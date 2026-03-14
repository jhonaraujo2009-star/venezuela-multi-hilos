import { useApp } from "../../context/AppContext";

export default function QuickButtons({ onFilter }) {
  const { settings, storeData } = useApp();
  
  const defaultButtons = [
    { id: 'cat', label: 'Catálogo', icon: '🛍️', filter: 'all' },
    { id: 'ofertas', label: 'Ofertas', icon: '🔥', filter: 'ofertas' },
    { id: 'top', label: 'Top Ventas', icon: '🏆', filter: 'top' },
    { id: 'new', label: 'Lo Último', icon: '✨', filter: 'new' }
  ];

  const currentButtons = storeData?.quickButtons || settings?.quickButtons;
  const savedButtons = Array.isArray(currentButtons) ? currentButtons : [];
  
  const isValid = savedButtons.some(b => b.filter === 'top') && savedButtons.some(b => b.filter === 'new');
  const buttons = isValid ? savedButtons : defaultButtons;

  return (
    // 🌟 DISEÑO ELEVADO: Margen negativo top (-mt-4) para que "suba" y se pegue al Hero
    <div className="relative z-20 max-w-[800px] mx-auto grid grid-cols-4 gap-2 sm:gap-4 px-4 sm:px-6 -mt-2 sm:-mt-4 pb-10">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onFilter(btn.filter)}
          // 🌟 MAGIA VISUAL: Sombras dinámicas, bordes rosas al hacer hover y efecto de hundimiento al hacer click
          className="group relative flex flex-col items-center justify-center gap-3 bg-white border border-gray-100 rounded-[1.5rem] sm:rounded-[2rem] py-5 sm:py-6 px-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(236,72,153,0.15)] hover:border-pink-200 hover:-translate-y-1.5 active:scale-90 active:bg-pink-50 transition-all duration-300 overflow-hidden"
        >
          {/* 🌟 Efecto Hover Premium (Brillo interno) */}
          <div className="absolute inset-0 bg-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Icono a todo color con animación de salto */}
          <span className="text-2xl sm:text-3xl relative z-10 transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 drop-shadow-sm">
            {btn.icon}
          </span>
          
          {/* Texto Minimalista */}
          <span className="text-[8px] sm:text-[10px] font-black text-gray-500 group-hover:text-pink-600 tracking-[0.15em] sm:tracking-[0.2em] text-center uppercase relative z-10 transition-colors duration-300">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
}