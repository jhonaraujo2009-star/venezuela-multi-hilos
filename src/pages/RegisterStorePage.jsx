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
      // 🌟 RASTREO SILENCIOSO DE IP AL REGISTRARSE
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

      toast.success("¡Tu boutique ha sido creada con éxito! 🛍️");
      
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
    if (len < 6) return { label: "Corta", color: "bg-red-400", width: "30%" };
    if (len < 8) return { label: "Aceptable", color: "bg-yellow-400", width: "60%" };
    return { label: "Segura & Fuerte", color: "bg-emerald-500", width: "100%" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-[#FCFCFD] text-gray-900 font-sans selection:bg-pink-100 selection:text-pink-900 relative overflow-x-hidden">
      
      {/* 🌟 1. TICKER BANNER DE ALTA COSTURA / FASHION EDITORIAL */}
      <div className="bg-gray-900 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] py-2 px-4 text-center overflow-hidden flex items-center justify-center gap-4 border-b border-gray-800">
        <span className="flex items-center gap-1.5 animate-pulse text-pink-300">
          <span>✨</span> EDICIÓN BOUTIQUE & E-COMMERCE
        </span>
        <span className="hidden md:inline text-gray-500">•</span>
        <span className="hidden md:inline text-gray-300">LANZA TU MARCA DIGITAL EN 60 SEGUNDOS</span>
        <span className="hidden lg:inline text-gray-500">•</span>
        <span className="hidden lg:inline text-pink-400">0% COSTO DE INSTALACIÓN</span>
      </div>

      {/* 🌟 2. NAVBAR SUPERIOR MINIMALISTA TIPO ZARA / SHEIN */}
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-xl sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            {globalBranding?.companyLogo ? (
              <img 
                src={globalBranding.companyLogo} 
                alt={globalBranding?.companyName || "Logo"} 
                className="h-10 sm:h-12 w-auto max-w-[170px] object-contain rounded-xl group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                  {globalBranding?.companyName ? globalBranding.companyName.charAt(0).toUpperCase() : "✦"}
                </span>
                <span className="font-black text-gray-900 text-xl tracking-tight uppercase">
                  {globalBranding?.companyName || "Venezuela Multi-Hilos"}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-semibold text-gray-400 tracking-wide uppercase">¿Ya tienes boutique?</span>
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-full border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Iniciar Sesión 🔐
            </button>
          </div>
        </div>
      </header>

      {/* 🌟 3. CINTA DE CATEGORÍAS EDITORIALES */}
      <div className="border-b border-gray-100 bg-white/60 text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] py-2.5 px-4 overflow-x-auto no-scrollbar whitespace-nowrap">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4">
          <span className="hover:text-pink-600 transition-colors cursor-default">✦ Moda Femenina</span>
          <span className="text-gray-300">•</span>
          <span className="hover:text-pink-600 transition-colors cursor-default">✦ Calzado & Tacones</span>
          <span className="text-gray-300">•</span>
          <span className="hover:text-pink-600 transition-colors cursor-default">✦ Maquillaje & Skincare</span>
          <span className="text-gray-300">•</span>
          <span className="hover:text-pink-600 transition-colors cursor-default">✦ Bolsos & Accesorios</span>
          <span className="text-gray-300">•</span>
          <span className="hover:text-pink-600 transition-colors cursor-default">✦ Joyería & Bisutería</span>
          <span className="text-gray-300">•</span>
          <span className="hover:text-pink-600 transition-colors cursor-default">✦ Ropa Masculina</span>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* ========================================================
              COLUMNA IZQUIERDA: Presentación Fashion & Mockup Pro
          ======================================================== */}
          <div className="lg:col-span-6 space-y-8">
            
            {/* Titular Editorial */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200/60 text-rose-600 text-xs font-black tracking-widest uppercase">
                <span className="text-sm">✦</span> E-COMMERCE SUITE DE ALTA GAMA
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-gray-900 tracking-tight leading-[1.12]">
                El escaparate digital que <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600">
                  tu marca merece.
                </span>
              </h1>

              <p className="text-gray-500 text-sm sm:text-base leading-relaxed font-normal max-w-xl">
                Diseñada con la velocidad de SHEIN y la elegancia visual de Zara. Vende por WhatsApp, gestiona variantes de tallas y colores, y factura con tasa oficial en tiempo real.
              </p>
            </div>

            {/* SIMULADOR EN VIVO (MOCKUP ORIGINAL PRESERVADO CON RETOQUES FASHION) */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-5 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)] relative overflow-hidden transition-all">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 ml-2">Tu Boutique en Vivo</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Sincronizado
                </span>
              </div>

              {/* Encabezado de la tienda simulada */}
              <div className="bg-gradient-to-br from-pink-50/80 via-rose-50/30 to-white rounded-3xl p-4 sm:p-5 border border-pink-100/70 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-xl shadow-md">
                    {formData.storeName ? formData.storeName.charAt(0).toUpperCase() : "🛍️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-black text-gray-900 text-base sm:text-lg truncate tracking-tight">
                        {formData.storeName.trim() || "Nombre de Tu Marca"}
                      </h4>
                      <span className="text-blue-500 text-sm" title="Tienda Oficial Verificada">✓</span>
                    </div>
                    <p className="text-xs font-mono font-bold text-pink-600 truncate">
                      /{formData.storeUrl ? formData.storeUrl : "tu-marca"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wider">
                  <span className="bg-white/95 text-gray-800 px-3 py-1 rounded-xl shadow-xs border border-gray-100">
                    💵 Tasa Oficial / Paralelo
                  </span>
                  <span className="bg-white/95 text-gray-800 px-3 py-1 rounded-xl shadow-xs border border-gray-100">
                    🚚 MRW • ZOOM • TEALCA
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-200">
                    🟢 Abierto
                  </span>
                </div>
              </div>

              {/* Mini Demo de Productos E-Commerce Tipo Zara / SHEIN */}
              <div className="grid grid-cols-2 gap-3.5 mb-4">
                <div className="bg-[#FAF9F6] rounded-2xl p-3 border border-gray-100 group hover:border-pink-200 transition-all">
                  <div className="w-full h-24 bg-white rounded-xl mb-2.5 flex items-center justify-center text-4xl shadow-xs relative overflow-hidden">
                    👗
                    <span className="absolute top-1.5 right-1.5 bg-gray-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                      NEW DROP
                    </span>
                  </div>
                  <span className="text-[11px] font-black text-gray-900 block truncate">Vestido Satinado Cut-Out</span>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Tallas: XS • S • M • L</p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
                    <span className="text-xs font-black text-gray-900">$28.00</span>
                    <span className="text-[9px] font-black uppercase bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg">+ Bolsa</span>
                  </div>
                </div>

                <div className="bg-[#FAF9F6] rounded-2xl p-3 border border-gray-100 group hover:border-pink-200 transition-all">
                  <div className="w-full h-24 bg-white rounded-xl mb-2.5 flex items-center justify-center text-4xl shadow-xs relative overflow-hidden">
                    💄
                    <span className="absolute top-1.5 right-1.5 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                      HOT SELLER
                    </span>
                  </div>
                  <span className="text-[11px] font-black text-gray-900 block truncate">Paleta Glow 12 Tonos</span>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Alta Pigmentación</p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
                    <span className="text-xs font-black text-gray-900">$16.50</span>
                    <span className="text-[9px] font-black uppercase bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg">+ Bolsa</span>
                  </div>
                </div>
              </div>

              {/* Botón de Checkout Rápido WhatsApp */}
              <div className="bg-[#25D366] text-white text-xs font-black py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 uppercase tracking-wider">
                <span>💬 Pedidos Directos con Carrito Desglosado</span>
              </div>
            </div>

            {/* 🌟 4 PILARES E-COMMERCE TIPO SHEIN / ZARA */}
            <div className="grid grid-cols-2 gap-3.5 text-left">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
                <span className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center text-lg mb-2">
                  👗
                </span>
                <p className="text-xs font-black text-gray-900 uppercase tracking-wider">Variantes de Moda</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">Gestiona tallas (XS-XL), tonos de labiales y colores de temporada.</p>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
                <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg mb-2">
                  🏪
                </span>
                <p className="text-xs font-black text-gray-900 uppercase tracking-wider">Punto de Venta POS</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">Vende en tu showroom físico y en Instagram sin descuadre de stock.</p>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
                <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-2">
                  📱
                </span>
                <p className="text-xs font-black text-gray-900 uppercase tracking-wider">App Instalable (PWA)</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">Tus clientas instalan tu boutique directo en su pantalla de inicio.</p>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg mb-2">
                  💵
                </span>
                <p className="text-xs font-black text-gray-900 uppercase tracking-wider">Multimoneda & Tasa</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">Calculadora automática en Bolívares y Dólares con conversión al día.</p>
              </div>
            </div>

            {/* Testimonio de Boutique */}
            <div className="bg-white p-4.5 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-black text-sm flex items-center justify-center shadow-md">
                👠
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-amber-400">★★★★★</span>
                  <span className="font-black text-gray-900 uppercase tracking-wider">Boutiques & Showrooms</span>
                </div>
                <p className="text-gray-500 italic">"Subimos nuestros vestidos y las clientas compran solas por WhatsApp. Parece una app de marca de lujo."</p>
              </div>
            </div>

          </div>

          {/* ========================================================
              COLUMNA DERECHA: Formulario Editorial Pro
          ======================================================== */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-[2.5rem] p-7 sm:p-11 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.07)] border border-gray-100 relative">
              
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-3.5">
                  ✦ ALTA DE BOUTIQUE
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  Lanza tu Tienda Online
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Sin costos ocultos ni tarjetas de crédito requeridas.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                
                {/* 1. NOMBRE DE LA MARCA */}
                <div>
                  <label className="block text-[11px] font-black text-gray-700 uppercase tracking-widest mb-1.5 ml-1">
                    Nombre de tu Marca o Boutique
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      ✦
                    </span>
                    <input 
                      type="text" 
                      required
                      value={formData.storeName}
                      onChange={handleNameChange}
                      placeholder="Ej: Zara Moda Caracas / Glow Beauty" 
                      className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm sm:text-base outline-none focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* 2. ENLACE WEB PERSONALIZADO */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
                      Enlace Web de tu Tienda
                    </label>
                    {urlStatus === "available" && (
                      <span className="text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ✓ Disponible
                      </span>
                    )}
                    {urlStatus === "taken" && (
                      <span className="text-red-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                        ✗ En uso
                      </span>
                    )}
                  </div>

                  <div className="flex items-stretch rounded-2xl overflow-hidden border border-gray-200 focus-within:border-gray-900 focus-within:ring-4 focus-within:ring-gray-900/5 transition-all">
                    <span className="bg-gray-100 text-gray-600 text-xs sm:text-sm font-black px-4 py-3.5 flex items-center border-r border-gray-200 select-none uppercase tracking-wider">
                      tienda/
                    </span>
                    <input 
                      type="text" 
                      required
                      value={formData.storeUrl}
                      onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
                      placeholder="tu-marca" 
                      className="w-full bg-gray-50/80 px-4 py-3.5 text-sm sm:text-base outline-none font-black text-pink-600 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                    <div className="px-3 flex items-center bg-gray-50/80">
                      {urlStatus === "checking" && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                    El enlace para tu biografía de Instagram, TikTok y estados de WhatsApp.
                  </p>
                </div>

                <div className="border-t border-gray-100 my-2"></div>

                {/* 3. CORREO ADMINISTRADOR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
                      Correo de Administración
                    </label>
                    {emailStatus === "available" && (
                      <span className="text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ✓ Correo listo
                      </span>
                    )}
                    {emailStatus === "taken" && (
                      <span className="text-red-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
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
                      placeholder="admin@tu-marca.com" 
                      className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl pl-11 pr-10 py-3.5 text-sm sm:text-base outline-none focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {emailStatus === "checking" && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 ml-1">
                    🔒 Llave única de acceso. Solo tú puedes cambiar la contraseña.
                  </p>
                </div>

                {/* 4. CONTRASEÑA */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
                      Contraseña Maestra
                    </label>
                    {strength.label && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
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
                      className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl pl-11 pr-12 py-3.5 text-sm sm:text-base outline-none focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 text-sm p-1 transition-colors"
                      aria-label="Alternar visibilidad"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>

                  {formData.password.length > 0 && (
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }}></div>
                    </div>
                  )}
                </div>

                {/* BOTÓN PRINCIPAL FASHION LUXURY */}
                <button 
                  type="submit"
                  disabled={loading || urlStatus === "taken" || emailStatus === "taken"}
                  className="w-full bg-gray-900 hover:bg-black text-white font-black py-4.5 rounded-2xl mt-4 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer tracking-[0.2em] uppercase"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creando Boutique...</span>
                    </>
                  ) : (
                    <span>Lanzar mi Tienda Online ✦</span>
                  )}
                </button>
              </form>

              {/* Sellos de Confianza E-Commerce */}
              <div className="grid grid-cols-3 gap-2 mt-7 pt-5 border-t border-gray-100 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  <span className="block text-base mb-0.5">⚡</span>
                  Sin esperas
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  <span className="block text-base mb-0.5">👗</span>
                  Moda & Belleza
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  <span className="block text-base mb-0.5">🛡️</span>
                  100% Tuya
                </div>
              </div>

              {/* Enlace al login */}
              <p className="text-center text-xs text-gray-500 mt-6 font-medium">
                ¿Ya tienes una boutique registrada?{" "}
                <button 
                  onClick={() => navigate('/login')} 
                  className="text-gray-900 font-black hover:text-pink-600 underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER LUXURY */}
      <footer className="border-t border-gray-100 bg-white py-8 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-semibold">© {new Date().getFullYear()} {globalBranding?.companyName || "Venezuela Multi-Hilos"}. Plataforma E-Commerce para Marcas.</p>
          <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <span>Términos</span>
            <span>Seguridad</span>
            <span>Privacidad</span>
          </div>
        </div>
      </footer>
    </div>
  );
}