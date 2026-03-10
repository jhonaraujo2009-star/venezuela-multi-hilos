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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 h-14 transition-all duration-300">
      
      {/* BUSCADOR INTELIGENTE ANIMADO */}
      <div 
        className={`absolute inset-0 bg-white/95 backdrop-blur-2xl z-50 flex items-center px-4 transition-all duration-500 ease-out ${
          searchOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          autoFocus={searchOpen}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Busca tops, vestidos, colores..."
          className="flex-1 bg-transparent border-none outline-none text-gray-900 text-base font-medium placeholder:text-gray-300"
        />
        <button 
          onClick={() => { setSearchOpen(false); setSearchQuery(""); }} 
          className="p-2 text-gray-400 hover:text-pink-500 transition-colors font-bold text-xl active:scale-90"
        >
          ✕
        </button>
      </div>

      {/* Resultados del Buscador */}
      {searchOpen && (searchResults.length > 0 || searching) && (
        <div className="absolute top-[60px] left-4 right-4 bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-500 max-h-[60vh] overflow-y-auto">
          {searching ? (
            <div className="p-8 text-center text-sm font-bold text-gray-400 tracking-widest uppercase animate-pulse">Buscando joyas...</div>
          ) : (
            <div className="p-2">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onProductClick(p); setSearchOpen(false); setSearchQuery(""); }}
                  className="w-full flex items-center gap-4 p-3 hover:bg-pink-50/50 rounded-2xl transition-colors text-left group"
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-14 h-16 object-cover rounded-xl shadow-sm group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-14 h-16 bg-gray-100 rounded-xl" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-800 uppercase line-clamp-1">{p.name}</p>
                    <p className="text-xs font-bold text-pink-500">${p.price}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CABECERA NORMAL */}
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
            {/* 🌟 LÓGICA DE NOMBRE REPARADA 🌟 */}
            ✨ {storeData?.nombre || storeData?.id || "Mi Tienda"}
            
            {/* 🌟 LÓGICA DE PLACA DE VERIFICACIÓN PRO 🌟 */}
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

        {/* Botonera Intacta */}
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

          <button 
            onClick={() => setIsOpen(true)} 
            className="relative p-2.5 rounded-full hover:bg-gray-50 transition-colors active:scale-90 text-gray-800"
          >
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {itemCount > 0 && (
              <span 
                className="absolute top-1 right-0.5 w-4 h-4 text-[10px] flex items-center justify-center rounded-full text-white font-black shadow-md border border-white" 
                style={{ background: "var(--primary)" }}
              >
                {itemCount}
              </span>
            )}
          </button>

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
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-2">
                <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Sesiones
                </p>
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                    onClick={() => {
                      document.getElementById(`session-${s.id}`)?.scrollIntoView({ behavior: "smooth" });
                      setMenuOpen(false);
                    }}
                  >
                    {s.name}
                  </button>
                ))}
                <div className="border-t border-gray-100 my-1" />
                
                <button
                  onClick={() => { navigate(storeData?.id ? `/${storeData.id}/preguntas` : "/"); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                >
                  💬 Zona de Preguntas
                </button>
                
                <button
                  onClick={() => { navigate(user && storeData?.id ? `/${storeData.id}/admin` : "/login"); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                >
                  🔒 Panel Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}