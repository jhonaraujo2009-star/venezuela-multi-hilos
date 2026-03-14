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
  
  // 🌟 EXTRAEMOS storeData (Esto lo agregué yo para leer las deudas y el logo)
  const { bsPrice, storeData } = useApp(); 

  const showFloatingElements = !isOpen && !selectedProduct;

  // 🌟 MAGIA 1: EL COBRADOR VIRTUAL (BLOQUEO POR DEUDA MAYOR A $20)
  const isBlockedByDebt = storeData?.deuda_comision > 20;

  // 🌟 MAGIA 2: SEO DE WHATSAPP (ESTO HACE QUE EL LINK SE VEA BONITO)
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
      
      setMetaTag('og:title', storeData.heroTitle || storeData.nombre || "Nuestra Tienda");
      setMetaTag('og:description', storeData.heroDescription || "Descubre nuestro catálogo de productos exclusivos.");
      setMetaTag('og:image', storeData.profileImage || storeData.appLogos?.icon512 || "");
    }
  }, [storeData]);

  // 🌟 SI DEBE DINERO, LE MOSTRAMOS ESTA PANTALLA EN LUGAR DE LA TIENDA
  if (isBlockedByDebt) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.04)] p-10 text-center border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            🛑
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Tienda en Mantenimiento</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium">
            Lo sentimos, esta tienda se encuentra temporalmente inactiva realizando labores administrativas. Por favor, regresa más tarde.
          </p>
        </div>
      </div>
    );
  }

  // 🌟 SI NO DEBE DINERO, CARGA TU TIENDA NORMALMENTE (NADA FUE BORRADO AQUÍ)
  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="fixed top-0 left-0 right-0 z-40">
        <AnnouncementBar />
        <Header onProductClick={setSelectedProduct} onFilter={setActiveFilter} />
      </div>

      <div className="pt-28">
        <div className="max-w-md mx-auto">
          <HeroBanner activeFilter={activeFilter} />
          <QuickButtons onFilter={setActiveFilter} />
          
          <ProductCatalog
            activeFilter={activeFilter}
            onProductClick={setSelectedProduct}
            onFilter={setActiveFilter} 
          />
          
          <Footer />
        </div>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
      
      <CartDrawer />
      
      {showFloatingElements && <WhatsAppVIP />}
      
      <InstallButton />

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

          <button
            onClick={() => setIsOpen(true)}
            className="h-[58px] min-w-[150px] bg-gray-950 text-white rounded-full font-black uppercase tracking-[0.2em] text-[11px] relative overflow-hidden group active:scale-95 transition-all flex items-center justify-center gap-2.5 shadow-inner"
          >
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