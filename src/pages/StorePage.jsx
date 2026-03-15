import { useState, useEffect } from "react"; 
import AnnouncementBar from "../components/layout/AnnouncementBar";
import Header from "../components/layout/Header";
import HeroBanner from "../components/layout/HeroBanner";
import QuickButtons from "../components/layout/QuickButtons";
import ProductCatalog from "../components/product/ProductCatalog";
import ProductModal from "../components/product/ProductModal";
import CartDrawer from "../components/cart/CartDrawer";
import Footer from "../components/layout/Footer";
import InstallButton from "../InstallButton";
import WhatsAppVIP from "../components/layout/WhatsAppVIP";

import { useCart } from "../context/CartContext";
import { useApp } from "../context/AppContext";

export default function StorePage() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const { itemCount, total, setIsOpen, isOpen } = useCart();
  const { bsPrice, storeData } = useApp(); 

  const showFloatingElements = !isOpen && !selectedProduct;

  // 🌟 BLOQUEO DOBLE: Por deuda o porque el Súper Admin la apagó
  const isBlockedByDebt = storeData?.deuda_comision > 20;
  const isStoreDisabled = storeData?.isActive === false;

  // 🌟 MAGIA: SEO DE WHATSAPP Y REDES SOCIALES (TARJETAS VISUALES)
  useEffect(() => {
    if (storeData) {
      document.title = storeData.nombre || "Tienda Online";
      
      const setMetaTag = (property, content) => {
        let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(property.includes(':') ? 'property' : 'name', property);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };
      
      // Etiquetas reforzadas para que WhatsApp arme la tarjeta perfecta
      setMetaTag('og:type', "website");
      setMetaTag('og:url', window.location.href);
      setMetaTag('og:title', storeData.heroTitle || storeData.nombre || "Nuestra Tienda");
      setMetaTag('og:description', storeData.heroDescription || "Descubre nuestro catálogo de productos exclusivos.");
      setMetaTag('og:image', storeData.profileImage || storeData.appLogos?.icon512 || "");
    }
  }, [storeData]);

  // 🌟 LÓGICA DE RECORTE DEL NOMBRE DE TIENDA (< 30 caracteres)
  const rawStoreName = storeData?.nombre || storeData?.id || "Mi Tienda";
  const displayStoreName = rawStoreName.length > 30 ? rawStoreName.substring(0, 30) + "..." : rawStoreName;

  // 🌟 PANTALLA DE BLOQUEO (Si debe dinero o fue apagada)
  if (isBlockedByDebt || isStoreDisabled) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.04)] p-10 text-center border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🛑</div>
          <h1 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Tienda No Disponible</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium">
            Lo sentimos, esta tienda se encuentra temporalmente inactiva o suspendida. Por favor, comunícate con el administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="fixed top-0 left-0 right-0 z-40">
        <AnnouncementBar />
        <Header onProductClick={setSelectedProduct} onFilter={setActiveFilter} />
      </div>

      {/* 🌟 Ajuste manual de altura (Mantenido intacto) */}
      <div className="pt-20">
        
        {/* NOMBRE DE LA TIENDA CON VERIFICACIÓN */}
        <div className="max-w-md mx-auto px-4 pb-2 flex items-center justify-center animate-in fade-in duration-700">
          <span className="text-xl font-black tracking-tighter uppercase flex items-center gap-1.5 text-center" style={{ color: "var(--primary)" }}>
            ✨ {displayStoreName}
            
            {storeData?.verification?.status === "verified" ? (
              <div className="relative flex items-center justify-center ml-1" title="Tienda Verificada Oficialmente">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping"></span>
                <svg className="relative w-5 h-5 text-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
              </div>
            ) : (
              <div className="ml-1.5 px-2.5 py-1 text-[8px] font-black bg-gradient-to-r from-gray-50 to-gray-100 text-gray-500 rounded-full border border-gray-200/60 flex items-center gap-1.5 tracking-widest uppercase shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                </span>
                No Verificado
              </div>
            )}
          </span>
        </div>

        {/* 🌟 Separación mt-8 para los botones (Mantenido intacto) */}
        <div className="max-w-md mx-auto mt-8">
          <HeroBanner activeFilter={activeFilter} />
          <QuickButtons onFilter={setActiveFilter} />
          <ProductCatalog activeFilter={activeFilter} onProductClick={setSelectedProduct} onFilter={setActiveFilter} />
          <Footer />
        </div>
      </div>

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      <CartDrawer />
      {showFloatingElements && <WhatsAppVIP />}
      <InstallButton />

      {/* BOTÓN FLOTANTE DEL CARRITO */}
      {showFloatingElements && itemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md h-[72px] bg-white/70 backdrop-blur-2xl rounded-full flex items-center justify-between p-1.5 pr-2.5 shadow-[0_20px_50px_rgba(236,72,153,0.15),0_10px_10px_rgba(0,0,0,0.05)] border border-white/60 animate-in slide-in-from-bottom-10 fade-in duration-700 active:scale-[0.98] transition-transform shadow-[0_0_25px_-5px_rgba(236,72,153,0.3)]">
          <div className="flex-1 flex flex-col justify-center px-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-gray-500 uppercase tracking-tighter">Total:</span>
              <span className="text-2xl font-black text-gray-950 tracking-tight">${total.toFixed(2)}</span>
            </div>
            <span className="text-[11px] font-bold text-gray-400 mt-[-1px] uppercase tracking-wider">
              Bs. {bsPrice(total)}
            </span>
          </div>
          <button onClick={() => setIsOpen(true)} className="h-[58px] min-w-[150px] bg-gray-950 text-white rounded-full font-black uppercase tracking-[0.2em] text-[11px] relative overflow-hidden group active:scale-95 transition-all flex items-center justify-center gap-2.5 shadow-inner">
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
            Ver Bolsa
            <span className="text-base group-hover:animate-bounce transition-transform">🛍️</span>
            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-xl shadow-pink-500/30 animate-pulse-subtle">
              {itemCount}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}