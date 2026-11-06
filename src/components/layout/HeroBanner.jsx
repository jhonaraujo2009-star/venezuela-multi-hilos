import { useApp } from "../../context/AppContext";
import { normalizeImageUrl } from "../../utils/imageNormalizer";
import VerifiedBadge from "../shared/VerifiedBadge";
import QuickButtons from "./QuickButtons";

export default function HeroBanner({ activeFilter, onFilter }) {
  const { settings, storeData } = useApp();

  const rawProfileImage = storeData?.profileImage || settings.profileImage;
  const profileImage = normalizeImageUrl(rawProfileImage);
  const rawTitle = storeData?.nombre || storeData?.heroTitle || settings.heroTitle || "Mi Tienda";
  const heroTitle = rawTitle.length > 30 ? rawTitle.substring(0, 30) + "..." : rawTitle;
  const heroDescription = storeData?.heroDescription || settings.heroDescription;
  
  const primaryColor = storeData?.primaryColor || settings.primaryColor || "#ec4899";
  const isVerified = storeData?.verification?.status === "verified";

  return (
    <section className="w-full bg-transparent pt-3 pb-1 px-3 sm:px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-br from-white via-white to-pink-50/30 rounded-[2rem] p-3.5 sm:p-4 border border-gray-100/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
          
          {/* FILA PRINCIPAL: LOGO A LA IZQUIERDA PEGADO + NOMBRE Y BOTONES EN COLUMNA A LA DERECHA */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            
            {/* COLUMNA IZQUIERDA: LOGO PEQUEÑO Y ELEGANTE + ESTADO DE VERIFICACIÓN */}
            <div className="shrink-0 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                {/* Aura luminosa sutil */}
                <div 
                  className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full blur-[20px] opacity-30"
                  style={{ backgroundColor: primaryColor }}
                />
                
                {/* Contenedor circular del logo */}
                <div 
                  onClick={() => onFilter && onFilter("all")}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-white shadow-[0_10px_25px_-6px_rgba(0,0,0,0.18)] ring-1 ring-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer group"
                >
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={heroTitle} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                    />
                  ) : (
                    <span className="text-3xl opacity-25">📸</span>
                  )}
                </div>
              </div>

              {/* Placa de verificación debajo del logo para equilibrio visual */}
              <div className="mt-2 flex items-center justify-center">
                {isVerified ? (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50/90 border border-blue-100 text-[8px] font-black text-blue-600 uppercase tracking-wider shadow-2xs">
                    <VerifiedBadge variant="shield" size="xs" />
                    <span>Verificada</span>
                  </div>
                ) : (
                  <div className="px-2 py-0.5 text-[7px] font-black bg-gray-50 text-gray-400 rounded-full border border-gray-200/60 flex items-center gap-1 tracking-widest uppercase">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gray-400"></span>
                    </span>
                    No Verificado
                  </div>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: NOMBRE DE TIENDA Y BOTONES UNO DEBAJO DEL OTRO */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              
              {/* Nombre de la Tienda (Ej: Bisutería Jhon) */}
              <div className="mb-2 pl-0.5">
                <h1 
                  className="text-sm sm:text-base font-black tracking-tight uppercase leading-tight flex items-center gap-1 truncate"
                  style={{ color: primaryColor }}
                  title={rawTitle}
                >
                  <span className="text-xs shrink-0">✨</span>
                  <span className="truncate">{heroTitle}</span>
                </h1>
              </div>

              {/* Catálogo, Ofertas, Top Ventas y Lo Último uno debajo del otro */}
              <QuickButtons onFilter={onFilter} activeFilter={activeFilter} compact />
            </div>

          </div>

          {/* Descripción breve de bienvenida (solo en vista principal si existe) */}
          {activeFilter === "all" && heroDescription && (
            <p className="mt-2.5 pt-2 border-t border-gray-100/80 text-[11px] sm:text-xs text-gray-500 leading-snug font-medium line-clamp-2 text-center">
              {heroDescription}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}