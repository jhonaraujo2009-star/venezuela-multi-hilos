import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

const STEPS = [
  {
    id: 1,
    badge: "Paso 1 de 5",
    icon: "📂",
    title: "Crea tus Sesiones (Categorías)",
    subtitle: "Organiza tu tienda antes de subir tus productos",
    color: "from-pink-500 to-rose-600",
    lightBg: "bg-pink-50",
    borderColor: "border-pink-200",
    description:
      "En la aplicación, las «Sesiones» son las categorías o departamentos de tu tienda (por ejemplo: Ropa de Dama, Maquillaje, Collares, Calzado). Crear tus sesiones primero te permitirá clasificar cada producto ordenadamente.",
    bullets: [
      {
        step: "1",
        title: "Entra a «📂 Sesiones» en tu Panel Admin",
        detail: "En el menú lateral izquierdo de tu panel de administración, selecciona la opción 📂 Sesiones."
      },
      {
        step: "2",
        title: "Presiona el botón «+ Nueva»",
        detail: "Se abrirá una ventana donde podrás escribir el nombre de tu categoría (ej. «Nuevos Ingresos» o «Perfumería») y pulsar «Crear Sesión»."
      },
      {
        step: "3",
        title: "Controla qué categorías son visibles",
        detail: "Cada sesión tiene un botón «Visible / Oculta», un lápiz (✏️) para cambiarle el nombre y una papelera (🗑️) para eliminarla cuando quieras."
      }
    ],
    tip: "💡 Consejo Pro: Crea entre 3 y 6 sesiones claras para que tus clientes encuentren todo rápido desde su celular.",
    actionLabel: "Ir a 📂 Sesiones en mi Panel",
    actionSubpath: "admin/sesiones"
  },
  {
    id: 2,
    badge: "Paso 2 de 5",
    icon: "📦",
    title: "Agrega tus Productos y Variantes",
    subtitle: "Sube fotos, precios en dólares, stock y ofertas relámpago",
    color: "from-purple-600 to-indigo-600",
    lightBg: "bg-purple-50",
    borderColor: "border-purple-200",
    description:
      "Una vez creadas tus sesiones, entra a «📦 Productos» para cargar tu mercancía. El sistema convierte automáticamente tus precios en dólares ($) a Bolívares (Bs.) usando la tasa que configures.",
    bullets: [
      {
        step: "1",
        title: "Datos básicos y Sesión",
        detail: "Escribe el nombre del producto, su descripción, el precio en USD ($) y selecciona en qué Sesión (categoría) quieres que aparezca."
      },
      {
        step: "2",
        title: "Sube hasta 3 Fotos y Nombra tus Modelos",
        detail: "Puedes subir hasta 3 imágenes por producto. Debajo de cada foto puedes escribir el nombre del modelo o color (ej. «Rojo Carmesí») para que el cliente elija exactamente la foto que desea comprar."
      },
      {
        step: "3",
        title: "Stock Total o Variantes (Tallas / Colores)",
        detail: "Si el producto es único, pon la cantidad en «Stock Total». Si tiene tallas o presentaciones (ej. Talla S, M, L), usa «+ Agregar Variantes» y asigna el stock de cada una."
      },
      {
        step: "4",
        title: "⚡ Ofertas Relámpago con Contador",
        detail: "Marca la casilla «Activar Oferta Relámpago», indica el % de descuento y la fecha/hora límite. ¡Tu producto saldrá destacado con cuenta regresiva en vivo!"
      }
    ],
    tip: "💡 Consejo Pro: Tus productos con oferta activa también aparecen en la sección de Ofertas de la página principal.",
    actionLabel: "Ir a 📦 Productos para subir mercancía",
    actionSubpath: "admin/productos"
  },
  {
    id: 3,
    badge: "Paso 3 de 5",
    icon: "⚙️",
    title: "Configura Tasa, WhatsApp e Interfaz",
    subtitle: "Personaliza tu marca, banners y contacto directo",
    color: "from-emerald-500 to-teal-600",
    lightBg: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description:
      "Haz que tu tienda luzca única y asegúrate de que todos los pedidos lleguen directo a tu WhatsApp con el cálculo exacto en Bolívares y Dólares.",
    bullets: [
      {
        step: "1",
        title: "En «⚙️ Ajustes»: Tasa de Cambio y WhatsApp",
        detail: "Coloca tu Tasa de Cambio del día (Bs/$), tu número de WhatsApp para recibir pedidos, tus redes sociales (Instagram, TikTok) y el color principal de tu tienda."
      },
      {
        step: "2",
        title: "En «🎨 Interfaz»: Banners y Cinta Superior",
        detail: "Sube las imágenes promocionales de tu carrusel principal y escribe el mensaje de la barra superior (ej. «Envíos gratis en compras mayores a $30»)."
      },
      {
        step: "3",
        title: "Solicita el Check Azul de Verificación (✓)",
        detail: "Al final de «⚙️ Ajustes» puedes enviar tus datos comerciales para obtener la insignia oficial de Tienda Verificada."
      }
    ],
    tip: "💡 Consejo Pro: Mantén actualizada la tasa en «⚙️ Ajustes» para que tus clientes vean el monto exacto en Bolívares al pagar.",
    actionLabel: "Configurar ⚙️ Ajustes de mi Tienda",
    actionSubpath: "admin"
  },
  {
    id: 4,
    badge: "Paso 4 de 5",
    icon: "🏦",
    title: "Métodos de Pago, Envíos y Cupones",
    subtitle: "Facilita el pago a tus clientes en segundos",
    color: "from-amber-500 to-orange-600",
    lightBg: "bg-amber-50",
    borderColor: "border-amber-200",
    description:
      "Cuando un cliente compra en tu tienda, puede elegir con qué método pagarte y qué agencia de envío prefiere.",
    bullets: [
      {
        step: "1",
        title: "Agrega tus cuentas en «🏦 Pagos»",
        detail: "Registra Pago Móvil, Zelle, Binance, Transferencia o Efectivo con tus datos bancarios para que el cliente los vea al finalizar su compra."
      },
      {
        step: "2",
        title: "Configura «🚚 Logística y Cupones»",
        detail: "Activa las empresas de encomienda con las que trabajas (MRW, Zoom, Tealca, Delivery) y crea códigos de descuento promocionales (ej. «BIENVENIDA10») para premiar a tus clientes."
      }
    ],
    tip: "💡 Consejo Pro: Los cupones que crees en tu tienda son exclusivos para tus productos.",
    actionLabel: "Configurar 🏦 Métodos de Pago",
    actionSubpath: "admin/pagos"
  },
  {
    id: 5,
    badge: "Paso 5 de 5",
    icon: "🛒",
    title: "Recibe Pedidos y Usa el Punto de Venta (POS)",
    subtitle: "Gestiona tus ventas web y de tienda física en tiempo real",
    color: "from-blue-600 to-indigo-700",
    lightBg: "bg-blue-50",
    borderColor: "border-blue-200",
    description:
      "Tienes dos formas de vender y llevar el control exacto de tu inventario y tus ganancias:",
    bullets: [
      {
        step: "1",
        title: "📦 Pedidos por Confirmar (Ventas Web)",
        detail: "Cada vez que un cliente hace un pedido en tu link, te llega a WhatsApp y aparece en «📦 Pedidos por Confirmar». Al darle «Confirmar Pago», el sistema descuenta el stock automáticamente."
      },
      {
        step: "2",
        title: "🏪 Punto de Venta (Caja Registradora POS)",
        detail: "Si vendes en local físico o cierras una venta rápida por chat, entra a «🏪 Punto Venta», toca los productos, pon los datos del cliente y registra la venta al instante."
      },
      {
        step: "3",
        title: "📊 Estadísticas e Historial",
        detail: "En «📊 Estadísticas» verás tu ingreso bruto, unidades vendidas, valor de inventario y tus Top 3 productos estrella."
      }
    ],
    tip: "💡 Consejo Pro: Activa el botón «🔔 Activar Alertas» arriba en tu Panel Admin desde tu celular para que suene cuando entre un pedido nuevo.",
    actionLabel: "Ver 🏪 Punto de Venta (POS)",
    actionSubpath: "admin/pos"
  }
];

export default function StoreOnboardingPage() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { storeData } = useApp() || {};

  // 'welcome' = pantalla de decisión inicial | 'guide' = paso a paso interactivo
  const [mode, setMode] = useState("welcome");
  const [currentStep, setCurrentStep] = useState(0);

  // Creador rápido interactivo para el Paso 1 (Crear primera sesión sin salir del tutorial)
  const [quickSessionName, setQuickSessionName] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [createdSessions, setCreatedSessions] = useState([]);

  const storeTitle = storeData?.nombre || storeId || "Tu Tienda";
  const publicStoreUrl = `${window.location.origin}/${storeId}`;

  const handleQuickCreateSession = async (e) => {
    e.preventDefault();
    if (!quickSessionName.trim() || !storeId) return;
    setCreatingSession(true);
    try {
      const cleanName = quickSessionName.trim();
      await addDoc(collection(db, "sessions"), {
        name: cleanName,
        slug: cleanName.toLowerCase().replace(/\s+/g, "-"),
        hidden: false,
        order: createdSessions.length,
        createdAt: serverTimestamp(),
        storeId: storeId
      });
      setCreatedSessions((prev) => [...prev, cleanName]);
      setQuickSessionName("");
      toast.success(`¡Sesión "${cleanName}" creada en tu tienda! ✅`);
    } catch (error) {
      toast.error("No se pudo crear la sesión. Verifica que hayas iniciado sesión.");
    } finally {
      setCreatingSession(false);
    }
  };

  const copyStoreLink = () => {
    navigator.clipboard.writeText(publicStoreUrl);
    toast.success("¡Enlace de tu tienda copiado! 📋");
  };

  const activeStepData = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/70 via-white to-purple-50/50 text-gray-900 font-sans">
      {/* HEADER FIJO CON OPCIÓN DE SALTAR SIEMPRE VISIBLE */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
              🎓
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-pink-600 truncate">
                Academia de Vendedores
              </p>
              <p className="text-[11px] font-bold text-gray-500 truncate">
                Tienda: <span className="text-gray-800">{storeTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(`/${storeId}`)}
              className="text-xs font-bold text-gray-600 hover:text-pink-600 px-3 py-2 rounded-xl border border-gray-200 hover:border-pink-200 bg-white transition-all cursor-pointer"
            >
              🏠 Ir a mi Tienda
            </button>
            <button
              onClick={() => navigate(`/${storeId}/admin`)}
              className="text-xs font-black text-white bg-gray-900 hover:bg-black px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Saltar al Panel Admin ⏭️
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {mode === "welcome" ? (
          /* =========================================================
             PANTALLA 1: BIENVENIDA Y ELECCIÓN (APRENDER O SALTAR)
          ========================================================= */
          <div className="bg-white rounded-[2.5rem] border border-pink-100 p-6 sm:p-12 shadow-[0_20px_60px_-15px_rgba(236,72,153,0.12)] text-center relative overflow-hidden">
            <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 text-white flex items-center justify-center text-4xl shadow-lg shadow-pink-500/25">
              🎉
            </div>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider mb-3">
              ✓ ¡Tu tienda ya está creada y activa!
            </span>

            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">
              ¡Bienvenido a <span className="text-pink-600">{storeTitle}</span>!
            </h1>

            <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8">
              ¿Te gustaría ver una guía rápida paso a paso para aprender a{" "}
              <strong className="text-gray-900">crear sesiones (categorías)</strong>,{" "}
              <strong className="text-gray-900">agregar productos</strong> y{" "}
              <strong className="text-gray-900">recibir pedidos</strong>, o prefieres saltar directo a tu tienda?
            </p>

            {/* Enlace oficial de la tienda listo para copiar */}
            <div className="max-w-md mx-auto mb-8 bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="text-left min-w-0 pl-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Tu Enlace Web Oficial
                </p>
                <p className="text-xs sm:text-sm font-mono font-bold text-pink-600 truncate">
                  {publicStoreUrl}
                </p>
              </div>
              <button
                onClick={copyStoreLink}
                className="shrink-0 bg-white hover:bg-pink-50 text-gray-800 hover:text-pink-600 border border-gray-200 font-black text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                📋 Copiar Link
              </button>
            </div>

            {/* BOTONES PRINCIPALES DE DECISIÓN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
              <button
                onClick={() => setMode("guide")}
                className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-700 text-white font-black py-4 px-6 rounded-2xl shadow-[0_12px_30px_-5px_rgba(236,72,153,0.4)] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <span className="text-base sm:text-lg flex items-center gap-2">
                  🎓 Aprender a usar la App
                </span>
                <span className="text-[11px] font-medium text-pink-100">
                  Ver tutorial paso a paso (2 min)
                </span>
              </button>

              <button
                onClick={() => navigate(`/${storeId}/admin`)}
                className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 px-6 rounded-2xl shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <span className="text-base sm:text-lg flex items-center gap-2">
                  ⚙️ Ir a mi Panel Admin
                </span>
                <span className="text-[11px] font-medium text-gray-300">
                  Saltar guía y configurar por mi cuenta
                </span>
              </button>
            </div>

            <button
              onClick={() => navigate(`/${storeId}`)}
              className="text-xs sm:text-sm font-black text-gray-500 hover:text-pink-600 underline underline-offset-4 transition-colors cursor-pointer"
            >
              Saltar todo y ver cómo luce mi tienda pública 🏠 →
            </button>

            {/* Resumen rápido de los 5 pasos incluidos en la guía */}
            <div className="mt-10 pt-8 border-t border-gray-100 text-left">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 text-center mb-5">
                ¿Qué aprenderás en la guía interactiva?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {STEPS.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentStep(idx);
                      setMode("guide");
                    }}
                    className="bg-gray-50/80 hover:bg-pink-50/60 border border-gray-100 hover:border-pink-200 rounded-2xl p-3.5 text-left transition-all cursor-pointer group"
                  >
                    <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">
                      {s.icon}
                    </div>
                    <p className="text-[10px] font-black text-pink-600 uppercase tracking-wider">
                      Paso {s.id}
                    </p>
                    <p className="text-xs font-bold text-gray-800 line-clamp-2 mt-0.5">
                      {s.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================
             PANTALLA 2: GUÍA INTERACTIVA PASO A PASO
          ========================================================= */
          <div className="space-y-6">
            {/* Barra de navegación de pasos */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                  Progreso del Tutorial
                </span>
                <span className="text-xs font-black text-pink-600">
                  {currentStep + 1} de {STEPS.length} completados
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {STEPS.map((s, idx) => {
                  const isCurrent = idx === currentStep;
                  const isDone = idx < currentStep;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCurrentStep(idx)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-pink-50 border-pink-400 ring-2 ring-pink-500/20"
                          : isDone
                          ? "bg-emerald-50/60 border-emerald-200"
                          : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{s.icon}</span>
                        {isDone && (
                          <span className="text-[10px] font-black text-emerald-600">✓</span>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-gray-700 truncate">
                        {s.id}. {s.title.split(" ")[1] || s.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta del Paso Actual */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${activeStepData.color} text-white flex items-center justify-center text-3xl shadow-md shrink-0`}
                  >
                    {activeStepData.icon}
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 mb-1.5">
                      {activeStepData.badge}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {activeStepData.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                      {activeStepData.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/${storeId}/${activeStepData.actionSubpath}`)}
                  className="shrink-0 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider px-4 py-3 rounded-2xl shadow-sm transition-all cursor-pointer self-start sm:self-center"
                >
                  {activeStepData.actionLabel} ↗
                </button>
              </div>

              <p className="text-gray-600 text-sm sm:text-base leading-relaxed my-6">
                {activeStepData.description}
              </p>

              {/* Lista de sub-pasos explicados claramente */}
              <div className="space-y-4">
                {activeStepData.bullets.map((b) => (
                  <div
                    key={b.step}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activeStepData.color} text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                    >
                      {b.step}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-gray-900">
                        {b.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                        {b.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 🌟 PRÁCTICA EN VIVO EN EL PASO 1: CREAR SESIÓN DESDE AQUÍ MISMO */}
              {activeStepData.id === 1 && (
                <div className="mt-6 p-5 rounded-3xl bg-pink-50/70 border border-pink-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⚡</span>
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-pink-800">
                      ¡Pruébalo ahora mismo! Crea tu primera Sesión aquí:
                    </h4>
                  </div>
                  <p className="text-xs text-pink-700 mb-3">
                    Escribe el nombre de una categoría de tu negocio (ej. «Collares», «Maquillaje», «Ofertas») y la crearemos directamente en tu tienda:
                  </p>
                  <form onSubmit={handleQuickCreateSession} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={quickSessionName}
                      onChange={(e) => setQuickSessionName(e.target.value)}
                      placeholder="Ej: Nueva Colección, Calzado, Accesorios..."
                      className="flex-1 bg-white border border-pink-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-pink-500"
                    />
                    <button
                      type="submit"
                      disabled={creatingSession || !quickSessionName.trim()}
                      className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      {creatingSession ? "Creando..." : "+ Crear Sesión en mi Tienda"}
                    </button>
                  </form>

                  {createdSessions.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-700">
                        Sesiones creadas:
                      </span>
                      {createdSessions.map((name, i) => (
                        <span
                          key={i}
                          className="bg-white border border-emerald-200 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-lg shadow-2xs"
                        >
                          ✓ {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Consejo Pro */}
              <div
                className={`mt-6 p-4 rounded-2xl ${activeStepData.lightBg} border ${activeStepData.borderColor} text-xs sm:text-sm font-bold text-gray-800`}
              >
                {activeStepData.tip}
              </div>

              {/* Botones Anterior / Siguiente / Finalizar */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => {
                    if (currentStep === 0) {
                      setMode("welcome");
                    } else {
                      setCurrentStep((prev) => prev - 1);
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs sm:text-sm transition-all cursor-pointer"
                >
                  ← {currentStep === 0 ? "Volver al Inicio" : "Paso Anterior"}
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => navigate(`/${storeId}`)}
                    className="w-full sm:w-auto px-4 py-3 rounded-2xl text-gray-500 hover:text-gray-800 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Saltar e ir a mi Tienda 🏠
                  </button>

                  {currentStep < STEPS.length - 1 ? (
                    <button
                      onClick={() => setCurrentStep((prev) => prev + 1)}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-pink-500/25 transition-all cursor-pointer"
                    >
                      Siguiente Paso ({currentStep + 2}/{STEPS.length}) →
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/${storeId}/admin`)}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                    >
                      🚀 ¡Terminar e ir a mi Panel Admin!
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
