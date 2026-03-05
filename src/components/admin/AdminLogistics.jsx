import { useState, useEffect } from "react";
import {
  collection, doc, setDoc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../config/firebase";
import toast from "react-hot-toast";

const LOGISTICS_IDS = ["mrw", "zoom", "tealca"];

export default function AdminLogistics() {
  const [logistics, setLogistics] = useState({});
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "percent", value: "" });
  const [uploading, setUploading] = useState({});
  const [savingCoupon, setSavingCoupon] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "logistics"), (snap) => {
      const data = {};
      snap.docs.forEach((d) => { data[d.id] = d.data(); });
      setLogistics(data);
    });
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => {
      setCoupons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub(); unsubCoupons(); };
  }, []);

  const uploadLogo = async (id, file) => {
    setUploading({ ...uploading, [id]: true });
    try {
      const r = ref(storage, `logistics/${id}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await setDoc(doc(db, "logistics", id), {
        name: id.toUpperCase(),
        logo: url,
        url: logistics[id]?.url || "",
      }, { merge: true });
      toast.success(`Logo de ${id.toUpperCase()} actualizado ✅`);
    } catch {
      toast.error("Error al subir logo");
    } finally {
      setUploading({ ...uploading, [id]: false });
    }
  };

  const updateLogisticsUrl = async (id, url) => {
    await setDoc(doc(db, "logistics", id), { url }, { merge: true });
  };

  const addCoupon = async () => {
    if (!newCoupon.code.trim() || !newCoupon.value) {
      toast.error("Completa código y valor");
      return;
    }
    setSavingCoupon(true);
    try {
      await addDoc(collection(db, "coupons"), {
        code: newCoupon.code.toUpperCase().trim(),
        type: newCoupon.type,
        value: parseFloat(newCoupon.value),
        active: true,
        usageCount: 0,
        createdAt: serverTimestamp(),
      });
      setNewCoupon({ code: "", type: "percent", value: "" });
      toast.success("Cupón creado ✅");
    } catch {
      toast.error("Error al crear cupón");
    } finally {
      setSavingCoupon(false);
    }
  };

  const toggleCoupon = async (id, active) => {
    await updateDoc(doc(db, "coupons", id), { active: !active });
  };

  const deleteCoupon = async (id) => {
    if (!confirm("¿Eliminar cupón?")) return;
    await deleteDoc(doc(db, "coupons", id));
    toast.success("Cupón eliminado");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">🚚 Logística y Promociones</h2>

      {/* Logistics logos */}
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Empresas de Envío</h3>
        <div className="space-y-4">
          {LOGISTICS_IDS.map((id) => (
            <div key={id} className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {logistics[id]?.logo ? (
                  <img src={logistics[id].logo} alt={id} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-sm font-bold text-gray-400 uppercase">{id}</span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">{id}</label>
                <input
                  defaultValue={logistics[id]?.url || ""}
                  onBlur={(e) => updateLogisticsUrl(id, e.target.value)}
                  placeholder="URL del sitio"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none"
                />
              </div>
              <label className="cursor-pointer px-4 py-2 rounded-2xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-pink-300 flex-shrink-0">
                {uploading[id] ? "..." : "Logo"}
                <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadLogo(id, e.target.files[0])} className="hidden" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Coupons */}
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Cupones de Descuento</h3>

        {/* New coupon */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <input
            value={newCoupon.code}
            onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
            placeholder="CÓDIGO"
            className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-pink-300 uppercase"
          />
          <select
            value={newCoupon.type}
            onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
            className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none"
          >
            <option value="percent">% Porcentaje</option>
            <option value="fixed">$ Fijo</option>
          </select>
          <input
            type="number"
            value={newCoupon.value}
            onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
            placeholder="Valor"
            className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-pink-300"
          />
        </div>
        <button onClick={addCoupon} disabled={savingCoupon}
          className="w-full py-3 rounded-2xl text-white font-semibold text-sm disabled:opacity-50 mb-4"
          style={{ background: "var(--primary)" }}>
          {savingCoupon ? "Creando..." : "+ Crear cupón"}
        </button>

        {/* List */}
        <div className="space-y-2">
          {coupons.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No hay cupones.</p>
          )}
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
              <div className="flex-1">
                <span className="font-mono font-bold text-sm text-gray-800">{c.code}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {c.type === "percent" ? `${c.value}% off` : `$${c.value} off`}
                </span>
              </div>
              <button onClick={() => toggleCoupon(c.id, c.active)}
                className={`text-xs px-2 py-1 rounded-xl font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-400"}`}>
                {c.active ? "Activo" : "Inactivo"}
              </button>
              <button onClick={() => deleteCoupon(c.id)}
                className="text-gray-400 hover:text-red-500 text-sm p-1">🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
