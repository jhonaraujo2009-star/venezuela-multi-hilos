import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";

export default function AdminSalesHistory() {
  const { storeData, bsPrice, settings } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  /* 
   * Firebase Listener
   * SOLO nos traemos las órdenes que sean ventas reales (pagado, completed, o POS)
   * Ignoramos las pendientes o canceladas para que sea un verdadero Historial de Venta.
   */
  useEffect(() => {
    if (!storeData?.id) return;
    const q = query(collection(db, "orders"), where("storeId", "==", storeData.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filtramos en memoria (o en query si tuvieramos índices, pero aquí es seguro en memoria)
      let ordersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        // Un ticket de venta válido tiene status: completed, pagado, entregado o enviado.
        .filter(o => {
          const st = (o.status || "").toLowerCase();
          return st === "completed" || st === "pagado" || st === "entregado" || st === "enviado";
        });

      // Ordenar por las más recientes primero
      ordersList.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });

      setOrders(ordersList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sales history:", error);
      toast.error("Error obteniendo el historial de ventas");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [storeData?.id]);

  /* 
   * Cálculos Monetarios Reales
   */
  const metrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let salesToday = 0;
    let countToday = 0;
    let salesMonth = 0;
    let salesYear = 0;

    orders.forEach(order => {
      const orderDateUnix = order.createdAt?.toMillis ? order.createdAt.toMillis() : 0;
      const amount = Number(order.total || order.totalAmount || 0);

      if (orderDateUnix >= today.getTime()) {
        salesToday += amount;
        countToday += 1;
      }
      if (orderDateUnix >= startOfMonth.getTime()) {
        salesMonth += amount;
      }
      if (orderDateUnix >= startOfYear.getTime()) {
        salesYear += amount;
      }
    });

    return { salesToday, countToday, salesMonth, salesYear };
  }, [orders]);


  const toggleDetails = (orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  /* 
   * Buscador por Nombre de Cliente o ID del Ticket
   */
  const filteredOrders = orders.filter(order => {
    const sTerm = searchTerm.toLowerCase();
    const cName = String(order.customerName || order.customer?.name || "Cliente").toLowerCase();
    const idMatch = String(order.id).toLowerCase().includes(sTerm);
    return sTerm === "" || cName.includes(sTerm) || idMatch;
  });

  const primaryColor = storeData?.primaryColor || settings?.primaryColor || "#000000";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 opacity-50 bg-white rounded-[2rem]">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-gray-500 tracking-widest uppercase text-sm animate-pulse">Cargando Historial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 
        ==============================
        1. TARJETAS DE MÉTRICAS GLOBALES
        ==============================
      */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-4">Historial de Ventas 🧾</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
              <span className="text-8xl">☀️</span>
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest relative z-10">Facturado Hoy</p>
            <div className="mt-2 flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-black">${metrics.salesToday.toFixed(2)}</span>
            </div>
            <div className="mt-2 text-[10px] font-bold text-gray-300 bg-white/10 inline-block px-2 py-1 rounded-lg relative z-10 border border-white/5">
              {metrics.countToday} Ticket(s) Emitido(s)
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-gray-900">
              <span className="text-8xl">📅</span>
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest relative z-10">Facturado en el Mes</p>
            <div className="mt-2 flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-black text-gray-900">${metrics.salesMonth.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 text-gray-900">
              <span className="text-8xl">🚀</span>
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest relative z-10">Facturado en el Año</p>
            <div className="mt-2 flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-black text-gray-900">${metrics.salesYear.toFixed(2)}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 
        ==============================
        2. BUSCADOR PURISTA
        ==============================
      */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 text-lg">🔍</span>
        <input 
          type="text" 
          placeholder="Buscar Ticket por Nombre de Cliente o ID..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-4 py-4 bg-white shadow-sm border border-gray-100 rounded-[2rem] text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-100 transition-all"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-900">✕</button>
        )}
      </div>

      {/* 
        ==============================
        3. LISTA DE RECIBOS (INMUTABLES)
        ==============================
      */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-[2rem] border border-gray-100 shadow-sm opacity-60">
            <span className="text-6xl mb-4 block">🧾</span>
            <h3 className="text-xl font-black text-gray-900 mb-1">Sin Registros</h3>
            <p className="text-sm font-medium text-gray-500">{searchTerm ? "No coincide ningún ticket con tu búsqueda." : "Aún no hay ventas concretadas para mostrar."}</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const dateObj = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now());
            const displayDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const customerName = order.customerName || order.customer?.name || "Cliente de Mostrador";
            const customerPhone = order.customerPhone || order.customer?.phone || "";
            const isManualPOS = order.origin === "POS_Manual";
            
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
            
            const oTotal = Number(order.total || order.totalAmount || 0);
            const oSub = Number(order.subtotal || oTotal);
            const oDesc = Number(order.discount || 0);
            const pMethod = order.paymentMethod || order.paymentId || "Efectivo";

            const orderItems = order.items || order.cart || [];
            const isExpanded = expandedOrderId === order.id;

            return (
              <div key={order.id} className={`bg-white rounded-[1.5rem] shadow-sm border transition-all ${isExpanded ? 'border-gray-900' : 'border-gray-100 hover:border-gray-300'}`}>
                
                {/* CABECERA DEL RECIBO */}
                <div 
                  onClick={() => toggleDetails(order.id)}
                  className="p-5 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${isManualPOS ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {isManualPOS ? "🏪" : "🌐"}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                        {customerName}
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-md border border-green-200">Facturado</span>
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        TICKET #{order.id.slice(-6).toUpperCase()} • {displayDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-none border-gray-100 pt-3 sm:pt-0">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Total</p>
                      <p className="text-xl sm:text-2xl font-black text-gray-900 leading-none">${oTotal.toFixed(2)}</p>
                    </div>

                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isExpanded ? 'bg-gray-900 text-white border-gray-900 rotate-180' : 'bg-white text-gray-400 border-gray-200'}`}>
                      ▼
                    </div>
                  </div>
                </div>

                {/* DETALLE DEL RECIBO */}
                {isExpanded && (
                  <div className="border-t border-dashed border-gray-200 bg-gray-50/50 p-5 sm:p-8 space-y-6 rounded-b-[1.5rem]">
                    
                    {/* Botón Whatsapp (Si hay teléfono) */}
                    {customerPhone && (
                      <div className="flex justify-end">
                        <a 
                          href={`https://wa.me/${waLink}`}
                          target="_blank" rel="noreferrer"
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                        >
                          💬 WhatsApp Directo al Cliente
                        </a>
                      </div>
                    )}

                    {/* Fila: Desglose */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Productos Facturados ({orderItems.length})</h4>
                      
                      <div className="space-y-3 mb-6">
                        {orderItems.map((item, idx) => {
                          const iQty = item.quantity || item.qty || 1;
                          const iPrice = Number(item.price || 0);
                          const iName = item.name || "Producto";
                          const iImage = item.image || item.images?.[0] || null;
                          const variantLabel = item.variant?.label || item.variant || null;

                          return (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                {iImage && <img src={iImage} className="w-10 h-10 rounded-lg object-cover border border-gray-200" alt="" />}
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{iName}</p>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase">
                                    {iQty} x ${iPrice.toFixed(2)} {variantLabel && `• VAR: ${typeof variantLabel === 'string' ? variantLabel : variantLabel.label}`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-black text-gray-900">${(iQty * iPrice).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-dashed border-gray-200 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="bg-gray-100 px-4 py-2 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest border border-gray-200 w-full md:w-auto text-center">
                          Pago Confirmado vía: <span className="text-gray-900">{pMethod}</span>
                        </div>
                        
                        <div className="text-right w-full md:w-auto">
                          {oDesc > 0 && <p className="text-xs font-bold text-red-500 mb-1">Descuento aplicado: -${oDesc.toFixed(2)}</p>}
                          <div className="flex items-end justify-center md:justify-end gap-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Cerrado</span>
                            <span className="text-3xl font-black text-gray-900 leading-none">${oTotal.toFixed(2)}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">Ref: Bs. {bsPrice ? bsPrice(oTotal) : "0.00"}</p>
                        </div>
                      </div>

                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
