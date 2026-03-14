import { useState, useEffect } from "react"; // 🌟 AGREGAMOS useEffect
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 🌟 MAGIA: Traemos currentUser para saber si ya hay alguien adentro
  const { login, logout, currentUser, user } = useAuth(); 
  const navigate = useNavigate();

  // 🌟 MAGIA VIP: Si entras a /login y YA tienes sesión, te patea directo a tu panel
  useEffect(() => {
    const activeUser = currentUser || user;
    if (activeUser) {
      if (activeUser.email === "aea@gmail.com") {
        navigate('/super-admin'); 
      } else {
        // Si es un vendedor, buscamos su tienda y lo mandamos directo
        const fetchMyStore = async () => {
          const q = query(collection(db, "stores"), where("ownerId", "==", activeUser.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            navigate(`/${snap.docs[0].id}/admin`);
          } else {
            navigate('/'); // Si no tiene tienda, lo mandamos al index
          }
        };
        fetchMyStore();
      }
    }
  }, [currentUser, user, navigate]);

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Completa todos los campos"); return; }
    setLoading(true);
    try {
      // 1. Iniciar sesión en Firebase Auth (La puerta principal)
      const userCred = await login(email, password);
      const userUid = userCred.user.uid;
      
      // 2. Buscar la tienda que te pertenece
      const q = query(collection(db, "stores"), where("ownerId", "==", userUid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const storeDoc = querySnapshot.docs[0]; 
        
        // ------------------------------------------------------------------
        // 🌟 FASE 1: RASTREO SILENCIOSO DE IP Y ÚLTIMA CONEXIÓN 🌟
        // ------------------------------------------------------------------
        try {
          // Obtenemos la IP y el País de la conexión actual
          const ipResponse = await fetch('https://ipapi.co/json/');
          const ipData = await ipResponse.json();
          
          // Actualizamos los datos en la tienda (sin que el usuario lo note)
          const storeRef = doc(db, "stores", storeDoc.id);
          await updateDoc(storeRef, {
            last_login: serverTimestamp(),
            ip_operacion: ipData.ip || "Desconocida",
            pais_operacion: ipData.country_name || "Desconocido"
          });
        } catch (geoError) {
          console.warn("No se pudo obtener la ubicación (posible bloqueador):", geoError);
          // Si falla (ej: tiene un bloqueador de anuncios), al menos guardamos la hora
          const storeRef = doc(db, "stores", storeDoc.id);
          await updateDoc(storeRef, { last_login: serverTimestamp() });
        }
        // ------------------------------------------------------------------
        
        // 🌟 MAGIA VIP: LA PREGUNTA DEL MILLÓN AL INICIAR SESIÓN 🌟
        if (email.toLowerCase() === "aea@gmail.com") {
          const choice = window.confirm("¡Bienvenido, Jefe! 👑\n\n¿Deseas entrar al PANEL DE CONTROL TOTAL (Súper Admin)?\n\n(Aceptar = Súper Admin / Cancelar = Administrar mi Tienda)");
          
          if (choice) {
            navigate("/super-admin");
            toast.success("¡Bienvenido al Olimpo! ⚡");
          } else {
            navigate(`/${storeDoc.id}/admin`);
            toast.success("¡Bienvenido al panel admin! 🔐");
          }
        } else {
          // Si es un vendedor normal, lo mandamos directo a su tienda
          navigate(`/${storeDoc.id}/admin`); // Te enviamos a tu panel privado
          toast.success("¡Bienvenido al panel admin! 🔐");
        }
        
      } else {
        toast.error("Tu usuario no tiene una tienda asignada.");
        logout(); // Cierra la sesión si no tiene tienda
      }
    } catch (error) {
      console.error("Detalle del error:", error); // 🌟 Ahora sabremos exactamente qué falla
      // 🌟 MAGIA: Separa los errores para no dar falsas alarmas
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast.error("Correo o contraseña incorrectos ❌");
      } else {
        toast.error("Error al conectar con la tienda. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Acceso restringido</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-pink-300"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-pink-300"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {loading ? "Verificando acceso..." : "Ingresar"}
          </button>
        </div>

        <button onClick={() => navigate("/")} className="w-full text-center text-sm text-gray-400 mt-4 hover:text-gray-600">
          ← Volver a la tienda principal
        </button>
      </div>
    </div>
  );
}