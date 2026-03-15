import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, increment, setDoc, onSnapshot, collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useApp } from "../../context/AppContext";
import { useCart } from "../../context/CartContext";
import { useBackButton } from "../../hooks/useBackButton";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductModal({ product: initialProduct, onClose }) {
  const { bsPrice, storeData, settings } = useApp();
  const { addItem } = useCart();
  
  const [currentProduct, setCurrentProduct] = useState(initialProduct);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [timeLeft, setTimeLeft] = useState("");

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [direction, setDirection] = useState(0);
  
  // 🌟 NUEVO ESTADO: Para el Acordeón de Descripción
  const [showDescription, setShowDescription] = useState(false);

  // 🌟 ESCUCHANDO BOTÓN ATRÁS DE ANDROID PARA CERRAR EL MODAL
  useBackButton(true, onClose);

  const primaryColor = storeData?.primaryColor || settings?.primaryColor || "#000000";
  const likedKey = `userLikes_${storeData?.id || "global"}`;

  const relatedScrollRef = useRef(null);

  const [hasLiked, setHasLiked] = useState(() => {
    const likedProducts = JSON.parse(localStorage.getItem(likedKey) || "{}");
    return !!likedProducts[currentProduct?.id];
  });

  const [likesCount, setLikesCount] = useState(currentProduct?.likes || 0);
  const [isLiking, setIsLiking] = useState(false);

  const variants = currentProduct?.variants || [];
  const hasVariants = variants.length > 0;
  const availableStock = hasVariants
    ? selectedVariant?.stock ?? 0
    : currentProduct?.totalStock ?? 0;

  const oldPrice = Number(currentProduct?.oldPrice) || 0;
  const currentPrice = Number(currentProduct?.price) || 0;
  const isFlashOffer = currentProduct?.offerEndsAt && currentProduct?.offerEndsAt > Date.now();
  const hasDiscount = (oldPrice > currentPrice) || isFlashOffer;
  
  let discountPercentage = 0;
  if (isFlashOffer && currentProduct?.offerDiscount) {
    discountPercentage = Number(currentProduct.offerDiscount);
  } else if (oldPrice > currentPrice) {
    discountPercentage = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
  }

  // 🌟 TOTAL DINÁMICO PARA EL BOTÓN AGRESIVO
  const totalPrice = (currentPrice * quantity).toFixed(2);

  useEffect(() => {
    if (!currentProduct) return;
    setActiveImage(0);
    setSelectedVariant(null);
    setQuantity(1);
    setDirection(0);
    setShowDescription(false); // Cierra la descripción al cambiar de producto
    const likedProducts = JSON.parse(localStorage.getItem(likedKey) || "{}");
    setHasLiked(!!likedProducts[currentProduct.id]);
    document.getElementById('modalScrollArea')?.scrollTo(0,0);
  }, [currentProduct, likedKey]);

  useEffect(() => {
    if (!currentProduct?.id) return;
    const productRef = doc(db, "products", currentProduct.id);
    const unsubscribe = onSnapshot(productRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.likes !== undefined) setLikesCount(data.likes);
      }
    });
    return () => unsubscribe();
  }, [currentProduct?.id]);

  useEffect(() => {
    if (!isFlashOffer) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = currentProduct.offerEndsAt - now;
      if (distance <= 0) {
        setTimeLeft("Oferta Terminada");
        clearInterval(interval);
      } else {
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isFlashOffer, currentProduct?.offerEndsAt]);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!currentProduct?.sessionId || !storeData?.id) return; 
      try {
        const q = query(
          collection(db, "products"),
          where("storeId", "==", storeData.id),
          where("sessionId", "==", currentProduct.sessionId),
          limit(10)
        );
        const snap = await getDocs(q);
        const related = [];
        snap.docs.forEach(d => {
          if (d.id !== currentProduct.id) related.push({ id: d.id, ...d.data() });
        });
        setRelatedProducts(related); 
      } catch(e) { 
        console.warn("No se pudieron cargar recomendados:", e); 
      }
    };
    fetchRelated();
  }, [currentProduct?.id, currentProduct?.sessionId, storeData?.id]);

  const scrollRelated = (scrollOffset) => {
    if(relatedScrollRef.current){
      relatedScrollRef.current.scrollLeft += scrollOffset;
    }
  };

  const handleLike = async () => {
    if (isLiking || !currentProduct?.id) return;
    setIsLiking(true);

    const likedProducts = JSON.parse(localStorage.getItem(likedKey) || "{}");
    const productRef = doc(db, "products", currentProduct.id);

    if (hasLiked) {
      setHasLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      delete likedProducts[currentProduct.id]; 
      localStorage.setItem(likedKey, JSON.stringify(likedProducts));
      try { await updateDoc(productRef, { likes: increment(-1) }); } catch (error) {}
    } else {
      setHasLiked(true);
      setLikesCount((prev) => prev + 1);
      likedProducts[currentProduct.id] = true; 
      localStorage.setItem(likedKey, JSON.stringify(likedProducts));
      try { await updateDoc(productRef, { likes: increment(1) }); } 
      catch (error) { await setDoc(productRef, { likes: 1 }, { merge: true }); }
    }
    setIsLiking(false);
  };

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) return toast.error("Selecciona una talla primero");
    if (quantity > availableStock) return toast.error("Supera el stock disponible");
    addItem(currentProduct, selectedVariant, quantity);
    toast.success("¡Agregado a tu bolsa! 🛍️");
    onClose();
  };

  const handleShareWhatsApp = () => {
    const text = `¡Mira lo que encontré en ${storeData?.nombre || 'la tienda'}! 😍\n*${currentProduct?.name}* por solo *$${currentPrice}*\n\nMíralo aquí:`;
    const url = window.location.href; 
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!currentProduct) return null;

  const images = currentProduct.images?.length > 0 ? currentProduct.images : (currentProduct.image ? [currentProduct.image] : []);
  const hasMultipleImages = images.length > 1;

  const paginate = (newDirection) => {
    setDirection(newDirection);
    let nextImage = activeImage + newDirection;
    if (nextImage < 0) nextImage = images.length - 1;
    if (nextImage >= images.length) nextImage = 0;
    setActiveImage(nextImage);
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center bg-black/70 backdrop-blur-sm sm:p-4 animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative bg-white w-full h-[100dvh] sm:h-[90vh] sm:max-w-[90%] md:max-w-[80%] lg:max-w-[1000px] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
      >
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-[60] w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-950 shadow-lg hover:bg-white hover:scale-110 transition-all active:scale-95 border border-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div id="modalScrollArea" className="flex-1 overflow-y-auto scrollbar-hide pb-32">
          <div className="flex flex-col md:flex-row">
            
            {/* GALERÍA */}
            <div className="w-full md:w-1/2 md:sticky md:top-0 md:h-fit">
              <div className="relative w-full aspect-[4/5] bg-gray-50 overflow-hidden group border-b border-gray-100 md:border-b-0 md:border-r">
                
                {hasDiscount && discountPercentage > 0 && (
                  <div className="absolute top-6 left-6 z-20 bg-red-500 text-white px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl">
                    -{discountPercentage}% Dto
                  </div>
                )}

                <AnimatePresence initial={false} custom={direction}>
                  {images.length > 0 && (
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
                        if (swipe < -swipeConfidenceThreshold) paginate(1);
                        else if (swipe > swipeConfidenceThreshold) paginate(-1);
                      }}
                      className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
                      alt={currentProduct.name}
                    />
                  )}
                </AnimatePresence>

                {hasMultipleImages && (
                  <>
                    <div className="absolute inset-y-0 left-0 w-1/5 hidden md:flex items-center justify-start pl-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => paginate(-1)} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-950 shadow-xl hover:scale-110 transition-transform">❮</button>
                    </div>
                    <div className="absolute inset-y-0 right-0 w-1/5 hidden md:flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => paginate(1)} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-950 shadow-xl hover:scale-110 transition-transform">❯</button>
                    </div>
                  </>
                )}

                {hasMultipleImages && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
                    {images.map((_, i) => (
                      <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === activeImage ? "w-7 bg-white shadow-lg" : "w-2 bg-white/70"}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* INFO Y FLUJO DE COMPRA */}
            <div className="w-full md:w-1/2">
              
              {isFlashOffer && timeLeft && (
                <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between sticky top-0 md:relative z-30 backdrop-blur-sm">
                  <span className="text-red-600 text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5">
                    <span className="animate-pulse text-lg">⚡</span> ¡Oferta Relámpago!
                  </span>
                  <span className="bg-white text-red-600 font-mono font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm border border-red-100">
                    {timeLeft}
                  </span>
                </div>
              )}

              <div className="p-6 md:p-8">
                
                {/* 1. CABECERA: NOMBRE, PRECIO Y SOCIAL */}
                <div className="flex justify-between items-start gap-5 mb-8">
                  <div className="flex-1">
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-950 leading-tight mb-2 tracking-tighter">
                      {currentProduct.name}
                    </h2>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black" style={{color: "var(--primary)"}}>
                        ${currentPrice}
                      </span>
                      {oldPrice > currentPrice && (
                        <span className="text-base font-medium text-gray-400 line-through">
                          ${oldPrice}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 block">
                      Ref: Bs. {bsPrice(currentPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0 pt-1">
                    <button onClick={handleShareWhatsApp} className="flex flex-col items-center justify-center w-14 h-14 active:scale-90 transition-transform bg-gray-50 hover:bg-green-50 rounded-2xl group border border-gray-100 shadow-inner">
                      <svg className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                      <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase group-hover:text-green-600">Enviar</span>
                    </button>

                    <button onClick={handleLike} disabled={isLiking} className="flex flex-col items-center justify-center w-14 h-14 active:scale-90 transition-transform bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                      <svg className={`w-6 h-6 transition-colors ${hasLiked ? "fill-red-500 text-red-500" : "fill-transparent text-gray-400"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                      <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase">{likesCount}</span>
                    </button>
                  </div>
                </div>

                {/* 🌟 2. EL FLUJO DE ORO: TALLAS INMEDIATAMENTE DESPUÉS DEL PRECIO */}
                {hasVariants && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">Selecciona tu Talla</span>
                      {!selectedVariant && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1.5"><span className="text-xs">⚠️</span> Requerido</span>}
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      {variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        const isOut = v.stock === 0;
                        return (
                          <button
                            key={v.id}
                            onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                            disabled={isOut}
                            className={`relative h-12 px-6 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 overflow-hidden active:scale-95 border-2
                              ${isSelected 
                                ? "text-white shadow-lg shadow-gray-950/10 border-gray-950" 
                                : "bg-white text-gray-800 border-gray-200 hover:border-gray-950 hover:bg-gray-50"}
                              ${isOut ? "opacity-40 cursor-not-allowed border-dashed bg-gray-50" : ""}
                            `}
                            style={{ backgroundColor: isSelected ? (primaryColor || '#000000') : '' }}
                          >
                            {isOut && <div className="absolute inset-0 w-full h-[1px] bg-gray-400 top-1/2 -rotate-12"></div>}
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🌟 CANTIDAD Y STOCK (DENTRO DEL FLUJO DE ORO) */}
                {(selectedVariant || !hasVariants) && availableStock > 0 && (
                  <div className="mb-8 border-b border-gray-100 pb-8">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">Cantidad</span>
                      <div className="flex items-center bg-gray-100 rounded-full p-1.5 border border-gray-200 shadow-inner">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-white hover:shadow-md transition-all active:scale-90">-</button>
                        <span className="w-12 text-center text-base font-black text-gray-950">{quantity}</span>
                        <button onClick={() => setQuantity(Math.min(availableStock, quantity + 1))} className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-white hover:shadow-md transition-all active:scale-90">+</button>
                      </div>
                    </div>
                    <div className="w-full">
                      <p className={`text-[10px] font-bold uppercase tracking-widest text-right transition-colors duration-300 ${availableStock <= 5 ? "text-red-500 animate-pulse" : "text-gray-400"}`}>
                        {availableStock <= 5 ? `⚠️ ¡Corre! Solo quedan ${availableStock} disponibles` : `${availableStock} unidades disponibles`}
                      </p>
                    </div>
                  </div>
                )}

                {/* 🌟 3. DESCRIPCIÓN PREMIUM (ACORDEÓN ELEGANTE) */}
                {currentProduct.description && (
                  <div className="mb-8 bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <button 
                      onClick={() => setShowDescription(!showDescription)}
                      className="w-full flex justify-between items-center text-[12px] font-black uppercase tracking-[0.1em] text-gray-950 group"
                    >
                      <span className="flex items-center gap-2"><span>📝</span> Detalles del Producto</span>
                      <span className="text-xl text-gray-400 group-hover:text-gray-950 transition-colors">
                        {showDescription ? "−" : "+"}
                      </span>
                    </button>
                    
                    <AnimatePresence>
                      {showDescription && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-5 text-[13px] text-gray-600 leading-relaxed font-medium prose prose-sm max-w-none prose-pink" dangerouslySetInnerHTML={{ __html: currentProduct.description }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 4. INSIGNIAS DE CONFIANZA */}
                <div className="mb-10 space-y-4">
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <span className="text-2xl drop-shadow-sm">🚚</span> Envíos rápidos a todo el país
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <span className="text-2xl drop-shadow-sm">💳</span> Pagos Seguros: Zelle • Binance • Bs
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <span className="text-2xl drop-shadow-sm">🛡️</span> Garantía de Satisfacción 100%
                  </div>
                </div>

                {/* 5. PRODUCTOS RECOMENDADOS (UBICADOS AL FINAL PARA NO DISTRAER) */}
                {relatedProducts.length > 0 && (
                  <div className="pt-8 border-t border-gray-100 relative group/related">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-950 mb-5 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><span>🔥</span> También te podría gustar</span>
                      
                      {relatedProducts.length > 3 && (
                        <div className="flex gap-1.5 opacity-0 group-hover/related:opacity-100 transition-opacity hidden md:flex">
                          <button onClick={() => scrollRelated(-300)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-950 shadow hover:bg-gray-100 transition-colors border border-gray-100">❮</button>
                          <button onClick={() => scrollRelated(300)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-950 shadow hover:bg-gray-100 transition-colors border border-gray-100">❯</button>
                        </div>
                      )}
                    </h3>
                    
                    <div 
                      ref={relatedScrollRef}
                      className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 scroll-smooth snap-x snap-mandatory"
                    >
                      {relatedProducts.map(rp => (
                        <button 
                          key={rp.id} 
                          onClick={() => setCurrentProduct(rp)} 
                          className="w-[calc(33.333%-11px)] flex-shrink-0 text-left group active:scale-95 transition-transform snap-start"
                        >
                          <div className="w-full aspect-[4/5] bg-white rounded-2xl mb-2.5 overflow-hidden border border-gray-100 shadow-sm">
                            <img src={rp.images?.[0] || rp.image} alt={rp.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <p className="text-[11px] font-bold text-gray-950 truncate leading-tight group-hover:text-pink-600 transition-colors">{rp.name}</p>
                          <p className="text-[10px] font-black text-gray-500 mt-1">${rp.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* 🌟 6. BOTÓN DE COMPRA AGRESIVO CON TOTAL DINÁMICO */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-15px_30px_rgba(0,0,0,0.08)] z-40">
          <button
            onClick={handleAddToCart}
            disabled={availableStock === 0 || (hasVariants && !selectedVariant)}
            style={{ backgroundColor: availableStock === 0 ? '#e5e7eb' : (primaryColor || '#000000') }}
            className={`w-full py-5 rounded-full text-white text-[13px] font-black uppercase tracking-[0.15em] transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2
              ${availableStock === 0 || (hasVariants && !selectedVariant) ? "text-gray-400 shadow-none cursor-not-allowed" : "hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]"}
            `}
          >
            {availableStock === 0 
              ? "Agotado" 
              : hasVariants && !selectedVariant 
                ? "Selecciona una Talla" 
                : (
                  <>
                    <span>{quantity > 1 ? `Agregar ${quantity} a la Bolsa` : "Agregar a la Bolsa"}</span>
                    <span className="opacity-50 text-[10px]">•</span>
                    <span>${totalPrice}</span>
                  </>
                )}
          </button>
        </div>

      </motion.div>
    </div>
  );
}