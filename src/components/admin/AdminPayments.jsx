import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../config/firebase";
import toast from "react-hot-toast";

const SEED = {
  bankName: "Banco de Venezuela",
  holderName: "Jhon Araujo",
  idNumber: "V-23493744",
  phone: "04120496690",
  accountNumber: "",
  type: "mobile_payment",
  order: 1,
  logo: "",
};

function PaymentForm({ payment, onClose }) {
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const r = ref(storage, `payments/${Date.now()}-${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setForm({ ...form, logo: url });
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
        await addDoc(collection(db, "payments"), { ...form, createdAt: serverTimestamp() });
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
    { key: "phone", label: "Teléfono de Contacto (WhatsApp)" }, // <--- AQUÍ SE INDICA EL TELÉFONO DE WHATSAPP
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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "payments"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        addDoc(collection(db, "payments"), { ...SEED, createdAt: serverTimestamp() });
      }
      setPayments(data);
    });
    return unsub;
  }, []);

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
        <PaymentForm payment={editPayment} onClose={() => { setShowForm(false); setEditPayment(null); }} />
      )}
    </div>
  );
}