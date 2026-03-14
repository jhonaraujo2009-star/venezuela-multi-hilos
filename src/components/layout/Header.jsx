import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext"; 

export default function Header({ onProductClick, onFilter }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const { itemCount, setIsOpen } = useCart();
  const { user } = useAuth();
  const { storeData } = useApp(); 
  const navigate = useNavigate();

  // MANTENEMOS LA LÓGICA INTACTA
  useEffect(() => {
    if (!storeData?.id) return;
    const fetchSessions = async () => {
      const q = query(
        collection(db, "sessions"), 
        where("hidden", "==", false),
        where("storeId", "==", storeData.id) 
      );
      const snap = await getDocs(q);
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchSessions();
  }, [storeData?.id]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        let qRef = collection(db, "products");
        if (storeData?.id) {
          qRef = query(collection(db, "products"), where("storeId", "==", storeData.id));
        }
        const snap = await getDocs(qRef);
        
        const q = searchQuery.toLowerCase();
        const results = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (p) =>
              p.name?.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q)
          )
          .slice(0, 6);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, storeData?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {/* 🌟 1. BUSCADOR PANTALLA COMPLETA (SEARCH OVERLAY PREMIUM) 🌟 */}
      <div 
        className={`fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          searchOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-12'
        }`}
      >
        {/* Barra de Búsqueda Gigante */}
        <div className="flex items-center px-6 py-6 sm:py-10 border-b border-gray-100 max-w-4xl mx-auto w-full">
          <svg className="w-8 h-8 text-gray-400 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus={searchOpen}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar productos..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 text-2xl sm:text-4xl font-black placeholder:text-gray-300 placeholder:font-medium tracking-tight"
          />
          <button 
            onClick={() => { setSearchOpen(false); setSearchQuery(""); }} 
            className="p-3 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100 ml-2 active:scale-90"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Resultados del Buscador */}
        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">
          {searchQuery && (searchResults.length > 0 || searching) && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Resultados</h3>
              
              {searching ? (
                <div className="text-sm font-bold text-gray-300 tracking-widest uppercase animate-pulse">Buscando...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { onProductClick(p); setSearchOpen(false); setSearchQuery(""); }}
                      className="w-full flex items-center gap-5 p-4 bg-white hover:bg-gray-50 rounded-3xl border border-gray-100 transition-all active:scale-95 group shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                    >
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-16 h-20 object-cover rounded-2xl shadow-sm group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-16 h-20 bg-gray-100 rounded-2xl" />
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-base font-black text-gray-900 leading-tight mb-1">{p.name}</p>
                        <p className="text-sm font-bold text-gray-500">${p.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Mensaje si no hay resultados ni está buscando */}
          {searchQuery && !searching && searchResults.length === 0 && (
             <div className="text-center py-20 text-gray-400">
               <span className="text-4xl block mb-4">🔍</span>
               <p className="text-sm font-bold uppercase tracking-widest">No encontramos "{searchQuery}"</p>
             </div>
          )}
        </div>
      </div>

      {/* 🌟 2. CABECERA PRINCIPAL (HEADER NORMAL) 🌟 */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 h-14 transition-all duration-300">
        <div className="max-w-md mx-auto px-4 h-full flex items-center justify-between gap-3">
          
          {/* Logo Dinámico con Placa de Verificación PRO */}
          <div 
            className="flex-shrink-0 cursor-pointer flex items-center gap-1.5" 
            onClick={() => { 
              if(onFilter) onFilter("all"); 
              window.scrollTo(0, 0); 
            }}
          >
            <span className="text-xl font-black tracking-tighter uppercase flex items-center gap-1.5" style={{ color: "var(--primary)" }}>
              ✨ {storeData?.nombre || storeData?.id || "Mi Tienda"}
              
              {storeData?.verification?.status === "verified" ? (
                <div className="relative flex items-center justify-center ml-1" title="Tienda Verificada Oficialmente">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping"></span>
                  <svg className="relative w-5 h-5 text-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                </div>
              ) : (
                <div className="ml-1.5 px-2.5 py-1 text-[8px] font-black bg-gradient-to-r from-gray-50 to-gray-100 text-gray-500 rounded-full border border-gray-200/60 flex items-center gap-1.5 tracking-widest uppercase shadow-[0_2px_8px_rgba(0,0,0,0.04)]" title="Solicita tu verificación en el Panel Admin">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                  </span>
                  No Verificado
                </div>
              )}
            </span>
          </div>

          {/* Botonera */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            
            <button 
              onClick={() => setSearchOpen(true)} 
              className="p-2.5 rounded-full hover:bg-gray-50 transition-colors active:scale-90 text-gray-800"
            >
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button 
              onClick={() => { 
                if(onFilter) onFilter("wishlist"); 
                window.scrollTo(0, 0); 
              }} 
              className="p-2.5 rounded-full hover:bg-pink-50 hover:text-pink-500 transition-colors active:scale-90 text-gray-800"
            >
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {/* 🌟 3. NUEVO ICONO DE CARRITO DE COMPRAS 🌟 */}
            <button 
              onClick={() => setIsOpen(true)} 
              className="relative p-2.5 rounded-full hover:bg-gray-50 transition-colors active:scale-90 text-gray-800"
            >
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span 
                  className="absolute top-1 right-0 w-4 h-4 text-[10px] flex items-center justify-center rounded-full text-white font-black shadow-md border border-white" 
                  style={{ background: "var(--primary)" }}
                >
                  {itemCount}
                </span>
              )}
            </button>

            {/* 🌟 4. MENÚ DE 3 PUNTOS LIMPIO (SOLO ADMIN) 🌟 */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)} 
                className="p-2.5 rounded-full hover:bg-gray-50 transition-colors active:scale-90 text-gray-800"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-2">
                  <button
                    onClick={() => { navigate(user && storeData?.id ? `/${storeData.id}/admin` : "/login"); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-gray-50 text-gray-800 flex items-center gap-3 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    Panel Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}