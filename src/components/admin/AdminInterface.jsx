import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export default function AdminInterface() {
  const { settings, storeData } = useApp();
  
  const [form, setForm] = useState({
    announcementText: storeData?.announcementText ?? settings.announcementText ?? "",
    heroTitle: storeData?.heroTitle ?? settings.heroTitle ?? "",
    heroDescription: storeData?.heroDescription ?? settings.heroDescription ?? "",
    legalText: storeData?.legalText ?? settings.legalText ?? "",
    socialLinks: storeData?.socialLinks ?? settings.socialLinks ?? {},
  });
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (storeData) {
      setForm(prev => ({
        ...prev,
        announcementText: storeData.announcementText ?? prev.announcementText,
        heroTitle: storeData.heroTitle ?? prev.heroTitle,
        heroDescription: storeData.heroDescription ?? prev.heroDescription,
        legalText: storeData.legalText ?? prev.legalText,
        socialLinks: storeData.socialLinks ?? prev.socialLinks,
      }));
    }
  }, [storeData]);

  // 🌟 MAGIA: Función rápida para guardar directo en la tienda actual
  const updateStoreConfig = async (updates) => {
    if (!storeData?.id) throw new Error("No hay tienda conectada");
    await setDoc(doc(db, "stores", storeData.id), updates, { merge: true });
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "tienda_maquillaje"); 

    const res = await fetch("https://api.cloudinary.com/v1_1/dp3abweme/image/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Error en la subida");
    const data = await res.json();
    return data.secure_url;
  };

  const handleProfileImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await updateStoreConfig({ profileImage: url }); // Lo guarda en la tienda
      toast.success("Foto de perfil actualizada ✅");
    } catch (error) {
      toast.error("Error al subir foto de perfil");
    } finally {
      setUploading(false);
    }
  };

  const handleHappyCustomerUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));
      const existing = storeData?.happyCustomerImages || settings.happyCustomerImages || [];
      await updateStoreConfig({ happyCustomerImages: [...existing, ...urls] }); // Lo guarda en la tienda
      toast.success(`${urls.length} imagen(es) subida(s) ✅`);
    } catch (error) {
      toast.error("Error al subir imágenes");
    } finally {
      setUploading(false);
    }
  };

  const removeHappyCustomer = async (url) => {
    const existing = storeData?.happyCustomerImages || settings.happyCustomerImages || [];
    const updated = existing.filter((u) => u !== url);
    await updateStoreConfig({ happyCustomerImages: updated });
    toast.success("Imagen eliminada");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStoreConfig(form); // Lo guarda en la tienda
      toast.success("Textos de la tienda actualizados ✅");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Variables visuales (le damos prioridad a los datos de la tienda)
  const currentProfileImage = storeData?.profileImage || settings.profileImage;
  const currentHappyImages = storeData?.happyCustomerImages || settings.happyCustomerImages || [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">🎨 Interfaz de Tu Tienda</h2>

      {/* Profile image */}
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Foto de Perfil</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {currentProfileImage ? (
              <img src={currentProfileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">✨</div>
            )}
          </div>
          <label className="cursor-pointer px-4 py-2 rounded-2xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-pink-300 transition-colors">
            {uploading ? "Subiendo..." : "Cambiar foto"}
            <input type="file" accept="image/*" onChange={handleProfileImage} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Text content */}
      <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800">Textos de la Tienda</h3>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Cintillo promocional superior</label>
          <input value={form.announcementText} onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Título debajo de tu foto</label>
          <input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Descripción de bienvenida</label>
          <textarea value={form.heroDescription} onChange={(e) => setForm({ ...form, heroDescription: e.target.value })}
            rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300 resize-none" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Texto legal (pie de página)</label>
          <textarea value={form.legalText} onChange={(e) => setForm({ ...form, legalText: e.target.value })}
            rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300 resize-none" />
        </div>
      </div>

      {/* Happy customers carrusel */}
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">Tus Clientes Felices (Fotos)</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {currentHappyImages.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeHappyCustomer(url)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >×</button>
            </div>
          ))}
          <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-pink-300 transition-colors">
            {uploading ? <span className="text-xs text-gray-400 animate-pulse">...</span> : <span className="text-gray-400 text-2xl">+</span>}
            <input type="file" accept="image/*" multiple onChange={handleHappyCustomerUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || uploading}
        className="w-full py-4 rounded-2xl text-white font-bold disabled:opacity-50"
        style={{ background: "var(--primary)" }}>
        {saving ? "Guardando..." : "Guardar Textos"}
      </button>
    </div>
  );
}