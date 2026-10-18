import { useState, useEffect } from "react";
import {
  collection, onSnapshot, query, where, updateDoc, doc, runTransaction, increment, deleteDoc
} from "firebase/firestore"; 
import { db } from "../../config/firebase";
import toast from "react-hot-toast";
import { useApp } from "../../context/AppContext";

export default function AdminInbox() {
  const [activeTab, setActiveTab] = useState("pedidos"); // "pedidos" | "preguntas"
  const [orders, setOrders] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { storeData, bsPrice } = useApp();

  const [replyTextMap, setReplyTextMap] = useState({});
  const [savingReplyId, setSavingReplyId] = useState(null);

  /* 
   * Firebase Listeners
   * 1. Pedidos pendientes por confirmar
   * 2. Preguntas enviadas por clientes a la tienda
   */
  useEffect(() => {
    if (!storeData?.id) return;

    const qOrders = query(
      collection(db, "orders"), 
      where("storeId", "==", storeData.id),
      where("status", "==", "pending") // Solo pendientes
    );
    
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(data);
      setLoading(false);
    });

    const qQuestions = query(
      collection(db, "questions"),
      where("storeId", "==", storeData.id)
    );

    const unsubQuestions = onSnapshot(qQuestions, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setQuestions(data);
    });

    return () => {
      unsubOrders();
      unsubQuestions();
    };
  }, [storeData?.id]);

  /*
   * Confirmar (Pago Verificado) - TRANSACCIONAL FIREBASE
   */
  const confirmOrder = async (order) => {
    if (order.items && order.items.length === 0) return toast.error("El pedido está vacío");
    if (!confirm(`¿Confirmar que ${order.customerName || 'el cliente'} ha pagado el pedido y restarlo del inventario?`)) return;

    const toastId = toast.loading("Procesando pago en el banco del sistema...");

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Leer TODOS los productos a descontar y Configuraciones Globales
        const itemsToUpdate = [];
        for (const item of (order.items || order.cart || [])) {
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
          const pQty = producto.item.quantity || producto.item.qty || 1;
          let updateData = {};

          if (currentData.variants && currentData.variants.length > 0 && producto.item.variant) {
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
            updateData = { 
              totalStock: Math.max(0, (currentData.totalStock || 0) - pQty) 
            };
          }

          updateData.salesCount = (currentData.salesCount || 0) + pQty;
          transaction.update(producto.ref, updateData);
        }
        
        // 3. COMISIONES SUPER ADMIN
        let comisionASumar = 0;

        if (isCommissionActive) {
          const porcentaje = storeData.comision_porcentaje || 5;

          (order.items || order.cart || []).forEach(item => {
            if (item._origenVenta === "index_super_admin") {
              const pQty = item.quantity || item.qty || 1;
              const pPrice = Number(item.price || 0);
              const totalItem = pPrice * pQty;
              comisionASumar += (totalItem * (porcentaje / 100));
            }
          });
        }

        const storeRef = doc(db, "stores", storeData.id);
        transaction.update(storeRef, {
          ventas_consolidadas: increment(1),
          deuda_comision: increment(comisionASumar)
        });
        
        // Actualizamos orden a completed
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

  /*
   * GESTIÓN DE PREGUNTAS (RESPUESTAS Y FAQ)
   */
  const handleSaveQuestionReply = async (questionId, makePublic = false) => {
    const text = replyTextMap[questionId];
    if (!text || !text.trim()) {
      return toast.error("Escribe una respuesta antes de guardar");
    }

    setSavingReplyId(questionId);
    try {
      await updateDoc(doc(db, "questions", questionId), {
        adminReply: text.trim(),
        isPublic: makePublic
      });
      toast.success(makePublic ? "Respuesta publicada en FAQ oficial ✅" : "Respuesta guardada ✅");
    } catch (error) {
      toast.error("Error al guardar respuesta");
    } finally {
      setSavingReplyId(null);
    }
  };

  const handleToggleQuestionPublic = async (questionId, currentStatus) => {
    try {
      await updateDoc(doc(db, "questions", questionId), { isPublic: !currentStatus });
      toast.success(!currentStatus ? "Pregunta visible en FAQ oficial" : "Pregunta ocultada del FAQ");
    } catch {
      toast.error("Error al cambiar visibilidad");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    try {
      await deleteDoc(doc(db, "questions", questionId));
      toast.success("Pregunta eliminada 🗑️");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const formatWhatsApp = (phone) => {
    if (!phone) return "";
    let num = phone.replace(/\D/g, "");
    if (num.startsWith("0")) num = num.substring(1);
    if (num.length > 0 && !num.startsWith("58")) {
      num = "58" + num;
    }
    return num;
  };

  const unrepliedCount = questions.filter(q => !q.adminReply).length;

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
      
      {/* Cabecera Título con Selector de Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Bandeja de Entrada 📥
          </h2>
          <p className="text-sm text-gray-400 font-medium">Revisa las solicitudes de compra y dudas de tus clientes.</p>
        </div>

        {/* Pestañas de Navegación */}
        <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-1">
          <button
            onClick={() => setActiveTab("pedidos")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "pedidos"
                ? "bg-black text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span>📦 Pedidos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "pedidos" ? "bg-yellow-400 text-black" : "bg-gray-100 text-gray-600"}`}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("preguntas")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "preguntas"
                ? "bg-black text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span>💬 Preguntas</span>
            {unrepliedCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white animate-pulse">
                {unrepliedCount}
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "preguntas" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
                {questions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================
          PESTAÑA 1: PEDIDOS PENDIENTES
      ========================================================= */}
      {activeTab === "pedidos" && (
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
                          💬 Hablar WhatsApp
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Lista de Compra Desglosada */}
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
      )}

      {/* =========================================================
          PESTAÑA 2: PREGUNTAS DE CLIENTES
      ========================================================= */}
      {activeTab === "preguntas" && (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-gray-100 border-dashed opacity-60">
              <span className="text-6xl mb-4 block">💬</span>
              <p className="text-gray-900 font-bold text-lg mb-1">No hay preguntas recibidas.</p>
              <p className="text-sm font-medium text-gray-500">Las dudas que dejen tus clientes en tu enlace de preguntas aparecerán aquí.</p>
            </div>
          ) : (
            questions.map((q) => {
              const dateObj = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt || Date.now());
              const displayDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const waLink = formatWhatsApp(q.phone);
              const currentReply = replyTextMap[q.id] !== undefined ? replyTextMap[q.id] : (q.adminReply || "");

              return (
                <div key={q.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-lg">
                        💬
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm">Cliente: {q.phone || "Sin teléfono"}</p>
                          {q.isPublic ? (
                            <span className="bg-green-100 text-green-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-green-200">
                              En FAQ Público
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                              Privado
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-semibold">{displayDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {q.phone && (
                        <a
                          href={`https://wa.me/${waLink}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <span>📱</span> Responder en WhatsApp
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
                        title="Eliminar pregunta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Mensaje de la pregunta */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pregunta:</p>
                    <p className="text-gray-800 font-medium text-sm">{q.text}</p>
                  </div>

                  {/* Formulario de Respuesta Oficial */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Respuesta Oficial (para mostrar en tu página de Preguntas Frecuentes):
                    </label>
                    <textarea
                      rows={2}
                      value={currentReply}
                      onChange={(e) => setReplyTextMap({ ...replyTextMap, [q.id]: e.target.value })}
                      placeholder="Escribe la respuesta oficial que verán tus clientes..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-pink-500 focus:bg-white transition-all resize-none"
                    />

                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <button
                        onClick={() => handleToggleQuestionPublic(q.id, q.isPublic)}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {q.isPublic ? "👁️ Ocultar del FAQ" : "🌐 Mostrar en FAQ Público"}
                      </button>
                      <button
                        onClick={() => handleSaveQuestionReply(q.id, true)}
                        disabled={savingReplyId === q.id}
                        className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                      >
                        {savingReplyId === q.id ? "Guardando..." : "Guardar y Publicar en FAQ"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}