import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export default function AdminSettings() {
  const { settings, storeData } = useApp(); // 🌟 YA NO usamos updateSettings global
  
  const [form, setForm] = useState({
    exchangeRate: storeData?.exchangeRate ?? settings.exchangeRate ?? "",
    whatsappNumber: storeData?.whatsappNumber ?? settings.whatsappNumber ?? "",
    primaryColor: storeData?.primaryColor ?? settings.primaryColor ?? "#ec4899",
    storeName: storeData?.nombre ?? "",
    verification: {
      cedula: storeData?.verification?.cedula || "",
      registroComercio: storeData?.verification?.registroComercio || "",
      youtubeLink: storeData?.verification?.youtubeLink || "",
      status: storeData?.verification?.status || "none",
    },
    quickButtons: storeData?.quickButtons ?? settings.quickButtons ?? [
      { id: 'cat', label: 'Catálogo', icon: '🛍️', filter: 'all' },
      { id: 'ofertas', label: 'Ofertas', icon: '🔥', filter: 'ofertas' },
      { id: 'top', label: 'Top Ventas', icon: '🏆', filter: 'top' },
      { id: 'new', label: 'Lo Último', icon: '✨', filter: 'new' }
    ],
    socialLinks: storeData?.socialLinks ?? settings.socialLinks ?? { instagram: "", tiktok: "", whatsapp: "" },
    customIcons: storeData?.customIcons ?? settings.customIcons ?? { whatsapp: "", instagram: "", tiktok: "" },
    shippingLogos: storeData?.shippingLogos ?? settings.shippingLogos ?? { mrw: "", tealca: "", zoom: "" },
    // 🌟 AGREGADO: Logos para la App Instalable (PWA)
    appLogos: storeData?.appLogos ?? settings.appLogos ?? { icon192: "", icon512: "" },
    whatsappWidget: storeData?.whatsappWidget ?? settings.whatsappWidget ?? {
      active: true,
      number: "",
      message: "¡Hola! 💖 Estoy viendo la tienda y me gustaría recibir asesoría personalizada."
    }
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  // Carga los datos apenas reconoce qué tienda es
  useEffect(() => {
    if (storeData) {
      setForm((prev) => ({
        ...prev,
        storeName: storeData.nombre || prev.storeName,
        primaryColor: storeData.primaryColor || prev.primaryColor,
        exchangeRate: storeData.exchangeRate || prev.exchangeRate,
        quickButtons: storeData.quickButtons || prev.quickButtons,
        socialLinks: storeData.socialLinks || prev.socialLinks,
        customIcons: storeData.customIcons || prev.customIcons,
        shippingLogos: storeData.shippingLogos || prev.shippingLogos,
        appLogos: storeData.appLogos || prev.appLogos, // 🌟 AGREGADO
        whatsappWidget: storeData.whatsappWidget || prev.whatsappWidget,
        verification: { ...prev.verification, ...storeData.verification },
      }));
    }
  }, [storeData]);

  const updateButton = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      quickButtons: prev.quickButtons.map(b => b.id === id ? { ...b, [field]: value } : b)
    }));
  };

  const handleUpload = async (e, type, category) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(type);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "tienda_maquillaje"); 
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dp3abweme/image/upload", { method: "POST", body: formData });
      const data = await res.json();
      setForm(prev => ({ ...prev, [category]: { ...prev[category], [type]: data.secure_url } }));
      toast.success("Logo subido con éxito");
    } catch {
      toast.error("Error al subir");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!storeData?.id) {
      toast.error("Error: No se detectó a qué tienda perteneces");
      return;
    }
    setSaving(true);
    try {
      let newStatus = form.verification.status;
      const hasAllFields = form.verification.cedula && form.verification.registroComercio && form.verification.youtubeLink;
      
      if (hasAllFields && newStatus === "none") {
        newStatus = "pending";
      }

      // 🌟 MAGIA: Construimos el paquete de datos solo para ESTA tienda
      const storeUpdates = {
        nombre: form.storeName,
        primaryColor: form.primaryColor,
        exchangeRate: parseFloat(form.exchangeRate) || 0,
        quickButtons: form.quickButtons,
        socialLinks: form.socialLinks,
        customIcons: form.customIcons,
        shippingLogos: form.shippingLogos,
        appLogos: form.appLogos, // 🌟 AGREGADO
        whatsappWidget: form.whatsappWidget,
        verification: {
          ...form.verification,
          status: newStatus
        }
      };

      // 🌟 MAGIA: Guardamos en stores/oscar (por ejemplo)
      await setDoc(doc(db, "stores", storeData.id), storeUpdates, { merge: true });

      toast.success("Ajustes de tu tienda guardados ✅");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24 space-y-8 max-w-md mx-auto p-4">

      {/* DATOS DEL NEGOCIO */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Datos de Tu Negocio</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Nombre de la Tienda</label>
            <input 
              type="text" 
              value={form.storeName} 
              onChange={(e) => setForm({...form, storeName: e.target.value})} 
              placeholder="Ej: Tienda Oscar" 
              className="w-full bg-pink-50/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-pink-400 font-bold text-gray-800 transition-all" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Color Principal de la Tienda</label>
            <div className="flex items-center gap-4 bg-gray-50/50 border border-gray-100 rounded-2xl p-2 transition-all hover:bg-white">
              <input 
                type="color" 
                value={form.primaryColor} 
                onChange={(e) => setForm({...form, primaryColor: e.target.value})} 
                className="w-12 h-12 rounded-xl cursor-pointer border-none outline-none bg-transparent"
              />
              <div>
                <span className="text-xs font-black text-gray-700 uppercase tracking-widest">{form.primaryColor}</span>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Cambia botones y acentos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SOLICITUD DE VERIFICACIÓN */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Verificación</h3>
          
          {form.verification.status === "verified" ? (
            <span className="bg-blue-100 text-blue-600 text-[9px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1">
              Verificado
            </span>
          ) : form.verification.status === "pending" ? (
            <span className="bg-yellow-100 text-yellow-600 text-[9px] font-black px-3 py-1 rounded-full uppercase">En Revisión</span>
          ) : (
            <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-3 py-1 rounded-full uppercase">No Solicitado</span>
          )}
        </div>

        {form.verification.status === "verified" ? (
          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 text-sm text-blue-800 font-medium">
            ¡Felicidades! Tu tienda ha sido verificada. La placa de confianza ya es visible.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-2">Cédula de Identidad / RIF</label>
              <input 
                type="text" 
                value={form.verification.cedula} 
                onChange={(e) => setForm({...form, verification: {...form.verification, cedula: e.target.value}})}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-2">Registro de Comercio (Nº)</label>
              <input 
                type="text" 
                value={form.verification.registroComercio} 
                onChange={(e) => setForm({...form, verification: {...form.verification, registroComercio: e.target.value}})}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-2">Link de Video (YouTube)</label>
              <input 
                type="url" 
                value={form.verification.youtubeLink} 
                onChange={(e) => setForm({...form, verification: {...form.verification, youtubeLink: e.target.value}})}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* FINANZAS */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Finanzas</h3>
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">Tasa de Cambio (Bs. por $1)</label>
          <input 
            type="number" 
            step="0.01" 
            value={form.exchangeRate} 
            onChange={(e) => setForm({...form, exchangeRate: e.target.value})} 
            className="w-full bg-pink-50 border border-pink-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-pink-400 font-bold text-pink-600" 
          />
        </div>
      </div>

      {/* MÓDULO ASESORÍA WHATSAPP VIP */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">WhatsApp VIP</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={form.whatsappWidget.active} onChange={(e) => setForm({...form, whatsappWidget: {...form.whatsappWidget, active: e.target.checked}})} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
          </label>
        </div>
        
        {form.whatsappWidget.active && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Tu Número (Ej: 584141234567)</label>
              <input type="text" value={form.whatsappWidget.number} onChange={(e) => setForm({...form, whatsappWidget: {...form.whatsappWidget, number: e.target.value}})} placeholder="58..." className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none border border-gray-100 focus:border-pink-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Mensaje Pre-escrito</label>
              <textarea value={form.whatsappWidget.message} onChange={(e) => setForm({...form, whatsappWidget: {...form.whatsappWidget, message: e.target.value}})} rows={3} className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none border border-gray-100 focus:border-pink-300 resize-none" />
            </div>
          </div>
        )}
      </div>
      
      {/* BOTONES VIP */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Botones de Categoría</h3>
        <div className="space-y-4">
          {form.quickButtons.map((btn) => (
            <div key={btn.id} className="flex gap-3 bg-gray-50/50 p-3 rounded-3xl border border-gray-100">
              <input value={btn.icon} onChange={(e) => updateButton(btn.id, 'icon', e.target.value)} className="w-14 text-2xl text-center bg-white rounded-2xl shadow-sm outline-none" />
              <input value={btn.label} onChange={(e) => updateButton(btn.id, 'label', e.target.value)} className="flex-1 bg-transparent px-2 text-sm font-bold text-gray-800 outline-none uppercase tracking-wider" />
            </div>
          ))}
        </div>
      </div>

      {/* MEDIA Y REDES */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-8">
        <div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Iconos Redes Sociales</h3>
          <div className="grid grid-cols-3 gap-3">
            {['whatsapp', 'instagram', 'tiktok'].map((social) => (
              <label key={social} className="group flex flex-col items-center gap-3 cursor-pointer bg-gray-50/50 p-3 rounded-3xl border border-gray-100 hover:bg-pink-50/30 transition-all">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                  {form.customIcons[social] ? <img src={form.customIcons[social]} className="w-full h-full object-contain" /> : <span className="text-xl">📸</span>}
                </div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{uploading === social ? "..." : social}</span>
                <input type="file" className="hidden" onChange={(e) => handleUpload(e, social, 'customIcons')} />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ENLACES Y DATOS BÁSICOS */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Enlaces de Tus Redes</h3>
        <input type="text" value={form.socialLinks.whatsapp} onChange={(e) => setForm({...form, socialLinks: {...form.socialLinks, whatsapp: e.target.value}})} placeholder="Link WhatsApp (wa.me/...)" className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none" />
        <input type="text" value={form.socialLinks.instagram} onChange={(e) => setForm({...form, socialLinks: {...form.socialLinks, instagram: e.target.value}})} placeholder="Link Instagram" className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none" />
        <input type="text" value={form.socialLinks.tiktok} onChange={(e) => setForm({...form, socialLinks: {...form.socialLinks, tiktok: e.target.value}})} placeholder="Link TikTok" className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none" />
      </div>

      {/* 🌟 NUEVO: AGENCIAS DE ENVÍO */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Logos de Agencias de Envío</h3>
        <div className="grid grid-cols-3 gap-3">
          {['mrw', 'tealca', 'zoom'].map((agency) => (
            <label key={agency} className="group flex flex-col items-center gap-3 cursor-pointer bg-gray-50/50 p-3 rounded-3xl border border-gray-100 hover:bg-pink-50/30 transition-all">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-110 transition-transform p-2">
                {form.shippingLogos?.[agency] ? <img src={form.shippingLogos[agency]} className="w-full h-full object-contain" /> : <span className="text-xl opacity-30">🚚</span>}
              </div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{uploading === agency ? "..." : agency}</span>
              <input type="file" className="hidden" onChange={(e) => handleUpload(e, agency, 'shippingLogos')} />
            </label>
          ))}
        </div>
      </div>

      {/* 🌟 NUEVO: LOGOS DE LA APLICACIÓN INSTALABLE (PWA) */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Logos de la App (Instalable)</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">Sube el ícono de tu tienda para cuando tus clientes la instalen en su celular.</p>
        <div className="grid grid-cols-2 gap-4">
          
          <label className="group flex flex-col items-center gap-3 cursor-pointer bg-gray-50/50 p-4 rounded-3xl border border-gray-100 hover:bg-pink-50/30 transition-all">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform p-1">
              {form.appLogos?.icon192 ? <img src={form.appLogos.icon192} className="w-full h-full object-cover rounded-xl" /> : <span className="text-2xl opacity-30">📱</span>}
            </div>
            <div className="text-center">
              <span className="block text-[10px] font-black text-gray-600 uppercase">Ícono Pequeño</span>
              <span className="block text-[9px] text-gray-400">(Recomendado 192x192)</span>
            </div>
            <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'icon192', 'appLogos')} />
          </label>

          <label className="group flex flex-col items-center gap-3 cursor-pointer bg-gray-50/50 p-4 rounded-3xl border border-gray-100 hover:bg-pink-50/30 transition-all">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform p-1">
              {form.appLogos?.icon512 ? <img src={form.appLogos.icon512} className="w-full h-full object-cover rounded-xl" /> : <span className="text-2xl opacity-30">📲</span>}
            </div>
            <div className="text-center">
              <span className="block text-[10px] font-black text-gray-600 uppercase">Ícono Grande</span>
              <span className="block text-[9px] text-gray-400">(Recomendado 512x512)</span>
            </div>
            <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'icon512', 'appLogos')} />
          </label>

        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full py-5 rounded-[2rem] text-white font-black uppercase tracking-[0.3em] shadow-[0_10px_40px_rgba(236,72,153,0.3)] hover:scale-[1.02] active:scale-95 transition-all" style={{ background: form.primaryColor || '#ec4899' }}>
        {saving ? "Procesando..." : "Guardar Ajustes"}
      </button>
    </div>
  );
}