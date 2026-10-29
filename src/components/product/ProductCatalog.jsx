import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import ProductCard from "./ProductCard";
import { useApp } from "../../context/AppContext"; 
import { motion, AnimatePresence } from "framer-motion"; // 🌟 MAGIA: Importamos framer-motion para las animaciones Premium
import { calculateProductPricing } from "../../utils/pricing";

// URL base del servidor local de tu PC para migración automática de URLs viejas de Cloudinary
const LOCAL_MEDIA_SERVER = import.meta.env.VITE_MEDIA_SERVER_URL || "https://armor-reduce-springs-brighton.trycloudflare.com";

export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  if (url.includes("res.cloudinary.com") || url.includes("cloudinary.com")) {
    const filename = url.split("/").pop().split("?")[0];
    return `${LOCAL_MEDIA_SERVER}/uploads/${filename}`;
  }
  return url;
};

// ═══════════════════════════════════════════════════════════════════
// 🌟 SISTEMA INTELIGENTE DE SUB-CATEGORÍAS 🌟
// Agrupa automáticamente los productos de cada colección por palabra
// clave en el nombre, creando un nivel intermedio de navegación
// con vista previa visual tipo cuadrícula premium.
// ═══════════════════════════════════════════════════════════════════

const SUBCATEGORY_DEFINITIONS = [
  { key: 'collares', label: 'Collares', emoji: '📿', keywords: ['collar', 'collares', 'gargantilla', 'gargantillas', 'choker', 'chokers'] },
  { key: 'cadenas', label: 'Cadenas', emoji: '⛓️', keywords: ['cadena', 'cadenas'] },
  { key: 'zarcillos', label: 'Zarcillos', emoji: '💎', keywords: ['zarcillo', 'zarcillos', 'sarcillo', 'sarcillos', 'arete', 'aretes', 'pendiente', 'pendientes', 'candonga', 'candongas'] },
  { key: 'pulseras', label: 'Pulseras', emoji: '🔗', keywords: ['pulsera', 'pulseras', 'brazalete', 'brazaletes', 'manilla', 'manillas', 'esclava', 'esclavas'] },
  { key: 'anillos', label: 'Anillos', emoji: '💍', keywords: ['anillo', 'anillos', 'sortija', 'sortijas'] },
  { key: 'dijes', label: 'Dijes', emoji: '🔮', keywords: ['dije', 'dijes'] },
  { key: 'tobilleras', label: 'Tobilleras', emoji: '🦶', keywords: ['tobillera', 'tobilleras'] },
  { key: 'relojes', label: 'Relojes', emoji: '⌚', keywords: ['reloj', 'relojes'] },
  { key: 'piercings', label: 'Piercings', emoji: '🔩', keywords: ['piercing', 'piercings'] },
  { key: 'broches', label: 'Broches', emoji: '📌', keywords: ['broche', 'broches', 'pin', 'pines'] },
  { key: 'cabello', label: 'Accesorios Cabello', emoji: '🎀', keywords: ['cintillo', 'cintillos', 'bandana', 'bandanas', 'cola', 'colas', 'moño', 'moños', 'gancho', 'ganchos', 'pinza', 'pinzas', 'coleta', 'coletas'] },
  { key: 'lentes', label: 'Lentes y Gafas', emoji: '🕶️', keywords: ['lente', 'lentes', 'gafa', 'gafas'] },
  { key: 'bolsos', label: 'Bolsos y Carteras', emoji: '👜', keywords: ['bolso', 'bolsos', 'cartera', 'carteras', 'mochila', 'mochilas', 'billetera', 'billeteras'] },
  { key: 'calzado', label: 'Calzado', emoji: '👟', keywords: ['zapato', 'zapatos', 'sandalia', 'sandalias', 'bota', 'botas'] },
  { key: 'ropa', label: 'Prendas de Vestir', emoji: '👗', keywords: ['vestido', 'vestidos', 'falda', 'faldas', 'pantalon', 'pantalones', 'camisa', 'camisas', 'franela', 'franelas', 'short', 'shorts', 'blusa', 'blusas', 'top'] },
  { key: 'sets', label: 'Sets y Conjuntos', emoji: '🎁', keywords: ['conjunto', 'conjuntos', 'set', 'sets', 'combo', 'combos'] },
];

// 🌟 Extrae de forma robusta la primera imagen válida de un producto
const getProductImage = (p) => {
  if (!p) return null;
  const raw = p.image || p.imageUrl || p.imagen || p.img || p.thumbnail || p.photo || p.foto;
  if (typeof raw === 'string' && raw.trim()) return normalizeImageUrl(raw.trim());

  const arrayCandidates = [p.images, p.imagenes, p.fotos, p.photos];
  for (const arr of arrayCandidates) {
    if (Array.isArray(arr) && arr.length > 0) {
      const foundStr = arr.find(img => typeof img === 'string' && img.trim().length > 0);
      if (foundStr) return normalizeImageUrl(foundStr.trim());
      const foundObj = arr.find(img => img && typeof img.url === 'string' && img.url.trim().length > 0);
      if (foundObj) return normalizeImageUrl(foundObj.url.trim());
    }
  }
  return null;
};

// 🌟 Detecta la sub-categoría canónica de un producto basándose en su nombre
const detectSubcategory = (productName) => {
  const nameLower = (productName || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const def of SUBCATEGORY_DEFINITIONS) {
    for (const kw of def.keywords) {
      const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (nameLower.includes(kwNorm)) {
        return { key: def.key, label: def.label, emoji: def.emoji };
      }
    }
  }
  return { key: 'otros', label: 'Otros', emoji: '🛍️' };
};

// 🌟 Obtiene la info de una sub-categoría por su clave
const getSubcategoryInfo = (key) => {
  if (key === 'otros') return { key: 'otros', label: 'Otros', emoji: '🛍️' };
  const found = SUBCATEGORY_DEFINITIONS.find(s => s.key === key);
  return found || { key, label: key.charAt(0).toUpperCase() + key.slice(1), emoji: '🛍️' };
};

// 🌟 Agrupa productos de una colección en sub-categorías con la foto del artículo MÁS CARO y su precio final
const buildSubcategories = (sessionProducts) => {
  const groups = {};
  
  sessionProducts.forEach(p => {
    const pName = p.name || p.nombre || p.title || '';
    const sub = detectSubcategory(pName);
    if (!groups[sub.key]) {
      groups[sub.key] = {
        ...sub,
        products: [],
        preview: null,
        finalPrice: 0,
        oldPrice: 0,
        hasDiscount: false,
        discountPerc: 0
      };
    }
    groups[sub.key].products.push(p);
  });

  // 🌟 Para cada subcategoría, encontramos el artículo MÁS CARO y su precio final con descuento
  Object.values(groups).forEach(group => {
    // Ordenamos de mayor a menor valor de referencia
    const sorted = [...group.products].sort((a, b) => {
      const valA = calculateProductPricing(a).baseValuation;
      const valB = calculateProductPricing(b).baseValuation;
      return valB - valA;
    });
    
    // Buscamos el artículo de referencia para portada
    const topItem = sorted.find(p => !!getProductImage(p)) || sorted[0];

    if (topItem) {
      group.preview = getProductImage(topItem) || topItem.images?.[0] || topItem.image;
      const pricing = calculateProductPricing(topItem);
      group.finalPrice = pricing.finalPrice;
      group.oldPrice = pricing.oldPrice;
      group.hasDiscount = pricing.hasDiscount;
      group.discountPerc = pricing.discountPerc;
    }
  });

  // Ordenar: más productos primero, "otros" siempre al final
  return Object.values(groups).sort((a, b) => {
    if (a.key === 'otros') return 1;
    if (b.key === 'otros') return -1;
    return b.products.length - a.products.length;
  });
};

const SPECIAL_FILTERS = ['all', 'top', 'new', 'ofertas', 'wishlist'];

export default function ProductCatalog({ activeFilter, onProductClick, onFilter }) {
  const [sessions, setSessions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  
  const { storeData } = useApp();

  const [liveTime, setLiveTime] = useState(Date.now());

  useEffect(() => { 
    setVisibleCount(8); 
  }, [activeFilter, activeSubcategory]);

  // 🌟 RESETEAR SUB-CATEGORÍA AL CAMBIAR DE COLECCIÓN O FILTRO
  useEffect(() => {
    setActiveSubcategory(null);
  }, [activeFilter]);

  useEffect(() => {
    if (activeFilter === "ofertas") {
      const interval = setInterval(() => setLiveTime(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [activeFilter]);

  useEffect(() => {
    let sessionsQuery = query(collection(db, "sessions"), where("hidden", "==", false));
    if (storeData?.id) {
      sessionsQuery = query(
        collection(db, "sessions"), 
        where("hidden", "==", false),
        where("storeId", "==", storeData.id)
      );
    }

    const unsubSessions = onSnapshot(sessionsQuery, (snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    let productsQuery = collection(db, "products");
    
    if (storeData?.id) {
      productsQuery = query(collection(db, "products"), where("storeId", "==", storeData.id));
    }

    const unsubProducts = onSnapshot(productsQuery, (snap) => {
      const rawProducts = snap.docs.map((d) => {
        const data = d.data();
        const createdAtMs = data.createdAt?.toMillis() || Date.now();
        
        let endTime = 0;
        if (data.offerEndsAt) {
          endTime = data.offerEndsAt?.toMillis ? data.offerEndsAt.toMillis() : new Date(data.offerEndsAt).getTime();
          if (endTime < 100000) endTime = createdAtMs + (endTime * 60 * 60 * 1000);
        } else if (data.horas || data.hours || data.duracion) {
          endTime = createdAtMs + (Number(data.horas || data.hours || data.duracion) * 60 * 60 * 1000);
        }

        return { 
          id: d.id, 
          ...data, 
          createdAtMs, 
          parsedOfferEndsAt: endTime 
        };
      });
      setProducts(rawProducts);
      setLoading(false);
    });

    return () => { 
      unsubSessions(); 
      unsubProducts(); 
    };
  }, [storeData?.id]); 

  // 🌟 CÓMPUTO DE SUB-CATEGORÍAS para la colección activa
  const isSessionFilter = activeFilter && !SPECIAL_FILTERS.includes(activeFilter);
  const subcategories = useMemo(() => {
    if (!activeFilter || SPECIAL_FILTERS.includes(activeFilter) || activeSubcategory) return [];
    const sessionProds = products.filter(p => p.sessionId === activeFilter);
    if (sessionProds.length === 0) return [];
    const subcats = buildSubcategories(sessionProds);
    // Solo mostrar la cuadrícula de sub-categorías si hay 2+ grupos distintos
    return subcats.length > 1 ? subcats : [];
  }, [activeSubcategory, products, activeFilter]);
  const showSubcategoryGrid = isSessionFilter && !activeSubcategory && subcategories.length > 0;

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-12 animate-in fade-in duration-500">
        <div className="flex flex-col items-center mb-12 opacity-60">
          <div className="h-6 w-48 bg-pink-100/50 rounded-full animate-pulse mb-4"></div>
          <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-12">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="w-full flex flex-col gap-3">
              <div className="w-full aspect-[4/5] bg-gray-100 rounded-[2.5rem] animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
              </div>
              <div className="h-4 w-3/4 bg-gray-100 rounded-full animate-pulse ml-2 mt-2"></div>
              <div className="h-5 w-1/2 bg-pink-50 rounded-full animate-pulse ml-2 mt-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  let filtered = [];
  const isTopTen = activeFilter === "top";
  const isNewArrivals = activeFilter === "new";
  const isOfertas = activeFilter === "ofertas";
  const isWishlist = activeFilter === "wishlist";

  if (isTopTen) {
    filtered = [...products]
      .filter(p => (p.salesCount || 0) > 0)
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 10);
      
  } else if (isNewArrivals) {
    const unaSemanaAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    filtered = products
      .filter(p => p.createdAtMs >= unaSemanaAtras || p.isNew)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
      
  } else if (isOfertas) {
    filtered = products.filter(p => {
      const pricing = calculateProductPricing(p);
      return pricing.hasDiscount || pricing.isFlashOffer;
    }).sort((a, b) => {
      const pricingA = calculateProductPricing(a);
      const pricingB = calculateProductPricing(b);
      const ahorroA = (pricingA.oldPrice || pricingA.rawPrice) - pricingA.finalPrice;
      const ahorroB = (pricingB.oldPrice || pricingB.rawPrice) - pricingB.finalPrice;
      return ahorroB - ahorroA;
    });

  } else if (isWishlist) {
    const likedKey = `userLikes_${storeData?.id || "global"}`;
    const likedItems = JSON.parse(localStorage.getItem(likedKey) || "{}");
    filtered = products.filter(p => likedItems[p.id]);

  } else if (activeFilter && activeFilter !== "all") {
    if (activeSubcategory) {
      // 🌟 Filtrar por sub-categoría dentro de la colección
      filtered = products.filter(p => 
        p.sessionId === activeFilter && 
        detectSubcategory(p.name || p.nombre || p.title || '').key === activeSubcategory
      );
    } else {
      filtered = products.filter(p => p.sessionId === activeFilter);
    }
  }

  // 🌟 DEFINIMOS LAS ANIMACIONES PARA LAS TARJETAS 🌟
  // containerVariants: Controla el efecto dominó (stagger) de toda la grilla
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1 // 🌟 MAGIA: Cada tarjeta entra 0.1s después de la anterior
      }
    }
  };

  // itemVariants: Controla cómo entra y sale cada tarjeta individualmente
  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } },
    exit: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }
  };

  if (!activeFilter || activeFilter === "all") {
    return (
      <div className="px-4 pb-24 space-y-10">
        <div className="py-8 text-center">
          <h2 className="text-[10px] font-black tracking-[0.5em] text-gray-400 uppercase mb-2 text-center">
            Exclusividad
          </h2>
          <h1 className="text-3xl font-serif italic text-gray-900 text-center">
            Nuestras Colecciones
          </h1>
        </div>
        
        {/* 🌟 APLICAMOS ANIMACIÓN A LA VISTA DE COLECCIONES */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-8"
        >
          {sessions.map((session) => {
            const sessionProducts = products.filter(p => p.sessionId === session.id);
            if (sessionProducts.length === 0) return null;
            
            const sortedSession = [...sessionProducts].sort((a, b) => calculateProductPricing(b).baseValuation - calculateProductPricing(a).baseValuation);
            const topSessionProduct = sortedSession.find(p => !!getProductImage(p)) || sessionProducts[0];
            const img = getProductImage(topSessionProduct);
            
            return (
              <motion.div 
                variants={itemVariants}
                key={session.id} 
                onClick={() => onFilter(session.id)} 
                className="group relative h-[420px] w-full rounded-[3rem] overflow-hidden shadow-2xl transition-all active:scale-95 cursor-pointer"
              >
                {img && (
                  <img 
                    src={img} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" 
                    alt={session.name} 
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-12">
                  <h3 className="text-3xl font-light text-white uppercase tracking-[0.2em] mb-4">
                    {session.name}
                  </h3>
                  <button className="text-[10px] text-white/90 font-bold uppercase tracking-[0.3em] backdrop-blur-md bg-white/10 px-8 py-2.5 rounded-full border border-white/20">
                    Explorar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    );
  }

  const visibleProducts = filtered.slice(0, visibleCount);

  // ═══════════════════════════════════════════════════════════════
  // 🌟 VISTA DE SUB-CATEGORÍAS (Nivel intermedio premium)
  // Cuando el usuario hace click en una colección y hay 2+ tipos
  // de productos, mostramos una cuadrícula de sub-categorías
  // con vista previa antes de mostrar los productos.
  // ═══════════════════════════════════════════════════════════════
  if (showSubcategoryGrid) {
    const sessionName = sessions.find(s => s.id === activeFilter)?.name || 'Colección';
    
    return (
      <div className="px-4 pb-24">
        {/* 🌟 HEADER PREMIUM DE SUB-CATEGORÍAS */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center py-10"
        >
          <h2 className="text-[10px] font-black tracking-[0.5em] text-gray-400 uppercase mb-2 text-center">
            {sessionName}
          </h2>
          <h1 className="text-2xl font-serif italic text-gray-900 text-center mb-1">
            Elige tu Categoría
          </h1>
          <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mb-4">
            {subcategories.reduce((sum, s) => sum + s.products.length, 0)} piezas en {subcategories.length} categorías
          </p>
          <button 
            onClick={() => onFilter("all")} 
            className="text-[9px] font-black text-pink-500 border-b border-pink-200 pb-1 uppercase tracking-widest hover:text-pink-600 transition-colors"
          >
            ← Regresar a Colecciones
          </button>
        </motion.div>

        {/* 🌟 CUADRÍCULA PREMIUM DE SUB-CATEGORÍAS */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4"
        >
          {subcategories.map((subcat) => (
            <motion.div
              variants={itemVariants}
              key={subcat.key}
              onClick={() => setActiveSubcategory(subcat.key)}
              className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 active:scale-95 cursor-pointer bg-neutral-900 border border-gray-100"
            >
              {/* 🌟 1. IMAGEN DE FONDO REAL (El artículo más caro de la categoría) */}
              {subcat.preview ? (
                <img 
                  src={subcat.preview} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={subcat.label} 
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-600/30 to-black flex items-center justify-center">
                  <span className="text-6xl opacity-30">{subcat.emoji}</span>
                </div>
              )}

              {/* 🌟 2. GRADIENTE DEGRADADO SUAVE (Transparente arriba para ver la joya nítida; oscuro abajo para leer el texto) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity group-hover:from-black/90 pointer-events-none" />

              {/* 🌟 3. BADGE SUPERIOR IZQUIERDO: PRECIO FINAL CON DESCUENTO */}
              {subcat.finalPrice > 0 && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <div className="bg-black/65 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/20 shadow-md flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="text-amber-300">⭐</span>
                    <span>${subcat.finalPrice.toFixed(2)}</span>
                    {subcat.hasDiscount && subcat.oldPrice > subcat.finalPrice && (
                      <span className="line-through text-gray-400 text-[9px] font-medium">
                        ${subcat.oldPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {subcat.discountPerc > 0 && (
                    <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                      -{subcat.discountPerc}%
                    </span>
                  )}
                </div>
              )}

              {/* 🌟 4. BADGE SUPERIOR DERECHO: CANTIDAD DE PIEZAS */}
              <div className="absolute top-3 right-3 z-10">
                <span className="bg-pink-600/95 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider border border-white/20">
                  {subcat.products.length} {subcat.products.length === 1 ? 'pieza' : 'piezas'}
                </span>
              </div>

              {/* 🌟 5. ZONA INFERIOR: NOMBRE DE LA CATEGORÍA Y PRECIO FINAL */}
              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center text-center z-10">
                <span className="text-2xl mb-1 drop-shadow-md transform group-hover:scale-110 transition-transform">
                  {subcat.emoji}
                </span>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-[0.15em] drop-shadow-md mb-0.5">
                  {subcat.label}
                </h3>
                {subcat.finalPrice > 0 && (
                  <div className="flex items-center gap-1.5 drop-shadow-sm mt-0.5">
                    <span className="text-[11px] text-white font-black tracking-wider">
                      ${subcat.finalPrice.toFixed(2)}
                    </span>
                    {subcat.hasDiscount && subcat.oldPrice > subcat.finalPrice && (
                      <span className="line-through text-gray-300 text-[9px] font-medium">
                        ${subcat.oldPrice.toFixed(2)}
                      </span>
                    )}
                    {subcat.discountPerc > 0 && (
                      <span className="bg-red-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter">
                        Oferta
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24">
      <div className="flex flex-col items-center py-12">
        <h2 className="text-2xl font-light tracking-[0.2em] text-gray-900 uppercase text-center flex items-center gap-2">
          {isTopTen ? "🏆 Ranking Top 10" : 
           isNewArrivals ? "✨ Lo Nuevo" : 
           isOfertas ? "🔥 Ofertas Hot" : 
           isWishlist ? "💖 Mis Favoritos" : 
           activeSubcategory ? `${getSubcategoryInfo(activeSubcategory).emoji} ${getSubcategoryInfo(activeSubcategory).label}` :
           "Colección"}
        </h2>
        <button 
          onClick={() => {
            if (activeSubcategory) {
              setActiveSubcategory(null);
            } else {
              onFilter("all");
            }
          }} 
          className="mt-4 text-[9px] font-black text-pink-500 border-b border-pink-200 pb-1 uppercase tracking-widest hover:text-pink-600 transition-colors"
        >
          ← {activeSubcategory ? `Regresar a ${sessions.find(s => s.id === activeFilter)?.name || 'Categorías'}` : 'Regresar a Tienda'}
        </button>
      </div>

      {/* 🌟 AnimatePresence permite animar elementos cuando son eliminados del DOM */}
      <AnimatePresence mode="wait"> 
        {filtered.length === 0 ? (
          <motion.div 
            key="empty-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-20"
          >
            <span className="text-6xl block mb-4 grayscale opacity-40">
              {isWishlist ? "💔" : "👗"}
            </span>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">
              {isWishlist ? "Aún no tienes favoritos." : "Catálogo vacío..."}
            </p>
            {isWishlist && (
              <p className="text-[10px] text-gray-400 mt-2">
                ¡Explora y enamórate de nuestras prendas!
              </p>
            )}
          </motion.div>
        ) : (
          /* 🌟 APLICAMOS ANIMACIÓN EN CASCADA A LA GRILLA DE PRODUCTOS */
          <motion.div 
            key={`${activeFilter}-${activeSubcategory || 'all'}`} // 🌟 Importante: El key cambia con el filtro y subcategoría, forzando la re-animación
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="grid grid-cols-2 gap-x-4 gap-y-12"
          >
            {visibleProducts.map((p, index) => (
              <motion.div variants={itemVariants} key={p.id}>
                <ProductCard 
                  product={p} 
                  onClick={onProductClick} 
                  rank={isTopTen ? index + 1 : null} 
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {visibleCount < filtered.length && (
        <div className="flex justify-center mt-16">
          <button 
            onClick={() => setVisibleCount(prev => prev + 8)} 
            className="px-10 py-4 rounded-full text-xs font-black tracking-[0.3em] uppercase bg-black text-white shadow-xl active:scale-95 transition-transform"
          >
            Ver Más
          </button>
        </div>
      )}
    </div>
  );
}