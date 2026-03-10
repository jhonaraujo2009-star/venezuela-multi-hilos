import { useState, useEffect } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🌟 NUEVO ESTADO: Controlador del menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // 🌟 Efecto para bloquear el fondo cuando el menú móvil está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const storesSnap = await getDocs(query(collection(db, "stores"), limit(8)));
        setStores(storesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const prodSnap = await getDocs(query(collection(db, "products"), limit(12)));
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error cargando marketplace:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGlobalData();
  }, []);

  const categories = ["🔥 Novedades", "⭐ Más Vendidos", "👗 Moda", "💻 Tecnología", "⚡ Ofertas Flash"];

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans pb-20 relative">
      
      {/* =========================================
          🌟 EL NUEVO MENÚ MÓVIL (DRAWER PREMIUM)
      ========================================= */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* Fondo oscuro empañado */}
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        
        {/* Panel lateral que se desliza */}
        <div className={`absolute top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-out rounded-l-[2rem] ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
          
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">M</span>
              </div>
              <span className="text-lg font-black tracking-tight text-gray-900">Mega<span className="text-pink-500">Store</span></span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-8">
            {/* Botones de Acción Primarios */}
            <div className="space-y-3">
              <button onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3.5 rounded-2xl transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Iniciar Sesión
              </button>
              <button onClick={() => { setIsMobileMenuOpen(false); navigate('/registro-vendedor'); }} className="w-full flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-lg shadow-pink-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Vender en la plataforma
              </button>
            </div>

            {/* Lista de Categorías */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Departamentos</p>
              <div className="space-y-1">
                {categories.map((cat, index) => (
                  <button key={index} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                    {cat}
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 text-center">
            <p className="text-xs text-gray-400 font-medium">MegaStore © 2026</p>
          </div>
        </div>
      </div>

      {/* =========================================
          1. HEADER NEO-MINIMALISTA
      ========================================= */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4 md:gap-8">
            
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => window.scrollTo(0,0)}>
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-black text-lg sm:text-xl">M</span>
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-gray-900 hidden sm:block">
                Mega<span className="text-pink-500">Store</span>
              </span>
            </div>

            {/* Buscador Central Grande (PC) */}
            <div className="flex-1 max-w-3xl hidden md:flex">
              <div className="relative w-full group">
                <input 
                  type="text" 
                  placeholder="Busca productos, marcas o tiendas..." 
                  className="w-full bg-gray-50 hover:bg-white text-gray-900 rounded-full py-3.5 pl-14 pr-32 outline-none border border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all font-medium"
                />
                <svg className="w-6 h-6 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-pink-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <button className="absolute right-1.5 top-1.5 bottom-1.5 bg-gray-900 hover:bg-pink-500 text-white px-6 rounded-full font-bold text-sm transition-colors shadow-md">
                  Buscar
                </button>
              </div>
            </div>

            {/* Iconos Derecha */}
            <div className="flex items-center gap-1 sm:gap-4 shrink-0">
              <button onClick={() => navigate('/login')} className="hidden md:flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold px-4 py-2 rounded-full hover:bg-gray-50 transition-colors text-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Acceder
              </button>
              
              <button className="relative p-2 text-gray-600 hover:text-pink-600 transition-colors">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <span className="absolute 0 right-0 bg-pink-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">0</span>
              </button>

              {/* 🌟 NUEVO: Botón Menú Hamburguesa (Móvil) 🌟 */}
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-900 md:hidden hover:bg-gray-50 rounded-full transition-colors">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Buscador Móvil (Solo visible en pantallas pequeñas) */}
        <div className="md:hidden px-4 pb-4">
          <div className="relative w-full">
            <input 
              type="text" 
              placeholder="¿Qué estás buscando?" 
              className="w-full bg-gray-50 text-gray-900 rounded-xl py-3 pl-12 pr-4 outline-none border border-gray-200 focus:border-pink-500 text-sm"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        {/* Sub-Nav (Desktop) */}
        <div className="border-t border-gray-100 bg-white hidden md:block">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 overflow-x-auto scrollbar-hide py-3 text-sm font-semibold text-gray-600">
            <button className="flex items-center gap-1 text-pink-600 shrink-0"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> Departamentos</button>
            <span className="w-px h-4 bg-gray-300 shrink-0"></span>
            {categories.map((cat, i) => <a key={i} href="#" className="hover:text-gray-900 shrink-0">{cat}</a>)}
            <span className="w-px h-4 bg-gray-300 shrink-0"></span>
            <a href="/registro-vendedor" className="text-pink-500 hover:text-pink-700 shrink-0">Vender en la plataforma</a>
          </div>
        </div>
      </header>

      {/* =========================================
          2. HERO BENTO GRID
      ========================================= */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 mb-8 sm:mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 h-auto lg:h-[480px]">
          
          <div className="lg:col-span-3 bg-gray-900 rounded-[2rem] overflow-hidden relative shadow-lg flex items-center p-6 sm:p-10 md:p-16 group min-h-[350px]">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-gray-800 to-transparent opacity-50"></div>
            <div className="absolute right-[-10%] top-[-20%] w-[500px] h-[500px] bg-pink-500/20 blur-[100px] rounded-full pointer-events-none group-hover:bg-pink-500/30 transition-colors duration-700"></div>
            
            <div className="relative z-10 max-w-xl w-full">
              <span className="inline-block py-1 px-3 rounded-full bg-white/10 text-white border border-white/20 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4 sm:mb-6">Nueva Colección</span>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight md:leading-[1.1] tracking-tight mb-4 sm:mb-6">
                Encuentra lo que te <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-600">apasiona.</span>
              </h1>
              
              <p className="text-gray-300 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 font-medium max-w-[90%]">
                Millones de productos de tiendas verificadas. Compra seguro, recibe rápido.
              </p>
              <button className="w-full sm:w-auto bg-white text-gray-900 px-8 py-3.5 sm:py-4 rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-transform shadow-xl">
                Explorar Catálogo
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-4 md:gap-6">
            <div onClick={() => navigate('/registro-vendedor')} className="flex-1 bg-pink-50 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group border border-pink-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 sm:mb-2">Crea tu Tienda</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">Empieza a vender hoy.</p>
                <span className="text-pink-600 font-bold text-xs sm:text-sm group-hover:underline">Saber más →</span>
              </div>
              <span className="absolute -right-4 -bottom-4 text-6xl sm:text-8xl opacity-20 group-hover:scale-110 transition-transform duration-500">🏪</span>
            </div>
            
            <div className="flex-1 bg-blue-50 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group border border-blue-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 sm:mb-2">Marcas Top</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">Calidad garantizada.</p>
                <span className="text-blue-600 font-bold text-xs sm:text-sm group-hover:underline">Ver directorio →</span>
              </div>
              <span className="absolute -right-4 -bottom-4 text-6xl sm:text-8xl opacity-20 group-hover:scale-110 transition-transform duration-500">⭐</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 sm:py-20">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold text-sm">Cargando catálogo...</p>
        </div>
      ) : (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          
          <section>
            <div className="flex items-end justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Tiendas Oficiales</h2>
              <button className="text-pink-600 font-bold text-xs sm:text-sm hover:underline">Ver todas</button>
            </div>
            
            <div className="flex gap-4 sm:gap-6 md:gap-8 overflow-x-auto pb-4 sm:pb-6 snap-x scrollbar-hide">
              {stores.map(store => (
                <button 
                  key={store.id} 
                  onClick={() => navigate(`/${store.id}`)}
                  className="snap-start shrink-0 flex flex-col items-center gap-2 sm:gap-3 group w-20 sm:w-24 md:w-32"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-full overflow-hidden bg-white border border-gray-200 shadow-sm group-hover:border-pink-500 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 relative">
                    {store.appLogos?.icon192 || store.profileImage ? (
                      <img src={store.appLogos?.icon192 || store.profileImage} alt={store.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-2xl sm:text-3xl">🛍️</div>
                    )}
                    {store.verification?.status === 'verified' && (
                      <div className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 md:bottom-2 md:right-2 bg-blue-500 text-white p-1 rounded-full border-2 border-white">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-800 text-center line-clamp-2 w-full group-hover:text-pink-600">
                    {store.nombre || store.id}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Selección Especial</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
              {products.map(p => (
                <div key={p.id} onClick={() => navigate(`/${p.storeId}`)} className="group bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-gray-100 transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1">
                  
                  <div className="aspect-[4/5] bg-[#F3F4F6] rounded-xl sm:rounded-2xl relative overflow-hidden mb-3 sm:mb-4">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover object-top mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl text-gray-300">📦</div>
                    )}
                    
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/90 backdrop-blur-sm px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black text-gray-700 uppercase shadow-sm border border-gray-100">
                      De: {p.storeId}
                    </div>

                    <div className="absolute bottom-2 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 hidden sm:flex">
                      <button className="bg-gray-900 text-white font-bold text-xs px-6 py-2 rounded-full shadow-lg">
                        Ver producto
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col flex-1 px-1">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-800 line-clamp-2 leading-snug mb-1.5 sm:mb-2 group-hover:text-pink-600 transition-colors">{p.name}</h3>
                    
                    <div className="flex items-center gap-1 mb-1 sm:mb-2 text-yellow-400 text-[10px] sm:text-xs">
                      <span>★★★★★</span>
                      <span className="text-gray-400 text-[8px] sm:text-[10px] ml-1 hidden sm:inline">(Verificado)</span>
                    </div>

                    <div className="mt-auto flex items-end justify-between">
                      <div className="flex items-baseline gap-0.5 sm:gap-1 text-gray-900">
                        <span className="text-xs sm:text-sm font-bold text-gray-400">$</span>
                        <span className="text-base sm:text-xl font-black tracking-tight">{p.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12 sm:mt-16 bg-gray-900 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 md:p-16 text-center shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-pink-500/20 rounded-full blur-[60px] sm:blur-[80px]"></div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-4 sm:mb-6 leading-tight">Empieza a vender hoy.</h2>
              <p className="text-gray-400 text-sm sm:text-lg mb-6 sm:mb-8 px-4 sm:px-0">Crea tu tienda online en minutos, sube tus productos y llega a miles de clientes en nuestra plataforma.</p>
              <button onClick={() => navigate('/registro-vendedor')} className="w-full sm:w-auto bg-pink-500 text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-black tracking-widest uppercase text-xs sm:text-sm hover:bg-pink-600 active:scale-95 transition-all shadow-xl">
                Registrar Mi Tienda
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}