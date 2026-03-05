import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuración de TU nueva tienda (Venezuela Multi Hilos)
const firebaseConfig = {
  apiKey: "AIzaSyA-W2oLOdc_lhG8_oygYRjn2Uynhld74uU",
  authDomain: "tiendavenezuela-768d2.firebaseapp.com",
  projectId: "tiendavenezuela-768d2",
  storageBucket: "tiendavenezuela-768d2.firebasestorage.app",
  messagingSenderId: "777137123854",
  appId: "1:777137123854:web:d04920f244b8b0c917825f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios (Esto es lo que hace que el clon funcione)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 

export default app;