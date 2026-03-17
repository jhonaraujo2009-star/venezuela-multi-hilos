import { useState, useEffect } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../config/firebase";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(q);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAndFilterProducts = async () => {
      setLoading(true);
      try {
        const prodSnap = await getDocs(query(collection(db, "products")));
        const allProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filtro local asegurando que el string de busqueda coincida parcialmente con nombre o categoria
        const filtered = allProducts.filter(p => {
          const matchName = p.name?.toLowerCase().includes(q.toLowerCase());
          const matchCategory = p.category?.toLowerCase().includes(q.toLowerCase());
          const matchDesc = p.description?.toLowerCase().includes(q.toLowerCase());
          return matchName || matchCategory || matchDesc;
        });

        setProducts(filtered);
      } catch (error) {
        console.error("Error buscando productos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (q) {
      fetchAndFilterProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [q]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  const goToStoreProduct = (storeId, productId = null) => {
    // 🌟 INYECCIÓN DEL RASTREADOR DE COMISIONES DEL SUPERADMIN
    sessionStorage.setItem("origenVenta", "index_super_admin");
    const query = productId ? `?product=${productId}` : ``;
    navigate(`/${storeId}${query}`);
  };

  return (
    <div className="min-h-screen bg-[#ebebed] font-sans pb-20">
      
      {/* 🌟 HEADER BUSCADOR PREMIUM */}
      <header className="bg-pink-500 sticky top-0 z-40 border-b border-pink-600 shadow-md">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-white hover:bg-black/10 p-2 rounded-full transition-colors shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          
          <div className="flex-1 w-full">
             <form onSubmit={handleSearch} className="relative w-full max-w-2xl flex shadow-sm rounded-md overflow-hidden bg-white border border-transparent focus-within:ring-2 focus-within:ring-white/50 transition-all">
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Buscar productos, marcas y más..." 
                 className="w-full py-2.5 pl-4 pr-10 outline-none text-gray-900 text-sm font-medium"
                 autoFocus
               />
               <button type="submit" className="bg-white border-l border-gray-200 px-4 hover:bg-gray-50 text-gray-500 transition-colors flex items-center justify-center">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               </button>
             </form>
          </div>
        </div>
      </header>

      {/* 🌟 CONTENIDO DE BUSQUEDA */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-pink-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Buscando productos...</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* 🌟 BARRA LATERAL CORTA (FILTROS) */}
            <aside className="w-full lg:w-64 shrink-0">
              <h1 className="text-2xl font-black text-gray-900 mb-1 capitalize line-clamp-2">
                {q}
              </h1>
              <p className="text-sm text-gray-500 mb-6">{products.length} resultados</p>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hidden lg:block">
                <h3 className="font-bold text-gray-900 mb-4 text-sm">Filtros Activos</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-pink-50 text-pink-600 border border-pink-100 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-2">
                    {q}
                    <button onClick={() => {setSearchParams({}); setSearchTerm("");}} className="hover:text-pink-800">×</button>
                  </span>
                </div>
              </div>
            </aside>

            {/* 🌟 GRILLA DE RESULTADOS (ESTILO MELI LISTA) */}
            <div className="flex-1">
              {products.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                  <span className="text-6xl mb-4 block">🔍</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No hay publicaciones que coincidan con tu búsqueda.</h3>
                  <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside text-left max-w-sm mx-auto mt-4">
                    <li>Revisa la ortografía de la palabra.</li>
                    <li>Utiliza palabras más genéricas o menos palabras.</li>
                    <li>Navega por las categorías de la página principal.</li>
                  </ul>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  {products.map(p => {
                    const pImg = p.image || p.images?.[0] || null;
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => goToStoreProduct(p.storeId, p.id)}
                        className="flex flex-col sm:flex-row p-4 gap-4 sm:gap-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                         <div className="w-full sm:w-40 sm:h-40 shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center p-2 relative">
                            {pImg ? (
                              <img src={pImg} alt={p.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <span className="text-4xl text-gray-200">📷</span>
                            )}
                         </div>
                         <div className="flex-1 py-1 flex flex-col justify-between">
                            <div>
                              <h2 className="text-xl font-normal text-gray-800 line-clamp-2 leading-snug group-hover:text-pink-600 transition-colors">
                                {p.name}
                              </h2>
                              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Vendido por: <span className="font-bold">{p.storeId}</span></p>
                              <div className="flex items-center gap-1 mt-4">
                                 <span className="text-2xl font-normal tracking-tight text-gray-900">${Number(p.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                              </div>
                              <span className="text-green-600 font-medium text-[13px] block mt-1">Llega gratis mañana</span>
                            </div>
                         </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
