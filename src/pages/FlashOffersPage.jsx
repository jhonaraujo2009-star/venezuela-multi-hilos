import { useState, useEffect } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigate } from "react-router-dom";

export default function FlashOffersPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPromotionalProducts = async () => {
      setLoading(true);
      try {
        // En un caso real quiza haya un campo 'isFlashOffer', aqui simulamos
        // trayendo productos y mostrándolos como ofertas
        const prodSnap = await getDocs(query(collection(db, "products"), limit(40)));
        const allProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setProducts(allProducts);
      } catch (error) {
        console.error("Error buscando ofertas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotionalProducts();
  }, []);

  const goToStoreProduct = (storeId, productId = null) => {
    // 🌟 INYECCIÓN DEL RASTREADOR DE COMISIONES DEL SUPERADMIN
    sessionStorage.setItem("origenVenta", "index_super_admin");
    const query = productId ? `?product=${productId}` : ``;
    navigate(`/${storeId}${query}`);
  };

  const filteredOffers = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#ebebed] font-sans pb-20">
      
      {/* 🌟 HEADER OFERTAS PREMIUM */}
      <header className="bg-gradient-to-r from-red-600 to-orange-500 sticky top-0 z-40 border-b border-red-700 shadow-md">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-white hover:bg-black/10 p-2 rounded-full transition-colors shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-white font-black text-xl italic tracking-tight flex items-center gap-2">
              <span className="text-2xl">⚡</span> OFERTAS RELÁMPAGO
            </h1>
          </div>
          
          <div className="flex-1 w-full max-w-md hidden sm:block">
             <div className="relative w-full flex shadow-sm rounded-md overflow-hidden bg-white/10 hover:bg-white/20 border border-white/20 focus-within:bg-white focus-within:ring-2 focus-within:ring-white/50 transition-all group">
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Buscar en ofertas..." 
                 className="w-full py-2 pl-4 pr-10 outline-none text-white focus:text-gray-900 placeholder-white/70 group-focus-within:placeholder-gray-400 text-sm font-medium bg-transparent"
               />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white group-focus-within:text-gray-400">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               </div>
             </div>
          </div>
        </div>
      </header>

      {/* Título y Banner Contador Visual */}
      <div className="bg-red-600 text-white py-2 text-center text-xs font-bold tracking-widest uppercase">
        Termina en: <span className="bg-white text-red-600 px-2 py-0.5 rounded ml-2">12</span> : <span className="bg-white text-red-600 px-2 py-0.5 rounded">45</span> : <span className="bg-white text-red-600 px-2 py-0.5 rounded">30</span>
      </div>

      {/* 🌟 CONTENIDO DE OFERTAS */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Buscador móvil */}
        <div className="sm:hidden mb-6">
           <div className="relative w-full flex shadow-sm rounded-md overflow-hidden bg-white border border-gray-200">
             <input 
               type="text" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Buscar en ofertas..." 
               className="w-full py-2 pl-4 pr-10 outline-none text-gray-900 text-sm font-medium"
             />
             <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
           </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-red-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Cargando promociones...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <span className="text-6xl mb-4 block">😢</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No encontramos ofertas para "{searchTerm}"</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredOffers.map((p, idx) => {
              const pImg = p.image || p.images?.[0] || null;
              // Simulamos precios anteriores para mostrar el descuento visualmente
              const currentPrice = Number(p.price || 0);
              const originalPrice = currentPrice * 1.25; // Simular 20% off
              
              return (
                <div 
                  key={p.id} 
                  onClick={() => goToStoreProduct(p.storeId, p.id)} 
                  className="group bg-white rounded-lg p-3 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full relative border border-gray-200 overflow-hidden"
                >
                  <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    20% OFF
                  </div>

                  <div className="aspect-[1/1] bg-white relative overflow-hidden mb-3 flex items-center justify-center p-2">
                    {pImg ? (
                      <img src={pImg} alt={p.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">📷</div>
                    )}
                  </div>
                  
                  <div className="flex flex-col flex-1 px-1">
                    <div className="mt-auto">
                      <span className="text-xs text-gray-400 line-through decoration-gray-400 block">${originalPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      <div className="flex items-baseline gap-1 text-gray-900 mb-0.5">
                        <span className="text-sm font-normal">$</span>
                        <span className="text-xl font-bold tracking-tight text-red-600">{currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                      <span className="text-green-600 font-medium text-[11px] block mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H14a1 1 0 001-1v-2.158A2.5 2.5 0 0113 10.5V8a1 1 0 00-1-1H3V4z" /></svg> Envío gratis
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-normal text-gray-500 line-clamp-2 leading-snug mt-2 group-hover:text-red-600 transition-colors">
                      {p.name}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
