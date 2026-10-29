import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, increment, setDoc, onSnapshot, collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useApp } from "../../context/AppContext";
import { useCart } from "../../context/CartContext";
import { useBackButton } from "../../hooks/useBackButton";
import { calculateProductPricing } from "../../utils/pricing";
import { normalizeImageUrl } from "../../utils/imageNormalizer";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductModal({ product, onClose }) {
  const navigate = useNavigate();
  const { bsPrice, storeData, settings } = useApp();
  const { addItem, items } = useCart();
  
  const [currentProduct, setCurrentProduct] = useState(product);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [timeLeft, setTimeLeft] = useState("");

  const [activeImage, setActiveImage] = useState(() => {
    return Number(product?.selectedImageIndex ?? 0) || 0;
  });
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [direction, setDirection] = useState(0);
  
  // 🌟 NUEVO ESTADO: Para el Acordeón de Descripción
  const [showDescription, setShowDescription] = useState(false);

  // 🌟 ESCUCHANDO BOTÓN ATRÁS DE ANDROID PARA CERRAR EL MODAL
  useBackButton(true, onClose);

  const primaryColor = storeData?.primaryColor || settings?.primaryColor || "#000000";
  const activeStoreId = storeData?.id || currentProduct?.storeId || product?.storeId || "global";
  const likedKey = `userLikes_${activeStoreId}`;

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
    ? (selectedVariant ? Number(selectedVariant.stock ?? 0) : 0)
    : Number(currentProduct?.totalStock ?? currentProduct?.stock ?? 0);

  // 🌟 LÍMITE ESTRICTO DE BASE DE DATOS TENIENDO EN CUENTA LO YA AGREGADO EN LA BOLSA (Todos los modelos del producto/variante)
  const baseKeyPrefix = `${currentProduct?.id}-${selectedVariant?.id || "default"}`;
  const alreadyInCart = items
    .filter((i) => i.key === baseKeyPrefix || i.key.startsWith(`${baseKeyPrefix}-mod`))
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const remainingStock = Math.max(0, availableStock - alreadyInCart);

  // 🌟 PRECIOS CENTRALIZADOS Y UNIFICADOS
  const pricing = calculateProductPricing(currentProduct);
  const oldPrice = pricing.oldPrice;
  const currentPrice = pricing.rawPrice;
  const finalPrice = pricing.finalPrice;
  const isFlashOffer = pricing.isFlashOffer;
  const hasDiscount = pricing.hasDiscount;
  const discountPercentage = pricing.discountPerc;

  // 🌟 TOTAL DINÁMICO PARA EL BOTÓN DE COMPRA
  const effectiveQuantity = remainingStock <= 0 ? 0 : quantity;
  const totalPrice = (finalPrice * effectiveQuantity).toFixed(2);

  useEffect(() => {
    if (!product) return;
    setCurrentProduct(product);
    setActiveImage(Number(product?.selectedImageIndex ?? 0) || 0);
    setSelectedVariant(null);
    setQuantity(1);
    setDirection(0);
    setShowDescription(false); // Cierra la descripción al cambiar de producto
    const likedProducts = JSON.parse(localStorage.getItem(likedKey) || "{}");
    setHasLiked(!!likedProducts[product.id]);
    document.getElementById('modalScrollArea')?.scrollTo(0,0);
  }, [product?.id, product?.selectedImageIndex, likedKey]);

  // 🌟 ESCUCHADOR EN TIEMPO REAL DESDE FIRESTORE: ACTUALIZA STOCK Y VARIANTES DE LA BD
  useEffect(() => {
    if (!currentProduct?.id) return;
    const productRef = doc(db, "products", currentProduct.id);
    const unsubscribe = onSnapshot(productRef, (docSnap) => {
      if (docSnap.exists()) {
        const freshData = { id: docSnap.id, ...docSnap.data() };
        setCurrentProduct((prev) => ({ ...prev, ...freshData }));
        if (freshData.likes !== undefined) setLikesCount(freshData.likes);
        if (selectedVariant) {
          const freshV = freshData.variants?.find((v) => v.id === selectedVariant.id);
          if (freshV) setSelectedVariant(freshV);
        }
      }
    });
    return () => unsubscribe();
  }, [currentProduct?.id, selectedVariant?.id]);

  useEffect(() => {
    if (!isFlashOffer || !pricing.endTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = pricing.endTime - now;
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
  }, [isFlashOffer, pricing.endTime]);

  useEffect(() => {
    const fetchRelated = async () => {
      const targetStoreId = storeData?.id || currentProduct?.storeId;
      if (!currentProduct?.sessionId || !targetStoreId) return; 
      try {
        const q = query(
          collection(db, "products"),
          where("storeId", "==", targetStoreId),
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
  }, [currentProduct?.id, currentProduct?.sessionId, currentProduct?.storeId, storeData?.id]);

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
      window.dispatchEvent(new CustomEvent("likes_updated"));
      window.dispatchEvent(new CustomEvent("wishlist_updated"));
      try { await updateDoc(productRef, { likes: increment(-1) }); } catch (error) {}
    } else {
      setHasLiked(true);
      setLikesCount((prev) => prev + 1);
      likedProducts[currentProduct.id] = true; 
      localStorage.setItem(likedKey, JSON.stringify(likedProducts));
      window.dispatchEvent(new CustomEvent("likes_updated"));
      window.dispatchEvent(new CustomEvent("wishlist_updated"));
      try { await updateDoc(productRef, { likes: increment(1) }); } 
      catch (error) { await setDoc(productRef, { likes: 1 }, { merge: true }); }
    }
    setIsLiking(false);
  };

  const getImagesArray = () => {
    let raw = currentProduct;
    let list = [];
    if (Array.isArray(raw.images) && raw.images.length > 0 && raw.images[0]) list = raw.images.filter(Boolean);
    else if (raw.image) list = [raw.image];
    else if (raw.imageUrl) list = [raw.imageUrl];
    return list.map(img => normalizeImageUrl(img)).filter(Boolean);
  };

  const images = getImagesArray();
  const hasMultipleImages = images.length > 1;

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) return toast.error("Selecciona una talla primero");
    if (availableStock <= 0) return toast.error("Este producto se encuentra agotado");
    if (remainingStock <= 0) return toast.error(`Ya tienes el límite disponible (${availableStock} unidades) en tu bolsa`);
    if (quantity > remainingStock) return toast.error(`Solo puedes agregar hasta ${remainingStock} unidades más`);

    const originToUse = currentProduct._origenVenta || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("origenVenta") : null) || "tienda_directa";
    const selectedImageUrl = images[activeImage] || currentProduct.image || currentProduct.imageUrl;

    const productToAdd = { 
      ...currentProduct, 
      image: selectedImageUrl,
      imageUrl: selectedImageUrl,
      selectedImage: selectedImageUrl,
      selectedImageIndex: activeImage,
      selectedModelLabel: hasMultipleImages ? `Modelo #${activeImage + 1}` : null,
      price: finalPrice,
      oldPrice: oldPrice > finalPrice ? oldPrice : null,
      _rawPrice: currentPrice,
      _rawOldPrice: pricing.rawOldPrice,
      _origenVenta: originToUse
    };
    const added = addItem(productToAdd, selectedVariant, quantity);
    if (added !== false) {
      toast.success(hasMultipleImages ? `¡Modelo #${activeImage + 1} agregado a tu bolsa! 🛍️` : "¡Agregado a tu bolsa! 🛍️");
      onClose();
    }
  };

  const handleShareWhatsApp = () => {
    const targetStoreId = storeData?.id || currentProduct?.storeId || '';
    const targetStoreName = storeData?.nombre || currentProduct?.storeName || 'la tienda';
    const text = `¡Mira lo que encontré en ${targetStoreName}! 😍\n*${currentProduct?.name}* por solo *$${finalPrice.toFixed(2)}*\n\nMíralo aquí:`;
    const url = currentProduct?.id
      ? `${window.location.origin}/api/store-og?storeId=${targetStoreId}&product=${encodeURIComponent(currentProduct.id)}`
      : `${window.location.origin}/api/store-og?storeId=${targetStoreId}`; 
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + "\n" + url)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!currentProduct) return null;

  const paginate = (newDirection) => {
    setDirection(newDirection);
    let nextImage = activeImage + newDirection;
    if (nextImage < 0) nextImage = images.length - 1;
    if (nextImage >= images.length) nextImage = 0;
    setActiveImage(nextImage);
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

  const slideVariants = {
    enter: (dir) => ({
      x: dir === 0 ? 0 : dir > 0 ? "100%" : "-100%",
      opacity: dir === 0 ? 1 : 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir) => ({
      x: dir === 0 ? 0 : dir < 0 ? "100%" : "-100%",
      opacity: 0
    })
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center bg-black/70 backdrop-blur-sm sm:p-4"
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
          title="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div id="modalScrollArea" className="flex-1 overflow-y-auto scrollbar-hide pb-32">
          <div className="flex flex-col md:flex-row">
            
            {/* 🌟 GALERÍA CON ESTILO INSTAGRAM DE ALTO CONTRASTE 🌟 */}
            <div className="w-full md:w-1/2 md:sticky md:top-0 md:h-fit flex flex-col bg-slate-50 border-b border-gray-100 md:border-b-0 md:border-r">
              <div className="relative w-full aspect-[4/5] bg-gradient-to-b from-gray-100 via-gray-50 to-gray-100 overflow-hidden group select-none">
                
                {hasDiscount && discountPercentage > 0 && (
                  <div className="absolute top-4 left-4 z-30 bg-red-600 text-white px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border border-white/20">
                    -{discountPercentage}% Dto
                  </div>
                )}

                {/* 🌟 CONTADOR ESTILO INSTAGRAM (Ej: 📷 1/4) */}
                {hasMultipleImages && (
                  <div className="absolute top-4 right-4 z-30 bg-black/65 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full shadow-xl border border-white/20 flex items-center gap-1.5 pointer-events-none">
                    <span>📷</span>
                    <span>{activeImage + 1}/{images.length}</span>
                  </div>
                )}

                {hasMultipleImages ? (
                  <AnimatePresence initial={false} custom={direction}>
                    {images.length > 0 && (
                      <motion.img
                        key={activeImage}
                        src={images[activeImage]}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset, velocity }) => {
                          const swipe = swipePower(offset.x, velocity.x);
                          if (swipe < -swipeConfidenceThreshold) paginate(1);
                          else if (swipe > swipeConfidenceThreshold) paginate(-1);
                        }}
                        className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
                        alt={`${currentProduct.name} - Modelo ${activeImage + 1}`}
                      />
                    )}
                  </AnimatePresence>
                ) : (
                  images.length > 0 && (
                    <img
                      src={images[0]}
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                      alt={currentProduct.name}
                    />
                  )
                )}

                {/* 🌟 FLECHAS DE NAVEGACIÓN ESTILO INSTAGRAM (Visibles en móvil y desktop con alto contraste) */}
                {hasMultipleImages && (
                  <>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all border border-white/20 cursor-pointer"
                      title="Modelo anterior"
                    >
                      <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); paginate(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all border border-white/20 cursor-pointer"
                      title="Siguiente modelo"
                    >
                      <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </>
                )}

                {/* 🌟 PUNTOS INDICADORES ESTILO INSTAGRAM EN CÁPSULA OSCURA (Inmunes a fotos de fondo blanco) */}
                {hasMultipleImages && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30 pointer-events-auto">
                    <div className="bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xl border border-white/20">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setDirection(i > activeImage ? 1 : -1);
                            setActiveImage(i);
                          }}
                          className={`rounded-full transition-all duration-300 ${
                            i === activeImage 
                              ? "w-6 h-2 bg-white shadow-md" 
                              : "w-2 h-2 bg-white/45 hover:bg-white/80"
                          }`}
                          title={`Ver modelo #${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 🌟 TIRA DE MINIATURAS INTERACTIVAS DE TODOS LOS MODELOS */}
              {hasMultipleImages && (
                <div className="p-3 bg-gray-50/90 border-t border-gray-200/80 flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                    Modelos:
                  </span>
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDirection(idx > activeImage ? 1 : -1);
                        setActiveImage(idx);
                      }}
                      className={`relative w-14 h-16 sm:w-16 sm:h-20 rounded-xl overflow-hidden shrink-0 transition-all duration-200 border-2 active:scale-95 ${
                        idx === activeImage 
                          ? "border-pink-600 ring-2 ring-pink-200 shadow-md scale-105" 
                          : "border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400"
                      }`}
                      title={`Elegir Modelo #${idx + 1}`}
                    >
                      <img src={img} alt={`Modelo #${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-black text-white text-center py-0.5">
                        #{idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
                <div className="flex justify-between items-start gap-5 mb-6">
                  <div className="flex-1">
                    
                    {/* 🌟 INDICADOR: ESTE PRODUCTO POSEE VARIOS MODELOS */}
                    {hasMultipleImages && (
                      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200/90 px-3 py-1 rounded-full w-fit shadow-xs">
                        <span>✨</span>
                        <span>Este producto posee varios modelos ({images.length} disponibles)</span>
                      </div>
                    )}

                    <h2 className="text-2xl sm:text-3xl font-black text-gray-950 leading-tight mb-2 tracking-tighter">
                      {currentProduct.name}
                    </h2>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black" style={{color: "var(--primary)"}}>
                        ${finalPrice.toFixed(2)}
                      </span>
                      {(oldPrice > finalPrice || (isFlashOffer && discountPercentage > 0)) && (
                        <span className="text-base font-medium text-gray-400 line-through">
                          ${(oldPrice > currentPrice ? oldPrice : currentPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 block">
                      Ref: Bs. {bsPrice(finalPrice)}
                    </span>

                    {/* 🌟 VENDIDO POR - VISITAR TIENDA DIRECTA */}
                    {currentProduct.storeId && (
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem("origenVenta", "index_super_admin");
                          navigate(`/${currentProduct.storeId}?ref=index`);
                          onClose();
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-pink-600 transition-colors font-bold group bg-gray-50 hover:bg-pink-50 px-3 py-1.5 rounded-full border border-gray-200 hover:border-pink-200 active:scale-95"
                        title="Visitar la tienda de este producto"
                      >
                        <span className="text-gray-400 font-normal">Vendido por:</span>
                        <span className="text-gray-800 group-hover:text-pink-600 group-hover:underline">
                          🏪 {currentProduct.storeName || currentProduct.storeId}
                        </span>
                        <span className="text-[10px] text-pink-500 font-black">→ Visitar</span>
                      </button>
                    )}
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

                {/* 🌟 INDICADOR VISUAL DEL MODELO ACTUALMENTE SELECCIONADO 🌟 */}
                {hasMultipleImages && (
                  <div className="mb-6 p-3.5 bg-gradient-to-r from-pink-50/90 via-pink-50/50 to-purple-50/80 border border-pink-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-14 rounded-xl overflow-hidden bg-white border border-pink-300 shadow-sm shrink-0">
                        <img src={images[activeImage]} alt={`Modelo #${activeImage + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest block leading-tight">Modelo Seleccionado</span>
                        <span className="text-sm font-black text-gray-900 block truncate">Modelo #{activeImage + 1}</span>
                        <span className="text-[10px] text-gray-500 block truncate">Desliza la foto para elegir tu modelo preferido</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-pink-700 bg-white px-2.5 py-1.5 rounded-xl border border-pink-100 shadow-xs shrink-0">
                      #{activeImage + 1} de {images.length}
                    </span>
                  </div>
                )}

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
                        <button 
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                          disabled={quantity <= 1 || remainingStock <= 0}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-white hover:shadow-md transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <span className="w-12 text-center text-base font-black text-gray-950">
                          {remainingStock <= 0 ? 0 : quantity}
                        </span>
                        <button 
                          type="button"
                          onClick={() => {
                            if (quantity >= remainingStock) {
                              toast.error(`Stock máximo alcanzado: solo hay ${availableStock} unidades disponibles en inventario.`);
                              return;
                            }
                            setQuantity(Math.min(remainingStock, quantity + 1));
                          }} 
                          disabled={quantity >= remainingStock || remainingStock <= 0}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-white hover:shadow-md transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="w-full">
                      <p className={`text-[10px] font-bold uppercase tracking-widest text-right transition-colors duration-300 ${
                        remainingStock <= 0 
                          ? "text-amber-600 font-black" 
                          : availableStock <= 5 
                            ? "text-red-500 animate-pulse" 
                            : "text-gray-400"
                      }`}>
                        {availableStock <= 0 
                          ? "Agotado en inventario" 
                          : remainingStock === 0
                            ? `⚠️ Ya tienes el máximo disponible en tu bolsa (${alreadyInCart} de ${availableStock})`
                            : alreadyInCart > 0
                              ? `Tienes ${alreadyInCart} en bolsa. Puedes agregar ${remainingStock} más (${availableStock} disponibles)`
                              : availableStock <= 5 
                                ? `⚠️ ¡Corre! Solo quedan ${availableStock} disponibles` 
                                : `${availableStock} unidades disponibles`}
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
                      {relatedProducts.map(rp => {
                        const rpPricing = calculateProductPricing(rp);
                        return (
                          <button 
                            key={rp.id} 
                            onClick={() => {
                              setCurrentProduct(rp);
                              setActiveImage(0);
                              setSelectedVariant(null);
                              setQuantity(1);
                              setDirection(0);
                              setShowDescription(false);
                              const likedProducts = JSON.parse(localStorage.getItem(likedKey) || "{}");
                              setHasLiked(!!likedProducts[rp.id]);
                              document.getElementById('modalScrollArea')?.scrollTo(0, 0);
                            }} 
                            className="w-[calc(33.333%-11px)] flex-shrink-0 text-left group active:scale-95 transition-transform snap-start"
                          >
                            <div className="w-full aspect-[4/5] bg-white rounded-2xl mb-2.5 overflow-hidden border border-gray-100 shadow-sm">
                              <img src={rp.images?.[0] || rp.image || rp.imageUrl} alt={rp.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <p className="text-[11px] font-bold text-gray-950 truncate leading-tight group-hover:text-pink-600 transition-colors">{rp.name}</p>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <p className="text-[11px] font-black text-gray-900">${rpPricing.finalPrice.toFixed(2)}</p>
                              {rpPricing.hasDiscount && rpPricing.oldPrice > rpPricing.finalPrice && (
                                <span className="text-[9px] font-medium text-gray-400 line-through">${rpPricing.oldPrice.toFixed(2)}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
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
            disabled={availableStock === 0 || (hasVariants && !selectedVariant) || remainingStock === 0}
            style={{ backgroundColor: (availableStock === 0 || (hasVariants && !selectedVariant) || remainingStock === 0) ? '#e5e7eb' : (primaryColor || '#000000') }}
            className={`w-full py-5 rounded-full text-white text-[13px] font-black uppercase tracking-[0.15em] transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2
              ${availableStock === 0 || (hasVariants && !selectedVariant) || remainingStock === 0 ? "text-gray-400 shadow-none cursor-not-allowed" : "hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]"}
            `}
          >
            {availableStock === 0 
              ? "Agotado en inventario" 
              : hasVariants && !selectedVariant 
                ? "Selecciona una Talla" 
                : remainingStock === 0
                  ? `Límite en bolsa alcanzado (${alreadyInCart} en bolsa)`
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
    </motion.div>
  );
}
