import { useApp } from "../../context/AppContext";

export default function QuickButtons({ onFilter, activeFilter = "all", compact = false }) {
  const { settings, storeData } = useApp();
  
  const defaultButtons = [
    { id: 'cat', label: 'Catálogo', icon: '🛍️', filter: 'all' },
    { id: 'ofertas', label: 'Ofertas', icon: '🔥', filter: 'ofertas' },
    { id: 'top', label: 'Top Ventas', icon: '🏆', filter: 'top' },
    { id: 'new', label: 'Lo Último', icon: '✨', filter: 'new' }
  ];

  const currentButtons = storeData?.quickButtons || settings?.quickButtons;
  const savedButtons = Array.isArray(currentButtons) ? currentButtons.filter(Boolean) : [];
  
  const isValid = savedButtons.some(b => b?.filter === 'top') && savedButtons.some(b => b?.filter === 'new');
  const buttons = isValid ? savedButtons : defaultButtons;
  const primaryColor = storeData?.primaryColor || settings?.primaryColor || "#ec4899";

  return (
    <div className={`flex flex-col gap-1.5 w-full ${compact ? "" : "max-w-md mx-auto px-4 pb-3"}`}>
      {buttons.map((btn) => {
        const isActive = activeFilter === btn.filter;
        return (
          <button
            key={btn.id}
            type="button"
            onClick={() => onFilter && onFilter(btn.filter)}
            className={`group relative w-full flex items-center justify-between px-3.5 py-2 rounded-xl border transition-all duration-200 active:scale-[0.98] overflow-hidden ${
              isActive
                ? "bg-gray-950 text-white border-gray-950 shadow-[0_6px_16px_rgba(0,0,0,0.12)]"
                : "bg-white/95 hover:bg-pink-50/50 text-gray-700 hover:text-gray-950 border-gray-100 hover:border-pink-200 shadow-[0_2px_8px_rgba(0,0,0,0.025)]"
            }`}
          >
            {/* Acento lateral elegante */}
            <span
              className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full transition-opacity duration-200 ${
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
              }`}
              style={{ backgroundColor: primaryColor }}
            />

            <div className="flex items-center gap-2.5 min-w-0 pl-0.5">
              <span className="text-sm sm:text-base leading-none shrink-0 transform group-hover:scale-110 transition-transform duration-200">
                {btn.icon}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-black uppercase tracking-[0.16em] truncate transition-colors ${
                  isActive ? "text-white" : "text-gray-700 group-hover:text-pink-600"
                }`}
              >
                {btn.label}
              </span>
            </div>

            <span
              className={`text-xs font-black transition-all duration-200 shrink-0 ${
                isActive
                  ? "text-pink-400 translate-x-0"
                  : "text-gray-300 group-hover:text-pink-500 group-hover:translate-x-0.5"
              }`}
            >
              ›
            </span>
          </button>
        );
      })}
    </div>
  );
}