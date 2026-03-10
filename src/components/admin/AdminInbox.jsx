import { useState, useEffect } from "react";
import {
  collection, onSnapshot, query, where, updateDoc, doc, getDocs, runTransaction, deleteDoc
} from "firebase/firestore";
import { db } from "../../config/firebase";
import toast from "react-hot-toast";
import { useApp } from "../../context/AppContext"; // 🌟 INYECTAMOS LA TIENDA

function ReplyBox({ value, onChange, onSubmit, saving }) {
  return (
    <div className="mt-2 flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu respuesta..."
        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300"
      />
      <button onClick={onSubmit} disabled={saving}
        className="px-4 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-50"
        style={{ background: "var(--primary)" }}>
        {saving ? "..." : "Responder"}
      </button>
    </div>
  );
}

export default function AdminInbox() {
  const [tab, setTab] = useState("pedidos");
  const [questions, setQuestions] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [comments, setComments] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [saving, setSaving] = useState({});
  const [orders, setOrders] = useState([]);
  
  const { storeData } = useApp(); // 🌟 SABER DE QUIÉN ES LA TIENDA

  useEffect(() => {
    if (!storeData?.id) return;

    // 🌟 FILTRAMOS LAS PREGUNTAS POR TIENDA Y LAS ORDENAMOS EN MEMORIA PARA EVITAR ERRORES
    const unsubQ = onSnapshot(query(collection(db, "questions"), where("storeId", "==", storeData.id)), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setQuestions(data);
    });

    // 🌟 FILTRAMOS LOS PEDIDOS POR TIENDA
    const unsubO = onSnapshot(query(collection(db, "orders"), where("storeId", "==", storeData.id)), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(data);
    });

    // 🌟 FILTRAMOS LOS PRODUCTOS POR TIENDA PARA LOS COMENTARIOS
    getDocs(query(collection(db, "products"), where("storeId", "==", storeData.id))).then((snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, name: d.data().name })));
    });

    return () => { unsubQ(); unsubO(); };
  }, [storeData?.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const unsub = onSnapshot(
      collection(db, "products", selectedProduct, "comments"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setComments(data);
      }
    );
    return unsub;
  }, [selectedProduct]);

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
        
        transaction.delete(doc(db, "orders", order.id));
      });
      toast.success(`Venta procesada con éxito ✅`);
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar el pago");
    }
  };

  const replyQuestion = async (id) => {
    const text = replyText[id];
    if (!text?.trim()) return;
    setSaving({ ...saving, [id]: true });
    try {
      await updateDoc(doc(db, "questions", id), { adminReply: text, adminRepliedAt: new Date(), isPublic: true });
      setReplyText({ ...replyText, [id]: "" });
      toast.success("Respuesta enviada ✅");
    } finally { setSaving({ ...saving, [id]: false }); }
  };

  const replyComment = async (commentId) => {
    const text = replyText[commentId];
    if (!text?.trim() || !selectedProduct) return;
    setSaving({ ...saving, [commentId]: true });
    try {
      await updateDoc(doc(db, "products", selectedProduct, "comments", commentId), { adminReply: text, adminRepliedAt: new Date() });
      setReplyText({ ...replyText, [commentId]: "" });
      toast.success("Respuesta enviada ✅");
    } finally { setSaving({ ...saving, [commentId]: false }); }
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-gray-900">💬 Centro de Mensajería</h2>
      
      <div className="flex gap-2">
        {["pedidos", "questions", "comments"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${tab === t ? "text-white" : "bg-gray-100 text-gray-600"}`}
            style={tab === t ? { background: "var(--primary)" } : {}}>
            {t === "pedidos" ? "📥 Pedidos" : t === "questions" ? "❓ Preguntas" : "💬 Comentarios"}
          </button>
        ))}
      </div>

      {tab === "pedidos" && (
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
      )}

      {tab === "questions" && (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {questions.map((q) => (
              <div key={q.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm text-gray-800">{q.text}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${q.isPublic ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {q.isPublic ? "Pública" : "Privada"}
                  </span>
                </div>
                <p className="text-xs text-blue-500 mb-2">📞 {q.phone}</p>
                {q.adminReply ? (
                  <div className="bg-pink-50 rounded-xl px-3 py-2 text-xs">
                    <span className="font-semibold" style={{ color: "var(--primary)" }}>Tu respuesta: </span>{q.adminReply}
                  </div>
                ) : (
                  <ReplyBox value={replyText[q.id] || ""} onChange={(v) => setReplyText({ ...replyText, [q.id]: v })} onSubmit={() => replyQuestion(q.id)} saving={saving[q.id]} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "comments" && (
        <div className="space-y-4">
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none">
            <option value="">Selecciona un producto...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {selectedProduct && (
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {comments.map((c) => (
                  <div key={c.id} className="p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-0.5">{c.authorName}</p>
                    <p className="text-sm text-gray-600 mb-2">{c.text}</p>
                    {c.adminReply ? (
                      <div className="bg-pink-50 rounded-xl px-3 py-2 text-xs">
                        <span className="font-semibold" style={{ color: "var(--primary)" }}>Tu respuesta: </span>{c.adminReply}
                      </div>
                    ) : (
                      <ReplyBox value={replyText[c.id] || ""} onChange={(v) => setReplyText({ ...replyText, [c.id]: v })} onSubmit={() => replyComment(c.id)} saving={saving[c.id]} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}