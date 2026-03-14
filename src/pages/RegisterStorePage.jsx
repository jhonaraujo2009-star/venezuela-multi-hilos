import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { db, auth } from "../config/firebase";
import toast from "react-hot-toast";

export default function RegisterStorePage() {
  const [formData, setFormData] = useState({
    storeName: "",
    storeUrl: "",
    email: "",
    password: "",
  });
  
  const [urlStatus, setUrlStatus] = useState("idle"); 
  const [emailStatus, setEmailStatus] = useState("idle"); 
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNameChange = (e) => {
    const name = e.target.value;
    const urlFormat = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    setFormData({ ...formData, storeName: name, storeUrl: urlFormat });
  };

  // VIGILANTE DE URL
  useEffect(() => {
    if (!formData.storeUrl) {
      setUrlStatus("idle");
      return;
    }
    
    setUrlStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const storeRef = doc(db, "stores", formData.storeUrl);
        const storeSnap = await getDoc(storeRef);
        setUrlStatus(storeSnap.exists() ? "taken" : "available");
      } catch (error) {
        setUrlStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.storeUrl]);

  // VIGILANTE DE CORREO MEJORADO
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setEmailStatus("idle");
      return;
    }

    setEmailStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const cleanEmail = formData.email.toLowerCase();
        
        const signInMethods = await fetchSignInMethodsForEmail(auth, cleanEmail);
        if (signInMethods.length > 0) {
          setEmailStatus("taken");
          return;
        }

        const q = query(collection(db, "stores"), where("ownerEmail", "==", cleanEmail));
        const querySnapshot = await getDocs(q);
        
        setEmailStatus(!querySnapshot.empty ? "taken" : "available");
      } catch (error) {
        console.error("Error verificando correo:", error);
        setEmailStatus("available"); 
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.storeName || !formData.storeUrl || !formData.email || !formData.password) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (urlStatus === "taken") {
      toast.error("El enlace de la tienda ya está en uso.");
      return;
    }
    if (emailStatus === "taken") {
      toast.error("Este correo ya tiene una tienda registrada.");
      return;
    }

    setLoading(true);
    try {
      // ------------------------------------------------------------------
      // 🌟 FASE 1: RASTREO SILENCIOSO DE IP AL REGISTRARSE 🌟
      // ------------------------------------------------------------------
      let ipOperacion = "Desconocida";
      let paisOperacion = "Desconocido";
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        ipOperacion = ipData.ip || "Desconocida";
        paisOperacion = ipData.country_name || "Desconocido";
      } catch (geoError) {
        console.warn("No se pudo obtener la ubicación:", geoError);
      }
      // ------------------------------------------------------------------

      const userCred = await createUserWithEmailAndPassword(auth, formData.email.toLowerCase(), formData.password);
      const user = userCred.user;

      await setDoc(doc(db, "stores", formData.storeUrl), {
        nombre: formData.storeName,
        ownerId: user.uid,
        ownerEmail: formData.email.toLowerCase(),
        primaryColor: "#ec4899", 
        createdAt: serverTimestamp(),
        verification: { status: "none" }, 
        isActive: true,
        // ------------------------------------------------------------------
        // 🌟 FASE 1: KIT DE INICIO SÚPER ADMIN (FINANZAS Y ANALÍTICAS) 🌟
        // ------------------------------------------------------------------
        ip_registro: ipOperacion, // Se guarda para siempre (IP original)
        pais_registro: paisOperacion, // País original de la cuenta
        ip_operacion: ipOperacion, // IP de la última sesión
        pais_operacion: paisOperacion, // País de la última sesión
        last_login: serverTimestamp(),
        comision_porcentaje: 5, // % de comisión por defecto (modificable en panel admin)
        deuda_comision: 0, // Inician sin deber nada
        total_productos: 0, // Contador de catálogo
        ventas_consolidadas: 0 // Contador de éxito
        // ------------------------------------------------------------------
      });

      toast.success("¡Tienda creada con éxito! Bienvenido a tu imperio.");
      
      // 🌟 MAGIA: INTERCEPTOR VIP PARA EL JEFE
      if (formData.email.toLowerCase() === "aea@gmail.com") {
        const choice = window.confirm("¡Bienvenido, Jefe! 👑\n\n¿Deseas entrar al PANEL DE CONTROL TOTAL (Súper Admin)?\n\n(Aceptar = Súper Admin / Cancelar = Administrar mi Tienda)");
        if (choice) {
          navigate("/super-admin");
        } else {
          navigate(`/${formData.storeUrl}/admin`);
        }
      } else {
        // Redirección normal para los demás usuarios
        navigate(`/${formData.storeUrl}/admin`);
      }

    } catch (error) {
      console.error("Error al registrar tienda:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Este correo ya está registrado en el sistema.");
        setEmailStatus("taken"); 
      } else {
        toast.error("Hubo un error al crear la tienda. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === "checking") return <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>;
    if (status === "available") return <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>;
    if (status === "taken") return <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>;
    return null;
  };

  return (
    // 🌟 Fondo gris claro en móvil para resaltar la tarjeta, fondo blanco en PC
    <div className="min-h-screen flex font-sans bg-[#F9FAFB] lg:bg-white">
      
      {/* LADO IZQUIERDO: Promesa de Valor (Oculto en móviles) */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 text-white flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-pink-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-violet-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-10 shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/')}>
            <span className="text-gray-900 font-black text-2xl">M</span>
          </div>
          <h1 className="text-5xl font-black leading-tight mb-6">
            Lleva tu negocio al <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">siguiente nivel.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md">
            Crea tu tienda online profesional en menos de 1 minuto. Sube tus productos, recibe pedidos y administra todo desde tu celular.
          </p>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl max-w-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-pink-500 border-2 border-gray-900 flex items-center justify-center text-xs">👩</div>
              <div className="w-10 h-10 rounded-full bg-violet-500 border-2 border-gray-900 flex items-center justify-center text-xs">👨</div>
              <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-gray-900 flex items-center justify-center text-xs">👱‍♀️</div>
            </div>
            <p className="text-sm font-bold text-gray-300">+500 emprendedores</p>
          </div>
          <p className="text-sm text-gray-400 italic">"Desde que abrí mi tienda aquí, mis ventas se automatizaron por completo. ¡Es la mejor decisión!"</p>
        </div>
      </div>

      {/* LADO DERECHO: Formulario de Registro */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative min-h-screen lg:min-h-0 py-10">
        
        {/* 🌟 Botón volver (Adaptable) */}
        <div className="w-full max-w-md flex items-center justify-between mb-6 lg:absolute lg:top-8 lg:left-8 lg:mb-0 lg:w-auto">
          <button onClick={() => navigate('/')} className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors">
            ← <span className="hidden sm:inline">Volver al inicio</span><span className="sm:hidden">Volver</span>
          </button>
        </div>

        {/* 🌟 Logo en móvil */}
        <div className="lg:hidden w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg mb-6 cursor-pointer" onClick={() => navigate('/')}>
          <span className="text-white font-black text-3xl">M</span>
        </div>

        {/* 🌟 Tarjeta del Formulario (Premium Glass en móvil) */}
        <div className="w-full max-w-md bg-white lg:bg-transparent p-6 sm:p-10 lg:p-0 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:shadow-none border border-gray-100 lg:border-none">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 tracking-tight">Abre tu Tienda Gratis</h2>
            <p className="text-gray-500 text-sm sm:text-base">Completa tus datos y empieza a vender hoy mismo.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
            
            {/* Nombre de la tienda */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre de tu marca</label>
              <input 
                type="text" 
                required
                value={formData.storeName}
                onChange={handleNameChange}
                placeholder="Ej: Tienda Moda Oscar" 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-3.5 outline-none focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all text-gray-900 font-medium text-sm sm:text-base"
              />
            </div>

            {/* Enlace Personalizado con Validación Responsiva */}
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>Tu enlace personalizado</span>
                {urlStatus === "available" && <span className="text-green-500 text-[10px] sm:text-xs font-bold flex items-center gap-1"><StatusIcon status="available"/> ¡Disponible!</span>}
                {urlStatus === "taken" && <span className="text-red-500 text-[10px] sm:text-xs font-bold flex items-center gap-1"><StatusIcon status="taken"/> No disponible</span>}
              </label>
              <div className="flex items-stretch relative">
                <div className="bg-gray-100 border border-gray-200 border-r-0 rounded-l-2xl px-3 sm:px-4 py-3 sm:py-3.5 flex items-center text-gray-500 text-xs sm:text-sm font-medium select-none">
                  megastore/
                </div>
                <input 
                  type="text" 
                  required
                  value={formData.storeUrl}
                  onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
                  placeholder="tu-tienda" 
                  className={`w-full bg-gray-50 border rounded-r-2xl px-3 sm:px-4 py-3 sm:py-3.5 outline-none focus:bg-white transition-all text-pink-600 font-bold text-sm sm:text-base ${
                    urlStatus === 'taken' ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 
                    urlStatus === 'available' ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10' : 
                    'border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10'
                  }`}
                />
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                  {urlStatus === "checking" && <StatusIcon status="checking" />}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 my-4 sm:my-6"></div>

            {/* Correo Electrónico con Validación Responsiva */}
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>Correo Electrónico</span>
                {emailStatus === "available" && <span className="text-green-500 text-[10px] sm:text-xs font-bold flex items-center gap-1"><StatusIcon status="available"/> Correo disponible</span>}
                {emailStatus === "taken" && <span className="text-red-500 text-[10px] sm:text-xs font-bold flex items-center gap-1"><StatusIcon status="taken"/> Ya registrado</span>}
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tucorreo@ejemplo.com" 
                  className={`w-full bg-gray-50 border rounded-2xl px-4 py-3 sm:py-3.5 outline-none focus:bg-white transition-all text-gray-900 font-medium pr-10 text-sm sm:text-base ${
                    emailStatus === 'taken' ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 
                    emailStatus === 'available' ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10' : 
                    'border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10'
                  }`}
                />
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                  {emailStatus === "checking" && <StatusIcon status="checking" />}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Contraseña</label>
              <input 
                type="password" 
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres" 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-3.5 outline-none focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all text-gray-900 font-medium text-sm sm:text-base"
              />
            </div>

            {/* Botón de Submit */}
            <button 
              type="submit"
              disabled={loading || urlStatus === "taken" || emailStatus === "taken"}
              className="w-full bg-gray-900 hover:bg-pink-600 text-white font-black py-3.5 sm:py-4 rounded-2xl mt-6 transition-colors disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg flex items-center justify-center text-sm sm:text-base"
            >
              {loading ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Crear mi tienda ahora"
              )}
            </button>
          </form>

          <p className="text-center text-xs sm:text-sm text-gray-500 mt-6 sm:mt-8">
            ¿Ya tienes una tienda? <button onClick={() => navigate('/login')} className="text-pink-600 font-bold hover:underline">Inicia sesión aquí</button>
          </p>
        </div>
      </div>
    </div>
  );
}