import { useState } from "react";
import { Link } from "react-router-dom";

const DISMISS_STORAGE_KEY = "create_store_ribbon_dismissed";

export default function CreateStoreRibbon() {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_STORAGE_KEY) !== "1";
    } catch (e) {
      return true;
    }
  });

  if (!isVisible) return null;

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(false);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
    } catch (err) {}
  };

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[35] flex flex-col items-start select-none pointer-events-none">
      {/* Botón "X" para cerrar la franja */}
      <button
        type="button"
        onClick={handleClose}
        title="Cerrar aviso"
        aria-label="Cerrar franja de crear tienda gratis"
        className="pointer-events-auto mb-1.5 ml-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#14091d]/90 hover:bg-pink-600 text-pink-200 hover:text-white border border-pink-400/45 shadow-[0_4px_14px_rgba(0,0,0,0.3)] backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
      >
        <svg
          className="w-3 h-3 sm:w-3.5 sm:h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.75}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <Link
        to="/registro-vendedor"
        aria-label="¡Crea tu tienda virtual gratis!"
        title="¡Crea tu tienda virtual gratis!"
        className="group relative flex items-center pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded-r-[20px]"
      >
        {/* Aura luminosa pulsante proyectada hacia el interior */}
        <span
          aria-hidden="true"
          className="create-store-ribbon-aura absolute -inset-y-2 left-0 -right-2.5 rounded-r-[28px] bg-gradient-to-b from-amber-400/55 via-pink-500/75 to-fuchsia-600/65 blur-lg pointer-events-none"
        />

        {/* Marco exterior prismático animado (pegado al borde izquierdo) */}
        <div className="create-store-ribbon-border relative p-[1.5px] pl-0 rounded-r-[18px] sm:rounded-r-[22px] shadow-[6px_12px_32px_rgba(236,72,153,0.38),0_4px_14px_rgba(0,0,0,0.28)] transition-all duration-300 ease-out md:group-hover:pl-1 group-active:scale-[0.97] origin-left">
          {/* Cuerpo principal tipo columna obsidian-lujo con parpadeo luminoso */}
          <div className="relative overflow-hidden rounded-r-[16.5px] sm:rounded-r-[20.5px] bg-gradient-to-b from-[#13081c] via-[#1c0926] to-[#0b0612] w-[32px] sm:w-[40px] py-3 sm:py-4 flex flex-col items-center justify-between gap-2.5 sm:gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_-1px_0_0_rgba(255,255,255,0.12)]">
            {/* Capa de parpadeo vibrante sincronizada */}
            <span
              aria-hidden="true"
              className="create-store-ribbon-flash absolute inset-0 bg-gradient-to-b from-amber-400/35 via-pink-500/75 to-fuchsia-600/55 pointer-events-none"
            />

            {/* Destello especular deslizante a lo largo de toda la columna */}
            <span
              aria-hidden="true"
              className="create-store-ribbon-shimmer absolute inset-0 pointer-events-none flex items-center"
            >
              <span className="w-full h-24 -skew-y-12 bg-gradient-to-b from-transparent via-white/45 to-transparent blur-[2px]" />
            </span>

            {/* Indicador superior brillante + ícono de destello */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-90" />
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-gradient-to-tr from-amber-300 to-yellow-100 shadow-[0_0_10px_rgba(253,224,71,0.95)]" />
              </span>

              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
              </svg>
            </div>

            {/* Texto vertical principal (lee de abajo hacia arriba con badge GRATIS! parpadeando) */}
            <div
              className="relative z-10 flex items-center justify-center gap-2 sm:gap-2.5"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.19em] text-white whitespace-nowrap drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                Crea tu tienda virtual
              </span>

              <span className="create-store-badge-blink inline-flex items-center justify-center py-2 sm:py-2.5 px-1 sm:px-1.5 rounded-full bg-gradient-to-b from-amber-300 via-yellow-300 to-pink-300 text-[#120618] text-[8.5px] sm:text-[10px] font-black uppercase tracking-[0.14em] leading-none whitespace-nowrap">
                ¡GRATIS!
              </span>
            </div>

            {/* Flecha inferior animada */}
            <div className="relative z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/20 transition-colors">
              <svg
                className="create-store-arrow-nudge w-3 h-3 sm:w-3.5 sm:h-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.75}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Tarjeta flotante pro al pasar el mouse (solo escritorio/tablet, sin ocupar área clicable) */}
        <div
          aria-hidden="true"
          className="hidden md:flex flex-col justify-center absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-4 py-3 rounded-2xl bg-[#110818]/92 backdrop-blur-xl border border-pink-400/35 shadow-[0_18px_40px_rgba(17,8,24,0.45),0_0_24px_rgba(236,72,153,0.22)] opacity-0 -translate-x-3 pointer-events-none transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 min-w-[210px]"
        >
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-300 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            100% Gratis · Sin mensualidad
          </span>
          <span className="text-xs font-black text-white tracking-tight leading-snug">
            ¡Crea tu tienda virtual gratis!
          </span>
          <span className="text-[10px] font-semibold text-pink-200/80 mt-0.5 flex items-center gap-1">
            Regístrate en 1 minuto y vende hoy
            <span className="text-amber-300 font-black">→</span>
          </span>
        </div>
      </Link>
    </div>
  );
}
