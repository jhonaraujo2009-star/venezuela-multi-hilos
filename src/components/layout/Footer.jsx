import { useApp } from "../../context/AppContext";

export default function Footer() {
  const { settings, storeData } = useApp();

  // 🌟 MAGIA: Usamos los textos de la tienda individual
  const legalText = storeData?.legalText || settings.legalText;
  const storeName = storeData?.heroTitle || settings.heroTitle || "Store";

  return (
    <footer className="mt-12 bg-white border-t border-gray-50 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Texto Legal - Alta Gama */}
        {legalText && (
          <p className="text-[10px] text-gray-400 text-center leading-relaxed tracking-wide uppercase font-medium opacity-60">
            {legalText}
          </p>
        )}

        {/* Separador Minimalista */}
        <div className="w-8 h-[1px] bg-gray-100 mx-auto" />

        {/* Copyright */}
        <p className="text-[9px] text-gray-300 text-center font-black uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} — {storeName}
        </p>
        
        <p className="text-[8px] text-gray-200 text-center uppercase tracking-widest">
          Todos los derechos reservados
        </p>
      </div>
    </footer>
  );
}