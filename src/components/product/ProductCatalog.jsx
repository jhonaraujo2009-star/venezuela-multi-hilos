import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import ProductCard from "./ProductCard";
import { useApp } from "../../context/AppContext"; 
import { motion, AnimatePresence } from "framer-motion"; // 🌟 MAGIA: Importamos framer-motion para las animaciones Premium

// ═══════════════════════════════════════════════════════════════════
// 🌟 SISTEMA INTELIGENTE DE SUB-CATEGORÍAS 🌟
// Agrupa automáticamente los productos de cada colección por palabra
// clave en el nombre, creando un nivel intermedio de navegación
// con vista previa visual tipo cuadrícula premium.
// ═══════════════════════════════════════════════════════════════════

const SUBCATEGORY_KEYWORDS = [
  { key: 'collar', label: 'Collares', emoji: '📿' },
  { key: 'gargantilla', label: 'Gargantillas', emoji: '💫' },
  { key: 'choker', label: 'Chokers', emoji: '🖤' },
  { key: 'cadena', label: 'Cadenas', emoji: '⛓️' },
  { key: 'zarcillo', label: 'Zarcillos', emoji: '💎' },
  { key: 'arete', label: 'Aretes', emoji: '✨' },
  { key: 'pendiente', label: 'Pendientes', emoji: '💎' },
  { key: 'candonga', label: 'Candongas', emoji: '✨' },
  { key: 'anillo', label: 'Anillos', emoji: '💍' },
  { key: 'sortija', label: 'Sortijas', emoji: '💍' },
  { key: 'pulsera', label: 'Pulseras', emoji: '🔗' },
  { key: 'brazalete', label: 'Brazaletes', emoji: '💪' },
  { key: 'manilla', label: 'Manillas', emoji: '🔗' },
  { key: 'dije', label: 'Dijes', emoji: '🔮' },
  { key: 'tobillera', label: 'Tobilleras', emoji: '🦶' },
  { key: 'reloj', label: 'Relojes', emoji: '⌚' },
  { key: 'piercing', label: 'Piercings', emoji: '🔩' },
  { key: 'broche', label: 'Broches', emoji: '📌' },
  { key: 'cintillo', label: 'Cintillos', emoji: '👑' },
  { key: 'bandana', label: 'Bandanas', emoji: '🎀' },
  { key: 'cola', label: 'Colas y Moños', emoji: '🎀' },
  { key: 'moño', label: 'Colas y Moños', emoji: '🎀' },
  { key: 'gancho', label: 'Ganchos', emoji: '✨' },
  { key: 'pinza', label: 'Pinzas', emoji: '✨' },
  { key: 'lente', label: 'Lentes', emoji: '🕶️' },
  { key: 'gafa', label: 'Gafas', emoji: '🕶️' },
  { key: 'sombrero', label: 'Sombreros', emoji: '🎩' },
  { key: 'gorra', label: 'Gorras', emoji: '🧢' },
  { key: 'bolso', label: 'Bolsos', emoji: '👜' },
  { key: 'cartera', label: 'Carteras', emoji: '👛' },
  { key: 'cinturon', label: 'Cinturones', emoji: '🔗' },
  { key: 'bufanda', label: 'Bufandas', emoji: '🧣' },
  { key: 'pantalon', label: 'Pantalones', emoji: '👖' },
  { key: 'camisa', label: 'Camisas', emoji: '👔' },
  { key: 'franela', label: 'Franelas', emoji: '👕' },
  { key: 'zapato', label: 'Zapatos', emoji: '👟' },
  { key: 'sandalia', label: 'Sandalias', emoji: '👡' },
  { key: 'vestido', label: 'Vestidos', emoji: '👗' },
  { key: 'falda', label: 'Faldas', emoji: '👗' },
  { key: 'short', label: 'Shorts', emoji: '🩳' },
  { key: 'conjunto', label: 'Conjuntos', emoji: '🎁' },
  { key: 'set', label: 'Sets', emoji: '🎁' },
];

// 🌟 Extrae de forma robusta la primera imagen válida de un producto
const getProductImage = (p) => {
  if (!p) return null;
  if (typeof p.image === 'string' && p.image.trim()) return p.image.trim();
  if (typeof p.imageUrl === 'string' && p.imageUrl.trim()) return p.imageUrl.trim();
  if (typeof p.imagen === 'string' && p.imagen.trim()) return p.imagen.trim();
  if (typeof p.img === 'string' && p.img.trim()) return p.img.trim();
  if (typeof p.thumbnail === 'string' && p.thumbnail.trim()) return p.thumbnail.trim();
  if (typeof p.photo === 'string' && p.photo.trim()) return p.photo.trim();
  if (typeof p.foto === 'string' && p.foto.trim()) return p.foto.trim();

  const arrayCandidates = [p.images, p.imagenes, p.fotos, p.photos];
  for (const arr of arrayCandidates) {
    if (Array.isArray(arr) && arr.length > 0) {
      const foundStr = arr.find(img => typeof img === 'string' && img.trim().length > 0);
      if (foundStr) return foundStr.trim();
      const foundObj = arr.find(img => img && typeof img.url === 'string' && img.url.trim().length > 0);
      if (foundObj) return foundObj.url.trim();
    }
  }
  return null;
};

// 🌟 Obtiene el precio numérico más alto o representativo de un producto
const getProductPrice = (p) => {
  if (!p) return 0;
  const price = Number(p.price ?? p.precio ?? 0) || 0;
  const oldPrice = Number(p.oldPrice ?? p.precioAnterior ?? 0) || 0;
  return Math.max(price, oldPrice);
};

// 🌟 Detecta la sub-categoría de un producto basándose en su nombre
const detectSubcategory = (productName) => {
  const nameLower = (productName || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  for (const sub of SUBCATEGORY_KEYWORDS) {
    const keyNormalized = sub.key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (nameLower.includes(keyNormalized)) {
      return sub;
    }
  }
  return { key: 'otros', label: 'Otros', emoji: '🛍️' };
};

// 🌟 Obtiene la info de una sub-categoría por su clave
const getSubcategoryInfo = (key) => {
  if (key === 'otros') return { key: 'otros', label: 'Otros', emoji: '🛍️' };
  const found = SUBCATEGORY_KEYWORDS.find(s => s.key === key);
  return found || { key, label: key.charAt(0).toUpperCase() + key.slice(1), emoji: '🛍️' };
};

// 🌟 Agrupa productos de una colección en sub-categorías con la foto del artículo MÁS CARO
const buildSubcategories = (sessionProducts) => {
  const groups = {};
  
  sessionProducts.forEach(p => {
    const pName = p.name || p.nombre || p.title || '';
    const sub = detectSubcategory(pName);
    if (!groups[sub.key]) {
      groups[sub.key] = { ...sub, products: [], preview: null, topPrice: 0 };
    }
    groups[sub.key].products.push(p);
  });

  // 🌟 Para cada subcategoría, encontramos el artículo MÁS CARO que tenga foto
  Object.values(groups).forEach(group => {
    // Ordenamos de mayor a menor precio
    const sorted = [...group.products].sort((a, b) => getProductPrice(b) - getProductPrice(a));
    
    // El valor más alto de la categoría
    group.topPrice = sorted.length > 0 ? getProductPrice(sorted[0]) : 0;

    // Buscamos el artículo más costoso con imagen válida para mostrar de fondo
    const topItemWithImage = sorted.find(p => !!getProductImage(p));
    if (topItemWithImage) {
      group.preview = getProductImage(topItemWithImage);
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
      const pOld = Number(p.oldPrice) || 0;
      const pPrice = Number(p.price) || 0;
      const pExtra = Number(p.discount) || Number(p.offerDiscount) || 0;
      const finalPrice = pExtra > 0 ? pPrice - (pPrice * (pExtra / 100)) : pPrice;
      
      const hasDiscount = pOld > finalPrice || pExtra > 0;
      const isFlashOffer = p.parsedOfferEndsAt && p.parsedOfferEndsAt > liveTime;
      
      return hasDiscount || isFlashOffer;
    }).sort((a, b) => {
      const aOld = Number(a.oldPrice) || Number(a.price);
      const aPrice = Number(a.price) || 0;
      const aExtra = Number(a.discount) || Number(a.offerDiscount) || 0;
      const aFinal = aExtra > 0 ? aPrice - (aPrice * (aExtra / 100)) : aPrice;
      const ahorroA = aOld - aFinal;

      const bOld = Number(b.oldPrice) || Number(b.price);
      const bPrice = Number(b.price) || 0;
      const bExtra = Number(b.discount) || Number(b.offerDiscount) || 0;
      const bFinal = bExtra > 0 ? bPrice - (bPrice * (bExtra / 100)) : bPrice;
      const ahorroB = bOld - bFinal;

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
            
            const sortedSession = [...sessionProducts].sort((a, b) => getProductPrice(b) - getProductPrice(a));
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
              className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgba(236,72,153,0.18)] transition-all duration-500 active:scale-95 cursor-pointer bg-gradient-to-b from-white via-stone-50/90 to-pink-50/40 border border-pink-100/70 hover:border-pink-300 flex flex-col justify-between p-3.5"
            >
              {/* 🌟 Resplandor estético sutil para realzar la joya */}
              <div className="absolute inset-0 bg-radial from-pink-100/50 via-transparent to-transparent opacity-70 pointer-events-none" />

              {/* 🌟 Badges Superiores */}
              <div className="relative z-10 flex items-center justify-between w-full">
                {/* Badge del Valor Más Caro (Referencia Top) */}
                {subcat.topPrice > 0 ? (
                  <span className="bg-white/95 backdrop-blur-md text-gray-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border border-pink-100/80 flex items-center gap-1">
                    <span className="text-amber-500">⭐</span> Top ${subcat.topPrice.toFixed(2)}
                  </span>
                ) : <div />}

                {/* Badge de Cantidad de Piezas */}
                <span className="bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                  {subcat.products.length}
                </span>
              </div>

              {/* 🌟 Imagen de Referencia de Fondo (El collar / zarcillo más caro) */}
              <div className="absolute inset-0 pt-7 pb-14 px-3 flex items-center justify-center overflow-hidden pointer-events-none">
                {subcat.preview ? (
                  <img 
                    src={subcat.preview} 
                    className="max-w-full max-h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] transition-transform duration-700 group-hover:scale-110" 
                    alt={subcat.label} 
                    loading="lazy"
                  />
                ) : (
                  <span className="text-6xl opacity-15">{subcat.emoji}</span>
                )}
              </div>

              {/* 🌟 Zona Inferior (Nombre de categoría y detalle de precio de referencia) */}
              <div className="relative z-10 w-full pt-4 bg-gradient-to-t from-white via-white/95 to-transparent rounded-b-[2rem] flex flex-col items-center text-center -mx-3.5 -mb-3.5 px-3.5 pb-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm drop-shadow-xs">{subcat.emoji}</span>
                  <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wider group-hover:text-pink-600 transition-colors">
                    {subcat.label}
                  </h3>
                </div>
                {subcat.topPrice > 0 ? (
                  <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100/60 tracking-wider">
                    Desde ${subcat.topPrice.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {subcat.products.length === 1 ? '1 pieza' : `${subcat.products.length} piezas`}
                  </span>
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