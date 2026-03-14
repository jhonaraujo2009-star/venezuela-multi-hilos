import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";

export default function AdminOrders() {
  const { storeData, bsPrice } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todos");
  
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // 🌟 MAGIA: Cambié "pendiente" a "pending" para que coincida exactamente con tu base de datos
  const STATUSES = [
    { id: "pending", label: "⏳ Pendiente", color: "bg-yellow-100 text-yellow-700 border-yellow-200", badge: "bg-yellow-500" },
    { id: "pagado", label: "💸 Pagado", color: "bg-blue-100 text-blue-700 border-blue-200", badge: "bg-blue-500" },
    { id: "enviado", label: "🚚 Enviado", color: "bg-purple-100 text-purple-700 border-purple-200", badge: "bg-purple-500" },
    { id: "entregado", label: "✅ Entregado", color: "bg-green-100 text-green-700 border-green-200", badge: "bg-green-500" },
    { id: "cancelado", label: "❌ Cancelado", color: "bg-red-100 text-red-700 border-red-200", badge: "bg-red-500" }
  ];

  useEffect(() => {
    if (storeData?.id) fetchOrders();
  }, [storeData?.id]);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, "orders"), where("storeId", "==", storeData.id));
      const snap = await getDocs(q);
      const ordersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      ordersList.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });

      setOrders(ordersList);
    } catch (error) {
      console.error("Error cargando pedidos:", error);
      toast.error("Error al cargar los pedidos");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Estado actualizado a: ${newStatus.toUpperCase()}`);
    } catch (error) {
      toast.error("No se pudo actualizar el estado");
    }
  };

  // 🌟 MAGIA: Funciones para extraer precio, nombre y cantidad con TUS VARIABLES EXACTAS
  const getItemPrice = (item) => Number(item?.price || 0);
  const getItemName = (item) => item?.name || "Producto Desconocido";
  const getItemQty = (item) => Number(item?.qty || 1); // Tú usas "qty", no "quantity"

  const handleUpdateItemQuantity = async (order, itemIndex, delta) => {
    const newItems = [...order.items];
    const item = newItems[itemIndex];
    const newQuantity = getItemQty(item) + delta;
    
    if (newQuantity <= 0) return;

    newItems[itemIndex].qty = newQuantity; // Actualizamos TU variable "qty"
    
    // Recalcular el totalAmount sumando (precio * qty)
    const newTotal = newItems.reduce((acc, curr) => acc + (getItemPrice(curr) * getItemQty(curr)), 0);

    try {
      await updateDoc(doc(db, "orders", order.id), { items: newItems, totalAmount: newTotal }); // Guardamos en TU variable "totalAmount"
      setOrders(orders.map(o => o.id === order.id ? { ...o, items: newItems, totalAmount: newTotal } : o));
      toast.success("Cantidad actualizada 🔄");
    } catch (error) {
      toast.error("Error al actualizar el producto");
    }
  };

  const handleDeleteItem = async (order, itemIndex) => {
    if (!window.confirm("¿Seguro que el cliente NO pagará este producto? Se eliminará del pedido.")) return;
    
    const newItems = [...order.items];
    newItems.splice(itemIndex, 1);
    
    const newTotal = newItems.reduce((acc, curr) => acc + (getItemPrice(curr) * getItemQty(curr)), 0);

    try {
      await updateDoc(doc(db, "orders", order.id), { items: newItems, totalAmount: newTotal });
      setOrders(orders.map(o => o.id === order.id ? { ...o, items: newItems, totalAmount: newTotal } : o));
      toast.success("Producto eliminado 🗑️");
    } catch (error) {
      toast.error("Error al eliminar el producto");
    }
  };

  const toggleOrderDetails = (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  const filteredOrders = statusFilter === "todos" 
    ? orders 
    : orders.filter(o => (o.status || "pending") === statusFilter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-bold text-gray-400 animate-pulse">Cargando central de pedidos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Central de Pedidos</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Edita las compras y confirma los pagos.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 flex items-center gap-3">
            <span className="text-2xl">🛍️</span>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Ventas</p>
              <p className="text-lg font-black text-gray-900 leading-none">{orders.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setStatusFilter("todos")}
          className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-sm ${statusFilter === "todos" ? "bg-gray-900 text-white border-gray-900 scale-105" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
        >
          Todos
        </button>
        {STATUSES.map(s => (
          <button 
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-sm ${statusFilter === s.id ? `${s.color} scale-105` : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100 shadow-sm mt-4">
          <span className="text-6xl mb-4 block opacity-50">📭</span>
          <h3 className="text-xl font-black text-gray-900 mb-2">Bandeja vacía</h3>
          <p className="text-gray-500 text-sm font-medium">No se encontraron pedidos con este filtro.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const currentStatus = STATUSES.find(s => s.id === (order.status || "pending")) || STATUSES[0];
            const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
            const isExpanded = expandedOrderId === order.id;

            // Leemos con TUS variables exactas
            const orderCustomerName = order.customerName || "Cliente Desconocido";
            const orderCustomerPhone = order.customerPhone || "";
            const orderTotalAmount = Number(order.totalAmount || 0);

            return (
              <div 
                key={order.id} 
                className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden relative"
              >
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${currentStatus.badge}`}></div>

                <div 
                  className="p-4 sm:p-5 pl-6 sm:pl-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleOrderDetails(order.id)}
                >
                  <div className="flex items-center gap-4 sm:w-1/3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg shadow-inner flex-shrink-0">
                      🧑
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{orderCustomerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          #{order.id.slice(-5).toUpperCase()}
                        </span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="text-[10px] font-bold text-gray-400">
                          {date.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-4 sm:w-2/3">
                    <div className="relative group" onClick={(e) => e.stopPropagation()}>
                      <select 
                        value={currentStatus.id}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`appearance-none outline-none pl-3 pr-8 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider border cursor-pointer transition-all ${currentStatus.color}`}
                      >
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] sm:text-[10px]">▼</span>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="text-base sm:text-lg font-black text-gray-900 leading-none">${orderTotalAmount.toFixed(2)}</p>
                    </div>

                    <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-gray-200 text-gray-900 rotate-180' : 'bg-gray-50 text-gray-400 hover:bg-gray-200'}`}>
                      ▼
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30 p-4 sm:p-6 pl-6 sm:pl-8 flex flex-col gap-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📞 WhatsApp del Cliente</h4>
                          <p className="text-lg font-black text-gray-900">{orderCustomerPhone}</p>
                        </div>
                        <a 
                          href={`https://wa.me/${orderCustomerPhone.replace(/\D/g,'')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-green-500 hover:bg-green-600 text-white w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <span>💬</span> Escribir al Cliente
                        </a>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between gap-3">
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">💳 Pago Reportado</h4>
                          <p className="text-sm font-bold text-gray-900 uppercase">{order.paymentId || "No especificado"}</p>
                        </div>
                        {currentStatus.id !== "pagado" && currentStatus.id !== "entregado" && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, "pagado")}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                          >
                            💸 Marcar como Pagado
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">🛍️ Edición de Productos</h4>
                      
                      <div className="space-y-4">
                        {order.items && order.items.length > 0 ? order.items.map((item, i) => {
                          const itemPrice = getItemPrice(item);
                          const itemName = getItemName(item);
                          const itemQty = getItemQty(item);
                          const itemTotal = itemPrice * itemQty;

                          return (
                            <div key={i} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                              
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{itemName}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                                      Precio Unitario: ${itemPrice.toFixed(2)}
                                    </span>
                                    {item.variant && (
                                      <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                                        Var: {item.variant}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteItem(order, i)} 
                                  className="text-red-500 bg-red-50 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm shrink-0"
                                >
                                  <span>✕</span> Eliminar
                                </button>
                              </div>

                              <div className="flex items-center justify-between border-t border-gray-200 pt-3 mt-1">
                                <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
                                  <button onClick={() => handleUpdateItemQuantity(order, i, -1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-pink-600 font-black text-lg transition-colors">-</button>
                                  <span className="text-sm font-black w-6 text-center text-gray-900">{itemQty}</span>
                                  <button onClick={() => handleUpdateItemQuantity(order, i, 1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-pink-600 font-black text-lg transition-colors">+</button>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</p>
                                  <p className="text-sm font-black text-gray-900">${itemTotal.toFixed(2)}</p>
                                </div>
                              </div>

                            </div>
                          );
                        }) : (
                          <div className="text-center py-6 bg-red-50 rounded-xl border border-red-100">
                            <p className="text-sm font-black text-red-600 uppercase tracking-widest">El pedido quedó vacío</p>
                            <p className="text-xs text-red-500 mt-1">Todos los productos fueron eliminados.</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center sm:text-left">
                          *Al editar productos, este total se ajusta automáticamente.
                        </p>
                        <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl flex items-center gap-6 shadow-xl w-full sm:w-auto justify-center">
                          <span className="text-sm font-black uppercase tracking-widest">Total Final:</span>
                          <div className="text-right">
                            <p className="text-2xl font-black leading-none">${orderTotalAmount.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Bs. {bsPrice ? bsPrice(orderTotalAmount) : "0.00"}</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}