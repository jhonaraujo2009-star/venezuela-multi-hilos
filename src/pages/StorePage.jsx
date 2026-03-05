import { useState } from "react";
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
  const { bsPrice } = useApp();

  const showFloatingElements = !isOpen && !selectedProduct;

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="fixed top-0 left-0 right-0 z-40">
        <AnnouncementBar />
        {/* 🌟 MAGIA: Le pasamos 'onFilter' al Header para abrir Favoritos */}
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