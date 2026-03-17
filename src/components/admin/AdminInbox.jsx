import { useState, useEffect } from "react";
import {
  collection, onSnapshot, query, where, updateDoc, doc, runTransaction, increment, deleteDoc
} from "firebase/firestore"; 
import { db } from "../../config/firebase";
import toast from "react-hot-toast";
import { useApp } from "../../context/AppContext";

export default function AdminInbox() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { storeData, bsPrice } = useApp();

  /* 
   * Firebase Listener 
   * SOLO trae pedidos con estado "pending" (pendientes por confirmar)
   */
  useEffect(() => {
    if (!storeData?.id) return;

    const q = query(
      collection(db, "orders"), 
      where("storeId", "==", storeData.id),
      where("status", "==", "pending") // Solo pendientes
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Ordenar más recientes primero
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(data);
      setLoading(false);
    });

    return () => unsub();
  }, [storeData?.id]);

  /*
   * Confirmar (Pago Verificado) - TRANSACCIONAL FIREBASE
   */
  const confirmOrder = async (order) => {
    if (order.items && order.items.length === 0) return toast.error("El pedido está vacío");
    if (!confirm(`¿Confirmar que ${order.customerName || 'el cliente'} ha pagado el pedido y restarlo del inventario?`)) return;

    // Toast en progreso
    const toastId = toast.loading("Procesando pago en el banco del sistema...");

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Leer TODOS los productos a descontar y Configuraciones Globales (Obligatorio en transacciones leer todo antes de escribir)
        const itemsToUpdate = [];
        for (const item of (order.items || order.cart || [])) {
          // Algunos pedidos viejos pueden usar productId en vez de id
          const pId = item.productId || item.id; 
          if (!pId) continue;

          const pRef = doc(db, "products", pId);
          const pDoc = await transaction.get(pRef);
          
          if (pDoc.exists()) {
             itemsToUpdate.push({ doc: pDoc, ref: pRef, item: item });
          }
        }

        // Leer configuración global de comisiones ANTES de escribir
        const globalRef = doc(db, "settings", "global");
        const globalDoc = await transaction.get(globalRef);
        const isCommissionActive = globalDoc.exists() ? globalDoc.data().isCommissionActive : false;

        // 2. Ejecutar Resta de Inventario
        for (const producto of itemsToUpdate) {
          const currentData = producto.doc.data();
          const pQty = producto.item.quantity || producto.item.qty || 1; // Unificar quantity y qty
          let updateData = {};

          if (currentData.variants && currentData.variants.length > 0 && producto.item.variant) {
            // Producto con Variantes
            const labelABuscar = typeof producto.item.variant === 'object' ? producto.item.variant.label : producto.item.variant;

            const newVariants = currentData.variants.map(v => {
              if (v.label === labelABuscar || v.id === producto.item.variant?.id) {
                return { ...v, stock: Math.max(0, (v.stock || 0) - pQty) };
              }
              return v;
            });
            
            updateData = { 
              variants: newVariants,
              totalStock: newVariants.reduce((acc, v) => acc + (v.stock || 0), 0) 
            };
          } else {
            // Producto Simple
            updateData = { 
              totalStock: Math.max(0, (currentData.totalStock || 0) - pQty) 
            };
          }

          // Sumar al salescount individual del producto
          updateData.salesCount = (currentData.salesCount || 0) + pQty;
          
          // Escribir en producto
          transaction.update(producto.ref, updateData);
        }
        
        // 3. COMISIONES SUPER ADMIN
        let comisionASumar = 0;

        if (isCommissionActive) {
          const porcentaje = storeData.comision_porcentaje || 5;

          (order.items || order.cart || []).forEach(item => {
            // Verificamos si este producto específico vino de la Vitrina del Súper Admin
            if (item._origenVenta === "index_super_admin") {
              const pQty = item.quantity || item.qty || 1;
              const pPrice = Number(item.price || 0);
              const totalItem = pPrice * pQty;
              comisionASumar += (totalItem * (porcentaje / 100)); // Calculamos su tajada
            }
          });
        }

        const storeRef = doc(db, "stores", storeData.id);
        transaction.update(storeRef, {
          ventas_consolidadas: increment(1),
          deuda_comision: increment(comisionASumar) // Si isCommissionActive es falso, comisionASumar será 0 (y será correcto)
        });
        
        // 4. EL CAMBIO DE MAGIA (Solución al Bug de Hiuston)
        // En lugar de `transaction.delete`, actualizamos a completed
        const orderRef = doc(db, "orders", order.id);
        transaction.update(orderRef, { status: "completed" });
      });

      toast.success(`¡Pedido Confirmado! Ahora está en tu Historial de Ventas. ✅`, { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Error al confirmar el pedido", { id: toastId });
    }
  };


  /*
   * ELIMINAR O RECHAZAR PEDIDO
   */
  const rejectOrder = async (orderId) => {
    if (!confirm("¿Estás seguro de que quieres rechazar o eliminar este pedido? No existirá registro de esta solicitud.")) return;
    try {
      await deleteDoc(doc(db, "orders", orderId));
      toast.success("Solicitud eliminada 🗑️");
    } catch (error) {
      toast.error("Hubo un error al eliminar.");
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50">
        <span className="text-4xl animate-bounce mb-4">📦</span>
        <p className="font-bold text-gray-500 tracking-widest uppercase text-sm animate-pulse">Buscando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Cabecera Título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Pedidos por Confirmar 📦
          </h2>
          <p className="text-sm text-gray-400 font-medium">Revisa las solicitudes, cobra por WhatsApp y libera el pedido.</p>
        </div>
        
        <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm inline-flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            {orders.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${orders.length > 0 ? "bg-yellow-500" : "bg-gray-300"}`}></span>
          </span>
          <p className="text-xs font-black text-gray-600 uppercase tracking-widest">{orders.length} Solicitudes</p>
        </div>
      </div>
      
      {/* Listado de Solicitudes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {orders.length === 0 ? (
           <div className="col-span-full text-center py-20 bg-white rounded-[2rem] border border-gray-100 border-dashed opacity-60">
              <span className="text-6xl mb-4 block">🧹</span>
              <p className="text-gray-900 font-bold text-lg mb-1">¡Todo limpio y revisado!</p>
              <p className="text-sm font-medium text-gray-500">Cuando un cliente llene el carrito y pida por WhatsApp, aparecerá aquí.</p>
           </div>
        ) : (
          orders.map((order) => {
            const dateObj = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now());
            const displayDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const customerName = order.customerName || order.customer?.name || "Cliente Sin Nombre";
            const customerPhone = order.customerPhone || order.customer?.phone || "";
            
            const oTotal = Number(order.total || order.totalAmount || 0);
            const items = order.items || order.cart || [];

            const formatWhatsApp = (phone) => {
              if (!phone) return "";
              let num = phone.replace(/\D/g, "");
              if (num.startsWith("0")) num = num.substring(1);
              if (num.length > 0 && !num.startsWith("58")) {
                num = "58" + num;
              }
              return num;
            };
            const waLink = formatWhatsApp(customerPhone);
            
            return (
              <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col group relative">
                
                {/* Etiqueta Nueva */}
                <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-700 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border border-yellow-200 shadow-sm animate-pulse-slow">
                  Pendiente Pago
                </div>

                {/* Info Cliente */}
                <div className="bg-gray-50 p-6 border-b border-gray-100 flex gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0 border border-gray-200">
                    🧑
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base line-clamp-1">{customerName}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ticket: #{order.id.slice(-5).toUpperCase()}</p>
                    
                    {customerPhone && (
                      <a 
                        href={`https://wa.me/${waLink}`}
                        target="_blank" rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 bg-green-100 hover:bg-green-500 text-green-700 hover:text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        💬 Hablar Whatsapp
                      </a>
                    )}
                  </div>
                </div>

                {/* Lista de Compra Desglosada (Premium) */}
                <div className="p-6 flex-1 bg-white">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-dashed border-gray-100 pb-2">
                    Carrito Requerido ({items.length})
                  </h4>
                  <div className="space-y-4">
                    {items.map((item, idx) => {
                      const iImage = item.image || item.images?.[0] || null;
                      const iName = item.name || "Producto desconocido";
                      const iQty = item.quantity || item.qty || 1;
                      const iPrice = Number(item.price || 0);
                      const iVariant = item.variant?.label || item.variant || null;

                      return (
                        <div key={idx} className="flex gap-3">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                            {iImage ? <img src={iImage} className="w-full h-full object-cover" alt="" /> : <span className="w-full h-full flex items-center justify-center">🖼️</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 leading-tight mb-1">{iName}</p>
                            <div className="flex flex-wrap gap-2 text-[10px] items-center text-gray-500 font-bold uppercase">
                              <span className="bg-gray-100 px-1.5 rounded">{iQty} x ${iPrice.toFixed(2)}</span>
                              {iVariant && <span className="bg-pink-50 text-pink-600 px-1.5 rounded border border-pink-100">VAR: {typeof iVariant === 'string' ? iVariant : iVariant.label}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-gray-900 block">${(iQty * iPrice).toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pie: Monto y Botones Confirmación */}
                <div className="bg-gray-50 p-6 border-t border-gray-100">
                  <div className="flex justify-between items-end mb-6">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total a Cobrar</span>
                    <div className="text-right">
                      <span className="text-3xl font-black text-gray-900 block leading-none">${oTotal.toFixed(2)}</span>
                      {bsPrice && <span className="text-[10px] font-bold text-gray-500 uppercase">Bs. {bsPrice(oTotal)}</span>}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => confirmOrder(order)} 
                      className="flex-1 bg-black hover:bg-gray-800 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all text-center"
                    >
                      PAGO RECIBIDO ✅
                    </button>
                    <button 
                      onClick={() => rejectOrder(order.id)} 
                      className="px-5 bg-white border-2 border-red-50 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-xl font-black transition-all"
                      title="Eliminar Solicitud"
                    >
                      ✕
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}