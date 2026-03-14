import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import ProductCard from "./ProductCard";
import { useApp } from "../../context/AppContext"; 
import { motion, AnimatePresence } from "framer-motion"; // 🌟 MAGIA: Importamos framer-motion para las animaciones Premium

export default function ProductCatalog({ activeFilter, onProductClick, onFilter }) {
  const [sessions, setSessions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);
  
  const { storeData } = useApp();

  const [liveTime, setLiveTime] = useState(Date.now());

  useEffect(() => { 
    setVisibleCount(8); 
  }, [activeFilter]);

  useEffect(() => {
    if (activeFilter === "ofertas") {
      const interval = setInterval(() => setLiveTime(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [activeFilter]);

  useEffect(() => {
    const unsubSessions = onSnapshot(
      query(collection(db, "sessions"), where("hidden", "==", false)), 
      (snap) => {
        setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

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
    filtered = products.filter(p => p.sessionId === activeFilter);
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
            
            const img = sessionProducts[0]?.image || sessionProducts[0]?.images?.[0];
            
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

  return (
    <div className="px-4 pb-24">
      <div className="flex flex-col items-center py-12">
        <h2 className="text-2xl font-light tracking-[0.2em] text-gray-900 uppercase text-center flex items-center gap-2">
          {isTopTen ? "🏆 Ranking Top 10" : 
           isNewArrivals ? "✨ Lo Nuevo" : 
           isOfertas ? "🔥 Ofertas Hot" : 
           isWishlist ? "💖 Mis Favoritos" : 
           "Colección"}
        </h2>
        <button 
          onClick={() => onFilter("all")} 
          className="mt-4 text-[9px] font-black text-pink-500 border-b border-pink-200 pb-1 uppercase tracking-widest hover:text-pink-600 transition-colors"
        >
          ← Regresar a Tienda
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
            key={activeFilter} // 🌟 Importante: El key cambia con el filtro, forzando la re-animación
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