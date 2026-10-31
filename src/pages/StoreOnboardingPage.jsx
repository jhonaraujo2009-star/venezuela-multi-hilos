import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

const STEPS = [
  {
    id: 1,
    shortLabel: "Productos",
    icon: "📦",
    title: "Sube tus Productos (las categorías se crean solas)",
    subtitle: "Fotos, precio en dólares, stock, variantes y ofertas relámpago, todo en un solo formulario",
    color: "from-pink-500 to-rose-600",
    lightBg: "bg-pink-50",
    borderColor: "border-pink-200",
    description:
      "Ya no necesitas crear categorías antes. Entra a «📦 Productos», pulsa «+ Agregar_Productos» y elige o crea la categoría ahí mismo. El sistema convierte automáticamente tus precios en dólares ($) a Bolívares (Bs.) con la tasa que configures.",
    bullets: [
      {
        step: "1",
        title: "Elige la categoría con un toque (o crea una nueva)",
        detail: "Arriba del formulario verás tus categorías como botones. Toca una para elegirla, o pulsa «+ Nueva categoría», escribe el nombre (ej. «Labiales») y presiona Enter. Si no eliges ninguna, el producto se guarda en «General» automáticamente."
      },
      {
        step: "2",
        title: "Nombre, descripción y precio",
        detail: "Escribe el nombre y el precio actual en USD ($). Si quieres mostrar una rebaja, coloca el «Precio Anterior» y saldrá tachado."
      },
      {
        step: "3",
        title: "Stock total o Variantes (Tallas / Colores)",
        detail: "Si el producto es único, pon la cantidad en «Stock total». Si tiene tallas o colores, pulsa «+ Agregar variante» y asigna el stock de cada una; el total se calcula solo."
      },
      {
        step: "4",
        title: "Fotos y ⚡ Oferta Relámpago",
        detail: "Toca el recuadro «+» para subir una o varias fotos. Para una oferta relámpago escribe el % de descuento y la duración en horas: tu producto saldrá con cuenta regresiva en vivo."
      },
      {
        step: "5",
        title: "Atajo: agregar varios productos a la misma categoría",
        detail: "En la lista de Productos, abre una categoría y pulsa «+ Agregar producto en …»: el formulario se abre con esa categoría ya seleccionada. Para renombrar, ocultar o borrar categorías usa «📂 Sesiones» (opcional)."
      }
    ],
    tip: "💡 Consejo Pro: Usa entre 3 y 6 categorías claras para que tus clientes encuentren todo rápido desde su celular. Los productos con oferta activa también aparecen en la sección de Ofertas de la página principal.",
    actionLabel: "Ir a 📦 Productos para subir mercancía",
    actionSubpath: "admin/productos"
  },
  {
    id: 2,
    shortLabel: "Ajustes",
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
    id: 3,
    shortLabel: "Pagos y Envíos",
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
    id: 4,
    shortLabel: "Ventas y POS",
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

  // Mostrar directamente los pasos en pantalla para que el usuario los vea de inmediato al registrarse
  const [currentStep, setCurrentStep] = useState(0);

  // Creador rápido interactivo para el Paso 1 (Crear primera sesión sin salir del tutorial)
  const [quickSessionName, setQuickSessionName] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [createdSessions, setCreatedSessions] = useState([]);

  const storeTitle = storeData?.nombre || storeId || "Tu Tienda";
  const publicStoreUrl = `${window.location.origin}/${storeId}`;

  // Marcar que el usuario ya vio o saltó el onboarding para no forzarlo de nuevo
  const finishOrSkipOnboarding = async (destinationPath) => {
    try {
      localStorage.removeItem(`onboarding_pending_${storeId}`);
    } catch (e) {}
    try {
      if (storeId) {
        await updateDoc(doc(db, "stores", storeId), { onboardingCompleted: true });
      }
    } catch (e) {}
    navigate(destinationPath, { replace: true });
  };

  const handleQuickCreateSession = async (e, presetName) => {
    e?.preventDefault?.();
    const cleanName = (presetName ?? quickSessionName).trim();
    if (!cleanName || !storeId) return;
    setCreatingSession(true);
    try {
      // Evitar duplicados: revisamos las categorías que ya tiene la tienda
      const snap = await getDocs(query(collection(db, "sessions"), where("storeId", "==", storeId)));
      const exists = snap.docs.some((d) => (d.data().name || "").trim().toLowerCase() === cleanName.toLowerCase());
      if (exists) {
        toast.success(`La categoría "${cleanName}" ya está lista en tu tienda 👍`);
        setCreatedSessions((prev) => (prev.includes(cleanName) ? prev : [...prev, cleanName]));
        setQuickSessionName("");
        return;
      }
      await addDoc(collection(db, "sessions"), {
        name: cleanName,
        slug: cleanName.toLowerCase().replace(/\s+/g, "-"),
        hidden: false,
        order: snap.docs.length,
        createdAt: serverTimestamp(),
        storeId: storeId
      });
      setCreatedSessions((prev) => [...prev, cleanName]);
      setQuickSessionName("");
      toast.success(`¡Categoría "${cleanName}" creada en tu tienda! ✅`);
    } catch (error) {
      toast.error("No se pudo crear la categoría. Verifica que hayas iniciado sesión.");
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50/70 via-white to-purple-50/50 text-gray-900 font-sans pb-16">
      {/* HEADER FIJO CON OPCIÓN DE SALTAR SIEMPRE VISIBLE */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
              🎓
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-pink-600 truncate">
                Aprender a usar la Aplicación
              </p>
              <p className="text-[11px] font-bold text-gray-500 truncate">
                Tienda: <span className="text-gray-800">{storeTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => finishOrSkipOnboarding(`/${storeId}`)}
              className="text-xs font-bold text-gray-700 hover:text-pink-600 px-3 py-2 rounded-xl border border-gray-200 hover:border-pink-300 bg-white transition-all cursor-pointer"
            >
              ⏭️ Saltar e ir a mi Tienda
            </button>
            <button
              onClick={() => finishOrSkipOnboarding(`/${storeId}/admin`)}
              className="text-xs font-black text-white bg-gray-900 hover:bg-black px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              ⚙️ Ir al Panel Admin
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* BANNER SUPERIOR DE BIENVENIDA + DECISIÓN RÁPIDA (APRENDER O SALTAR) */}
        <div className="bg-white rounded-[2rem] border border-pink-100 p-5 sm:p-7 shadow-[0_12px_40px_-12px_rgba(236,72,153,0.12)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-wider">
                🎉 ¡Tienda creada con éxito!
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Guía Rápida: Cómo usar <span className="text-pink-600">{storeTitle}</span> paso a paso
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Sigue estos <strong>{STEPS.length} pasos</strong> para subir tus productos, configurar tu tienda y empezar a vender, o presiona <strong>Saltar</strong> si ya sabes usar la aplicación.
              </p>
            </div>

            {/* Enlace oficial de la tienda listo para copiar */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Link de tu Tienda
                </p>
                <p className="text-xs font-mono font-bold text-pink-600 truncate max-w-[180px] sm:max-w-[210px]">
                  {publicStoreUrl}
                </p>
              </div>
              <button
                onClick={copyStoreLink}
                className="shrink-0 bg-white hover:bg-pink-50 text-gray-800 hover:text-pink-600 border border-gray-200 font-black text-xs px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                📋 Copiar
              </button>
            </div>
          </div>

          {/* Botones claros de acción rápida */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-500">
              👇 Explora los {STEPS.length} pasos aquí abajo o salta directo:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => finishOrSkipOnboarding(`/${storeId}`)}
                className="text-xs font-black text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                🏠 Saltar e ir a mi Tienda Pública
              </button>
              <button
                onClick={() => finishOrSkipOnboarding(`/${storeId}/admin`)}
                className="text-xs font-black text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                ⚙️ Saltar e ir a mi Panel Admin
              </button>
            </div>
          </div>
        </div>

        {/* BARRA INTERACTIVA DE LOS 5 PASOS */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">
              Pasos para configurar tu tienda
            </span>
            <span className="text-xs font-black text-pink-600">
              Paso {currentStep + 1} de {STEPS.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  <p className="text-[11px] font-black text-gray-800 truncate">
                    {s.id}. {s.shortLabel}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* TARJETA DETALLADA DEL PASO ACTUAL */}
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
                  Paso {currentStep + 1} de {STEPS.length}
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
              onClick={() => finishOrSkipOnboarding(`/${storeId}/${activeStepData.actionSubpath}`)}
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

          {/* 🌟 PRÁCTICA EN VIVO EN EL PASO 1: CREAR CATEGORÍAS DESDE AQUÍ MISMO */}
          {activeStepData.id === 1 && (
            <div className="mt-6 p-5 rounded-3xl bg-pink-50/70 border border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚡</span>
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-pink-800">
                  Opcional: adelanta tus categorías aquí con un toque
                </h4>
              </div>
              <p className="text-xs text-pink-700 mb-3">
                También puedes crearlas directo al subir cada producto. Si quieres dejarlas listas desde ya, toca una sugerencia o escribe la tuya:
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["Maquillaje", "Ropa", "Accesorios", "Calzado", "Ofertas"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={creatingSession}
                    onClick={() => handleQuickCreateSession(null, c)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-pink-200 text-pink-600 hover:bg-pink-100 disabled:opacity-50 cursor-pointer"
                  >
                    + {c}
                  </button>
                ))}
              </div>
              <form onSubmit={handleQuickCreateSession} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={quickSessionName}
                  onChange={(e) => setQuickSessionName(e.target.value)}
                  placeholder="Ej: Nueva Colección, Perfumería..."
                  className="flex-1 bg-white border border-pink-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  disabled={creatingSession || !quickSessionName.trim()}
                  className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  {creatingSession ? "Creando..." : "+ Crear Categoría"}
                </button>
              </form>

              {createdSessions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-700">
                    Categorías listas:
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

          {/* Botones Anterior / Siguiente / Saltar / Finalizar */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              ← Paso Anterior
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => finishOrSkipOnboarding(`/${storeId}`)}
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
                  onClick={() => finishOrSkipOnboarding(`/${storeId}/admin`)}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  🚀 ¡Terminar e ir a mi Panel Admin!
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}