import { useApp } from "../../context/AppContext";

export default function WhatsAppVIP() {
  const { settings, storeData } = useApp();
  
  // 🌟 MAGIA: Busca el widget de la tienda actual. Si no tiene, usa el global.
  const widget = storeData?.whatsappWidget || settings?.whatsappWidget;

  // Si está apagado o no hay número, el botón se oculta
  if (!widget?.active || !widget?.number) return null;

  const handleChat = () => {
    const text = encodeURIComponent(widget.message || "Hola, necesito asesoría.");
    window.open(`https://wa.me/${widget.number}?text=${text}`, "_blank");
  };

  return (
    <button
      onClick={handleChat}
      className="fixed bottom-48 right-4 z-50 group flex items-center gap-0 bg-white/30 backdrop-blur-3xl rounded-full p-2 hover:pr-6 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 shadow-[0_8px_32px_rgba(236,72,153,0.25)] border border-white/60 animate-float"
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400/20 to-purple-400/20 blur-xl group-hover:scale-150 transition-transform duration-700 -z-10"></div>
      <div className="relative w-12 h-12 bg-gradient-to-tr from-gray-900 to-black text-white rounded-full flex items-center justify-center text-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_5px_15px_rgba(0,0,0,0.3)] transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105">
        <span className="relative z-10 text-2xl drop-shadow-md">💬</span>
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full z-20">
          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></span>
        </span>
      </div>
      <div className="max-w-0 overflow-hidden group-hover:max-w-[130px] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-start justify-center opacity-0 group-hover:opacity-100">
        <span className="pl-3 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950 leading-tight">
          Asesoría VIP
        </span>
        <span className="pl-3 text-[9px] font-bold text-green-600 tracking-widest uppercase mt-0.5 flex items-center gap-1 drop-shadow-sm">
          En línea ahora
        </span>
      </div>
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </button>
  );
}