import { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useLocation, useNavigate } from "react-router-dom"; 

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  exchangeRate: 36.5,
  whatsappNumber: "584120496690",
  freeShippingGoal: 50,
  primaryColor: "#ec4899",
  announcementText: "🚚 Envíos gratis por MRW a partir de $50",
  profileImage: "",
  heroTitle: "Moda & Belleza ✨",
  heroDescription: "Descubre nuestra colección exclusiva de ropa y maquillaje.",
  socialLinks: { instagram: "", tiktok: "", facebook: "", twitter: "" },
  quickButtons: [
    { id: "1", label: "Catálogo", icon: "🛍️", filter: "all" },
    { id: "2", label: "Ofertas", icon: "🔥", filter: "ofertas" },
    { id: "3", label: "Ropa", icon: "👗", filter: "ropa" },
    { id: "4", label: "Maquillaje", icon: "💄", filter: "maquillaje" },
  ],
  legalText: "Todos los precios están expresados en dólares americanos (USD).",
  happyCustomerImages: [],
};

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "config", "settings"), (snap) => {
      if (snap.exists()) setSettings((prev) => ({ ...prev, ...snap.data() }));
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    setLoading(true);
    const pathParts = location.pathname.split('/').filter(Boolean);
    
    // 🌟 MAGIA: Rutas seguras completas
    const reservedPaths = ['admin', 'login', 'registro-vendedor', 'super-admin']; 
    
    let storeId = null; 
    
    if (pathParts.length > 0 && !reservedPaths.includes(pathParts[0])) {
      storeId = pathParts[0].toLowerCase(); 
    }

    if (!storeId) {
      setStoreData(null);
      setLoading(false);
      return;
    }

    const unsubStore = onSnapshot(doc(db, "stores", storeId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStoreData({ 
          id: snap.id, 
          ...data,
          verification: data.verification || { status: 'none' } 
        });
      } else {
        setStoreData(null);
        navigate("/", { replace: true });
      }
      setLoading(false);
    });

    return () => unsubStore();
  }, [location.pathname, navigate]);

  useEffect(() => {
    const activeColor = storeData?.primaryColor || settings.primaryColor || "#ec4899";
    document.documentElement.style.setProperty("--primary", activeColor);
  }, [settings.primaryColor, storeData?.primaryColor]);

  const updateSettings = async (updates) => {
    await setDoc(doc(db, "config", "settings"), updates, { merge: true });
  };

  const bsPrice = (usdPrice) => {
    return (usdPrice * settings.exchangeRate).toFixed(2);
  };

  return (
    <AppContext.Provider value={{ settings, storeData, loading, updateSettings, bsPrice }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};