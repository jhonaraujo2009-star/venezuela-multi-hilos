import { useState } from "react";
import { useApp } from "../../context/AppContext";

export default function WhatsAppVIP() {
  const { settings, storeData } = useApp();
  
  // 🌟 Estado para controlar si el usuario cerró el widget
  const [isVisible, setIsVisible] = useState(true);
  
  const widget = storeData?.whatsappWidget || settings?.whatsappWidget;

  // Si está apagado, no hay número, o el usuario lo cerró, no mostramos nada
  if (!widget?.active || !widget?.number || !isVisible) return null;

  const handleChat = () => {
    const text = encodeURIComponent(widget.message || "Hola, necesito asesoría.");
    window.open(`https://wa.me/${widget.number}?text=${text}`, "_blank");
  };

  return (
    /* 🌟 MAGIA QUIRÚRGICA: Cambiamos 'bottom-6' por 'top-[40%] -translate-y-1/2' 
       Esto lo eleva exactamente al 40% de la pantalla de forma perfecta */
    <div className="fixed top-[40%] -translate-y-1/2 right-4 sm:right-6 z-50 flex flex-col items-end animate-fade-in-up">
      
      {/* 🌟 Botón "X" para cerrar (Estilo Cristal Apple) */}
      <button 
        onClick={() => setIsVisible(false)}
        className="mb-2 bg-white/80 backdrop-blur-md text-gray-400 hover:text-gray-800 rounded-full p-1.5 shadow-sm border border-gray-100/50 transition-all duration-300 hover:scale-110 hover:bg-white"
        title="Ocultar chat"
        aria-label="Cerrar asesoría"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      {/* 🌟 Etiqueta Superior Flotante "Asesoría" */}
      <div className="mr-3 mb-1.5">
        <span className="bg-gradient-to-r from-gray-900 to-black text-transparent bg-clip-text text-[10px] font-black uppercase tracking-[0.3em] drop-shadow-sm">
          Asesoría
        </span>
      </div>

      {/* 🌟 Botón Principal de Chat (Interactivo y Expansible) */}
      <button
        onClick={handleChat}
        className="group relative flex items-center bg-white/40 backdrop-blur-2xl rounded-full p-1.5 pr-2 transition-all duration-500 hover:pr-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white/80 hover:bg-white/70"
      >
        {/* Aura brillante de fondo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400/20 to-emerald-400/20 blur-xl group-hover:blur-2xl transition-all duration-500 -z-10"></div>
        
        {/* Círculo Oscuro con el Icono */}
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-gray-900 to-black text-white rounded-full flex items-center justify-center text-xl shadow-inner transition-transform duration-500 group-hover:scale-105 z-10">
          <span className="relative z-10 text-2xl sm:text-3xl drop-shadow-md">💬</span>
          
          {/* Indicador LED Verde ("En línea") */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 border-[2.5px] border-black rounded-full z-20">
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-80"></span>
          </span>
        </div>
        
        {/* Texto que se revela al pasar el mouse (Hover) */}
        <div className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-500 ease-out flex flex-col items-start justify-center opacity-0 group-hover:opacity-100 z-10">
          <span className="pl-3 text-xs sm:text-sm font-black uppercase tracking-widest text-gray-900 leading-none">
            VIP
          </span>
          <span className="pl-3 text-[9px] sm:text-[10px] font-bold text-green-600 tracking-wider uppercase mt-1 flex items-center gap-1">
            En línea
          </span>
        </div>
      </button>

      {/* Animación de entrada suave */}
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}