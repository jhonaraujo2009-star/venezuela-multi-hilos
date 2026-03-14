import { useApp } from "../../context/AppContext";

export default function Footer() {
  const { settings, storeData } = useApp();

  const legalText = storeData?.legalText || settings.legalText;
  const storeName = storeData?.heroTitle || settings.heroTitle || "Store";

  // 🌟 LOGOS SALVAVIDAS: Si no ponen link, le ponemos "#" para que el botón SIEMPRE aparezca
  const defaultSocialLinks = {
    whatsapp: storeData?.socialLinks?.whatsapp || settings?.socialLinks?.whatsapp || "#",
    instagram: storeData?.socialLinks?.instagram || settings?.socialLinks?.instagram || "#",
    tiktok: storeData?.socialLinks?.tiktok || settings?.socialLinks?.tiktok || "#",
  };
  
  const customIcons = storeData?.customIcons || settings?.customIcons || {};

  return (
    <footer className="mt-20 sm:mt-32 pb-12 px-4">
      <div className="max-w-md mx-auto flex flex-col items-center gap-8">
        
        {/* 🌟 REDES SOCIALES (MUDADAS AL FOOTER) */}
        <div className="flex items-center gap-6">
          {['whatsapp', 'instagram', 'tiktok'].map((social) => {
            const link = defaultSocialLinks[social];

            return (
              <a key={social} href={link} target={link === "#" ? "_self" : "_blank"} rel="noreferrer" className="group flex flex-col items-center gap-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)] group-hover:border-pink-200 group-hover:bg-white overflow-hidden p-3">
                  {customIcons[social] ? (
                    <img src={customIcons[social]} className="w-full h-full object-contain" alt={social} />
                  ) : (
                    // 🌟 ICONOS PREDETERMINADOS ELEGANTES (Grises que toman color al tocarlos)
                    <img 
                      src={
                        social === 'whatsapp' ? 'https://cdn-icons-png.flaticon.com/512/3670/3670051.png' : 
                        social === 'instagram' ? 'https://cdn-icons-png.flaticon.com/512/1384/1384063.png' : 
                        'https://cdn-icons-png.flaticon.com/512/3046/3046121.png'
                      } 
                      className="w-full h-full object-contain opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" 
                      alt={social} 
                    />
                  )}
                </div>
              </a>
            );
          })}
        </div>

        {/* Separador Elegante */}
        <div className="w-12 h-[2px] bg-gray-200/50 rounded-full" />

        {/* Texto Legal - Alta Gama */}
        {legalText && (
          <p className="text-[10px] sm:text-xs text-gray-400 text-center leading-relaxed tracking-wide font-medium">
            {legalText}
          </p>
        )}

        <div className="flex flex-col items-center gap-1.5 opacity-60">
          <p className="text-[9px] sm:text-[10px] text-gray-500 text-center font-black uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} {storeName}
          </p>
          <p className="text-[8px] sm:text-[9px] text-gray-400 text-center uppercase tracking-[0.3em]">
            Todos los derechos reservados
          </p>
        </div>
        
      </div>
    </footer>
  );
}