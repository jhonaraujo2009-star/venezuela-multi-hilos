import { useState } from "react";
// Eliminamos las importaciones de Firebase Storage que daban error
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";

export default function AdminInterface() {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState({
    announcementText: settings.announcementText || "",
    heroTitle: settings.heroTitle || "",
    heroDescription: settings.heroDescription || "",
    legalText: settings.legalText || "",
    socialLinks: { ...settings.socialLinks },
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // NUEVA FUNCIÓN PARA SUBIR A CLOUDINARY
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "tienda_maquillaje"); // Tu preset configurado

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dp3abweme/image/upload", // Tu Cloud Name
      {
        method: "POST",
        body: formData,
      }
    );

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
      await updateSettings({ profileImage: url });
      toast.success("Foto de perfil actualizada ✅");
    } catch (error) {
      console.error(error);
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
      const urls = await Promise.all(
        files.map((f) => uploadToCloudinary(f))
      );
      const existing = settings.happyCustomerImages || [];
      await updateSettings({ happyCustomerImages: [...existing, ...urls] });
      toast.success(`${urls.length} imagen(es) subida(s) ✅`);
    } catch (error) {
      console.error(error);
      toast.error("Error al subir imágenes del carrusel");
    } finally {
      setUploading(false);
    }
  };

  const removeHappyCustomer = async (url) => {
    const updated = (settings.happyCustomerImages || []).filter((u) => u !== url);
    await updateSettings({ happyCustomerImages: updated });
    toast.success("Imagen eliminada");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success("Interfaz actualizada ✅");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">🎨 Gestor de Interfaz</h2>

      {/* Profile image */}
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Foto de Perfil</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {settings.profileImage ? (
              <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
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
        <h3 className="font-bold text-gray-800">Textos de la tienda</h3>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Cintillo promocional</label>
          <input value={form.announcementText} onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Título principal</label>
          <input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Descripción de bienvenida</label>
          <textarea value={form.heroDescription} onChange={(e) => setForm({ ...form, heroDescription: e.target.value })}
            rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300 resize-none" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Texto legal / políticas</label>
          <textarea value={form.legalText} onChange={(e) => setForm({ ...form, legalText: e.target.value })}
            rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300 resize-none" />
        </div>
      </div>

      {/* Social links */}
      <div className="bg-white rounded-3xl p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-800">Redes Sociales</h3>
        {["instagram", "tiktok", "facebook", "twitter"].map((net) => (
          <div key={net}>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{net}</label>
            <input
              value={form.socialLinks[net] || ""}
              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, [net]: e.target.value } })}
              placeholder={`https://${net}.com/tutienda`}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300"
            />
          </div>
        ))}
      </div>

      {/* Happy customers carrusel */}
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">Carrusel "Clientes Felices"</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(settings.happyCustomerImages || []).map((url, i) => (
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
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}