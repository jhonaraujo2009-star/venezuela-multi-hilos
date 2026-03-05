import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

// 🌟 MAGIA: Añadimos onFilter aquí arriba sin borrar onProductClick
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessions = async () => {
      // HEMOS QUITADO EL 'orderBy' AQUÍ PARA ARREGLAR TU ERROR
      const q = query(collection(db, "sessions"), where("hidden", "==", false));
      const snap = await getDocs(q);
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const snap = await getDocs(collection(db, "products"));
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
  }, [searchQuery]);

  // Cerrar menú al hacer clic afuera
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
      
      {/* 🌟 1. BUSCADOR INTELIGENTE ANIMADO (Reemplaza tu buscador viejo) 🌟 */}
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
        
        {/* Logo (Ahora resetea los filtros al tocarlo) */}
        <div 
          className="flex-shrink-0 cursor-pointer" 
          onClick={() => { 
            if(onFilter) onFilter("all"); 
            window.scrollTo(0, 0); 
          }}
        >
          <span className="text-xl font-black tracking-tighter uppercase" style={{ color: "var(--primary)" }}>
            ✨ Luckathys
          </span>
        </div>

        {/* Botonera */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          
          {/* Botón Lupa */}
          <button 
            onClick={() => setSearchOpen(true)} 
            className="p-2.5 rounded-full hover:bg-gray-50 transition-colors active:scale-90 text-gray-800"
          >
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* 🌟 2. BOTÓN WISHLIST (CORAZÓN VIP) 🌟 */}
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

          {/* Botón Carrito Intacto */}
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

          {/* Tu Menú Original de 3 puntos (INTACTO) */}
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
                  onClick={() => { navigate("/preguntas"); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                >
                  💬 Zona de Preguntas
                </button>
                <button
                  onClick={() => { navigate(user ? "/admin" : "/login"); setMenuOpen(false); }}
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