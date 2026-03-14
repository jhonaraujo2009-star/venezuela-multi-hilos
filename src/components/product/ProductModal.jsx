import { useState, useEffect } from "react";
import { doc, updateDoc, increment, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useApp } from "../../context/AppContext";
import { useCart } from "../../context/CartContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductModal({ product, onClose }) {
  const { bsPrice, storeData, settings } = useApp();
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [direction, setDirection] = useState(0);

  const primaryColor = storeData?.primaryColor || settings?.primaryColor || "#000000";

  const likedKey = `userLikes_${storeData?.id || "global"}`;

  const [hasLiked, setHasLiked] = useState(() => {
    const likedProducts = JSON.parse(localStorage.getItem(likedKey) || "{}");
    return !!likedProducts[product.id];
  });

  const [likesCount, setLikesCount] = useState(product.likes || 0);
  const [isLiking, setIsLiking] = useState(false);

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const availableStock = hasVariants
    ? selectedVariant?.stock ?? 0
    : product.totalStock ?? 0;

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

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const likedProducts = JSON.parse(localStorage.getItem(likedKey) || "{}");
    const productRef = doc(db, "products", product.id);

    if (hasLiked) {
      setHasLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      delete likedProducts[product.id]; 
      localStorage.setItem(likedKey, JSON.stringify(likedProducts));

      try {
        await updateDoc(productRef, { likes: increment(-1) });
      } catch (error) {
        console.error("Error al quitar like", error);
      }
    } else {
      setHasLiked(true);
      setLikesCount((prev) => prev + 1);
      likedProducts[product.id] = true; 
      localStorage.setItem(likedKey, JSON.stringify(likedProducts));

      try {
        await updateDoc(productRef, { likes: increment(1) });
      } catch (error) {
        await setDoc(productRef, { likes: 1 }, { merge: true });
      }
    }
    setIsLiking(false);
  };

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) return toast.error("Selecciona una talla primero");
    if (quantity > availableStock) return toast.error("Supera el stock disponible");
    addItem(product, selectedVariant, quantity);
    toast.success("¡Agregado a tu bolsa! 🛍️");
    onClose();
  };

  const images = product.images?.length > 0 ? product.images : [product.image];
  const hasMultipleImages = images.length > 1;

  const paginate = (newDirection) => {
    setDirection(newDirection);
    let nextImage = activeImage + newDirection;
    if (nextImage < 0) nextImage = images.length - 1;
    if (nextImage >= images.length) nextImage = 0;
    setActiveImage(nextImage);
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset, velocity) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-white w-full sm:max-w-[460px] rounded-t-[2rem] sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl"
      >
        
        {/* Botón Cerrar: Burbuja Gris Elegante */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] w-9 h-9 bg-black/10 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-sm hover:bg-black/20 hover:scale-110 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          
          {/* GALERÍA EDGE-TO-EDGE CON SWIPE */}
          <div className="relative w-full aspect-[4/5] bg-gray-100 overflow-hidden group">
            
            {hasDiscount && discountPercentage > 0 && (
              <div className="absolute top-4 left-4 z-20 bg-red-500 text-white px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                -{discountPercentage}% Dto
              </div>
            )}

            <AnimatePresence initial={false} custom={direction}>
              <motion.img
                key={activeImage}
                src={images[activeImage]}
                custom={direction}
                initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction < 0 ? 300 : -300, opacity: 0 }}
                transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);
                  if (swipe < -swipeConfidenceThreshold) {
                    paginate(1);
                  } else if (swipe > swipeConfidenceThreshold) {
                    paginate(-1);
                  }
                }}
                className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
                alt={product.name}
              />
            </AnimatePresence>

            {hasMultipleImages && (
              <>
                <div className="absolute inset-y-0 left-0 w-1/5 hidden sm:flex items-center justify-start pl-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => paginate(-1)} className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-black shadow-md hover:scale-110 transition-transform">❮</button>
                </div>
                <div className="absolute inset-y-0 right-0 w-1/5 hidden sm:flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => paginate(1)} className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-black shadow-md hover:scale-110 transition-transform">❯</button>
                </div>
              </>
            )}

            {/* Puntos Dinámicos de Alta Gama */}
            {hasMultipleImages && (
              <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 z-20">
                {images.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeImage ? "w-5 bg-white shadow-md" : "w-1.5 bg-white/60"}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="px-5 pt-6 pb-8">
            <div className="flex justify-between items-start gap-4 mb-3">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-2">
                  {product.name}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-gray-900">
                    ${currentPrice}
                  </span>
                  {oldPrice > currentPrice && (
                    <span className="text-sm font-medium text-gray-400 line-through">
                      ${oldPrice}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">
                  Referencia: Bs. {bsPrice(currentPrice)}
                </span>
              </div>

              {/* Botón Favorito Interactivo */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className="flex flex-col items-center justify-center p-2 active:scale-90 transition-transform bg-gray-50 rounded-2xl"
              >
                <svg className={`w-6 h-6 transition-colors ${hasLiked ? "fill-red-500 text-red-500" : "fill-transparent text-gray-400"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                <span className="text-[10px] font-bold text-gray-500 mt-1">{likesCount}</span>
              </button>
            </div>

            {product.description && (
              <div className="text-[13px] text-gray-600 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: product.description }} />
            )}

            {/* 🌟 SELECTOR DE VARIANTES "PÍLDORA" */}
            {hasVariants && (
              <div className="mb-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">Selecciona tu Talla</span>
                  {!selectedVariant && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse">Requerido</span>}
                </div>
                
                <div className="flex flex-wrap gap-2.5">
                  {variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const isOut = v.stock === 0;
                    return (
                      <button
                        key={v.id}
                        onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                        disabled={isOut}
                        className={`relative h-11 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 overflow-hidden active:scale-95
                          ${isSelected 
                            ? "bg-gray-900 text-white shadow-md border-2 border-gray-900" 
                            : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-900"
                          }
                          ${isOut ? "opacity-40 cursor-not-allowed border-dashed bg-gray-50" : ""}
                        `}
                      >
                        {isOut && <div className="absolute inset-0 w-full h-[1px] bg-gray-400 top-1/2 -rotate-12"></div>}
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 🌟 SELECTOR DE CANTIDAD Y AVISO DE STOCK INTELIGENTE */}
            {(selectedVariant || !hasVariants) && availableStock > 0 && (
              <div className="flex flex-col mb-2 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">Cantidad</span>
                  <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200 shadow-inner">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-white hover:shadow-sm transition-all">-</button>
                    <span className="w-10 text-center text-sm font-black text-gray-900">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(availableStock, quantity + 1))} className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-white hover:shadow-sm transition-all">+</button>
                  </div>
                </div>
                
                {/* 🌟 MAGIA: AVISO VISUAL DEL STOCK EXACTO PARA EL CLIENTE */}
                <p className={`text-[10px] font-bold uppercase tracking-widest text-right mt-2 transition-colors duration-300 ${availableStock <= 5 ? "text-red-500 animate-pulse" : "text-gray-400"}`}>
                  {availableStock <= 5 ? `¡Corre! Solo quedan ${availableStock} disponibles` : `${availableStock} unidades disponibles`}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* BOTÓN DE COMPRA: REDONDEADO Y FLOTANTE */}
        <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-20">
          <button
            onClick={handleAddToCart}
            disabled={availableStock === 0 || (hasVariants && !selectedVariant)}
            style={{ backgroundColor: availableStock === 0 ? '#e5e7eb' : (primaryColor || '#000000') }}
            className={`w-full py-4 rounded-full text-white text-[13px] font-black uppercase tracking-[0.15em] transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.15)]
              ${availableStock === 0 || (hasVariants && !selectedVariant) ? "text-gray-400 shadow-none cursor-not-allowed" : "hover:shadow-[0_12px_25px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"}
            `}
          >
            {availableStock === 0 ? "Agotado" : hasVariants && !selectedVariant ? "Selecciona una Talla" : "Agregar a la Bolsa"}
          </button>
        </div>

      </motion.div>
    </div>
  );
}