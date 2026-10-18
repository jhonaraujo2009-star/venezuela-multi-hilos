import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { db, auth } from "../config/firebase";
import toast from "react-hot-toast";
import { SUPER_ADMIN_EMAIL } from "../config/constants";
import { useApp } from "../context/AppContext";

const RESERVED_URLS = ['admin', 'login', 'registro-vendedor', 'super-admin', 'search', 'ofertas', 'preguntas', 'api'];

export default function RegisterStorePage() {
  const { globalBranding } = useApp() || {};
  const [formData, setFormData] = useState({
    storeName: "",
    storeUrl: "",
    email: "",
    password: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
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

    if (RESERVED_URLS.includes(formData.storeUrl.toLowerCase())) {
      setUrlStatus("taken");
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
      toast.error("Por favor, completa todos los campos requeridos.");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (RESERVED_URLS.includes(formData.storeUrl.toLowerCase())) {
      toast.error("Este enlace o nombre está reservado por el sistema.");
      return;
    }
    if (urlStatus === "taken") {
      toast.error("El enlace de la tienda ya está en uso. Por favor elige otro.");
      return;
    }
    if (emailStatus === "taken") {
      toast.error("Este correo ya tiene una tienda registrada.");
      return;
    }

    setLoading(true);
    try {
      // 🌟 FASE 1: RASTREO SILENCIOSO DE IP AL REGISTRARSE
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
        ip_registro: ipOperacion,
        pais_registro: paisOperacion,
        ip_operacion: ipOperacion,
        pais_operacion: paisOperacion,
        last_login: serverTimestamp(),
        comision_porcentaje: 5,
        deuda_comision: 0,
        total_productos: 0,
        ventas_consolidadas: 0
      });

      toast.success("¡Tu tienda ha sido creada con éxito! 🚀");
      
      // Interceptor para el Super Admin
      if (formData.email.toLowerCase() === SUPER_ADMIN_EMAIL?.toLowerCase()) {
        const choice = window.confirm("¡Bienvenido, Jefe! 👑\n\n¿Deseas entrar al PANEL DE CONTROL TOTAL (Súper Admin)?\n\n(Aceptar = Súper Admin / Cancelar = Administrar mi Tienda)");
        if (choice) {
          navigate("/super-admin");
        } else {
          navigate(`/${formData.storeUrl}/admin`);
        }
      } else {
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

  const getPasswordStrength = () => {
    const len = formData.password.length;
    if (len === 0) return { label: "", color: "bg-gray-200", width: "0%" };
    if (len < 6) return { label: "Muy corta", color: "bg-red-400", width: "30%" };
    if (len < 8) return { label: "Aceptable", color: "bg-yellow-400", width: "60%" };
    return { label: "Segura y fuerte", color: "bg-emerald-500", width: "100%" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/60 via-white to-purple-50/40 text-gray-900 font-sans selection:bg-pink-100 selection:text-pink-900 relative overflow-x-hidden">
      
      {/* Luces sutiles y estéticas de fondo (Colores Claros Pro) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-100/50 blur-[130px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[550px] h-[550px] bg-purple-100/40 blur-[140px] rounded-full pointer-events-none -z-10"></div>

      {/* NAVBAR SUPERIOR ELEGANTE */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          >
            {globalBranding?.companyLogo ? (
              <img 
                src={globalBranding.companyLogo} 
                alt={globalBranding?.companyName || "Logo"} 
                className="h-10 sm:h-12 w-auto max-w-[200px] object-contain drop-shadow-sm pointer-events-none"
              />
            ) : (
              <span 
                className="text-2xl sm:text-3xl font-black tracking-tighter uppercase text-transparent bg-clip-text select-none pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(to right, #462523 0%, #cb9b51 22%, #f6e27a 45%, #ffffff 50%, #f6e27a 55%, #cb9b51 78%, #462523 100%)",
                  filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.3))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                {globalBranding?.companyName || "VENEZUELA MULTI-HILOS"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-semibold text-gray-500">¿Ya tienes cuenta?</span>
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-2xl border border-gray-200 text-gray-700 hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50/50 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Iniciar Sesión 🔐
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

          {/* ========================================================
              COLUMNA IZQUIERDA: Presentación E-Commerce & Mockup
          ======================================================== */}
          <div className="lg:col-span-6 space-y-8">
            
            {/* Titular */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-100/80 border border-pink-200 text-pink-700 text-xs font-black tracking-wider uppercase shadow-xs">
                <span>✨</span> Plataforma E-Commerce para Marcas
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-[1.15]">
                Crea tu tienda online y <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600">
                  vende como los grandes.
                </span>
              </h1>

              <p className="text-gray-600 text-sm sm:text-base leading-relaxed font-normal">
                Tu catálogo interactivo listo en segundos. Automatiza tus ventas por WhatsApp, gestiona tu inventario con Punto de Venta (POS) y acepta pagos en Bolívares y Dólares con tasa actualizada.
              </p>
            </div>

            {/* SIMULADOR EN VIVO DE CÓMO SE VERÁ SU TIENDA (Interactive Preview) */}
            <div className="bg-white rounded-[2.5rem] border border-pink-100 p-5 sm:p-7 shadow-[0_20px_50px_-15px_rgba(236,72,153,0.12)] relative overflow-hidden transition-all">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="text-[11px] font-bold text-gray-400 ml-2">Vista previa de tu tienda</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
                  ⚡ En vivo
                </span>
              </div>

              {/* Encabezado de la tienda simulada */}
              <div className="bg-gradient-to-br from-pink-50 via-rose-50/40 to-white rounded-3xl p-4 sm:p-5 border border-pink-100/80 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-pink-500/20">
                    {formData.storeName ? formData.storeName.charAt(0).toUpperCase() : "🛍️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-black text-gray-900 text-base sm:text-lg truncate">
                        {formData.storeName.trim() || "Nombre de Tu Tienda"}
                      </h4>
                      <span className="text-blue-500 text-sm" title="Tienda Oficial">✓</span>
                    </div>
                    <p className="text-xs font-mono font-bold text-pink-600 truncate">
                      /{formData.storeUrl ? formData.storeUrl : "tu-marca"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className="bg-white/90 text-gray-700 px-2.5 py-1 rounded-xl shadow-xs border border-pink-100">
                    💵 Tasa Oficial / Paralelo
                  </span>
                  <span className="bg-white/90 text-gray-700 px-2.5 py-1 rounded-xl shadow-xs border border-pink-100">
                    🚚 Envíos Nacionales
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl border border-emerald-200">
                    🟢 Abierto ahora
                  </span>
                </div>
              </div>

              {/* Mini Demo de Productos del E-Commerce */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 group">
                  <div className="w-full h-20 bg-white rounded-xl mb-2 flex items-center justify-center text-3xl shadow-xs">
                    👗
                  </div>
                  <span className="text-[11px] font-black text-gray-900 block truncate">Vestido Colección</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-pink-600">$18.00</span>
                    <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-black">+ Carrito</span>
                  </div>
                </div>

                <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 group">
                  <div className="w-full h-20 bg-white rounded-xl mb-2 flex items-center justify-center text-3xl shadow-xs">
                    💄
                  </div>
                  <span className="text-[11px] font-black text-gray-900 block truncate">Labial Larga Duración</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-pink-600">$12.50</span>
                    <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-black">+ Carrito</span>
                  </div>
                </div>
              </div>

              {/* Botón flotante simulado */}
              <div className="bg-emerald-500 text-white text-xs font-black py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20">
                <span>💬 Recibir Pedidos por WhatsApp al Instante</span>
              </div>
            </div>

            {/* Puntos Claves E-Commerce */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="text-xl mb-1">🏪</div>
                <p className="text-xs font-black text-gray-900">Punto de Venta POS</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Control de caja e inventario</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="text-xl mb-1">📱</div>
                <p className="text-xs font-black text-gray-900">App Instalable (PWA)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Tus clientes la bajan a su móvil</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs col-span-2 sm:col-span-1">
                <div className="text-xl mb-1">🛡️</div>
                <p className="text-xs font-black text-gray-900">100% Independiente</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Tus ventas son solo tuyas</p>
              </div>
            </div>

          </div>

          {/* ========================================================
              COLUMNA DERECHA: Formulario Pro de Registro
          ======================================================== */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-pink-100/70 relative">
              
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-[10px] font-black uppercase tracking-wider mb-3">
                  🚀 Registro Inmediato
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  Abre tu Tienda Gratis
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Completa estos 4 datos y empieza a vender hoy mismo.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                
                {/* 1. NOMBRE DE LA MARCA */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">
                    1. Nombre de tu marca o tienda
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      🏪
                    </span>
                    <input 
                      type="text" 
                      required
                      value={formData.storeName}
                      onChange={handleNameChange}
                      placeholder="Ej: Moda & Estilo Caracas" 
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm sm:text-base outline-none focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* 2. ENLACE PERSONALIZADO */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      2. Tu Enlace Web Oficial
                    </label>
                    {urlStatus === "available" && (
                      <span className="text-emerald-600 text-[11px] font-black flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ ¡Disponible!
                      </span>
                    )}
                    {urlStatus === "taken" && (
                      <span className="text-red-500 text-[11px] font-black flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        ✗ No disponible
                      </span>
                    )}
                  </div>

                  <div className="flex items-stretch rounded-2xl overflow-hidden border border-gray-200 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-500/10 transition-all">
                    <span className="bg-gray-100/90 text-gray-500 text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-3.5 flex items-center border-r border-gray-200 select-none">
                      tienda/
                    </span>
                    <input 
                      type="text" 
                      required
                      value={formData.storeUrl}
                      onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
                      placeholder="tu-marca" 
                      className="w-full bg-gray-50/70 px-3.5 sm:px-4 py-3.5 text-sm sm:text-base outline-none font-bold text-pink-600 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                    <div className="px-3 flex items-center bg-gray-50/70">
                      {urlStatus === "checking" && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                    Este será el link que compartirás con tus clientes en Instagram y WhatsApp.
                  </p>
                </div>

                <div className="border-t border-gray-100 my-2"></div>

                {/* 3. CORREO ELECTRÓNICO */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      3. Correo de Acceso (Administrador)
                    </label>
                    {emailStatus === "available" && (
                      <span className="text-emerald-600 text-[11px] font-black flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Correo listo
                      </span>
                    )}
                    {emailStatus === "taken" && (
                      <span className="text-red-500 text-[11px] font-black flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        ✗ Ya registrado
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      ✉️
                    </span>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="admin@tunegocio.com" 
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-10 py-3.5 text-sm sm:text-base outline-none focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 font-medium text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {emailStatus === "checking" && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 ml-1">
                    🔒 Por seguridad, este correo será tu identificador único de cuenta.
                  </p>
                </div>

                {/* 4. CONTRASEÑA */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      4. Contraseña Segura
                    </label>
                    {strength.label && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        formData.password.length >= 8 ? "bg-emerald-50 text-emerald-700" :
                        formData.password.length >= 6 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"
                      }`}>
                        {strength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      🔒
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres" 
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-12 py-3.5 text-sm sm:text-base outline-none focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 font-medium text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm p-1 transition-colors"
                      aria-label="Mostrar contraseña"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>

                  {/* Barra indicadora de fortaleza */}
                  {formData.password.length > 0 && (
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }}></div>
                    </div>
                  )}
                </div>

                {/* BOTÓN DE CREAR TIENDA */}
                <button 
                  type="submit"
                  disabled={loading || urlStatus === "taken" || emailStatus === "taken"}
                  className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-black py-4 sm:py-4.5 rounded-2xl mt-4 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_30px_-5px_rgba(236,72,153,0.4)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer tracking-wider uppercase"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creando tu tienda...</span>
                    </>
                  ) : (
                    <span>🚀 Crear mi tienda ahora</span>
                  )}
                </button>
              </form>

              {/* Beneficios de confianza debajo del botón */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-gray-100 text-center">
                <div className="text-[11px] text-gray-500 font-semibold">
                  <span className="block text-base mb-0.5">⚡</span>
                  Activa al instante
                </div>
                <div className="text-[11px] text-gray-500 font-semibold">
                  <span className="block text-base mb-0.5">🛡️</span>
                  Sin costos ocultos
                </div>
                <div className="text-[11px] text-gray-500 font-semibold">
                  <span className="block text-base mb-0.5">💳</span>
                  Sin tarjeta de crédito
                </div>
              </div>

              {/* Enlace al login */}
              <p className="text-center text-xs sm:text-sm text-gray-500 mt-6">
                ¿Ya tienes una tienda registrada?{" "}
                <button 
                  onClick={() => navigate('/login')} 
                  className="text-pink-600 font-black hover:underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER LIGERO */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} {globalBranding?.companyName || "Venezuela Multi-Hilos"}. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}