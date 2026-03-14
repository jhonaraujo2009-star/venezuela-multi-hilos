import { useState, useEffect } from "react";
import {
  collection, onSnapshot, query, where, updateDoc, doc, runTransaction, deleteDoc, increment
} from "firebase/firestore"; 
import { db } from "../../config/firebase";
import toast from "react-hot-toast";
import { useApp } from "../../context/AppContext"; // 🌟 INYECTAMOS LA TIENDA

export default function AdminInbox() {
  const [orders, setOrders] = useState([]);
  const { storeData } = useApp(); // 🌟 SABER DE QUIÉN ES LA TIENDA

  useEffect(() => {
    if (!storeData?.id) return;

    // 🌟 FILTRAMOS LOS PEDIDOS POR TIENDA
    const unsubO = onSnapshot(query(collection(db, "orders"), where("storeId", "==", storeData.id)), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(data);
    });

    return () => { unsubO(); };
  }, [storeData?.id]);

  const editItemQty = async (orderId, itemIndex, currentQty) => {
    const newQty = prompt("Nueva cantidad para este producto:", currentQty);
    if (newQty === null || isNaN(newQty) || newQty < 0) return;
    
    const order = orders.find(o => o.id === orderId);
    const updatedItems = [...order.items];
    
    if (parseInt(newQty) === 0) { 
      updatedItems.splice(itemIndex, 1); 
    } else { 
      updatedItems[itemIndex].qty = parseInt(newQty); 
    }
    
    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
    
    try {
      await updateDoc(doc(db, "orders", orderId), { items: updatedItems, totalAmount: newTotal });
      toast.success("Pedido actualizado ✅");
    } catch (e) { 
      toast.error("Error al editar"); 
    }
  };

  const confirmOrder = async (order) => {
    if (order.items.length === 0) return toast.error("El pedido está vacío");
    if (!confirm(`¿Confirmar pago de ${order.customerName}?`)) return;

    try {
      await runTransaction(db, async (transaction) => {
        const leerProductos = [];
        for (const item of order.items) {
          const pRef = doc(db, "products", item.id);
          const pDoc = await transaction.get(pRef);
          leerProductos.push({ doc: pDoc, ref: pRef, item: item });
        }

        for (const producto of leerProductos) {
          if (producto.doc.exists()) {
            const currentData = producto.doc.data();
            let updateData = {};

            if (currentData.variants && currentData.variants.length > 0 && producto.item.variant) {
              const labelABuscar = typeof producto.item.variant === 'object' 
                ? producto.item.variant.label 
                : producto.item.variant;

              const newVariants = currentData.variants.map(v => {
                if (v.label === labelABuscar) {
                  return { ...v, stock: Math.max(0, (v.stock || 0) - producto.item.qty) };
                }
                return v;
              });
              
              updateData = { 
                variants: newVariants,
                totalStock: newVariants.reduce((acc, v) => acc + (v.stock || 0), 0) 
              };
            } else {
              updateData = { 
                totalStock: Math.max(0, (currentData.totalStock || 0) - producto.item.qty) 
              };
            }

            updateData.salesCount = (currentData.salesCount || 0) + producto.item.qty;
            transaction.update(producto.ref, updateData);
          }
        }
        
        // ------------------------------------------------------------------
        // 🌟 FASE 3: EL COBRADOR AUTOMÁTICO (COMISIONES Y VENTAS) 🌟
        // ------------------------------------------------------------------
        let comisionASumar = 0;
        const porcentaje = storeData.comision_porcentaje || 5;

        order.items.forEach(item => {
          // Si el producto viene marcado por tu página principal (Index)
          if (item._origenVenta === "index_super_admin") {
            const totalItem = item.price * item.qty;
            comisionASumar += (totalItem * (porcentaje / 100));
          }
        });

        // Actualizamos la tienda en tiempo real: +1 venta y sumamos la deuda si aplica
        const storeRef = doc(db, "stores", storeData.id);
        transaction.update(storeRef, {
          ventas_consolidadas: increment(1),
          deuda_comision: increment(comisionASumar)
        });
        // ------------------------------------------------------------------
        
        transaction.delete(doc(db, "orders", order.id));
      });
      toast.success(`Venta procesada con éxito ✅`);
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar el pago");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-gray-900">📥 Centro de Pedidos</h2>
      
      <div className="grid gap-4">
        {orders.length === 0 ? (
           <p className="text-center text-gray-400 py-8 text-sm">No hay pedidos pendientes.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800 uppercase text-xs">{order.customerName}</h3>
                  <p className="text-[10px] text-blue-500 font-bold">📞 {order.customerPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-pink-500">${order.totalAmount}</p>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">
                      {item.name} {item.variant ? `(${typeof item.variant === 'object' ? item.variant.label : item.variant})` : ""} (x{item.qty})
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400">${item.price * item.qty}</span>
                      <button onClick={() => editItemQty(order.id, idx, item.qty)} className="text-[10px] bg-gray-100 px-2 py-1 rounded-lg font-bold text-gray-500 hover:bg-pink-100">✏️ Editar</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <button onClick={() => confirmOrder(order)} className="flex-1 bg-black text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Confirmar Pago</button>
                <button onClick={() => deleteDoc(doc(db, "orders", order.id))} className="px-4 bg-red-50 text-red-500 rounded-xl text-[10px] font-black">Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}