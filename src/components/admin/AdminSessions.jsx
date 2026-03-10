import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, where
} from "firebase/firestore";
import { db } from "../../config/firebase";
import toast from "react-hot-toast";
import { useApp } from "../../context/AppContext"; // 🌟 Inyectamos el cerebro

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showForm, setShowForm] = useState(false);
  
  const { storeData } = useApp(); // 🌟 Extraemos la tienda actual

  useEffect(() => {
    if (!storeData?.id) return;

    // 🌟 MAGIA: Solo busca las sesiones que pertenezcan a esta tienda
    const unsub = onSnapshot(
      query(collection(db, "sessions"), where("storeId", "==", storeData.id)),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Las ordenamos manualmente para no pedir índices extra a Firebase
        data.sort((a, b) => a.order - b.order); 
        setSessions(data);
      }
    );
    return unsub;
  }, [storeData?.id]);

  const addSession = async () => {
    if (!newName.trim() || !storeData?.id) return;
    setAdding(true);
    try {
      await addDoc(collection(db, "sessions"), {
        name: newName.trim(),
        slug: newName.trim().toLowerCase().replace(/\s+/g, "-"),
        hidden: false,
        order: sessions.length,
        createdAt: serverTimestamp(),
        storeId: storeData.id // 🌟 MAGIA: Guardamos a quién le pertenece esta sesión
      });
      setNewName("");
      setShowForm(false);
      toast.success("Sesión creada ✅");
    } catch {
      toast.error("Error al crear sesión");
    } finally {
      setAdding(false);
    }
  };

  const updateSession = async (id, updates) => {
    try {
      await updateDoc(doc(db, "sessions", id), updates);
      toast.success("Sesión actualizada");
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const deleteSession = async (id) => {
    if (!confirm("¿Eliminar esta sesión?")) return;
    try {
      await deleteDoc(doc(db, "sessions", id));
      toast.success("Sesión eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900 italic">📂 Sesiones</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-lg"
          style={{ background: "var(--primary)" }}>
          + Nueva
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        {sessions.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No hay sesiones todavía.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1">
                  {editId === s.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={async () => {
                        if (editName.trim() && editName !== s.name) {
                          await updateSession(s.id, { name: editName });
                        }
                        setEditId(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      autoFocus
                      className="bg-pink-50 border border-pink-200 rounded-xl px-3 py-2 text-sm outline-none w-full font-bold text-pink-600"
                    />
                  ) : (
                    <span className={`text-sm font-bold ${s.hidden ? "text-gray-400 line-through" : "text-gray-800"}`}>
                      {s.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateSession(s.id, { hidden: !s.hidden })}
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${
                      s.hidden ? "bg-gray-100 text-gray-400" : "bg-green-100 text-green-600"
                    }`}
                  >
                    {s.hidden ? "Oculta" : "Visible"}
                  </button>

                  <button
                    onClick={() => { setEditId(s.id); setEditName(s.name); }}
                    className="p-2 bg-gray-50 rounded-xl text-xs hover:bg-gray-100"
                  >✏️</button>

                  <button
                    onClick={() => deleteSession(s.id)}
                    className="p-2 bg-red-50 text-red-500 rounded-xl text-xs hover:bg-red-100"
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Nueva Sesión</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nombre de la Categoría</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Maquillaje, Ropa"
                  onKeyDown={(e) => e.key === "Enter" && addSession()}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-pink-300 font-bold"
                  autoFocus
                />
              </div>
              
              <button onClick={addSession} disabled={adding}
                className="w-full py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-lg disabled:opacity-50"
                style={{ background: "var(--primary)" }}>
                {adding ? "Creando..." : "Crear Sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}