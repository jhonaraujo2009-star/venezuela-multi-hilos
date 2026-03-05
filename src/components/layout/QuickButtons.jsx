import { useApp } from "../../context/AppContext";

export default function QuickButtons({ onFilter }) {
  const { settings } = useApp();
  
  // ESTRUCTURA MAESTRA DE ALTA GAMA
  const defaultButtons = [
    { id: 'cat', label: 'Catálogo', icon: '🛍️', filter: 'all' },
    { id: 'ofertas', label: 'Ofertas', icon: '🔥', filter: 'ofertas' },
    { id: 'top', label: 'Top Ventas', icon: '🏆', filter: 'top' },
    { id: 'new', label: 'Lo Último', icon: '✨', filter: 'new' }
  ];

  // LÓGICA DE SEGURIDAD: Si la base de datos falla o le faltan botones, fuerza la estructura maestra.
  const savedButtons = Array.isArray(settings?.quickButtons) ? settings.quickButtons : [];
  const isValid = savedButtons.some(b => b.filter === 'top') && savedButtons.some(b => b.filter === 'new');
  const buttons = isValid ? savedButtons : defaultButtons;

  return (
    <div className="grid grid-cols-4 gap-3 px-4 mb-8">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onFilter(btn.filter)}
          className="group relative flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-2xl border border-white/40 rounded-[2rem] py-4 px-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgb(236,72,153,0.15)] active:scale-90 transition-all duration-500 overflow-hidden"
        >
          {/* Efecto de iluminación de fondo Premium */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 to-purple-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Icono con animación flotante */}
          <span className="text-3xl relative z-10 transform group-hover:-translate-y-1.5 transition-transform duration-500 drop-shadow-sm">
            {btn.icon}
          </span>
          
          {/* Texto de alta legibilidad */}
          <span className="text-[9px] font-black text-gray-800 tracking-[0.15em] text-center uppercase relative z-10">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
}