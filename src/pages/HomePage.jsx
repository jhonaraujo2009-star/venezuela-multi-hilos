import { useState, useEffect, useMemo, useRef } from "react";
import { collection, getDocs, query, limit, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useApp } from "../context/AppContext";
import { useBackButton } from "../hooks/useBackButton";
import CartDrawer from "../components/cart/CartDrawer";
import ProductModal from "../components/product/ProductModal";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import VerifiedBadge from "../components/shared/VerifiedBadge";
import { calculateProductPricing, prepareProductForCart } from "../utils/pricing";
import { normalizeImageUrl } from "../utils/imageNormalizer";

// ============================================================================
// 🌟 TARJETA DE PRODUCTO MARKETPLACE (DISEÑO MODERNO Y LIMPIO)
// ============================================================================
const ProductCard = ({
  p,
  onClick,
  onAddToCart,
  onGoToStore,
  storeName,
  isStoreVerified = false,
  bsPrice,
  rank = null,
  extraClasses = "",
}) => {
  const getThumbnail = () => {
    let raw = null;
    if (Array.isArray(p.images) && p.images.length > 0 && p.images[0]) raw = p.images[0];
    else if (p.image) raw = p.image;
    else if (p.imageUrl) raw = p.imageUrl;
    return normalizeImageUrl(raw);
  };

  const pImg = getThumbnail();
  const displayName = storeName || p.storeName || p.storeId || "Tienda";
  const imageCount =
    (Array.isArray(p.images) ? p.images.filter(Boolean).length : 0) ||
    (p.image || p.imageUrl ? 1 : 0);
  const hasMultipleModels = imageCount > 1;
  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
  const pricing = calculateProductPricing(p);

  const totalStock = hasVariants
    ? p.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : Number(p.totalStock ?? p.stock ?? 0);
  const isSoldOut = totalStock <= 0;
  const lowStock = totalStock > 0 && totalStock <= 5;

  // Favoritos sincronizados con localStorage
  const likedKey = `userLikes_${p?.storeId || "global"}`;
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const checkLiked = () => {
      try {
        const liked = JSON.parse(localStorage.getItem(likedKey) || "{}");
        setIsLiked(!!liked[p.id]);
      } catch (e) {
        setIsLiked(false);
      }
    };
    checkLiked();
    window.addEventListener("likes_updated", checkLiked);
    return () => window.removeEventListener("likes_updated", checkLiked);
  }, [p?.id, likedKey]);

  const handleToggleLike = (e) => {
    e.stopPropagation();
    try {
      const liked = JSON.parse(localStorage.getItem(likedKey) || "{}");
      const next = !isLiked;
      setIsLiked(next);
      if (next) liked[p.id] = true;
      else delete liked[p.id];
      localStorage.setItem(likedKey, JSON.stringify(liked));
      window.dispatchEvent(new CustomEvent("likes_updated"));
    } catch (err) {}
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-3xl p-3 sm:p-3.5 border border-slate-100 hover:border-pink-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_18px_40px_rgba(236,72,153,0.1)] transition-all duration-300 cursor-pointer flex flex-col h-full relative hover:-translate-y-1 ${
        isSoldOut ? "opacity-75" : ""
      } ${extraClasses}`}
    >
      {/* Contenedor de Imagen */}
      <div className="w-full aspect-square bg-slate-50/70 rounded-2xl relative overflow-hidden mb-3 flex items-center justify-center border border-slate-100/60">
        {/* Badge de Ranking (Para Más Vendidos) */}
        {rank && (
          <div className="absolute top-2.5 left-2.5 z-20">
            <span
              className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-black shadow-md border ${
                rank === 1
                  ? "bg-amber-400 text-amber-950 border-amber-200"
                  : rank === 2
                  ? "bg-slate-200 text-slate-800 border-white"
                  : rank === 3
                  ? "bg-orange-300 text-orange-950 border-orange-100"
                  : "bg-white/95 text-slate-700 border-slate-100"
              }`}
            >
              {rank <= 3 ? `🏆 #${rank}` : `#${rank}`}
            </span>
          </div>
        )}

        {/* Botón Favorito */}
        <button
          type="button"
          onClick={handleToggleLike}
          className={`absolute ${
            rank ? "top-10 left-2.5" : "top-2.5 left-2.5"
          } z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-slate-100 flex items-center justify-center transition-transform active:scale-75 hover:scale-110`}
          title={isLiked ? "Quitar de favoritos" : "Guardar en favoritos"}
        >
          <svg
            className={`w-4 h-4 transition-colors ${
              isLiked ? "text-pink-500 fill-pink-500" : "text-slate-400 hover:text-pink-500"
            }`}
            fill={isLiked ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>

        {/* Badges de Descuento Real o Flash */}
        {pricing.hasDiscount && !isSoldOut && (
          <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1">
            <span className="bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md tracking-tight">
              {pricing.discountPerc > 0 ? `-${pricing.discountPerc}%` : "OFERTA"}
            </span>
          </div>
        )}

        {/* Badge de Stock Bajo */}
        {!isSoldOut && lowStock && (
          <div className="absolute bottom-2.5 left-2.5 z-20">
            <span className="bg-amber-500/95 backdrop-blur-xs text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
              🔥 ¡Quedan {totalStock}!
            </span>
          </div>
        )}

        {/* Badge de Varios Modelos */}
        {hasMultipleModels && !isSoldOut && (
          <div className="absolute bottom-2.5 right-2.5 z-20">
            <span className="bg-white/95 backdrop-blur-md text-pink-600 border border-pink-100 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <span>✨</span>
              <span>{imageCount} fotos</span>
            </span>
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <span className="bg-white text-slate-900 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
              Agotado
            </span>
          </div>
        )}

        {pImg ? (
          <img
            src={pImg}
            alt={p.name}
            loading="lazy"
            onLoad={(e) => e.currentTarget.classList.add("loaded")}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-slate-200">
            📷
          </div>
        )}
      </div>

      {/* Contenido de la Tarjeta */}
      <div className="flex flex-col flex-1 px-0.5 text-left">
        {/* Tienda Vendedora Clickable */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onGoToStore) onGoToStore(p.storeId);
          }}
          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-pink-600 transition-colors cursor-pointer w-fit max-w-full py-0.5 px-2 -ml-1 rounded-full hover:bg-pink-50/80 mb-1 group/store"
          title={`Visitar tienda ${displayName}`}
        >
          <span className="text-[10px]">🏪</span>
          <span className="font-semibold text-slate-700 group-hover/store:text-pink-600 truncate">
            {displayName}
          </span>
          {isStoreVerified && <VerifiedBadge variant="starburst" size="xs" showTooltip={false} />}
          <span className="text-[9px] text-pink-500 opacity-0 group-hover/store:opacity-100 transition-opacity font-bold">
            →
          </span>
        </div>

        {/* Nombre del Producto */}
        <h3 className="text-[13px] font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-pink-600 transition-colors mb-2">
          {p.name}
        </h3>

        {/* Bloque de Precios */}
        <div className="mt-auto pt-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              ${Number(pricing.finalPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {pricing.hasDiscount && pricing.oldPrice > pricing.finalPrice && (
              <span className="text-xs text-slate-400 line-through font-medium">
                ${Number(pricing.oldPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {bsPrice && (
            <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
              Bs. {bsPrice(pricing.finalPrice)}
            </span>
          )}
        </div>

        {/* Botón de Acción */}
        <button
          type="button"
          disabled={isSoldOut}
          onClick={(e) => {
            e.stopPropagation();
            if (!isSoldOut && onAddToCart) onAddToCart(p);
          }}
          className={`mt-3 w-full py-2.5 px-3 rounded-2xl text-[11px] font-extrabold tracking-wide transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            isSoldOut
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-slate-900 hover:bg-pink-600 text-white shadow-xs hover:shadow-md hover:shadow-pink-500/20"
          }`}
          title={hasVariants ? "Seleccionar opciones" : "Añadir a la bolsa"}
        >
          <span>{hasVariants ? "✨" : "🛍️"}</span>
          <span>{isSoldOut ? "Agotado" : hasVariants ? "Ver opciones" : "Añadir a la bolsa"}</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 🌟 CARRUSEL HORIZONTAL REFINADO
// ============================================================================
const HorizontalCarousel = ({ id, children }) => {
  const scroll = (direction) => {
    const container = document.getElementById(id);
    if (container) {
      const scrollAmount = direction === "left" ? -440 : 440;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="relative group/carousel">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-100 items-center justify-center text-slate-700 hover:text-pink-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
        aria-label="Anterior"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div
        id={id}
        className="flex overflow-x-auto gap-3.5 sm:gap-4 pb-3 pt-1 px-1 hide-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-100 items-center justify-center text-slate-700 hover:text-pink-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
        aria-label="Siguiente"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

// ============================================================================
// 🌟 SKELETON LOADERS MODERNOS
// ============================================================================
const MarketplaceSkeleton = () => (
  <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10 animate-pulse">
    {/* Categorías Skeleton */}
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 min-w-[90px]">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200/70" />
          <div className="h-3 w-14 bg-slate-200/70 rounded-full" />
        </div>
      ))}
    </div>
    {/* Tiendas Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-44 rounded-3xl bg-white border border-slate-100 p-4 flex flex-col justify-end items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-200/70 mb-3" />
          <div className="h-4 w-28 bg-slate-200/70 rounded-full mb-2" />
          <div className="h-3 w-16 bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
    {/* Productos Skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl p-3.5 border border-slate-100 space-y-3">
          <div className="aspect-square rounded-2xl bg-slate-200/60" />
          <div className="h-3 w-1/2 bg-slate-200/60 rounded-full" />
          <div className="h-4 w-full bg-slate-200/60 rounded-full" />
          <div className="h-6 w-2/3 bg-slate-200/80 rounded-full" />
          <div className="h-9 w-full bg-slate-200/60 rounded-2xl" />
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// 🌟 PÁGINA PRINCIPAL DEL MARKETPLACE MULTITIENDA
// ============================================================================
export default function HomePage() {
  const [stores, setStores] = useState([]);
  const [allActiveStores, setAllActiveStores] = useState([]);
  const [storesMap, setStoresMap] = useState({});
  const [verifiedStoresMap, setVerifiedStoresMap] = useState({});
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [loading, setLoading] = useState(true);

  const [bestSellers, setBestSellers] = useState([]);
  const [offersProducts, setOffersProducts] = useState([]);
  const [dailyTopProducts, setDailyTopProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStoresModalOpen, setIsStoresModalOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  const navigate = useNavigate();
  const { currentUser, user, logout } = useAuth();
  const activeUser = currentUser || user;
  const { bsPrice } = useApp();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // 🌟 CONEXIÓN CON LA BOLSA DE COMPRAS MULTITIENDA
  const { itemCount, total, setIsOpen, isOpen, addItem, items } = useCart();
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 🌟 HISTORIAL DEL BOTÓN ATRÁS EN LA PÁGINA PRINCIPAL
  useBackButton(Boolean(selectedCategory), () => {
    setSelectedCategory(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  useBackButton(isMobileMenuOpen, () => setIsMobileMenuOpen(false));
  useBackButton(isStoresModalOpen, () => setIsStoresModalOpen(false));

  // Cargar historial de productos vistos recientemente
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("marketplace_recently_viewed") || "[]");
      if (Array.isArray(saved)) setRecentlyViewed(saved);
    } catch (e) {}
  }, []);

  const handleSelectProduct = (p) => {
    if (!p) return;
    const prepared = prepareProductForCart(p, "index_super_admin");
    setSelectedProduct(prepared);
    try {
      const saved = JSON.parse(localStorage.getItem("marketplace_recently_viewed") || "[]");
      const filtered = (Array.isArray(saved) ? saved : []).filter((item) => item.id !== p.id);
      const updated = [p, ...filtered].slice(0, 10);
      localStorage.setItem("marketplace_recently_viewed", JSON.stringify(updated));
      setRecentlyViewed(updated);
    } catch (e) {}
  };

  // Cerrar sugerencias de búsqueda al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOpenModal = (e) => {
      if (e.detail) setSelectedProduct(e.detail);
    };
    window.addEventListener("open_product_modal", handleOpenModal);
    return () => window.removeEventListener("open_product_modal", handleOpenModal);
  }, []);

  const handleAddToCartFromHome = (p) => {
    const productReady = prepareProductForCart(p, "index_super_admin");
    if (productReady.variants && productReady.variants.length > 0) {
      handleSelectProduct(productReady);
      return;
    }
    const stock = Number(productReady.totalStock ?? productReady.stock ?? 0);
    const baseKeyPrefix = `${productReady.id}-default`;
    const inCart = items
      .filter((i) => i.key === baseKeyPrefix || i.key.startsWith(`${baseKeyPrefix}-mod`))
      .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    if (stock <= 0) {
      toast.error("Este producto se encuentra agotado");
      return;
    }
    if (inCart >= stock) {
      toast.error(`Ya tienes el límite disponible (${stock} unidades) en tu bolsa`);
      return;
    }
    const added = addItem({ ...productReady, _origenVenta: "index_super_admin" }, null, 1);
    if (added !== false) {
      toast.success(`¡"${productReady.name}" agregado a tu bolsa! 🛍️`);
    }
  };

  // 🌟 NAVEGACIÓN DIRECTA A LA TIENDA DEL PRODUCTO CON RADAR DE COMISIÓN
  const goToStoreWithRadar = (storeId, productId = null) => {
    if (!storeId) return;
    sessionStorage.setItem("origenVenta", "index_super_admin");
    const queryStr = productId ? `?product=${productId}&ref=index` : `?ref=index`;
    navigate(`/${storeId}${queryStr}`);
  };

  const handleGoToStore = (storeId) => {
    if (!storeId) return;
    goToStoreWithRadar(storeId);
  };

  const [globalSettings, setGlobalSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("global_branding");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          companyName: parsed.companyName || "",
          companyLogo: parsed.companyLogo || "",
          sections: parsed.homepageSections || {
            topStores: true,
            randomProducts: true,
            bestSellers: true,
            offers: true,
            dailyTop: true,
          },
        };
      }
    } catch (e) {}
    return {
      companyName: "",
      companyLogo: "",
      sections: {
        topStores: true,
        randomProducts: true,
        bestSellers: true,
        offers: true,
        dailyTop: true,
      },
    };
  });

  // 🌟 BANNERS INTERACTIVOS DEL HERO
  const heroBanners = [
    {
      badge: "🔥 REBAJAS DE TEMPORADA",
      title: "Compra en tus tiendas favoritas desde un solo lugar",
      desc: "Explora cientos de productos exclusivos, arma tu bolsa multitienda y recibe en toda Venezuela.",
      ctaText: "Explorar Ofertas Flash",
      ctaAction: () => navigate("/ofertas"),
      secondaryText: "Ver Tiendas Oficiales",
      secondaryAction: () => setIsStoresModalOpen(true),
      gradient: "from-slate-950 via-slate-900 to-pink-950",
      accent: "from-pink-500 to-rose-500",
      img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1600",
    },
    {
      badge: "✨ COLECCIÓN VERIFICADA",
      title: "Moda, Bisutería y Accesorios en Tendencia",
      desc: "Tiendas verificadas con atención directa, precios actualizados y métodos de pago locales.",
      ctaText: "Ver Bisutería y Moda",
      ctaAction: () => {
        const target = document.getElementById("seccion-catalogo");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      },
      secondaryText: "Directorio de Tiendas",
      secondaryAction: () => setIsStoresModalOpen(true),
      gradient: "from-indigo-950 via-slate-900 to-purple-950",
      accent: "from-indigo-500 to-purple-500",
      img: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=1600",
    },
    {
      badge: "🚀 VENDE EN NUESTRA PLATAFORMA",
      title: "¿Tienes una tienda? Lleva tus ventas al siguiente nivel",
      desc: "Registra tu catálogo gratis, recibe pedidos por WhatsApp y aparece en nuestra vitrina principal.",
      ctaText: "Crear mi Tienda Gratis",
      ctaAction: () => navigate("/registro-vendedor"),
      secondaryText: "Iniciar Sesión",
      secondaryAction: () => navigate("/login"),
      gradient: "from-slate-900 via-zinc-900 to-neutral-950",
      accent: "from-amber-500 to-orange-500",
      img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1600",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  useEffect(() => {
    if (isMobileMenuOpen || isStoresModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen, isStoresModalOpen]);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        let currentSections = {
          topStores: true,
          randomProducts: true,
          bestSellers: true,
          offers: true,
          dailyTop: true,
        };

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.homepageSections) {
            currentSections = data.homepageSections;
          }
          const updatedSettings = {
            companyName: data.companyName || "",
            companyLogo: data.companyLogo || "",
            sections: currentSections,
          };
          setGlobalSettings(updatedSettings);
          try {
            localStorage.setItem(
              "global_branding",
              JSON.stringify({
                companyName: updatedSettings.companyName,
                companyLogo: updatedSettings.companyLogo,
                homepageSections: currentSections,
              })
            );
          } catch (e) {}
        }

        const storesSnap = await getDocs(collection(db, "stores"));
        const allStores = storesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const sMap = {};
        const vMap = {};
        allStores.forEach((s) => {
          sMap[s.id] = s.nombre || s.name || s.id;
          vMap[s.id] = s.verification?.status === "verified";
        });
        setStoresMap(sMap);
        setVerifiedStoresMap(vMap);

        const activeStoresList = allStores.filter((s) => s.isActive !== false && !(s.deuda_comision > 20));
        setAllActiveStores(activeStoresList);

        // Priorizamos tiendas verificadas para la sección destacada
        const activeVerifiedStores = activeStoresList.filter(
          (s) => s.verification?.status === "verified"
        );
        setStores(
          activeVerifiedStores.length > 0
            ? activeVerifiedStores.slice(0, 8)
            : activeStoresList.slice(0, 8)
        );

        const allActiveStoreIds = activeStoresList.map((s) => s.id);

        const prodSnap = await getDocs(query(collection(db, "products"), limit(120)));
        const allActiveProducts = prodSnap.docs
          .map((d) => ({ id: d.id, ...d.data(), _origenVenta: "index_super_admin" }))
          .filter((p) => allActiveStoreIds.includes(p.storeId));

        setAllProducts(allActiveProducts);

        if (currentSections.randomProducts) {
          const randomList = [...allActiveProducts]
            .sort(() => 0.5 - Math.random())
            .slice(0, 20);
          setProducts(randomList);
        }
        if (currentSections.bestSellers) {
          const bsList = [...allActiveProducts]
            .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
            .slice(0, 12);
          setBestSellers(bsList);
        }
        if (currentSections.offers) {
          const actualOffers = allActiveProducts.filter(
            (p) => calculateProductPricing(p).hasDiscount
          );
          const offersList =
            actualOffers.length > 0
              ? actualOffers.slice(0, 12)
              : [...allActiveProducts].sort(() => 0.5 - Math.random()).slice(0, 12);
          setOffersProducts(offersList);
        }
        if (currentSections.dailyTop) {
          const dtList = [...allActiveProducts]
            .slice(0, 14)
            .sort(() => 0.5 - Math.random());
          setDailyTopProducts(dtList);
        }
      } catch (error) {
        console.error("Error cargando marketplace:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGlobalData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowSearchSuggestions(false);
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  // 🌟 CATEGORÍAS CON PALABRAS CLAVE PARA BÚSQUEDA INTELIGENTE
  const categories = [
    {
      icon: "💎",
      name: "Bisutería",
      color: "from-pink-50 to-rose-50 border-pink-100",
      keywords: ["collar", "pulsera", "zarcillo", "anillo", "cadena", "joya", "acero", "bisuteria", "dije", "fantasia"],
    },
    {
      icon: "👗",
      name: "Moda",
      color: "from-purple-50 to-indigo-50 border-purple-100",
      keywords: ["guante", "ropa", "moda", "accesorio", "invierno", "blusa", "vestido", "franela"],
    },
    {
      icon: "📿",
      name: "Collares",
      color: "from-amber-50 to-yellow-50 border-amber-100",
      keywords: ["collar", "collares", "dije", "cadena", "choker"],
    },
    {
      icon: "💍",
      name: "Pulseras",
      color: "from-rose-50 to-orange-50 border-rose-100",
      keywords: ["pulsera", "pulseras", "brazalete", "manilla"],
    },
    {
      icon: "✨",
      name: "Zarcillos",
      color: "from-sky-50 to-blue-50 border-sky-100",
      keywords: ["zarcillo", "zarcillos", "pendiente", "aretes", "topos"],
    },
    {
      icon: "🎀",
      name: "Cabello",
      color: "from-fuchsia-50 to-pink-50 border-fuchsia-100",
      keywords: ["pinza", "bandana", "cola", "cabello", "pelo", "moño", "estrellas", "cintillo", "scrunchie"],
    },
    {
      icon: "🧸",
      name: "Juguetes",
      color: "from-emerald-50 to-teal-50 border-emerald-100",
      keywords: ["juguete", "peluche", "conejo", "niño", "juego", "muñeco"],
    },
    {
      icon: "⌚",
      name: "Relojes",
      color: "from-slate-50 to-zinc-100 border-slate-200",
      keywords: ["reloj", "relojes", "dama", "caballero", "smartwatch"],
    },
    {
      icon: "👟",
      name: "Calzado",
      color: "from-orange-50 to-amber-50 border-orange-100",
      keywords: ["zapato", "calzado", "bota", "sandalia", "tenis"],
    },
    {
      icon: "💻",
      name: "Tecnología",
      color: "from-cyan-50 to-blue-50 border-cyan-100",
      keywords: ["tecnologia", "celular", "audifono", "gadget", "cargador", "forro"],
    },
  ];

  // Conteo de productos por categoría para mostrar indicador real
  const categoryCounts = useMemo(() => {
    const counts = {};
    categories.forEach((cat) => {
      counts[cat.name] = allProducts.filter((p) => {
        const text = `${p.name || ""} ${p.category || ""} ${p.description || ""}`.toLowerCase();
        return cat.keywords.some((k) => text.includes(k.toLowerCase()));
      }).length;
    });
    return counts;
  }, [allProducts]);

  // Sugerencias en vivo del buscador
  const liveSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return { products: [], stores: [] };

    const matchedProducts = allProducts
      .filter((p) => {
        const text = `${p.name || ""} ${p.category || ""} ${storesMap[p.storeId] || ""}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 5);

    const matchedStores = allActiveStores
      .filter((s) => (s.nombre || s.name || s.id || "").toLowerCase().includes(q))
      .slice(0, 3);

    return { products: matchedProducts, stores: matchedStores };
  }, [searchTerm, allProducts, allActiveStores, storesMap]);

  const handleCategoryClick = (cat) => {
    if (selectedCategory?.name === cat.name) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(cat);
      const target = document.getElementById("seccion-catalogo");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Productos filtrados y ordenados en el catálogo principal
  const displayedProducts = useMemo(() => {
    let base = selectedCategory || selectedStoreFilter !== "all" ? [...allProducts] : [...products];

    if (selectedCategory) {
      base = base.filter((p) => {
        const text = `${p.name || ""} ${p.category || ""} ${p.description || ""}`.toLowerCase();
        return selectedCategory.keywords.some((k) => text.includes(k.toLowerCase()));
      });
    }

    if (selectedStoreFilter !== "all") {
      base = base.filter((p) => p.storeId === selectedStoreFilter);
    }

    if (sortBy === "price_asc") {
      base.sort((a, b) => calculateProductPricing(a).finalPrice - calculateProductPricing(b).finalPrice);
    } else if (sortBy === "price_desc") {
      base.sort((a, b) => calculateProductPricing(b).finalPrice - calculateProductPricing(a).finalPrice);
    } else if (sortBy === "popular") {
      base.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    }

    return base;
  }, [selectedCategory, selectedStoreFilter, sortBy, allProducts, products]);

  // Conteo de productos por tienda para el directorio
  const storeProductCounts = useMemo(() => {
    const map = {};
    allProducts.forEach((p) => {
      if (p.storeId) map[p.storeId] = (map[p.storeId] || 0) + 1;
    });
    return map;
  }, [allProducts]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24 relative overflow-x-hidden">
      {/* =========================================
          🌟 TOP BAR DE CONFIANZA
      ========================================= */}
      <div className="bg-slate-950 text-white text-[11px] py-2 px-4 border-b border-white/10">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium text-slate-300 truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Marketplace Multitienda Oficial •{" "}
              <strong className="text-white">{allActiveStores.length || "Múltiples"} tiendas activas</strong> con envíos a toda Venezuela
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-5 text-slate-300 shrink-0">
            <button
              type="button"
              onClick={() => setIsStoresModalOpen(true)}
              className="hover:text-pink-400 transition-colors font-semibold flex items-center gap-1"
            >
              <span>🏪</span> Directorio de Tiendas
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => navigate("/ofertas")}
              className="hover:text-pink-400 transition-colors font-semibold flex items-center gap-1"
            >
              <span>⚡</span> Ofertas Flash
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => navigate("/registro-vendedor")}
              className="text-pink-400 hover:text-pink-300 transition-colors font-bold"
            >
              Vende con nosotros →
            </button>
          </div>
        </div>
      </div>

      {/* =========================================
          🌟 MENÚ MÓVIL (DRAWER)
      ========================================= */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div
          className={`absolute top-0 left-0 bottom-0 w-[86%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-900 to-pink-950 text-white">
            <div className="flex items-center gap-2.5">
              {globalSettings.companyLogo ? (
                <img
                  src={globalSettings.companyLogo}
                  alt="Logo"
                  className="max-h-9 object-contain bg-white px-2.5 py-1 rounded-xl shadow-xs"
                />
              ) : (
                <span className="text-lg font-black tracking-tight">
                  {globalSettings.companyName || "MultiTienda"}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto bg-slate-50/60 space-y-5">
            {activeUser ? (
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">
                  Sesión Activa
                </p>
                <p className="text-sm font-bold text-slate-900 truncate mb-4">{activeUser.email}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-xl transition-colors text-xs active:scale-95 shadow-xs hover:bg-pink-600"
                  >
                    Ir a mi Panel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2.5 rounded-xl transition-colors text-xs active:scale-95"
                  >
                    Salir
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/login");
                  }}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-3.5 rounded-2xl transition-colors shadow-xs text-xs uppercase tracking-wider"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Iniciar Sesión Vendedor
                </button>
                <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 p-4 rounded-2xl border border-pink-100">
                  <p className="text-xs font-extrabold text-slate-900 mb-1">¿Tienes una tienda o marca?</p>
                  <p className="text-[11px] text-slate-600 mb-3">
                    Publica tus productos y vende en piloto automático por WhatsApp.
                  </p>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/registro-vendedor");
                    }}
                    className="w-full flex justify-center items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-xs text-xs"
                  >
                    ✨ Crear mi tienda gratis
                  </button>
                </div>
              </div>
            )}

            {/* Accesos Rápidos Móvil */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsOpen(true);
                }}
                className="flex flex-col items-start p-3.5 bg-white border border-slate-200/70 rounded-2xl hover:border-pink-300 transition-all"
              >
                <span className="text-xl mb-1">🛍️</span>
                <span className="text-xs font-extrabold text-slate-800">Mi Bolsa</span>
                <span className="text-[10px] text-pink-600 font-bold">{itemCount} artículos</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsStoresModalOpen(true);
                }}
                className="flex flex-col items-start p-3.5 bg-white border border-slate-200/70 rounded-2xl hover:border-pink-300 transition-all"
              >
                <span className="text-xl mb-1">🏪</span>
                <span className="text-xs font-extrabold text-slate-800">Tiendas</span>
                <span className="text-[10px] text-slate-500 font-semibold">{allActiveStores.length} disponibles</span>
              </button>
            </div>

            {/* Departamentos */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                Explorar por Categoría
              </p>
              <div className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
                {categories.map((cat, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleCategoryClick(cat);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-pink-50/50 text-slate-700 font-semibold text-sm transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {categoryCounts[cat.name] > 0 && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {categoryCounts[cat.name]}
                        </span>
                      )}
                      <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          🌟 HEADER PRINCIPAL (GLASSMORPHISM)
      ========================================= */}
      <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-200/70 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
        <div className="max-w-[1240px] mx-auto">
          <div className="flex items-center gap-3 sm:gap-6 py-3 px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => {
                setSelectedCategory(null);
                setSelectedStoreFilter("all");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {globalSettings.companyLogo ? (
                <img
                  src={globalSettings.companyLogo}
                  alt="Logo"
                  className="max-h-10 sm:max-h-11 w-auto object-contain"
                />
              ) : globalSettings.companyName ? (
                <span className="text-2xl sm:text-3xl font-black tracking-tighter bg-gradient-to-r from-slate-900 via-pink-600 to-rose-600 text-transparent bg-clip-text">
                  {globalSettings.companyName}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white font-black text-lg shadow-sm">
                    M
                  </div>
                  <span className="text-xl font-black tracking-tight text-slate-900 hidden sm:inline">
                    Multi<span className="text-pink-600">Tienda</span>
                  </span>
                </div>
              )}
            </div>

            {/* Buscador Central con Autocompletado en Vivo */}
            <div ref={searchContainerRef} className="flex-1 relative">
              <form
                onSubmit={handleSearch}
                className="relative w-full flex items-center rounded-2xl bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white border border-transparent focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-500/10 transition-all duration-200"
              >
                <span className="pl-3.5 sm:pl-4 text-slate-400 pointer-events-none">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  placeholder="Buscar productos, tiendas, collares, moda..."
                  className="w-full bg-transparent py-2.5 sm:py-3 pl-2.5 pr-20 outline-none text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="text-slate-400 hover:text-slate-600 p-1.5 mr-1"
                    title="Limpiar"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="submit"
                  className="mr-1.5 bg-slate-900 hover:bg-pink-600 text-white text-xs font-bold px-3.5 py-1.5 sm:py-2 rounded-xl transition-colors shrink-0 hidden sm:inline-flex items-center gap-1"
                >
                  Buscar
                </button>
              </form>

              {/* Dropdown de Sugerencias en Vivo */}
              {showSearchSuggestions &&
                searchTerm.trim().length >= 2 &&
                (liveSuggestions.products.length > 0 || liveSuggestions.stores.length > 0) && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 divide-y divide-slate-100">
                    {liveSuggestions.stores.length > 0 && (
                      <div className="p-3 bg-slate-50/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                          Tiendas Oficiales
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {liveSuggestions.stores.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setShowSearchSuggestions(false);
                                goToStoreWithRadar(s.id);
                              }}
                              className="flex items-center gap-2 bg-white hover:bg-pink-50 border border-slate-200/80 hover:border-pink-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 transition-colors"
                            >
                              <span>🏪</span>
                              <span>{s.nombre || s.id}</span>
                              {s.verification?.status === "verified" && (
                                <VerifiedBadge variant="starburst" size="xs" showTooltip={false} />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {liveSuggestions.products.length > 0 && (
                      <div className="p-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
                          Productos sugeridos
                        </p>
                        {liveSuggestions.products.map((prod) => {
                          const thumb = normalizeImageUrl(
                            (Array.isArray(prod.images) && prod.images[0]) || prod.image || prod.imageUrl
                          );
                          const pr = calculateProductPricing(prod);
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => {
                                setShowSearchSuggestions(false);
                                handleSelectProduct(prod);
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-2xl transition-colors text-left"
                            >
                              <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
                                {thumb ? (
                                  <img src={thumb} alt={prod.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="flex items-center justify-center h-full text-sm">📷</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  🏪 {storesMap[prod.storeId] || prod.storeId}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-black text-pink-600">
                                  ${Number(pr.finalPrice || 0).toFixed(2)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={handleSearch}
                          className="w-full mt-1 py-2 text-center text-xs font-bold text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"
                        >
                          Ver todos los resultados para "{searchTerm}" →
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Acciones Derecha */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Botón de Bolsa de Compras */}
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="relative flex items-center gap-2 bg-slate-100 hover:bg-pink-50 text-slate-800 hover:text-pink-600 px-3 sm:px-4 py-2.5 rounded-2xl transition-all group active:scale-95"
                title="Mi Bolsa de Compras"
              >
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <span className="hidden sm:inline text-xs font-extrabold">Bolsa</span>
                {itemCount > 0 && (
                  <span className="bg-pink-600 text-white text-[10px] font-black min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow-xs">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Usuario / Vendedor en Desktop */}
              {activeUser ? (
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-pink-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <span>⚡</span>
                    <span>Mi Panel</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2.5 rounded-2xl transition-colors"
                    title="Cerrar Sesión"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => navigate("/login")}
                    className="text-xs font-bold text-slate-700 hover:text-pink-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Ingresar
                  </button>
                  <button
                    onClick={() => navigate("/registro-vendedor")}
                    className="bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Crea tu tienda
                  </button>
                </div>
              )}

              {/* Botón Menú Móvil */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-slate-800 hover:bg-slate-100 rounded-2xl transition-colors active:scale-90 md:hidden"
                aria-label="Abrir menú"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sub-barra de Navegación Rápida (Desktop) */}
          <div className="hidden md:flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-900 px-3 py-1.5 rounded-xl font-bold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Departamentos
              </button>

              <button
                type="button"
                onClick={() => navigate("/ofertas")}
                className="px-3 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors flex items-center gap-1"
              >
                <span>🔥</span> Ofertas Flash
              </button>

              <button
                type="button"
                onClick={() => setIsStoresModalOpen(true)}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <span>🏪</span> Tiendas Oficiales ({allActiveStores.length})
              </button>

              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    selectedCategory?.name === cat.name
                      ? "bg-pink-600 text-white font-bold"
                      : "hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span>🛡️</span> Compra directa y verificada
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================
          🌟 HERO BANNER MODERNO + BARRA DE BENEFICIOS
      ========================================= */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="relative w-full h-[250px] sm:h-[320px] md:h-[370px] rounded-3xl sm:rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.08)] bg-slate-950">
          <AnimatePresence mode="sync">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className={`absolute inset-0 bg-gradient-to-r ${heroBanners[currentSlide].gradient}`}
            >
              <img
                src={heroBanners[currentSlide].img}
                alt={heroBanners[currentSlide].title}
                className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 md:p-14 max-w-2xl text-white">
                <span
                  className={`bg-gradient-to-r ${heroBanners[currentSlide].accent} text-white px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase w-fit mb-3 shadow-lg`}
                >
                  {heroBanners[currentSlide].badge}
                </span>
                <h1 className="text-2xl sm:text-4xl md:text-[42px] font-black leading-[1.1] tracking-tight mb-2.5 sm:mb-3 drop-shadow-xs">
                  {heroBanners[currentSlide].title}
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-slate-200/90 max-w-xl mb-5 sm:mb-6 line-clamp-2 sm:line-clamp-none">
                  {heroBanners[currentSlide].desc}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={heroBanners[currentSlide].ctaAction}
                    className="bg-white text-slate-950 hover:bg-pink-500 hover:text-white font-black text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl transition-all shadow-lg active:scale-95"
                  >
                    {heroBanners[currentSlide].ctaText} →
                  </button>
                  <button
                    type="button"
                    onClick={heroBanners[currentSlide].secondaryAction}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl transition-all active:scale-95"
                  >
                    {heroBanners[currentSlide].secondaryText}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controles Laterales del Slider */}
          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? heroBanners.length - 1 : prev - 1))}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/30 hover:bg-white text-white hover:text-slate-900 rounded-full items-center justify-center backdrop-blur-md border border-white/15 transition-all active:scale-90"
            aria-label="Banner anterior"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % heroBanners.length)}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/30 hover:bg-white text-white hover:text-slate-900 rounded-full items-center justify-center backdrop-blur-md border border-white/15 transition-all active:scale-90"
            aria-label="Siguiente banner"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Indicadores inferiores */}
          <div className="absolute bottom-4 right-6 z-20 flex gap-2">
            {heroBanners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === i ? "w-8 bg-pink-500" : "w-2 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Ir al slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Barra de Beneficios Estilo Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-lg shrink-0">
              💳
            </div>
            <div>
              <h4 className="text-slate-900 font-extrabold text-xs sm:text-sm leading-tight">
                Pago Móvil y Divisas
              </h4>
              <p className="text-slate-500 text-[11px] hidden sm:block">Pagos rápidos directo a cada tienda</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
              🚚
            </div>
            <div>
              <h4 className="text-slate-900 font-extrabold text-xs sm:text-sm leading-tight">
                Envíos a Nivel Nacional
              </h4>
              <p className="text-slate-500 text-[11px] hidden sm:block">MRW, Zoom, Tealca y Delivery local</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
              🛡️
            </div>
            <div>
              <h4 className="text-slate-900 font-extrabold text-xs sm:text-sm leading-tight">
                Tiendas Verificadas
              </h4>
              <p className="text-slate-500 text-[11px] hidden sm:block">Vendedores calificados y auditados</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0">
              🛍️
            </div>
            <div>
              <h4 className="text-slate-900 font-extrabold text-xs sm:text-sm leading-tight">
                Bolsa Multitienda
              </h4>
              <p className="text-slate-500 text-[11px] hidden sm:block">Agrega de varias tiendas a la vez</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          🌟 CONTENIDO PRINCIPAL
      ========================================= */}
      {loading ? (
        <MarketplaceSkeleton />
      ) : (
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
          {/* =========================================
              🌟 CATEGORÍAS INTERACTIVAS CON CONTADOR
          ========================================= */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Explorar por Categoría
                </h2>
                <p className="text-xs text-slate-500">
                  Filtra al instante entre todos los catálogos disponibles
                </p>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs bg-pink-50 text-pink-600 hover:bg-pink-100 px-3 py-1.5 rounded-full font-extrabold transition-colors"
                >
                  ✕ Quitar filtro ({selectedCategory.name})
                </button>
              )}
            </div>

            <div className="flex overflow-x-auto gap-3 sm:gap-3.5 pb-2 hide-scrollbar snap-x">
              {categories.map((cat, i) => {
                const isActive = selectedCategory?.name === cat.name;
                const count = categoryCounts[cat.name] || 0;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className={`flex flex-col items-center justify-center min-w-[92px] sm:min-w-[108px] p-3 rounded-3xl border transition-all duration-300 snap-start group active:scale-95 ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/15 -translate-y-0.5"
                        : "bg-white hover:bg-pink-50/40 text-slate-700 border-slate-100 hover:border-pink-200 shadow-xs hover:-translate-y-0.5"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-2 transition-transform duration-300 group-hover:scale-110 ${
                        isActive ? "bg-white/15" : `bg-gradient-to-br ${cat.color} border`
                      }`}
                    >
                      {cat.icon}
                    </div>
                    <span className="text-xs font-extrabold truncate w-full text-center">{cat.name}</span>
                    <span
                      className={`text-[10px] font-semibold mt-0.5 ${
                        isActive ? "text-pink-300" : "text-slate-400"
                      }`}
                    >
                      {count} {count === 1 ? "item" : "items"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* =========================================
              🌟 TIENDAS OFICIALES DESTACADAS
          ========================================= */}
          {!selectedCategory && globalSettings.sections.topStores && stores.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-1">
                    <span>✓</span> Vendedores Destacados
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Tiendas Oficiales
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStoresModalOpen(true)}
                  className="text-xs sm:text-sm font-extrabold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100/80 px-4 py-2 rounded-2xl transition-colors flex items-center gap-1"
                >
                  <span>Ver todas ({allActiveStores.length})</span>
                  <span>→</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
                {stores.slice(0, 4).map((store, i) => {
                  const gradients = [
                    "from-pink-500/15 via-rose-500/10 to-amber-500/10",
                    "from-blue-500/15 via-indigo-500/10 to-cyan-500/10",
                    "from-purple-500/15 via-fuchsia-500/10 to-pink-500/10",
                    "from-emerald-500/15 via-teal-500/10 to-cyan-500/10",
                  ];
                  const prodCount = storeProductCounts[store.id] || store.total_productos || 0;
                  const storeAvatar = normalizeImageUrl(store.appLogos?.icon192 || store.profileImage);

                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => goToStoreWithRadar(store.id)}
                      className="group bg-white rounded-3xl p-4 border border-slate-100 hover:border-pink-200 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden hover:-translate-y-1"
                    >
                      {/* Fondo Superior Decorativo */}
                      <div
                        className={`absolute top-0 inset-x-0 h-20 bg-gradient-to-br ${
                          gradients[i % gradients.length]
                        }`}
                      />

                      {/* Avatar de la Tienda */}
                      <div className="relative z-10 mt-3 mb-2.5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white border-4 border-white shadow-md flex items-center justify-center text-2xl">
                          {storeAvatar ? (
                            <img
                              src={storeAvatar}
                              alt={store.nombre}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <span className="text-slate-400">🏪</span>
                          )}
                        </div>
                        {store.verification?.status === "verified" && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                            <VerifiedBadge variant="starburst" size="sm" showTooltip={false} />
                          </div>
                        )}
                      </div>

                      {/* Nombre y Meta */}
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate w-full group-hover:text-pink-600 transition-colors">
                        {store.nombre || store.id}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 mb-3">
                        {store.heroTitle || "Tienda Oficial Verificada"}
                      </p>

                      <div className="mt-auto w-full pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-500">
                          {prodCount > 0 ? `${prodCount} productos` : "Catálogo activo"}
                        </span>
                        <span className="font-extrabold text-pink-600 group-hover:translate-x-0.5 transition-transform">
                          Visitar →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* =========================================
              🌟 CATÁLOGO PRINCIPAL DE PRODUCTOS (CON FILTROS Y ORDENAMIENTO)
          ========================================= */}
          <section id="seccion-catalogo" className="scroll-mt-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                  {selectedCategory ? (
                    <>
                      <span>{selectedCategory.icon}</span>
                      <span>Catálogo de {selectedCategory.name}</span>
                      <span className="bg-pink-100 text-pink-700 text-xs font-extrabold px-3 py-0.5 rounded-full">
                        {displayedProducts.length} resultados
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Descubrimiento para ti</span>
                      <span className="bg-pink-50 text-pink-600 border border-pink-100 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider">
                        Multitienda
                      </span>
                    </>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Combina productos de distintas tiendas en una misma bolsa de compras
                </p>
              </div>

              {/* Controles de Filtro por Tienda y Ordenamiento */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedStoreFilter}
                  onChange={(e) => setSelectedStoreFilter(e.target.value)}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-pink-500 transition-colors cursor-pointer"
                >
                  <option value="all">🏪 Todas las tiendas</option>
                  {allActiveStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre || s.id}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-pink-500 transition-colors cursor-pointer"
                >
                  <option value="recommended">✨ Recomendados</option>
                  <option value="popular">🔥 Más vendidos</option>
                  <option value="price_asc">💲 Precio: Menor a Mayor</option>
                  <option value="price_desc">💎 Precio: Mayor a Menor</option>
                </select>

                {(selectedCategory || selectedStoreFilter !== "all" || sortBy !== "recommended") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedStoreFilter("all");
                      setSortBy("recommended");
                    }}
                    className="text-xs text-rose-600 hover:bg-rose-50 font-extrabold px-3 py-2 rounded-xl border border-rose-100 transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {displayedProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {displayedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    storeName={storesMap[p.storeId]}
                    isStoreVerified={verifiedStoresMap[p.storeId]}
                    bsPrice={bsPrice}
                    onClick={() => handleSelectProduct(p)}
                    onAddToCart={handleAddToCartFromHome}
                    onGoToStore={handleGoToStore}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 py-14 px-4 text-center shadow-xs">
                <span className="text-4xl block mb-3">{selectedCategory?.icon || "🔍"}</span>
                <p className="font-extrabold text-slate-900 text-base mb-1">
                  No encontramos productos con este filtro
                </p>
                <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
                  Prueba seleccionando otra categoría o explora todos los productos disponibles en la plataforma.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedStoreFilter("all");
                  }}
                  className="bg-slate-900 hover:bg-pink-600 text-white text-xs font-extrabold py-3 px-6 rounded-2xl transition-colors shadow-sm"
                >
                  Ver todos los productos
                </button>
              </div>
            )}
          </section>

          {/* =========================================
              🌟 OFERTAS ESPECIALES / FLASH
          ========================================= */}
          {!selectedCategory && globalSettings.sections.offers && offersProducts.length > 0 && (
            <section className="bg-gradient-to-br from-rose-500/5 via-orange-500/5 to-pink-500/5 border border-rose-100 rounded-[2rem] p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider mb-1 animate-pulse">
                    <span>⚡</span> Precios Rebajados
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Ofertas Destacadas
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/ofertas")}
                  className="text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-white px-4 py-2 rounded-2xl border border-rose-100 shadow-xs transition-all"
                >
                  Ver todas →
                </button>
              </div>

              <HorizontalCarousel id="offer-carousel">
                {offersProducts.map((p) => (
                  <div
                    key={`offer-${p.id}`}
                    className="min-w-[175px] max-w-[175px] sm:min-w-[215px] sm:max-w-[215px] shrink-0 snap-start"
                  >
                    <ProductCard
                      p={p}
                      storeName={storesMap[p.storeId]}
                      isStoreVerified={verifiedStoresMap[p.storeId]}
                      bsPrice={bsPrice}
                      onClick={() => handleSelectProduct(p)}
                      onAddToCart={handleAddToCartFromHome}
                      onGoToStore={handleGoToStore}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* =========================================
              🌟 LOS MÁS VENDIDOS (CON RANKING)
          ========================================= */}
          {!selectedCategory && globalSettings.sections.bestSellers && bestSellers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    🏆 Favoritos del Público
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1">
                    Los Más Vendidos
                  </h2>
                </div>
              </div>
              <HorizontalCarousel id="bs-carousel">
                {bestSellers.map((p, idx) => (
                  <div
                    key={`bs-${p.id}`}
                    className="min-w-[175px] max-w-[175px] sm:min-w-[215px] sm:max-w-[215px] shrink-0 snap-start"
                  >
                    <ProductCard
                      p={p}
                      rank={idx + 1}
                      storeName={storesMap[p.storeId]}
                      isStoreVerified={verifiedStoresMap[p.storeId]}
                      bsPrice={bsPrice}
                      onClick={() => handleSelectProduct(p)}
                      onAddToCart={handleAddToCartFromHome}
                      onGoToStore={handleGoToStore}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* =========================================
              🌟 TENDENCIAS DE HOY
          ========================================= */}
          {!selectedCategory && globalSettings.sections.dailyTop && dailyTopProducts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                    ✨ Selección Diaria
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1">
                    Tendencias de Hoy
                  </h2>
                </div>
              </div>
              <HorizontalCarousel id="daily-carousel">
                {dailyTopProducts.map((p) => (
                  <div
                    key={`top-${p.id}`}
                    className="min-w-[175px] max-w-[175px] sm:min-w-[215px] sm:max-w-[215px] shrink-0 snap-start"
                  >
                    <ProductCard
                      p={p}
                      storeName={storesMap[p.storeId]}
                      isStoreVerified={verifiedStoresMap[p.storeId]}
                      bsPrice={bsPrice}
                      onClick={() => handleSelectProduct(p)}
                      onAddToCart={handleAddToCartFromHome}
                      onGoToStore={handleGoToStore}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* =========================================
              🌟 VISTOS RECIENTEMENTE (HISTORIAL EN VIVO)
          ========================================= */}
          {recentlyViewed.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    🕒 Vistos Recientemente
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("marketplace_recently_viewed");
                    setRecentlyViewed([]);
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Borrar historial
                </button>
              </div>
              <HorizontalCarousel id="recent-carousel">
                {recentlyViewed.map((p) => (
                  <div
                    key={`recent-${p.id}`}
                    className="min-w-[165px] max-w-[165px] sm:min-w-[195px] sm:max-w-[195px] shrink-0 snap-start"
                  >
                    <ProductCard
                      p={p}
                      storeName={storesMap[p.storeId]}
                      isStoreVerified={verifiedStoresMap[p.storeId]}
                      bsPrice={bsPrice}
                      onClick={() => handleSelectProduct(p)}
                      onAddToCart={handleAddToCartFromHome}
                      onGoToStore={handleGoToStore}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* =========================================
              🌟 BANNERS DE COLECCIONES (BENTO GRID)
          ========================================= */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() =>
                handleCategoryClick(categories[1]) // Moda
              }
              className="group bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-3xl overflow-hidden cursor-pointer relative h-44 sm:h-52 flex items-center px-6 sm:px-10 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="relative z-10 max-w-[65%]">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-200 bg-white/10 px-2.5 py-1 rounded-full">
                  Colección Destacada
                </span>
                <h3 className="text-white font-black text-xl sm:text-2xl mt-2 mb-1">
                  Moda & Accesorios
                </h3>
                <p className="text-purple-100/80 text-xs sm:text-sm mb-4">
                  Renueva tu estilo con las mejores tiendas
                </p>
                <span className="bg-white text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl inline-flex items-center gap-1 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                  Explorar Moda →
                </span>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center mask-image-gradient-left opacity-75 group-hover:scale-105 transition-transform duration-700" />
            </div>

            <div
              onClick={() => navigate("/ofertas")}
              className="group bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 rounded-3xl overflow-hidden cursor-pointer relative h-44 sm:h-52 flex items-center px-6 sm:px-10 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="relative z-10 max-w-[65%]">
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-black/20 px-2.5 py-1 rounded-full">
                  ⚡ Tiempo Limitado
                </span>
                <h3 className="text-white font-black text-xl sm:text-2xl mt-2 mb-1">
                  Zona de Ofertas Flash
                </h3>
                <p className="text-white/90 text-xs sm:text-sm mb-4">
                  Descuentos reales directo de tienda
                </p>
                <span className="bg-slate-950 text-white text-xs font-extrabold px-4 py-2 rounded-xl inline-flex items-center gap-1 group-hover:bg-white group-hover:text-slate-950 transition-colors">
                  Ver Ofertas →
                </span>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center mask-image-gradient-left opacity-75 group-hover:scale-105 transition-transform duration-700" />
            </div>
          </section>

          {/* =========================================
              🌟 BANNER CTA VENDEDORES
          ========================================= */}
          {!activeUser ? (
            <div className="bg-slate-950 text-white rounded-[2rem] p-6 sm:p-10 md:p-12 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="max-w-xl relative z-10 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-400 bg-pink-500/10 border border-pink-500/20 px-3 py-1 rounded-full">
                  🚀 Impulsa tu negocio
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-3 mb-2 tracking-tight">
                  Empieza a vender en {globalSettings.companyName || "nuestro Marketplace"}
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Crea tu propia tienda virtual en minutos, recibe pedidos detallados en tu WhatsApp, administra tu inventario y aparece en la portada principal.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 relative z-10 shrink-0">
                <button
                  onClick={() => navigate("/registro-vendedor")}
                  className="bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-pink-600/25 active:scale-95"
                >
                  Crear mi tienda gratis
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/15 px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all"
                >
                  Ya tengo cuenta
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 rounded-[2rem] p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0 hidden sm:flex">
                  🚀
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">¡Hola de nuevo!</h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Gestiona tus productos, pedidos y estadísticas desde tu panel de control.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="bg-white text-slate-950 hover:bg-pink-500 hover:text-white px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition-colors shrink-0"
              >
                Ir a mi Panel →
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================
          🌟 MODAL DIRECTORIO DE TODAS LAS TIENDAS
      ========================================= */}
      <AnimatePresence>
        {isStoresModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setIsStoresModalOpen(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-3xl max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    🏪 Directorio de Tiendas ({allActiveStores.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecciona cualquier tienda para visitar su catálogo completo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStoresModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="px-5 sm:px-6 py-3 bg-slate-50 border-b border-slate-100">
                <input
                  type="text"
                  value={storeSearchQuery}
                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                  placeholder="Buscar tienda por nombre..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-pink-500"
                />
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allActiveStores
                  .filter((s) =>
                    (s.nombre || s.name || s.id || "")
                      .toLowerCase()
                      .includes(storeSearchQuery.toLowerCase())
                  )
                  .map((store) => {
                    const avatar = normalizeImageUrl(store.appLogos?.icon192 || store.profileImage);
                    const count = storeProductCounts[store.id] || store.total_productos || 0;
                    return (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => {
                          setIsStoresModalOpen(false);
                          goToStoreWithRadar(store.id);
                        }}
                        className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200/80 hover:border-pink-300 hover:bg-pink-50/30 transition-all text-left group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center text-xl">
                          {avatar ? (
                            <img src={avatar} alt={store.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <span>🏪</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-pink-600">
                              {store.nombre || store.id}
                            </h4>
                            {store.verification?.status === "verified" && (
                              <VerifiedBadge variant="starburst" size="xs" showTooltip={false} />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {store.heroTitle || "Tienda Oficial"}
                          </p>
                          <span className="text-[10px] font-bold text-pink-600">
                            {count > 0 ? `${count} productos` : "Visitar catálogo →"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================
          🌟 FOOTER MODERNO
      ========================================= */}
      <footer className="mt-20 border-t border-slate-200/80 bg-white">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
          <div className="md:col-span-1">
            {globalSettings.companyLogo ? (
              <img
                src={globalSettings.companyLogo}
                alt={globalSettings.companyName || "Logo"}
                className="max-h-10 mb-3 mx-auto md:mx-0 object-contain"
              />
            ) : (
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-slate-900 to-pink-600 text-transparent bg-clip-text mb-3 block">
                {globalSettings.companyName || "MultiTienda"}
              </span>
            )}
            <p className="text-xs text-slate-500 leading-relaxed">
              El marketplace multitienda donde compras directo a las mejores tiendas verificadas del país con un solo carrito.
            </p>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Explorar
            </h4>
            <ul className="text-xs text-slate-500 space-y-2 font-medium">
              <li>
                <button onClick={() => setIsStoresModalOpen(true)} className="hover:text-pink-600">
                  Tiendas Oficiales
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/ofertas")} className="hover:text-pink-600">
                  Ofertas Relámpago
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    const el = document.getElementById("seccion-catalogo");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="hover:text-pink-600"
                >
                  Catálogo General
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Vendedores
            </h4>
            <ul className="text-xs text-slate-500 space-y-2 font-medium">
              <li>
                <button onClick={() => navigate("/registro-vendedor")} className="hover:text-pink-600">
                  Crear tienda gratis
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/login")} className="hover:text-pink-600">
                  Acceso a mi panel
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Compra Segura
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tus pedidos se procesan directamente con cada tienda verificada, garantizando atención personalizada e inmediata.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-100 py-4 text-center text-[11px] text-slate-400">
          <p>
            Copyright © {new Date().getFullYear()} {globalSettings.companyName || "MultiTienda"}. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* 🌟 MODAL DE DETALLE DE PRODUCTO */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
      </AnimatePresence>

      {/* 🌟 BOLSA DE COMPRAS MULTITIENDA */}
      <CartDrawer onSelectProduct={handleSelectProduct} />

      {/* 🌟 BOTÓN FLOTANTE DE BOLSA SI HAY PRODUCTOS */}
      {!isOpen && !selectedProduct && itemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md h-[72px] bg-white/90 backdrop-blur-2xl rounded-full flex items-center justify-between p-1.5 pr-2.5 shadow-[0_20px_50px_rgba(236,72,153,0.18),0_10px_10px_rgba(0,0,0,0.05)] border border-pink-100 animate-in slide-in-from-bottom-10 fade-in duration-500 active:scale-[0.98] transition-transform">
          <div className="flex-1 flex flex-col justify-center px-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Total:</span>
              <span className="text-2xl font-black text-slate-950 tracking-tight">${total.toFixed(2)}</span>
            </div>
            <span className="text-[11px] font-bold text-pink-600 mt-[-1px]">
              {itemCount} {itemCount === 1 ? "artículo en bolsa" : "artículos en bolsa"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="h-[58px] min-w-[155px] bg-slate-950 hover:bg-pink-600 text-white rounded-full font-black uppercase tracking-[0.15em] text-[11px] relative overflow-hidden group active:scale-95 transition-all flex items-center justify-center gap-2 shadow-inner"
          >
            <span>Ver Bolsa</span>
            <span className="text-base group-hover:animate-bounce transition-transform">🛍️</span>
            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-xl">
              {itemCount}
            </span>
          </button>
        </div>
      )}

      {/* 🌟 CSS INYECTADO PARA MASKS Y SCROLLBARS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .mask-image-gradient-left {
          -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%);
          mask-image: linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%);
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
        }}
      />
    </div>
  );
}
