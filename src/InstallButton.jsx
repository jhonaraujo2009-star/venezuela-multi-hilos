import React, { useState, useEffect } from 'react';
// Importamos el cerebro del carrito para que el botón sea inteligente
import { useCart } from "./context/CartContext";

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Extraemos la información del carrito
  const { itemCount, isOpen } = useCart();

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('El usuario aceptó instalar la App');
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  // REGLA 1: Si no hay prompt o el carrito está abierto, lo ocultamos
  if (!isVisible || isOpen) return null;

  // 🌟 MAGIA: Si hay productos en la bolsa, la barra de pago está visible (mide ~90px). 
  // Así que subimos este botón a 100px para que quede justo encima flotando en armonía.
  const isCheckoutBarVisible = itemCount > 0;
  const bottomPosition = isCheckoutBarVisible ? '100px' : '24px';

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-[45] w-[92%] max-w-md transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
      style={{ bottom: bottomPosition }}
    >
      <button
        onClick={handleInstallClick}
        className="w-full py-3.5 bg-white/90 backdrop-blur-xl border border-white shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] rounded-2xl text-[11px] font-black text-gray-800 uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-transform"
      >
        <span className="text-xl animate-bounce">📲</span>
        Descargar App de la Tienda
      </button>
    </div>
  );
};

export default InstallButton;