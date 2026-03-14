import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, where
} from "firebase/firestore";
import { db } from "../../config/firebase";
import toast from "react-hot-toast";
import { useApp } from "../../context/AppContext"; // 🌟 INYECTAMOS LA TIENDA

function PaymentForm({ payment, onClose, storeData }) {
  const [form, setForm] = useState({
    bankName: payment?.bankName || "",
    holderName: payment?.holderName || "",
    idNumber: payment?.idNumber || "",
    phone: payment?.phone || "",
    accountNumber: payment?.accountNumber || "",
    type: payment?.type || "bank",
    logo: payment?.logo || "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🌟 CIRUGÍA LÁSER: Conectamos la subida a Cloudinary en lugar de Firebase Storage
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 🌟 VALIDACIÓN VIP: Verificamos que exista la tienda
    if (!storeData?.id) {
      toast.error("Error: No se detectó tu tienda.");
      return;
    }

    setUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "tienda_maquillaje"); // Tu carpeta de Cloudinary

    // 🌟 MAGIA CLOUDINARY: Le decimos que cree una sub-carpeta con el ID de la tienda
    formData.append("folder", `tienda_maquillaje/${storeData.id}`);

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dp3abweme/image/upload", { 
        method: "POST", 
        body: formData 
      });
      
      if (!res.ok) throw new Error("Error en la subida a Cloudinary");
      
      const data = await res.json();
      setForm({ ...form, logo: data.secure_url });
      toast.success("Logo subido con éxito");
    } catch (error) {
      console.error(error);
      toast.error("Error al subir el logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.bankName.trim() || !form.holderName.trim()) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (payment?.id) {
        await updateDoc(doc(db, "payments", payment.id), form);
        toast.success("Método actualizado ✅");
      } else {
        // 🌟 ASIGNAMOS EL MÉTODO DE PAGO AL DUEÑO ACTUAL
        await addDoc(collection(db, "payments"), { 
          ...form, 
          createdAt: serverTimestamp(),
          storeId: storeData.id 
        });
        toast.success("Método añadido ✅");
      }
      onClose();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "bankName", label: "Banco / Método", required: true },
    { key: "holderName", label: "Titular", required: true },
    { key: "idNumber", label: "C.I. / RIF" },
    { key: "phone", label: "Teléfono de Contacto (WhatsApp)" }, 
    { key: "accountNumber", label: "Número de cuenta" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{payment ? "Editar método" : "Nuevo método de pago"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>
        <div className="p-5 space-y-3">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
              <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300" />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Logo</label>
            <div className="flex items-center gap-3">
              {form.logo && <img src={form.logo} alt="" className="w-12 h-12 object-contain rounded-xl border border-gray-100" />}
              <label className="cursor-pointer px-4 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-pink-300">
                {uploading ? "Subiendo..." : "Subir logo"}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || uploading}
            className="w-full py-3 rounded-2xl text-white font-bold disabled:opacity-50"
            style={{ background: "var(--primary)" }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const { storeData } = useApp(); // 🌟 SABER DE QUIÉN ES LA TIENDA

  useEffect(() => {
    if (!storeData?.id) return;
    // 🌟 SOLO TRAE LOS MÉTODOS DE PAGO DE ESTA TIENDA
    const unsub = onSnapshot(query(collection(db, "payments"), where("storeId", "==", storeData.id)), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPayments(data);
    });
    return unsub;
  }, [storeData?.id]);

  const deletePayment = async (id) => {
    if (!confirm("¿Eliminar método de pago?")) return;
    await deleteDoc(doc(db, "payments", id));
    toast.success("Eliminado");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🏦 Métodos de Pago</h2>
        <button onClick={() => { setEditPayment(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-2xl text-white text-sm font-semibold"
          style={{ background: "var(--primary)" }}>
          + Nuevo
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No hay métodos de pago.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-4">
                {p.logo ? (
                  <img src={p.logo} alt="" className="w-12 h-12 object-contain rounded-xl border border-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏦</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{p.bankName}</p>
                  <p className="text-xs text-gray-500">{p.holderName} · {p.idNumber}</p>
                  {p.phone && <p className="text-xs text-gray-400">📲 {p.phone}</p>}
                  {p.accountNumber && <p className="text-xs text-gray-400">Cuenta: {p.accountNumber}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditPayment(p); setShowForm(true); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 text-sm">✏️</button>
                  <button onClick={() => deletePayment(p.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <PaymentForm payment={editPayment} storeData={storeData} onClose={() => { setShowForm(false); setEditPayment(null); }} />
      )}
    </div>
  );
}