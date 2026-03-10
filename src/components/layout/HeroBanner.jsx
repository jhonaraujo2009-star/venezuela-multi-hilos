import { useApp } from "../../context/AppContext";

export default function HeroBanner({ activeFilter }) {
  // 🌟 CAMBIO: Extraemos storeData además de settings
  const { settings, storeData } = useApp();
  const isExpanded = activeFilter === "all";
  
  // 🌟 MAGIA: Leemos los logos de envío de la franquicia, si no hay, usamos los globales
  const shipLogos = storeData?.shippingLogos || settings?.shippingLogos || {};

  // 🌟 MAGIA: Leemos los datos de la franquicia, si no hay, usamos los globales por defecto
  const profileImage = storeData?.profileImage || settings.profileImage;
  const heroTitle = storeData?.heroTitle || settings.heroTitle || "Mi Tienda";
  const heroDescription = storeData?.heroDescription || settings.heroDescription;
  const socialLinks = storeData?.socialLinks || settings.socialLinks || {};
  const customIcons = storeData?.customIcons || settings.customIcons || {};

  return (
    <section 
      className={`w-full overflow-hidden transition-all duration-500 ease-in-out px-4 flex flex-col items-center justify-center 
        ${isExpanded ? "opacity-100 py-8" : "opacity-0 py-0"}`} 
      style={{ maxHeight: isExpanded ? "100vh" : "0px", minHeight: isExpanded ? "40vh" : "0px" }}
    >
      <div className={`flex flex-col items-center justify-center transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0"}`}>
        
        {/* Imagen de Perfil VIP */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100" style={{ borderColor: "var(--primary)" }}>
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">✨</div>
            )}
          </div>
        </div>

        {/* Título y Descripción VIP */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">{heroTitle}</h1>
        <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed">{heroDescription}</p>

        {/* Redes Sociales VIP */}
        <div className="flex items-center gap-5 mt-6">
          {['whatsapp', 'instagram', 'tiktok'].map((social) => (
            socialLinks[social] && (
              <a key={social} href={socialLinks[social]} target="_blank" rel="noreferrer" className="w-10 h-10 transition-transform hover:scale-110">
                {customIcons[social] ? (
                  <img src={customIcons[social]} className="w-full h-full object-contain" alt={social} />
                ) : (
                  <div className="w-full h-full bg-gray-50 rounded-xl flex items-center justify-center text-xl shadow-sm">
                    {social === 'whatsapp' ? '💬' : social === 'instagram' ? '📸' : '🎵'}
                  </div>
                )}
              </a>
            )
          ))}
        </div>

        {/* LOGOS DE LOGÍSTICA / ENVÍOS */}
        <div className="mt-10 pt-6 border-t border-gray-100/50 w-full max-w-xs flex items-center justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
           <img src={shipLogos.mrw || "https://logotipoz.com/wp-content/uploads/2021/10/mrw-logo.png"} className="h-5 object-contain" alt="MRW" />
           <img src={shipLogos.tealca || "https://tealca.com/wp-content/uploads/2020/04/Logo-Tealca.png"} className="h-5 object-contain" alt="Tealca" />
           <img src={shipLogos.zoom || "https://zoom.red/wp-content/uploads/2020/09/logo-zoom.png"} className="h-5 object-contain" alt="Zoom" />
        </div>

      </div>
    </section>
  );
}