import React from 'react';

/**
 * 🌟 VerifiedBadge - Insignia de Verificación de Élite
 * 
 * Variantes disponibles:
 * - 'starburst': (Recomendado) Roseta clásica de 12 puntas estilo Instagram/Twitter/Meta Verified.
 * - 'shield': Escudo heráldico de seguridad comercial y confianza (estilo MercadoLíder Platinum).
 * - 'pill': Pastilla flotante con texto "OFICIAL ✓" de alta visibilidad.
 * - 'gold': Roseta dorada metálica para tiendas VIP / Platinum.
 * 
 * Tamaños: 'xs', 'sm', 'md', 'lg'
 */
export default function VerifiedBadge({ 
  variant = 'starburst', 
  size = 'sm', 
  className = '', 
  showTooltip = true,
  tooltipText = "Tienda Verificada Oficial" 
}) {
  const sizeMap = {
    xs: { icon: "w-3.5 h-3.5", pill: "text-[9px] px-1.5 py-0.5 gap-1" },
    sm: { icon: "w-4 h-4", pill: "text-[10px] px-2 py-0.5 gap-1.5" },
    md: { icon: "w-5 h-5", pill: "text-xs px-2.5 py-1 gap-1.5" },
    lg: { icon: "w-6 h-6", pill: "text-sm px-3 py-1 gap-2" },
  };

  const currentSize = sizeMap[size] || sizeMap.sm;

  // 1. Roseta Starburst (Meta / Twitter 12-point scallop)
  if (variant === 'starburst') {
    return (
      <span 
        className={`inline-flex items-center justify-center shrink-0 relative group cursor-pointer ${className}`}
        title={showTooltip ? tooltipText : undefined}
      >
        <svg 
          className={`${currentSize.icon} drop-shadow-[0_1px_3px_rgba(37,99,235,0.35)] transition-transform duration-200 group-hover:scale-110`} 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <defs>
            <linearGradient id="verified_blue_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          {/* Roseta de 12 puntas suave */}
          <path 
            d="M12 1.5l1.6 2.3 2.7-.6 1 2.6 2.8.5.2 2.8 2.3 1.6-1 2.6 1.6 2.3-2.1 1.9.2 2.8-2.7.9-.7 2.7-2.8-.2-1.7 2.2-2.3-1.6-2.3 1.6-1.7-2.2-2.8.2-.7-2.7-2.7-.9.2-2.8-2.1-1.9 1.6-2.3-1-2.6 2.3-1.6.2-2.8 2.8-.5 1-2.6 2.7.6L12 1.5z" 
            fill="url(#verified_blue_grad)" 
          />
          {/* Checkmark blanco puro con sombra interna */}
          <path 
            d="M7.7 12.3l3 3 5.8-6.1" 
            stroke="#ffffff" 
            strokeWidth="2.3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </span>
    );
  }

  // 2. Escudo de Confianza / Seguridad Comercial (Shield)
  if (variant === 'shield') {
    return (
      <span 
        className={`inline-flex items-center justify-center shrink-0 relative group cursor-pointer ${className}`}
        title={showTooltip ? tooltipText : undefined}
      >
        <svg 
          className={`${currentSize.icon} drop-shadow-[0_1px_3px_rgba(14,165,233,0.4)] transition-transform duration-200 group-hover:scale-110`} 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <defs>
            <linearGradient id="verified_shield_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <path 
            d="M12 2L4 5.5v6.2c0 5.4 3.4 10.4 8 11.8 4.6-1.4 8-6.4 8-11.8V5.5L12 2z" 
            fill="url(#verified_shield_grad)" 
          />
          <path 
            d="M8.5 12l2.5 2.5 5-5" 
            stroke="#ffffff" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </span>
    );
  }

  // 3. Insignia Dorada VIP / Luxury Gold
  if (variant === 'gold') {
    return (
      <span 
        className={`inline-flex items-center justify-center shrink-0 relative group cursor-pointer ${className}`}
        title={showTooltip ? "Tienda Oficial VIP Verificada" : undefined}
      >
        <svg 
          className={`${currentSize.icon} drop-shadow-[0_1px_4px_rgba(245,158,11,0.5)] transition-transform duration-200 group-hover:scale-110`} 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <defs>
            <linearGradient id="verified_gold_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <path 
            d="M12 1.5l1.6 2.3 2.7-.6 1 2.6 2.8.5.2 2.8 2.3 1.6-1 2.6 1.6 2.3-2.1 1.9.2 2.8-2.7.9-.7 2.7-2.8-.2-1.7 2.2-2.3-1.6-2.3 1.6-1.7-2.2-2.8.2-.7-2.7-2.7-.9.2-2.8-2.1-1.9 1.6-2.3-1-2.6 2.3-1.6.2-2.8 2.8-.5 1-2.6 2.7.6L12 1.5z" 
            fill="url(#verified_gold_grad)" 
          />
          <path 
            d="M7.7 12.3l3 3 5.8-6.1" 
            stroke="#ffffff" 
            strokeWidth="2.3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </span>
    );
  }

  // 4. Pastilla Flotante "OFICIAL ✓" (Pill Badge)
  return (
    <span 
      className={`inline-flex items-center font-black tracking-wider uppercase rounded-full bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-indigo-500/10 text-blue-600 border border-blue-400/30 shadow-xs ${currentSize.pill} ${className}`}
      title={showTooltip ? tooltipText : undefined}
    >
      <svg className="w-3 h-3 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span>Oficial</span>
    </span>
  );
}
