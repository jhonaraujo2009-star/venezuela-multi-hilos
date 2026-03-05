import { useState, useEffect } from "react";
import { doc, updateDoc, increment, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useApp } from "../../context/AppContext";
import { useCart } from "../../context/CartContext";
import toast from "react-hot-toast";

export default function ProductModal({ product, onClose }) {
  const { bsPrice } = useApp();
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [hasLiked, setHasLiked] = useState(() => {
    const likedProducts = JSON.parse(localStorage.getItem("userLikes") || "{}");
    return !!likedProducts[product.id];
  });

  const [likesCount, setLikesCount] = useState(product.likes || 0);
  const [isLiking, setIsLiking] = useState(false);

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const availableStock = hasVariants
    ? selectedVariant?.stock ?? 0
    : product.totalStock ?? 0;

  // Lógica de Oferta
  const oldPrice = Number(product.oldPrice) || 0;
  const currentPrice = Number(product.price) || 0;
  const isFlashOffer = product.offerEndsAt && product.offerEndsAt > Date.now();
  const hasDiscount = (oldPrice > currentPrice) || isFlashOffer;
  
  let discountPercentage = 0;
  if (isFlashOffer && product.offerDiscount) {
    discountPercentage = Number(product.offerDiscount);
  } else if (oldPrice > currentPrice) {
    discountPercentage = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
  }

  // Sincronizar likes en vivo
  useEffect(() => {
    const productRef = doc(db, "products", product.id);
    const unsubscribe = onSnapshot(productRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.likes !== undefined) setLikesCount(data.likes);
      }
    });
    return () => unsubscribe();
  }, [product.id]);

  // 🌟 MAGIA: Lógica de doble acción (Poner y Quitar Corazón) 🌟
  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const likedProducts = JSON.parse(localStorage.getItem("userLikes") || "{}");
    const productRef = doc(db, "products", product.id);

    if (hasLiked) {
      // QUITAR EL CORAZÓN
      setHasLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      delete likedProducts[product.id]; // Lo borramos del celular
      localStorage.setItem("userLikes", JSON.stringify(likedProducts));

      try {
        await updateDoc(productRef, { likes: increment(-1) });
      } catch (error) {
        console.error("Error al quitar like", error);
      }
    } else {
      // PONER EL CORAZÓN
      setHasLiked(true);
      setLikesCount((prev) => prev + 1);
      likedProducts[product.id] = true; // Lo guardamos en el celular
      localStorage.setItem("userLikes", JSON.stringify(likedProducts));

      try {
        await updateDoc(productRef, { likes: increment(1) });
      } catch (error) {
        await setDoc(productRef, { likes: 1 }, { merge: true });
      }
    }
    
    setIsLiking(false);
  };

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) return toast.error("Selecciona una talla o medida");
    if (quantity > availableStock) return toast.error("Supera el stock disponible");
    addItem(product, selectedVariant, quantity);
    toast.success("¡Excelente elección! 🛍️");
    onClose();
  };

  // 🌟 LÓGICA DEL ZOOM MAGNÉTICO 🌟
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    e.currentTarget.style.setProperty('--x', `${x}%`);
    e.currentTarget.style.setProperty('--y', `${y}%`);
  };

  const stockPercentage = Math.min((availableStock / (hasVariants ? 50 : 100)) * 100, 100);
  const isLowStock = availableStock > 0 && availableStock <= 5;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/70 backdrop-blur-md sm:p-4 animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/50 backdrop-blur-xl flex items-center justify-center text-gray-900 shadow-xl border border-white/60 hover:bg-white active:scale-90 transition-all text-xl font-bold"
        >
          ✕
        </button>

        <div className="flex-1 overflow-y-auto pb-6">
          
          {/* 🌟 CONTENEDOR DE LA IMAGEN CON ZOOM 🌟 */}
          <div className="relative mx-4 mt-4">
            <div 
              className="relative aspect-[4/5] bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner group cursor-crosshair touch-pan-y"
              onMouseMove={handleMouseMove}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                const x = ((touch.clientX - left) / width) * 100;
                const y = ((touch.clientY - top) / height) * 100;
                e.currentTarget.style.setProperty('--x', `${x}%`);
                e.currentTarget.style.setProperty('--y', `${y}%`);
              }}
            >
              {/* BADGE DE OFERTA EN GRANDE */}
              {hasDiscount && discountPercentage > 0 && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 shadow-2xl pointer-events-none">
                  <span className="text-lg animate-bounce">{isFlashOffer ? "⚡" : "🔥"}</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white leading-none">OFERTA TOP</span>
                    <span className="text-[14px] font-black text-orange-400 leading-none">-{discountPercentage}%</span>
                  </div>
                </div>
              )}

              {product.images?.length > 0 ? (
                <img 
                  src={product.images[activeImage]} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[2] sm:group-hover:scale-[2.5] active:scale-[2] origin-[var(--x,50%)_var(--y,50%)]" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl opacity-50">✨</div>
              )}
            </div>

            {/* 🌟 GALERÍA DE MINIATURAS (THUMBNAILS) VIP 🌟 */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide px-1">
                {product.images.map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveImage(i)} 
                    className={`relative w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 border-2 ${i === activeImage ? "border-pink-500 shadow-lg scale-105" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`Vista ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFORMACIÓN DEL PRODUCTO */}
          <div className="px-6 mt-5 space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-2 uppercase">
                  {product.name}
                </h2>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-3">
                    <span className={`text-3xl font-black ${hasDiscount ? "text-red-600" : "text-gray-950"}`}>
                      ${product.price}
                    </span>
                    {oldPrice > 0 && (
                      <span className="text-lg font-bold text-gray-400 line-through decoration-red-500/50">
                        ${oldPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-400 mt-1 uppercase">
                    Bs. {bsPrice(product.price)}
                  </span>
                </div>
              </div>

              {/* 🌟 BOTÓN DE CORAZÓN CON EFECTO DE QUITAR/PONER 🌟 */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex flex-col items-center justify-center min-w-[60px] p-3 rounded-2xl transition-all duration-500 shadow-sm ${hasLiked ? "bg-pink-50 border border-pink-100" : "bg-white border border-gray-100 active:scale-90"}`}
              >
                <span className={`text-2xl transition-all duration-500 ${hasLiked ? "text-pink-500 scale-110 drop-shadow-md" : "text-gray-300 grayscale"}`}>
                  {hasLiked ? "❤️" : "🤍"}
                </span>
                <span className={`text-[10px] font-black tracking-widest mt-1 ${hasLiked ? "text-pink-500" : "text-gray-400"}`}>
                  {likesCount}
                </span>
              </button>
            </div>

            {product.description && (
              <div className="text-sm text-gray-500 leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl" dangerouslySetInnerHTML={{ __html: product.description }} />
            )}

            {hasVariants && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex justify-between">
                  <span>Selecciona tu talla</span>
                  {!selectedVariant && <span className="text-red-500 animate-pulse">¡Requerido!</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                      disabled={v.stock === 0}
                      className={`px-4 py-2 rounded-xl transition-all flex flex-col items-center border min-w-[70px] ${selectedVariant === v ? "bg-gray-950 text-white border-gray-950 shadow-lg scale-105" : "bg-white text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100"} ${v.stock === 0 ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                    >
                      <span className="text-base font-black uppercase">{v.label}</span>
                      <span className={`text-[10px] font-medium mt-0.5 ${selectedVariant === v ? "text-gray-300" : "text-gray-400"}`}>
                        {v.stock > 0 ? `${v.stock} disp.` : "Agotado"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(selectedVariant || !hasVariants) && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                    <span>Disponibilidad</span>
                    <span className={isLowStock ? "text-red-500 font-black animate-pulse" : "text-green-500"}>
                      {availableStock} en stock
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${isLowStock ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${stockPercentage}%` }} />
                  </div>
                  {isLowStock && availableStock > 0 && <p className="text-[11px] text-red-500 font-black flex items-center gap-1">⚠️ ¡Últimas unidades disponibles!</p>}
                </div>

                {availableStock > 0 && (
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500 pl-2">Cantidad</span>
                    <div className="flex items-center gap-4 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center text-xl font-bold text-gray-600 active:scale-90">-</button>
                      <span className="w-6 text-center font-black text-lg">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(availableStock, quantity + 1))} className="w-8 h-8 flex items-center justify-center text-xl font-bold text-gray-600 active:scale-90">+</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
          <button
            onClick={handleAddToCart}
            disabled={availableStock === 0 || (hasVariants && !selectedVariant)}
            className="w-full py-4 rounded-[1.5rem] text-white font-black uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            style={{ background: availableStock === 0 || (hasVariants && !selectedVariant) ? "#d1d5db" : "var(--primary)" }}
          >
            {availableStock === 0 ? "Agotado" : hasVariants && !selectedVariant ? "Elige una talla" : "Añadir a la Bolsa"}
            {availableStock > 0 && (hasVariants ? selectedVariant : true) && <span className="text-xl animate-bounce">🛍️</span>}
          </button>
        </div>
      </div>
    </div>
  );
}