import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useCart } from "../../context/CartContext";

export default function ProductCard({ product, onClick, rank }) {
  const { bsPrice } = useApp();
  const { addItem, setIsOpen } = useCart();
  const [timeLeft, setTimeLeft] = useState("");

  const getThumbnail = () => {
    if (product.image) return product.image;
    if (product.imageUrl) return product.imageUrl;
    if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) return product.images[0];
    return null;
  };
  const productThumbnail = getThumbnail();

  const totalStock = product.variants?.length
    ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
    : (product.totalStock ?? 0);

  const isSoldOut = totalStock === 0;
  const lowStock = totalStock > 0 && totalStock <= 5;

  // 🌟 LÓGICA DE DESCUENTOS APILADOS (STACKED DISCOUNTS) 🌟
  const rawOldPrice = Number(product.oldPrice) || 0; 
  const rawPrice = Number(product.price) || 0;       
  
  const extraDiscountPerc = Number(product.discount) || Number(product.offerDiscount) || 0; 

  const finalPrice = extraDiscountPerc > 0 
    ? rawPrice - (rawPrice * (extraDiscountPerc / 100)) 
    : rawPrice;

  const displayCrossedPrice = rawOldPrice > rawPrice ? rawOldPrice : (extraDiscountPerc > 0 ? rawPrice : 0);

  // 🌟 CÁLCULO DE ETIQUETAS (BADGES) 🌟
  let baseDiscountPerc = 0;
  if (rawOldPrice > rawPrice) {
    baseDiscountPerc = Math.round(((rawOldPrice - rawPrice) / rawOldPrice) * 100);
  } else if (extraDiscountPerc > 0 && rawOldPrice === 0) {
    baseDiscountPerc = extraDiscountPerc; 
  }

  // 🌟 DETECTIVE DE OFERTAS 🌟
  let endTime = product.parsedOfferEndsAt || 0;
  if (!endTime) {
    if (product.offerEndsAt) {
      endTime = product.offerEndsAt?.toMillis ? product.offerEndsAt.toMillis() : new Date(product.offerEndsAt).getTime();
      if (endTime < 100000) endTime = (product.createdAtMs || Date.now()) + (endTime * 60 * 60 * 1000);
    } else if (product.horas || product.duracion || product.hours) {
      endTime = (product.createdAtMs || Date.now()) + (Number(product.horas || product.duracion || product.hours) * 60 * 60 * 1000);
    }
  }

  const isFlashOffer = endTime > Date.now();
  const hasDiscount = (displayCrossedPrice > finalPrice) || isFlashOffer;

  // RELOJ EN VIVO
  useEffect(() => {
    if (!isFlashOffer || !endTime) return;
    const interval = setInterval(() => {
      const distance = endTime - Date.now();
      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft(""); 
      } else {
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, isFlashOffer]);

  // ------------------------------------------------------------------
  // 🌟 FASE 2: EL CHISMOSO (Rastreador de Origen) 🌟
  // ------------------------------------------------------------------
  // Detectamos si el cliente está viendo este producto en tu página principal (/)
  const isFromSuperAdmin = window.location.pathname === "/";

  // Clonamos el producto con los precios matemáticos y LA ETIQUETA INVISIBLE
  const productWithFinalPrice = {
    ...product,
    price: Number(finalPrice.toFixed(2)),
    oldPrice: displayCrossedPrice,
    // Aquí inyectamos el GPS para cobrar la comisión luego
    _origenVenta: isFromSuperAdmin ? "index_super_admin" : "tienda_directa"
  };
  // ------------------------------------------------------------------

  // 🌟 FUNCIÓN DE AGREGADO RÁPIDO
  const handleDirectAdd = (e) => {
    e.stopPropagation(); // Evitar que se abra la tarjeta
    
    if (productWithFinalPrice.variants && productWithFinalPrice.variants.length > 0) {
      // Si tiene variantes (tallas, colores), forzamos a abrir el modal
      onClick(productWithFinalPrice);
    } else {
      // Si no tiene variantes, lo mandamos directo a la bolsa con animación
      addItem(productWithFinalPrice, null, 1);
      
      // Feedback visual
      const btn = e.currentTarget;
      btn.classList.add("scale-125", "bg-pink-500", "text-white");
      btn.classList.remove("bg-white", "text-gray-900");
      
      setTimeout(() => {
        btn.classList.remove("scale-125", "bg-pink-500", "text-white");
        btn.classList.add("bg-white", "text-gray-900");
        // setIsOpen(true); -> El usuario solicitó NO abrir la bolsa automáticamente.
      }, 400);
    }
  };

  return (
    <button
      onClick={() => !isSoldOut && onClick(productWithFinalPrice)}
      className={`relative text-left bg-white/80 backdrop-blur-sm rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-white w-full group ${isSoldOut ? "opacity-70 cursor-default" : "cursor-pointer"}`}
    >
      {rank && (
        <div className="absolute top-3 right-3 z-30 flex flex-col items-center">
          <div className="relative animate-bounce">
             <span className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg font-black text-xs border-2 ${
               rank === 1 ? "bg-yellow-400 border-yellow-200 text-yellow-900" :
               rank === 2 ? "bg-slate-300 border-slate-100 text-slate-700" :
               rank === 3 ? "bg-orange-400 border-orange-200 text-orange-900" :
               "bg-white border-gray-100 text-gray-400"
             }`}>
               {rank <= 3 ? "🏆" : rank}
             </span>
          </div>
        </div>
      )}

      {/* 🌟 RELOJ FLOTANTE 🌟 */}
      {isFlashOffer && timeLeft && !isSoldOut && (
        <div className="absolute top-3 left-3 z-30 bg-black/80 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl border border-white/20">
          <span className="animate-spin-slow">⏳</span> {timeLeft}
        </div>
      )}

      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50/50">
        {productThumbnail && (
          <img src={productThumbnail} alt={product.name} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" />
        )}

        {!isSoldOut && !isFlashOffer && (
          <div className="absolute top-3 right-3 z-20">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md border ${
              lowStock ? "bg-red-500/95 text-white border-red-400 animate-pulse" : "bg-white/90 text-gray-800 border-white/50"
            }`}>
              <span className={lowStock ? "text-white" : "text-green-500"}>●</span> Quedan {totalStock}
            </span>
          </div>
        )}

        {/* 🌟 ETIQUETAS DE DESCUENTO VIP 🌟 */}
        {hasDiscount && !isSoldOut && (
          <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1 items-end">
            
            {/* Etiqueta Redonda Principal */}
            {baseDiscountPerc > 0 && (
              <div className="bg-red-600 text-white flex flex-col items-center justify-center w-11 h-11 rounded-full shadow-xl border-2 border-white animate-pulse">
                <span className="text-[10px] font-black leading-none">-{baseDiscountPerc}%</span>
                <span className="text-[7px] font-bold uppercase">OFF</span>
              </div>
            )}

            {/* Etiqueta Brillante de Descuento Extra */}
            {extraDiscountPerc > 0 && rawOldPrice > rawPrice && (
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-1 rounded-lg shadow-lg border border-white/50 animate-bounce">
                <span className="text-[9px] font-black leading-none uppercase tracking-wider">-{extraDiscountPerc}% Extra</span>
              </div>
            )}
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-white text-black text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-2xl">Agotado</span>
          </div>
        )}

        {/* 🌟 BOTÓN DE AGREGADO DIRECTO (Aparece en hover) 🌟 */}
        {!isSoldOut && (
          <div 
            onClick={handleDirectAdd}
            className="absolute bottom-3 right-3 z-30 w-10 h-10 bg-white text-gray-900 rounded-full shadow-2xl border border-gray-100 flex items-center justify-center translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95"
            title="Añadir a la bolsa rápido"
          >
            <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {productWithFinalPrice.variants && productWithFinalPrice.variants.length > 0 ? (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /> // Plus
              ) : (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> // Bag
              )}
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 bg-transparent">
        <h3 className="text-[13px] font-bold text-gray-800 leading-tight truncate w-full block mb-1 group-hover:text-pink-600 transition-colors uppercase">
          {product.name}
        </h3>
        
        <div className="flex flex-col">
          {hasDiscount ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-red-600">${finalPrice.toFixed(2)}</span>
                {displayCrossedPrice > 0 && <span className="text-xs font-bold text-gray-400 line-through">${displayCrossedPrice.toFixed(2)}</span>}
              </div>
              <div className="flex items-center gap-1">
                {isFlashOffer ? (
                  <span className="text-[8px] font-black text-white bg-red-600 px-1.5 rounded-sm uppercase tracking-tighter">⚡ Flash</span>
                ) : (
                  <span className="text-[8px] font-black text-white bg-orange-500 px-1.5 rounded-sm uppercase tracking-tighter">🔥 Oferta</span>
                )}
                <span className="text-[9px] text-gray-400 font-bold uppercase">Bs. {bsPrice(finalPrice)}</span>
              </div>
            </div>
          ) : (
            <>
              <span className="text-lg font-black text-gray-900">${finalPrice.toFixed(2)}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase">Bs. {bsPrice(finalPrice)}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}