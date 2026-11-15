import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";

export default function Footer() {
  const { storeData } = useApp();

  const legalText = storeData?.legalText || "Todos los precios están expresados en dólares americanos (USD).";
  const storeName = storeData?.nombre || storeData?.heroTitle || "Tienda Online";

  // 🔒 AISLAMIENTO ESTRICTO DE INQUILINO: Leer redes y teléfono exclusivamente de la tienda actual
  const rawStorePhone =
    storeData?.phone ||
    storeData?.whatsappNumber ||
    storeData?.whatsappWidget?.number ||
    storeData?.telefono ||
    "";
  let formattedStorePhone = String(rawStorePhone || "").replace(/\D/g, "");
  if (formattedStorePhone.startsWith("0")) {
    formattedStorePhone = "58" + formattedStorePhone.slice(1);
  } else if (formattedStorePhone.length === 10 && /^(412|414|424|416|426)/.test(formattedStorePhone)) {
    formattedStorePhone = "58" + formattedStorePhone;
  }
  const dynamicStoreWhatsAppLink =
    storeData?.socialLinks?.whatsapp ||
    (formattedStorePhone.length >= 10 ? `https://wa.me/${formattedStorePhone}` : "#");

  const defaultSocialLinks = {
    whatsapp: dynamicStoreWhatsAppLink,
    instagram: storeData?.socialLinks?.instagram || "#",
    tiktok: storeData?.socialLinks?.tiktok || "#",
  };
  
  const customIcons = storeData?.customIcons || {};

  return (
    <footer className="mt-20 sm:mt-32 pb-12 px-4">
      <div className="max-w-md mx-auto flex flex-col items-center gap-8">
        
        {/* 🌟 REDES SOCIALES (MUDADAS AL FOOTER) */}
        <div className="flex items-center gap-6">
          {['whatsapp', 'instagram', 'tiktok'].map((social) => {
            const link = defaultSocialLinks[social];
            const isUnconfigured = !link || link === "#";

            return (
              <a
                key={social}
                href={link}
                target={isUnconfigured ? "_self" : "_blank"}
                rel="noreferrer"
                onClick={(e) => {
                  if (isUnconfigured) {
                    e.preventDefault();
                    if (social === "whatsapp") {
                      toast.error("Tienda sin contacto configurado");
                    }
                  }
                }}
                className="group flex flex-col items-center gap-2"
              >
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