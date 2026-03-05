import { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  exchangeRate: 36.5,
  whatsappNumber: "584120496690",
  freeShippingGoal: 50,
  primaryColor: "#ec4899",
  announcementText: "🚚 Envíos gratis por MRW a partir de $50",
  profileImage: "",
  heroTitle: "Moda & Belleza ✨",
  heroDescription: "Descubre nuestra colección exclusiva de ropa y maquillaje. Calidad y estilo en un solo lugar.",
  socialLinks: {
    instagram: "",
    tiktok: "",
    facebook: "",
    twitter: "",
  },
  quickButtons: [
    { id: "1", label: "Catálogo", icon: "🛍️", filter: "all" },
    { id: "2", label: "Ofertas", icon: "🔥", filter: "ofertas" },
    { id: "3", label: "Ropa", icon: "👗", filter: "ropa" },
    { id: "4", label: "Maquillaje", icon: "💄", filter: "maquillaje" },
  ],
  legalText: "Todos los precios están expresados en dólares americanos (USD). Los precios en bolívares son referenciales basados en la tasa del día.",
  happyCustomerImages: [],
};

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "settings"), (snap) => {
      if (snap.exists()) {
        setSettings((prev) => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Apply primary color CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty("--primary", settings.primaryColor);
  }, [settings.primaryColor]);

  const updateSettings = async (updates) => {
    await setDoc(doc(db, "config", "settings"), updates, { merge: true });
  };

  const bsPrice = (usdPrice) => {
    return (usdPrice * settings.exchangeRate).toFixed(2);
  };

  return (
    <AppContext.Provider value={{ settings, loading, updateSettings, bsPrice }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
