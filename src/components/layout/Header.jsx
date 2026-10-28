import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { SUPER_ADMIN_EMAIL } from "../../config/constants"; 
import { calculateProductPricing } from "../../utils/pricing";

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

  // 🌟 ESTADO PARA EL BRANDING MATRIZ EN TIEMPO REAL
  const [globalBranding, setGlobalBranding] = useState(() => {
    try {
      const cached = localStorage.getItem("global_branding");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          name: parsed.companyName || "",
          logo: parsed.companyLogo || null
        };
      }
    } catch(e) {}
    return { name: "", logo: null };
  });

  // 🌟 CONTADOR DE ME GUSTA / FAVORITOS EN TIEMPO REAL
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const updateWishlistCount = () => {
      try {
        const likedKey = `userLikes_${storeData?.id || "global"}`;
        const liked = JSON.parse(localStorage.getItem(likedKey) || "{}");
        const count = Object.keys(liked).filter((k) => liked[k]).length;
        setWishlistCount(count);
      } catch (e) {
        setWishlistCount(0);
      }
    };

    updateWishlistCount();
    window.addEventListener("likes_updated", updateWishlistCount);
    window.addEventListener("wishlist_updated", updateWishlistCount);
    window.addEventListener("storage", updateWishlistCount);
    return () => {
      window.removeEventListener("likes_updated", updateWishlistCount);
      window.removeEventListener("wishlist_updated", updateWishlistCount);
      window.removeEventListener("storage", updateWishlistCount);
    };
  }, [storeData?.id]);

  // 🌟 ESCUCHAMOS DIRECTAMENTE AL SUPER ADMIN (settings/global)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalBranding({
          name: data.companyName || "",
          logo: data.companyLogo || null
        });
      }
    });
    return () => unsub(); 
  }, []);

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
      {/* 🌟 BUSCADOR PANTALLA COMPLETA */}
      <div 
        className={`fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          searchOpen ? 'opacity-100 visible translate-y-0 pointer-events-auto' : 'opacity-0 invisible -translate-y-12 pointer-events-none'
        }`}
      >
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

        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">
          {searchQuery && (searchResults.length > 0 || searching) && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Resultados</h3>
              
              {searching ? (
                <div className="text-sm font-bold text-gray-300 tracking-widest uppercase animate-pulse">Buscando...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {searchResults.map((p) => {
                    const pricing = calculateProductPricing(p);
                    const thumb = p.image || p.imageUrl || p.images?.[0];
                    return (
                      <button
                        key={p.id}
                        onClick={() => { onProductClick(p); setSearchOpen(false); setSearchQuery(""); }}
                        className="w-full flex items-center gap-5 p-4 bg-white hover:bg-gray-50 rounded-3xl border border-gray-100 transition-all active:scale-95 group shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                      >
                        {thumb ? (
                          <img src={thumb} alt={p.name} className="w-16 h-20 object-cover rounded-2xl shadow-sm group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-16 h-20 bg-gray-100 rounded-2xl" />
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-base font-black text-gray-900 leading-tight mb-1">{p.name}</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-sm font-bold text-gray-900">${pricing.finalPrice.toFixed(2)}</p>
                            {pricing.hasDiscount && pricing.oldPrice > pricing.finalPrice && (
                              <span className="text-xs font-medium text-gray-400 line-through">${pricing.oldPrice.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {searchQuery && !searching && searchResults.length === 0 && (
             <div className="text-center py-20 text-gray-400">
               <span className="text-4xl block mb-4">🔍</span>
               <p className="text-sm font-bold uppercase tracking-widest">No encontramos "{searchQuery}"</p>
             </div>
          )}
        </div>
      </div>

      {/* 🌟 CABECERA PRINCIPAL (HEADER NORMAL) */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-gray-100 h-14 transition-all duration-300">
        <div className="max-w-md mx-auto px-4 h-full flex items-center justify-between gap-3">
          
          {/* 🌟 LOGO O NOMBRE ENCHAPADO EN ORO (ESTILO EK EMPIRE) 🌟 */}
          <Link 
            to="/" 
            className="flex-shrink-0 flex items-center gap-1.5 py-1.5 pr-3 cursor-pointer select-none relative z-10 active:opacity-80 transition-opacity" 
            title="Ir a la página principal"
            onClick={() => { 
              window.scrollTo({ top: 0, behavior: "instant" }); 
            }}
          >
            {globalBranding.logo ? (
              <img src={globalBranding.logo} alt="Empresa Matriz" className="h-8 w-auto object-contain drop-shadow-sm pointer-events-none" />
            ) : (
              <span 
                className="text-xl sm:text-[22px] font-black tracking-tighter uppercase text-transparent bg-clip-text pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(to right, #462523 0%, #cb9b51 22%, #f6e27a 45%, #ffffff 50%, #f6e27a 55%, #cb9b51 78%, #462523 100%)",
                  filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.4))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                {globalBranding.name || "MULTI TIENDA"}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
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
                if(storeData?.id) navigate(`/${storeData.id}`);
              }} 
              className="relative p-2 sm:p-2.5 rounded-full hover:bg-pink-50 hover:text-pink-500 transition-colors active:scale-90 text-gray-800"
              title="Mis Favoritos"
            >
              <svg 
                className={`w-5 h-5 sm:w-[22px] sm:h-[22px] transition-colors ${wishlistCount > 0 ? "text-pink-500 fill-pink-500" : ""}`} 
                fill={wishlistCount > 0 ? "currentColor" : "none"} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span 
                  className="absolute top-1 right-0 min-w-[16px] h-4 px-1 text-[10px] flex items-center justify-center rounded-full text-white font-black shadow-md border border-white bg-pink-500 animate-in zoom-in-50 duration-200"
                >
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* 🌟 BOTÓN DE COMPARTIR PERFIL DIRECTO EN HEADER 🌟 */}
            {storeData?.id && (
              <button 
                onClick={async () => {
                  const shareData = {
                    title: `¡Visita ${storeData.nombre || "mi tienda"}!`,
                    text: storeData.heroDescription || `Te invito a ver mi catálogo interactivo en línea.`,
                    url: `${window.location.origin}/api/store-og?storeId=${storeData.id}`
                  };
                  
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else {
                      await navigator.clipboard.writeText(shareData.url);
                      alert("¡Enlace copiado al portapapeles!");
                    }
                  } catch (err) {
                    console.log("Compartir cancelado o error:", err);
                  }
                }}
                className="p-2 sm:p-2.5 rounded-full hover:bg-pink-50 hover:text-pink-500 transition-colors active:scale-90 text-gray-800 relative group"
                title="Compartir Mi Tienda"
              >
                <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}

            <button 
              onClick={() => setIsOpen(true)} 
              className="relative p-2 sm:p-2.5 rounded-full hover:bg-gray-50 transition-colors active:scale-90 text-gray-800"
            >
              <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)} 
                className="p-2 sm:p-2.5 rounded-full hover:bg-gray-50 transition-colors active:scale-90 text-gray-800"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
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
                    Panel Admin Tienda
                  </button>
                  {user && SUPER_ADMIN_EMAIL && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
                    <button
                      onClick={() => { navigate("/super-admin"); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-pink-50 text-pink-600 flex items-center gap-3 rounded-xl transition-colors"
                    >
                      <span className="text-sm">👑</span>
                      Súper Admin
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}