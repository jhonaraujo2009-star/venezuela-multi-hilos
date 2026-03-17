import { useApp } from "../../context/AppContext";

export default function HeroBanner({ activeFilter }) {
  const { settings, storeData } = useApp();
  const isExpanded = activeFilter === "all";

  const profileImage = storeData?.profileImage || settings.profileImage;
  const heroTitle = storeData?.heroTitle || storeData?.nombre || settings.heroTitle || "Mi Tienda";
  const heroDescription = storeData?.heroDescription || settings.heroDescription;
  
  const primaryColor = storeData?.primaryColor || settings.primaryColor || "#ec4899";
  const isVerified = storeData?.verification?.status === "verified";

  return (
    <section 
      className={`w-full overflow-hidden transition-all duration-700 ease-in-out bg-transparent
        ${isExpanded ? "opacity-100 mb-2" : "opacity-0 mb-0"}`} 
      style={{ maxHeight: isExpanded ? "1000px" : "0px", minHeight: "0px" }}
    >
      <div className={`max-w-[1200px] mx-auto transition-all duration-500 transform ${isExpanded ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"}`}>
        
        <div className="flex flex-col items-center gap-6 px-4 sm:px-6 py-6 sm:py-10">
          
          {/* LOGO GIGANTE Y AURA */}
          <div className="shrink-0 relative z-10 flex items-center justify-center p-2">
            <div 
              className="absolute w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full blur-[30px] opacity-40 translate-y-2"
              style={{ backgroundColor: primaryColor }}
            ></div>
            
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full border-[6px] border-white shadow-[0_15px_35px_-10px_rgba(0,0,0,0.15)] overflow-hidden bg-gray-50 flex items-center justify-center">
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Logo de la Tienda" 
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-1000 ease-out" 
                />
              ) : (
                <span className="text-5xl opacity-20">📸</span>
              )}
            </div>
          </div>

          {/* TEXTO ELEGANTE (SIEMPRE CENTRADO) */}
          <div className="flex-1 min-w-0 text-center flex flex-col justify-center w-full">
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight flex flex-col items-center justify-center gap-2.5 mb-3 w-full">
              <span className="truncate w-full max-w-full text-center">{heroTitle}</span>
              
              {isVerified && (
                <span className="shrink-0 flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs shadow-md shadow-blue-500/20 border-2 border-white mt-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </span>
              )}
            </h1>
            
            <p className="text-sm sm:text-[15px] text-gray-500 leading-relaxed font-medium line-clamp-3 w-full max-w-lg mx-auto break-words">
              {heroDescription || "Explora nuestra colección exclusiva y encuentra los mejores productos seleccionados para ti."}
            </p>

          </div>
        </div>
      </div>
    </section>
  );
}