import { useState, useEffect } from "react";
import { useApp } from "./context/AppContext";

export default function InstallButton() {
  const { storeData } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 🌟 1. MAGIA AVANZADA: GENERAMOS EL INSTALADOR DINÁMICO 🌟
    if (storeData?.id) {
      const manifest = {
        name: storeData.nombre || "Mi Tienda",
        short_name: storeData.nombre || "Tienda",
        // 🎯 EL TRUCO ARREGLADO: Usamos la URL absoluta para que Chrome no se confunda
        start_url: `${window.location.origin}/${storeData.id}`, 
        display: "standalone",
        background_color: "#ffffff",
        theme_color: storeData.primaryColor || "#ec4899",
        icons: [
          {
            src: storeData.appLogos?.icon192 || "https://cdn-icons-png.flaticon.com/512/3144/3144456.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: storeData.appLogos?.icon512 || "https://cdn-icons-png.flaticon.com/512/3144/3144456.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      };

      // Convertimos el JSON en un archivo virtual
      const stringManifest = JSON.stringify(manifest);
      const blob = new Blob([stringManifest], { type: 'application/json' });
      const manifestURL = URL.createObjectURL(blob);

      // Le inyectamos el archivo virtual a la página para que el celular lo lea
      let linkTag = document.querySelector('link[rel="manifest"]');
      if (!linkTag) {
        linkTag = document.createElement('link');
        linkTag.rel = 'manifest';
        document.head.appendChild(linkTag);
      }
      linkTag.href = manifestURL;
    }

    // 🌟 2. CAPTURAMOS EL AVISO DEL CELULAR PARA INSTALAR 🌟
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Evitamos que salga el feo aviso por defecto de Android
      setDeferredPrompt(e); // Guardamos el aviso para usarlo en nuestro propio botón
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      console.log('App instalada con éxito 🚀');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Revisamos si ya la tiene instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
       setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [storeData]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Mostramos el aviso nativo de instalación
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('El usuario aceptó instalar la app');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Si no se puede instalar, o ya está instalada, o no hay tienda... no mostramos nada
  if (!isInstallable || isInstalled || !storeData) return null;

  return (
    // 🌟 MAGIA: "md:hidden" asegura que este botón NO aparezca en monitores de PC, solo en celulares
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in slide-in-from-bottom-5 duration-700 fade-in md:hidden">
      <div className="bg-white/95 backdrop-blur-2xl p-4 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <img 
              src={storeData.appLogos?.icon192 || "https://cdn-icons-png.flaticon.com/512/3144/3144456.png"} 
              alt="App Icon" 
              className="w-12 h-12 rounded-2xl object-cover shadow-sm" 
           />
           <div>
             <p className="text-sm font-black text-gray-900 leading-tight">Instalar App</p>
             <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-0.5">Tienda {storeData.nombre}</p>
           </div>
        </div>
        <button 
          onClick={handleInstall}
          className="px-6 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-transform"
          style={{ background: storeData.primaryColor || "var(--primary)" }}
        >
          Instalar
        </button>
      </div>
    </div>
  );
}