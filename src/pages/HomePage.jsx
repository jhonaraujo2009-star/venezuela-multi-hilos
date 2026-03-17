import { useState, useEffect } from "react";
import { collection, getDocs, query, limit, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion"; // 🌟 LÓGICA ULTRA PREMIUM

const ProductCard = ({ p, onClick, isFlash = false, extraClasses = "" }) => {
  const getThumbnail = () => {
    if (p.image) return p.image;
    if (p.imageUrl) return p.imageUrl;
    if (Array.isArray(p.images) && p.images.length > 0 && p.images[0]) return p.images[0];
    return null;
  };
  const pImg = getThumbnail();
  return (
    <div 
      onClick={onClick} 
      className={`group bg-white p-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer flex flex-col h-full relative z-10 hover:z-20 border border-gray-100 rounded-lg sm:border-0 sm:border-r sm:border-b ${extraClasses}`}
    >
      <div className="w-full aspect-square bg-white relative overflow-hidden mb-3 border-b border-gray-50/50 pb-2 flex items-center justify-center">
        {isFlash && (
          <div className="absolute top-2 right-2 z-10">
             <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm animate-pulse-subtle">FLASH</span>
          </div>
        )}
        {pImg ? (
          <img src={pImg} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">📷</div>
        )}
      </div>
      
      <div className="flex flex-col flex-1 px-1 text-left">
        <div className="mt-auto">
          <div className="flex items-baseline gap-1 text-gray-900 mb-0.5">
            <span className="text-sm font-normal">$</span>
            <span className="text-xl sm:text-[22px] font-normal tracking-tight">{Number(p.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
          </div>
          {isFlash && (
            <span className="text-green-500 font-medium text-[11px] block mt-0.5">Hasta 20% OFF</span>
          )}
          <span className="text-green-600 font-medium text-[11px] block mt-1">Llega gratis mañana</span>
        </div>
        <h3 className="text-[12px] sm:text-[13px] font-normal text-gray-500 line-clamp-2 leading-snug mt-2 group-hover:text-pink-600 transition-colors">
          {p.name}
        </h3>
        <p className="text-[10px] text-gray-400 mt-2">Vendido por: <span className="font-bold text-gray-600 truncate">{p.storeId}</span></p>
      </div>
    </div>
  );
};

const HorizontalCarousel = ({ id, children }) => {
  const scroll = (direction) => {
    const container = document.getElementById(id);
    if (container) {
      const scrollAmount = direction === "left" ? -400 : 400;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="relative group/carousel">
      {/* Botón Izquierdo (Oculto en móvil, aparece al hacer hover en PC) */}
      <button 
        onClick={() => scroll("left")}
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 items-center justify-center text-gray-600 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0"
        aria-label="Anterior"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>

      {/* Contenedor del Carrusel Original */}
      <div id={id} className="flex overflow-x-auto gap-4 pb-4 px-4 sm:px-0 hide-scrollbar snap-x snap-mandatory scroll-smooth">
        {children}
      </div>

      {/* Botón Derecho */}
      <button 
        onClick={() => scroll("right")}
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 items-center justify-center text-gray-600 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
        aria-label="Siguiente"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default function HomePage() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [bestSellers, setBestSellers] = useState([]);
  const [offersProducts, setOffersProducts] = useState([]);
  const [dailyTopProducts, setDailyTopProducts] = useState([]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const { currentUser, user, logout } = useAuth();
  const activeUser = currentUser || user;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const [globalSettings, setGlobalSettings] = useState({ 
    companyName: "MegaStore", 
    companyLogo: "",
    sections: {
      topStores: true,
      randomProducts: true,
      bestSellers: true,
      offers: true,
      dailyTop: true
    }
  });

  // 🌟 SLIDER GIGANTE (ESTILO MERCADOLIBRE / AMAZON)
  const heroBanners = [
    {
      title: "Rebajas de Temporada",
      subtitle: "HASTA 50% OFF",
      desc: "Descubre las mejores ofertas en las tiendas oficiales.",
      bg: "bg-gradient-to-r from-pink-600 to-rose-600",
      img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2070"
    },
    {
      title: "Nueva Colección VIP",
      subtitle: "LO MÁS TOP",
      desc: "Productos exclusivos recién llegados a nuestra plataforma.",
      bg: "bg-gradient-to-r from-blue-700 to-indigo-800",
      img: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=2071"
    },
    {
      title: "Tecnología al Límite",
      subtitle: "GAMER & SMART",
      desc: "Lleva tu setup al siguiente nivel con envíos rápidos.",
      bg: "bg-gradient-to-r from-gray-900 to-black",
      img: "https://images.unsplash.com/photo-1550009158-9fdf6db30182?auto=format&fit=crop&q=80&w=2012"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
    }, 6000); // 🌟 Cambio suave cada 6 segundos
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        // Obtenemos Configuraciones del SuperAdmin
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        let currentSections = {
          topStores: true,
          randomProducts: true,
          bestSellers: true,
          offers: true,
          dailyTop: true
        };

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.homepageSections) {
             currentSections = data.homepageSections;
          }
          setGlobalSettings({
            companyName: data.companyName || "MegaStore",
            companyLogo: data.companyLogo || "",
            sections: currentSections
          });
        }

        const storesSnap = await getDocs(collection(db, "stores"));
        const allStores = storesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Solo tiendas activas Y VERIFICADAS
        const activeVerifiedStores = allStores.filter(s => s.isActive !== false && s.verification?.status === 'verified');
        setStores(activeVerifiedStores.slice(0, 8)); // Top 8 tiendas

        const allActiveStoreIds = allStores.filter(s => s.isActive !== false).map(s => s.id);

        const prodSnap = await getDocs(query(collection(db, "products"), limit(100)));
        const allActiveProducts = prodSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => allActiveStoreIds.includes(p.storeId));
          
        if (currentSections.randomProducts) {
          const randomList = [...allActiveProducts].sort(() => 0.5 - Math.random()).slice(0, 15);
          setProducts(randomList);
        }
        if (currentSections.bestSellers) {
          const bsList = [...allActiveProducts].sort((a,b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 12);
          setBestSellers(bsList);
        }
        if (currentSections.offers) {
          const offersList = [...allActiveProducts].sort(() => 0.5 - Math.random()).slice(0, 12);
          setOffersProducts(offersList);
        }
        if (currentSections.dailyTop) {
          const dtList = [...allActiveProducts].slice(0, 12).sort(() => 0.5 - Math.random());
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
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const goToStoreWithRadar = (storeId, productId = null) => {
    sessionStorage.setItem("origenVenta", "index_super_admin");
    const query = productId ? `?product=${productId}&ref=index` : `?ref=index`;
    navigate(`/${storeId}${query}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const categories = [
    { icon: "👗", name: "Moda" },
    { icon: "💻", name: "Tecnología" },
    { icon: "👟", name: "Calzado" },
    { icon: "💄", name: "Belleza" },
    { icon: "🎮", name: "Gaming" },
    { icon: "🚲", name: "Deportes" },
    { icon: "🧸", name: "Juguetes" },
    { icon: "🚗", name: "Accesorios" },
    { icon: "🍔", name: "Comida" },
    { icon: "🛒", name: "Supermercado" }
  ];

  return (
    <div className="min-h-screen bg-[#ebebed] font-sans pb-20 relative overflow-x-hidden">
      
      {/* =========================================
          🌟 MENÚ MÓVIL (DRAWER)
      ========================================= */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        
        <div className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-pink-500 text-white">
            <div className="flex items-center gap-2">
              {globalSettings.companyLogo ? (
                <img src={globalSettings.companyLogo} alt="Logo" className="max-h-8 object-contain bg-white px-2 py-1 rounded-md" />
              ) : (
                <span className="text-xl font-black tracking-tighter">
                  {globalSettings.companyName || "MegaStore"}
                </span>
              )}
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50">
            {activeUser ? (
              <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-200 shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest relative z-10 mb-1">Tu Cuenta</p>
                <p className="text-sm font-bold text-gray-900 truncate relative z-10 mb-4">{activeUser.email}</p>
                
                <div className="flex gap-2 relative z-10">
                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }} className="flex-1 bg-pink-500 text-white font-bold py-2.5 rounded-xl transition-colors text-xs active:scale-95 shadow-sm hover:bg-pink-600">
                    Panel Admin
                  </button>
                  <button onClick={handleLogout} className="flex-1 bg-white hover:bg-red-50 text-red-500 font-bold py-2.5 rounded-xl transition-colors text-xs border border-gray-200 active:scale-95">
                    Salir
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }} className="w-full flex items-center gap-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-bold px-4 py-3.5 rounded-2xl transition-colors shadow-sm">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Iniciar Sesión
                </button>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-900 mb-2">¿Tienes productos para vender?</p>
                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/registro-vendedor'); }} className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-xs">
                    Crea tu tienda gratis
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-gray-500 mb-3 px-2">Comprar por Departamento</p>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {categories.map((cat, index) => (
                  <button key={index} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-gray-700 font-medium transition-all">
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span> {cat.name}
                    </span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          🌟 HEADER YELLOW/WHITE STILE (E-COMMERCE REAL)
      ========================================= */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-200 shadow-sm">
        <div className="max-w-[1200px] mx-auto">
          {/* Top Bar PC */}
          <div className="flex items-center gap-4 py-3 px-4 sm:px-6 lg:px-8">
            
            {/* Logo */}
            <div className="flex items-center gap-1 cursor-pointer shrink-0 mr-4" onClick={() => window.scrollTo(0,0)}>
              {globalSettings.companyLogo ? (
                <img src={globalSettings.companyLogo} alt="Logo Matrix" className="max-h-12 w-auto object-contain drop-shadow-sm" />
              ) : (
                <span className="text-3xl font-black tracking-tighter bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-transparent bg-clip-text">
                  {globalSettings.companyName || "MegaStore"}
                </span>
              )}
            </div>

            {/* Buscador Central (El motor del Marketplace) */}
            <div className="flex-1 hidden md:flex">
              <form onSubmit={handleSearch} className="relative w-full flex shadow-sm rounded-md overflow-hidden bg-white border border-gray-300 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 transition-all">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar productos, marcas y más..." 
                  className="w-full py-2.5 pl-4 pr-10 outline-none text-gray-900 text-sm font-medium"
                />
                <button type="submit" className="bg-white border-l border-gray-200 px-4 hover:bg-gray-50 text-gray-500 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
              </form>
            </div>

            {/* Banner Publicitario Dinámico Top Right */}
            <div className="hidden lg:flex shrink-0 items-center justify-center -mr-2">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer hover:bg-green-100 transition-colors">
                <span className="text-xl">🚀</span>
                <span className="text-xs font-bold text-green-800">Envíos Gratis <span className="font-normal text-green-700 block text-[10px]">en miles de productos</span></span>
              </div>
            </div>

            {/* Iconos Derecha: Hamburguesa en móvil, Cuenta en PC */}
            <div className="flex items-center gap-4 ml-auto md:ml-4 shrink-0">
              {/* Carrito global de marketplace si lo hay, simulemos: */}
              <button className="relative p-2 text-gray-700 hover:text-pink-600 transition-colors group">
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">0</span>
              </button>

              {activeUser ? (
                <div className="hidden md:flex items-center gap-4">
                  <div className="flex flex-col items-end cursor-pointer group" onClick={() => navigate('/login')}>
                    <span className="text-[11px] text-gray-500 group-hover:text-gray-900 transition-colors">Bienvenido, administrador</span>
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-1">Mi panel <svg className="w-3 h-3 text-gray-400 group-hover:text-pink-500 transition-colors" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg></span>
                  </div>
                  <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors group" title="Cerrar Sessión">
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <button onClick={() => navigate('/registro-vendedor')} className="text-sm text-gray-600 hover:text-gray-900 font-medium">Crea tu tienda</button>
                  <button onClick={() => navigate('/login')} className="text-sm font-bold text-gray-900 hover:text-pink-600 transition-colors">Ingresa</button>
                </div>
              )}

              <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 text-gray-900 md:hidden hover:bg-gray-100 rounded-md transition-colors">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sub-Nav Desktop: Historial, Categorías, Ofertas */}
          <div className="hidden md:flex items-center justify-between px-4 sm:px-6 lg:px-8 pb-3 text-[13px] text-gray-600 font-medium">
            <div className="flex items-center gap-5">
              <button onClick={() => setIsMobileMenuOpen(true)} className="flex items-center gap-1.5 hover:text-gray-900 transition-colors font-bold"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> Categorías</button>
              <a href="#" className="hover:text-gray-900 transition-colors">Ofertas</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Historial</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Supermercado</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Moda</a>
              <a href="/registro-vendedor" className="hover:text-gray-900 transition-colors text-pink-600 font-bold">Vender</a>
            </div>
          </div>

          {/* Buscador Móvil Pequeño */}
          <div className="md:hidden px-4 pb-3">
            <form onSubmit={handleSearch} className="relative w-full flex shadow-sm rounded-full overflow-hidden bg-gray-100 border border-transparent focus-within:border-pink-300 focus-within:bg-white transition-all">
              <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Estoy buscando..." 
                className="w-full bg-transparent text-gray-900 py-2.5 pl-10 pr-4 outline-none text-sm"
              />
            </form>
          </div>
        </div>
      </header>

      {/* =========================================
          🌟 SUPER HERO BANNER (SLIDER ULTRA PREMIUM)
      ========================================= */}
      <div className="w-full bg-gradient-to-b from-gray-100 to-[#ebebed] pb-4">
        {/* Usamos AnimatePresence de Framer Motion para lograr un fadding real tipo Amazon */}
        <div className="relative w-full h-[200px] sm:h-[280px] md:h-[350px] lg:h-[400px] overflow-hidden bg-white shadow-inner">
          <AnimatePresence mode="sync">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full"
            >
              <img 
                src={heroBanners[currentSlide].img} 
                alt="Banner Promocional" 
                className="w-full h-full object-cover object-center"
              />
              <div className={`absolute inset-0 ${heroBanners[currentSlide].bg} opacity-20 mix-blend-multiply`}></div>
            </motion.div>
          </AnimatePresence>

          {/* Sombra de degradado para que el overlap inferior se vea genial */}
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[rgba(235,235,237,1)] to-transparent"></div>

          {/* Controles del Slider */}
          <button 
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? heroBanners.length - 1 : prev - 1))}
            className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 p-2 sm:p-3 rounded-full shadow-lg transition-all hidden md:block"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button 
            onClick={() => setCurrentSlide((prev) => (prev + 1) % heroBanners.length)}
            className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 p-2 sm:p-3 rounded-full shadow-lg transition-all hidden md:block"
          >
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroBanners.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === i ? "w-6 bg-pink-500" : "w-3 bg-white/60 hover:bg-white"}`}
              ></button>
            ))}
          </div>
        </div>

        {/* =========================================
            🌟 OVERLAP: MENÚ DE PAGOS Y PROTECCIÓN (TIPO MELI)
        ========================================= */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-30 -mt-6 sm:-mt-10">
          <div className="bg-white rounded-xl shadow-md border border-gray-100/50 p-4 sm:p-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
             <div className="flex items-center gap-3 w-1/2 lg:w-auto">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                </div>
                <div>
                  <h4 className="text-gray-900 font-bold text-sm">Transferencias y Pago Móvil</h4>
                  <p className="text-gray-500 text-xs hidden sm:block">A tu conveniencia</p>
                </div>
             </div>
             
             <div className="hidden lg:block w-px h-10 bg-gray-200"></div>

             <div className="flex items-center gap-3 w-1/2 lg:w-auto">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </div>
                <div>
                  <h4 className="text-gray-900 font-bold text-sm">Entregas en tu ciudad</h4>
                  <p className="text-gray-500 text-xs hidden sm:block">Envíos seguros a nivel nacional</p>
                </div>
             </div>

             <div className="hidden lg:block w-px h-10 bg-gray-200"></div>

             <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-900 font-bold text-sm">Tiendas Verificadas</h4>
                  <p className="text-gray-500 text-xs">Vendedores calificados dentro de la plataforma</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-4 shadow-xl"></div>
          <p className="text-gray-500 font-bold text-sm uppercase tracking-widest text-center">Cargando la mejor selección...</p>
        </div>
      ) : (
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-14">
          
          {/* =========================================
              🌟 CATEGORÍAS (CIRCULOS TIPO MELI)
          ========================================= */}
          <section>
            <h2 className="text-[22px] font-medium text-gray-800 tracking-tight flex items-center gap-2 mb-4">
              Categorías populares
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x">
              {categories.map((cat, i) => (
                <button 
                  key={i} 
                  className="flex flex-col items-center gap-2 min-w-[80px] sm:min-w-[100px] group snap-start"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-2xl sm:text-3xl group-hover:shadow-md group-hover:border-pink-300 transition-all duration-300 group-hover:-translate-y-1">
                    {cat.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-600 group-hover:text-pink-600 transition-colors text-center w-full truncate px-1">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </section>
          
          {/* =========================================
              🌟 TIENDAS OFICIALES (BUBBLE / STORE CARDS TIPO AMAZON BRAND)
          ========================================= */}
          {globalSettings.sections.topStores && stores.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22px] font-medium text-gray-800 tracking-tight flex items-center gap-2">
                  Descubre tiendas oficiales
                </h2>
                <button className="text-blue-600 font-bold text-sm hover:text-blue-800 transition-colors">
                  Ver todas
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stores.slice(0, 4).map((store, i) => (
                  <button 
                    key={store.id} 
                    onClick={() => goToStoreWithRadar(store.id)} 
                    className="group bg-white rounded-lg shadow-sm hover:shadow-lg border border-gray-200/60 overflow-hidden flex flex-col transition-all duration-300 relative text-left"
                  >
                    {/* Banner de la tienda (simulado con color para estilo premium) */}
                    <div className={`h-16 w-full ${i%2===0 ? 'bg-gradient-to-r from-blue-100 to-cyan-100' : 'bg-gradient-to-r from-rose-100 to-orange-100'} relative`}>
                        <div className="absolute inset-0 bg-white/20"></div>
                    </div>
                    
                    {/* Logo sobrepuesto circular */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-white shadow-md z-10 flex items-center justify-center text-2xl">
                      {store.appLogos?.icon192 || store.profileImage ? (
                        <img src={store.appLogos?.icon192 || store.profileImage} alt={store.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <span className="opacity-50 text-gray-400">🏪</span>
                      )}
                    </div>

                    <div className="pt-8 pb-4 px-3 flex flex-col items-center flex-1 bg-white">
                      <h3 className="font-bold text-gray-900 text-sm text-center truncate w-full flex items-center justify-center gap-1.5 mt-2">
                        {store.nombre || store.id}
                        {store.verification?.status === 'verified' && (
                          <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        )}
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Tienda Oficial</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* =========================================
              🌟 PRODUCTOS ALEATORIOS (Descubrimiento)
          ========================================= */}
          {globalSettings.sections.randomProducts && products.length > 0 && (
            <section className="bg-white rounded-lg p-0 sm:p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-2 p-4 sm:p-0">
                <h2 className="text-[22px] font-medium text-gray-800 tracking-tight flex items-center gap-2">
                  Productos recomendados para ti
                  <span className="bg-blue-100 text-blue-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm tracking-wider">Descubrimiento</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 border-t sm:border border-gray-100 sm:rounded-md divide-x divide-y sm:divide-y-0 text-left border-b lg:divide-y-0">
                {products.map((p, idx) => (
                  <ProductCard key={p.id} p={p} onClick={() => goToStoreWithRadar(p.storeId, p.id)} isFlash={idx % 4 === 0} />
                ))}
              </div>
            </section>
          )}

          {/* =========================================
              🌟 LOS MÁS VENDIDOS
          ========================================= */}
          {globalSettings.sections.bestSellers && bestSellers.length > 0 && (
            <section className="bg-white rounded-lg p-0 sm:p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-2 p-4 sm:p-0">
                <h2 className="text-[22px] font-medium text-gray-800 tracking-tight flex items-center gap-2">
                  Los Más Vendidos
                  <span className="bg-orange-100 text-orange-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm tracking-wider">Top Ventas</span>
                </h2>
              </div>
              <HorizontalCarousel id="bs-carousel">
                {bestSellers.map((p) => (
                  <div key={`bs-${p.id}`} className="min-w-[160px] max-w-[160px] sm:min-w-[200px] sm:max-w-[200px] shrink-0 snap-center sm:snap-start">
                    <ProductCard p={p} onClick={() => goToStoreWithRadar(p.storeId, p.id)} extraClasses="border sm:border" />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* =========================================
              🌟 OFERTAS
          ========================================= */}
          {globalSettings.sections.offers && offersProducts.length > 0 && (
            <section className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100/50 rounded-lg p-0 sm:p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-2 p-4 sm:p-0">
                <h2 className="text-[22px] font-black text-red-600 tracking-tight flex items-center gap-2">
                  Ofertas Especiales
                  <span className="bg-red-600 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-sm tracking-widest animate-pulse">FLASH</span>
                </h2>
              </div>
              <HorizontalCarousel id="offer-carousel">
                {offersProducts.map((p) => (
                  <div key={`offer-${p.id}`} className="min-w-[160px] max-w-[160px] sm:min-w-[200px] sm:max-w-[200px] shrink-0 snap-center sm:snap-start">
                    <ProductCard p={p} onClick={() => goToStoreWithRadar(p.storeId, p.id)} isFlash={true} extraClasses="border border-red-200/50 shadow-sm" />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}
          
          {/* =========================================
              🌟 TENDENCIAS / DAILY TOP
          ========================================= */}
          {globalSettings.sections.dailyTop && dailyTopProducts.length > 0 && (
            <section className="bg-white rounded-lg p-0 sm:p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-2 p-4 sm:p-0">
                <h2 className="text-[22px] font-medium text-gray-800 tracking-tight flex items-center gap-2">
                  Tendencias de Hoy
                  <span className="bg-purple-100 text-purple-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm tracking-wider">Top Diario</span>
                </h2>
              </div>
              <HorizontalCarousel id="daily-carousel">
                {dailyTopProducts.map((p) => (
                  <div key={`top-${p.id}`} className="min-w-[160px] max-w-[160px] sm:min-w-[200px] sm:max-w-[200px] shrink-0 snap-center sm:snap-start">
                    <ProductCard p={p} onClick={() => goToStoreWithRadar(p.storeId, p.id)} extraClasses="border sm:border" />
                  </div>
                ))}
              </HorizontalCarousel>
            </section>
          )}

          {/* =========================================
              🌟 BANNERS DE PROMO (GRID 2 COLUMNAS)
          ========================================= */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div onClick={() => navigate('/search?q=moda')} className="group bg-gradient-to-r from-purple-700 to-indigo-800 rounded-xl overflow-hidden cursor-pointer relative h-36 sm:h-48 flex items-center px-6 sm:px-10 shadow-sm hover:shadow-lg transition-all">
                <div className="relative z-10 w-2/3">
                  <h3 className="text-white font-black text-xl sm:text-2xl mb-2">Moda y Accesorios</h3>
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-3">Descubre las nuevas tendencias</p>
                  <span className="bg-white text-indigo-900 text-xs font-bold px-4 py-1.5 rounded-full inline-block group-hover:scale-105 transition-transform">Ver Categoría</span>
                </div>
                {/* Imagen decorativa derecha */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mask-image-gradient-left opacity-80 group-hover:opacity-100 transition-opacity"></div>
             </div>

             <div onClick={() => navigate('/ofertas')} className="group bg-gradient-to-r from-orange-500 to-red-500 rounded-xl overflow-hidden cursor-pointer relative h-36 sm:h-48 flex items-center px-6 sm:px-10 shadow-sm hover:shadow-lg transition-all">
                <div className="relative z-10 w-2/3">
                  <h3 className="text-white font-black text-xl sm:text-2xl mb-2">Ofertas Relámpago</h3>
                  <p className="text-white/80 text-xs sm:text-sm font-medium mb-3">Solo por 24 horas</p>
                  <span className="bg-white text-red-600 text-xs font-bold px-4 py-1.5 rounded-full inline-block group-hover:scale-105 transition-transform">Comprar ahora</span>
                </div>
                {/* Imagen decorativa derecha */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mask-image-gradient-left opacity-80 group-hover:opacity-100 transition-opacity"></div>
             </div>
          </section>

          {/* =========================================
              🌟 BANNER CTA (CALL TO ACTION VENDER) CON FONDO BLANCO
          ========================================= */}
          {!activeUser ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row items-center cursor-pointer hover:shadow-md transition-shadow group">
              <div className="w-full md:w-1/3 bg-blue-50 h-48 md:h-auto flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 relative overflow-hidden">
                 <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors"></div>
                 <span className="text-8xl group-hover:scale-110 transition-transform duration-500">🏪</span>
              </div>
              <div className="p-8 md:p-12 flex-1 relative">
                <h2 className="text-2xl font-normal text-gray-900 mb-2">Empieza a vender tus productos en <span className="font-bold">MegaStore</span></h2>
                <p className="text-gray-500 text-sm mb-6">Únete a nuestra plataforma, crea tu tienda virtual y llega a miles de compradores. Sin complicaciones.</p>
                <div className="flex gap-4">
                  <button onClick={() => navigate('/registro-vendedor')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-bold text-sm transition-colors shadow-sm">
                    Crear mi tienda
                  </button>
                  <button onClick={() => navigate('/login')} className="bg-white border border-gray-300 hover:bg-gray-50 text-blue-600 px-6 py-2.5 rounded-md font-bold text-sm transition-colors">
                    Ya tengo cuenta
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row items-center cursor-pointer hover:shadow-md transition-shadow group">
              <div className="w-full md:w-1/4 bg-white/10 h-32 md:h-auto flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
                 <span className="text-6xl group-hover:scale-110 transition-transform duration-500">🚀</span>
              </div>
              <div className="p-6 md:p-8 flex-1 relative text-white">
                <h2 className="text-2xl font-bold mb-1">¡Hola de nuevo!</h2>
                <p className="text-pink-100 text-sm mb-4">Ve a tu panel de administración para gestionar tus ventas o explorar más productos.</p>
                <button onClick={() => navigate('/admin')} className="bg-white text-pink-600 px-6 py-2.5 rounded-md font-bold text-sm transition-colors shadow-sm hover:bg-gray-50 inline-block">
                  Ir a mi Panel
                </button>
              </div>
            </div>
          )}

        </div>
      )}
      
      {/* 🌟 FOOTER TIPO CORPORATIVO */}
      <footer className="mt-20 border-t border-gray-200 bg-white">
        {/* Superior */}
        <div className="max-w-[1200px] mx-auto px-4 py-8 border-b border-gray-100 flex flex-wrap justify-between gap-8 md:gap-4 text-center md:text-left">
           <div className="w-full md:w-1/4">
              {globalSettings.companyLogo ? (
                <img src={globalSettings.companyLogo} alt="Logo" className="max-h-10 mb-4 mx-auto md:mx-0 object-contain" />
              ) : (
                <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-transparent bg-clip-text mb-4 block">
                  {globalSettings.companyName || "MegaStore"}
                </span>
              )}
              <p className="text-xs text-gray-500">El marketplace donde encuentras de todo, enviado por las mejores tiendas de tu país.</p>
           </div>
           <div>
             <h4 className="font-bold text-gray-900 text-sm mb-3">Acerca de</h4>
             <ul className="text-xs text-gray-500 space-y-2">
               <li><a href="#" className="hover:text-blue-600">Nuestra historia</a></li>
               <li><a href="/registro-vendedor" className="hover:text-blue-600">Unete como vendedor</a></li>
               <li><a href="#" className="hover:text-blue-600">Blog oficial</a></li>
             </ul>
           </div>
           <div>
             <h4 className="font-bold text-gray-900 text-sm mb-3">Ayuda</h4>
             <ul className="text-xs text-gray-500 space-y-2">
               <li><a href="#" className="hover:text-blue-600">Centro de seguridad</a></li>
               <li><a href="#" className="hover:text-blue-600">Devoluciones</a></li>
               <li><a href="#" className="hover:text-blue-600">Cómo comprar</a></li>
             </ul>
           </div>
           <div>
             <h4 className="font-bold text-gray-900 text-sm mb-3">Redes sociales</h4>
             <ul className="text-xs text-gray-500 space-y-2">
               <li><a href="#" className="hover:text-blue-600">Instagram</a></li>
               <li><a href="#" className="hover:text-blue-600">Twitter X</a></li>
               <li><a href="#" className="hover:text-blue-600">Facebook</a></li>
             </ul>
           </div>
        </div>
        
        {/* Inferior */}
        <div className="bg-gray-100 py-4 text-center text-[11px] text-gray-500">
          <p>Copyright © 2026 {globalSettings.companyName || "Mega Store"}. Todos los derechos reservados.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:underline">Políticas de Privacidad</a>
            <a href="#" className="hover:underline">Términos de Condiciones</a>
          </div>
        </div>
      </footer>

      {/* 🌟 CSS INYECTADO PARA MASKS Y BLENDS */}
      <style dangerouslySetInnerHTML={{__html: `
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
      `}} />
    </div>
  );
}