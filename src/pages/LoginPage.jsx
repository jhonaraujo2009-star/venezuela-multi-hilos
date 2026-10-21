import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { db, auth } from "../config/firebase";
import { SUPER_ADMIN_EMAIL } from "../config/constants";

export default function LoginPage() {
  const { globalBranding } = useApp() || {};
  const [viewMode, setViewMode] = useState("login"); // 'login' | 'forgot' | 'reset'

  // Estados para inicio de sesión
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para recuperación de cuenta
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const { login, logout, currentUser, user } = useAuth();
  const navigate = useNavigate();

  // 🌟 MAGIA: Si viene con un enlace de restablecimiento en la URL (?mode=resetPassword&oobCode=XYZ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const oobCodeParam = params.get("oobCode");

    if (modeParam === "resetPassword" && oobCodeParam) {
      setViewMode("reset");
      setRecoveryCode(oobCodeParam);
      verifyPasswordResetCode(auth, oobCodeParam)
        .then((targetEmail) => {
          setRecoveryEmail(targetEmail);
          toast.success(`Código validado para ${targetEmail}. Ingresa tu nueva contraseña.`);
        })
        .catch((err) => {
          console.error("Código de recuperación no válido:", err);
          toast.error("El enlace o código de recuperación ha expirado o no es válido.");
        });
    }
  }, []);

  // 🌟 Redirección automática si YA hay una sesión activa (solo si no está restaurando contraseña)
  useEffect(() => {
    const activeUser = currentUser || user;
    if (activeUser && viewMode === "login") {
      if (activeUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL?.toLowerCase()) {
        navigate("/super-admin");
      } else {
        const fetchMyStore = async () => {
          const userEmail = activeUser.email ? activeUser.email.trim().toLowerCase() : "";
          if (!userEmail) {
            navigate("/");
            return;
          }

          // 🔒 Regla Estricta: 1 Correo = 1 Tienda Única (búsqueda exclusiva por ownerEmail)
          const snap = await getDocs(
            query(
              collection(db, "stores"),
              where("ownerEmail", "==", userEmail)
            )
          );

          if (!snap.empty) {
            const storeDoc = snap.docs[0];
            // Auto-sincronizar ownerId con el UID del dueño actual si estaba desfasado
            if (storeDoc.data().ownerId !== activeUser.uid) {
              try {
                await updateDoc(doc(db, "stores", storeDoc.id), { ownerId: activeUser.uid });
              } catch (e) {
                console.warn("Error sincronizando ownerId:", e);
              }
            }
            navigate(`/${storeDoc.id}/admin`);
          } else {
            navigate("/");
          }
        };
        fetchMyStore();
      }
    }
  }, [currentUser, user, navigate, viewMode]);

  // ========================================================
  // 1. INICIAR SESIÓN NORMAL
  // ========================================================
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    setLoading(true);
    try {
      const userCred = await login(email.trim().toLowerCase(), password);
      const userUid = userCred.user.uid;

      const isSuperAdmin =
        email.trim().toLowerCase() === SUPER_ADMIN_EMAIL?.trim().toLowerCase();

      const cleanEmail = email.trim().toLowerCase();

      // 🔒 2. Búsqueda estricta por ownerEmail (1 Correo = 1 Tienda Única)
      // Se elimina la búsqueda por ownerId que permitía a un usuario anterior ingresar por UID
      const qEmail = query(
        collection(db, "stores"),
        where("ownerEmail", "==", cleanEmail)
      );
      const querySnapshot = await getDocs(qEmail);

      if (!querySnapshot.empty) {
        const storeDoc = querySnapshot.docs[0];
        const storeData = storeDoc.data();
        const storeRef = doc(db, "stores", storeDoc.id);

        const updates = {
          last_login: serverTimestamp(),
        };

        // Si el ownerId no corresponde al UID del usuario legítimo actual, se corrige inmediatamente
        if (storeData.ownerId !== userUid) {
          updates.ownerId = userUid;
        }

        try {
          const ipResponse = await fetch("https://ipapi.co/json/");
          const ipData = await ipResponse.json();
          updates.ip_operacion = ipData.ip || "Desconocida";
          updates.pais_operacion = ipData.country_name || "Desconocido";
          await updateDoc(storeRef, updates);
        } catch (geoError) {
          await updateDoc(storeRef, updates);
        }

        if (isSuperAdmin) {
          const choice = window.confirm(
            "¡Bienvenido, Jefe! 👑\n\n¿Deseas entrar al PANEL DE CONTROL TOTAL (Súper Admin)?\n\n(Aceptar = Súper Admin / Cancelar = Administrar mi Tienda)"
          );
          if (choice) {
            navigate("/super-admin");
            toast.success("¡Bienvenido al Olimpo! ⚡");
          } else {
            navigate(`/${storeDoc.id}/admin`);
            toast.success("¡Bienvenido al panel admin! 🔐");
          }
        } else {
          navigate(`/${storeDoc.id}/admin`);
          toast.success("¡Bienvenido al panel admin! 🔐");
        }
      } else if (isSuperAdmin) {
        navigate("/super-admin");
        toast.success("¡Bienvenido al Olimpo! ⚡");
      } else {
        toast.error("Tu usuario no tiene una tienda asignada.");
        logout();
      }
    } catch (error) {
      console.error("Detalle del error:", error);
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        toast.error("Correo o contraseña incorrectos ❌");
      } else {
        toast.error("Error al conectar con la tienda. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // 2. ENVIAR CÓDIGO AL CORREO REGISTRADO
  // ========================================================
  const handleSendResetCode = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = recoveryEmail.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error("Por favor, ingresa tu correo registrado");
      return;
    }

    setRecoveryLoading(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      };

      try {
        await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      } catch (err) {
        if (err.code === "auth/unauthorized-continue-uri") {
          await sendPasswordResetEmail(auth, cleanEmail);
        } else {
          throw err;
        }
      }

      toast.success("¡Código enviado! Revisa tu correo (bandeja o spam) 📬");
      setViewMode("reset");
    } catch (error) {
      console.error("Error enviando código de recuperación:", error);
      if (error.code === "auth/user-not-found") {
        toast.error("No encontramos ninguna cuenta registrada con este correo.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("El formato del correo es inválido.");
      } else {
        toast.error("Error al enviar el código. Intenta nuevamente.");
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  // ========================================================
  // 3. RESTAURAR CONTRASEÑA CON EL CÓDIGO
  // ========================================================
  const handleConfirmResetPassword = async (e) => {
    if (e) e.preventDefault();

    if (!recoveryCode.trim()) {
      toast.error("Por favor, ingresa el código que recibiste en tu correo");
      return;
    }
    if (!newPassword) {
      toast.error("Por favor, ingresa tu nueva contraseña");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setRecoveryLoading(true);
    try {
      let cleanCode = recoveryCode.trim();
      if (cleanCode.includes("oobCode=")) {
        const match = cleanCode.match(/oobCode=([^&]+)/);
        if (match) cleanCode = decodeURIComponent(match[1]);
      }

      await confirmPasswordReset(auth, cleanCode, newPassword);
      toast.success("¡Contraseña restaurada con éxito! 🔐 Accediendo...");

      const targetEmail = recoveryEmail.trim().toLowerCase();
      if (targetEmail) {
        try {
          const userCred = await login(targetEmail, newPassword);
          const userUid = userCred.user.uid;
          const isSuperAdmin =
            targetEmail === SUPER_ADMIN_EMAIL?.trim().toLowerCase();

          // 🔒 Regla Estricta: 1 Correo = 1 Tienda Única (búsqueda exclusiva por ownerEmail)
          const qEmail = query(
            collection(db, "stores"),
            where("ownerEmail", "==", targetEmail)
          );
          const querySnapshot = await getDocs(qEmail);

          if (!querySnapshot.empty) {
            const storeDoc = querySnapshot.docs[0];
            const storeData = storeDoc.data();
            // Auto-sincronizar ownerId con el UID del dueño actual
            if (storeData.ownerId !== userUid) {
              await updateDoc(doc(db, "stores", storeDoc.id), {
                ownerId: userUid,
              }).catch(err => console.warn("No se pudo actualizar ownerId tras reset:", err));
            }
            navigate(`/${storeDoc.id}/admin`);
            return;
          } else if (isSuperAdmin) {
            navigate("/super-admin");
            return;
          }
        } catch (loginErr) {
          console.warn("Inicio de sesión automático falló:", loginErr);
        }
      }

      setEmail(targetEmail);
      setPassword("");
      setViewMode("login");
      toast.success("Contraseña actualizada. Inicia sesión con tu nueva clave.");
    } catch (error) {
      console.error("Error al restaurar contraseña:", error);
      if (
        error.code === "auth/invalid-action-code" ||
        error.code === "auth/invalid-oob-code"
      ) {
        toast.error("El código es inválido o ya ha sido utilizado ❌");
      } else if (error.code === "auth/expired-action-code") {
        toast.error("El código ha expirado. Por favor, solicita uno nuevo ⏱️");
      } else if (error.code === "auth/weak-password") {
        toast.error("La contraseña debe tener al menos 6 caracteres.");
      } else {
        toast.error("Error al restaurar la contraseña. Verifica el código e intenta de nuevo.");
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#F9FAFB] lg:bg-white text-gray-900 selection:bg-pink-100 selection:text-pink-900">
      
      {/* ========================================================
          LADO IZQUIERDO: Branding & Experiencia Visual (Desktop)
      ======================================================== */}
      <div className="hidden lg:flex w-1/2 bg-gray-950 text-white flex-col justify-between p-16 relative overflow-hidden select-none">
        {/* Luces difuminadas de fondo */}
        <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] bg-gradient-to-br from-pink-500/25 to-purple-600/15 blur-[120px] rounded-full pointer-events-none animate-pulse duration-1000"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-tl from-rose-500/20 to-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        {/* Header con Logo */}
        <div className="relative z-10">
          <div
            className="w-fit h-14 px-4 py-2 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center mb-12 shadow-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform border border-white/20"
            onClick={() => navigate("/")}
          >
            {globalBranding?.companyLogo ? (
              <img
                src={globalBranding.companyLogo}
                alt={globalBranding?.companyName || "Logo"}
                className="h-full w-auto max-w-[190px] object-contain rounded-lg"
              />
            ) : (
              <span 
                className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-transparent bg-clip-text select-none pointer-events-none"
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

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-pink-300 text-xs font-black tracking-wider uppercase mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Centro de Control de Vendedores
          </div>

          <h1 className="text-4xl xl:text-5xl font-black leading-tight mb-6 tracking-tight">
            Administra tu tienda con <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">
              total control y libertad.
            </span>
          </h1>

          <p className="text-gray-400 text-base xl:text-lg max-w-md leading-relaxed font-normal">
            Gestiona tu catálogo, recibe pedidos por WhatsApp, actualiza tasas de cambio y haz seguimiento a tus ganancias en tiempo real.
          </p>
        </div>

        {/* Tarjeta de Seguridad y Confianza */}
        <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl max-w-md shadow-2xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-pink-500/20">
              🛡️
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Cuentas 100% Independientes</h4>
              <p className="text-xs text-gray-400">Seguridad criptográfica y datos protegidos</p>
            </div>
          </div>
          <p className="text-xs text-gray-300/80 leading-relaxed">
            Cada tienda cuenta con su propio entorno aislado. Solo tú puedes acceder y administrar tus productos, tasas y clientes.
          </p>
        </div>
      </div>

      {/* ========================================================
          LADO DERECHO: Formulario Dinámico (Login / Forgot / Reset)
      ======================================================== */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative min-h-screen lg:min-h-0 py-10">
        
        {/* Botón Volver Superior */}
        <div className="w-full max-w-md flex items-center justify-between mb-6 lg:absolute lg:top-8 lg:left-8 lg:mb-0 lg:w-auto">
          <button
            onClick={() => navigate("/")}
            className="text-xs sm:text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors py-1.5 px-3 rounded-xl hover:bg-gray-100/70"
          >
            ← <span className="hidden sm:inline">Volver a la tienda principal</span><span className="sm:hidden">Volver</span>
          </button>
        </div>

        {/* Logo en versión Móvil */}
        <div
          className="lg:hidden flex items-center justify-center mb-6 cursor-pointer"
          onClick={() => navigate("/")}
        >
          {globalBranding?.companyLogo ? (
            <img
              src={globalBranding.companyLogo}
              alt={globalBranding?.companyName || "Logo"}
              className="h-12 max-w-[200px] object-contain rounded-2xl bg-white p-2 shadow-md border border-gray-100"
            />
          ) : (
            <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">
              <span 
                className="text-xl font-black tracking-tighter uppercase text-transparent bg-clip-text select-none"
                style={{
                  backgroundImage: "linear-gradient(to right, #462523 0%, #cb9b51 22%, #f6e27a 45%, #ffffff 50%, #f6e27a 55%, #cb9b51 78%, #462523 100%)",
                  filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.2))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                {globalBranding?.companyName || "VENEZUELA MULTI-HILOS"}
              </span>
            </div>
          )}
        </div>

        {/* Contenedor de la Tarjeta */}
        <div className="w-full max-w-md bg-white p-7 sm:p-10 rounded-[2.5rem] shadow-[0_12px_45px_rgb(0,0,0,0.06)] border border-gray-100 transition-all">

          {/* ====================================================
              VISTA 1: INICIAR SESIÓN NORMAL
          ==================================================== */}
          {viewMode === "login" && (
            <div>
              {/* Cabecera */}
              <div className="text-center sm:text-left mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-[10px] font-black uppercase tracking-wider mb-3">
                  🔐 Acceso Seguro
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  ¡Hola de nuevo! 👋
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Ingresa tus credenciales para administrar tu tienda.
                </p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      ✉️
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tunegocio@ejemplo.com"
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 font-medium text-gray-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-xs font-bold text-gray-700">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryEmail(email);
                        setViewMode("forgot");
                      }}
                      className="text-xs font-bold text-pink-600 hover:text-pink-700 hover:underline transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      🔒
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu clave secreta"
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-12 py-3.5 text-sm outline-none focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 font-medium text-gray-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm p-1 transition-colors"
                      aria-label="Alternar visibilidad de contraseña"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* Botón Principal */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-[0_10px_25px_-5px_rgba(236,72,153,0.4)] disabled:opacity-50 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verificando Acceso...</span>
                    </>
                  ) : (
                    <span>Ingresar a mi Panel 🚀</span>
                  )}
                </button>
              </form>

              {/* Separador */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <span className="relative bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  ¿Aún no tienes tienda?
                </span>
              </div>

              {/* Registro de Vendedor */}
              <div className="text-center">
                <button
                  onClick={() => navigate("/registro-vendedor")}
                  className="w-full py-3 px-4 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:border-pink-300 hover:bg-pink-50/40 hover:text-pink-600 transition-all"
                >
                  🏪 Abrir mi tienda gratis en 1 minuto
                </button>
              </div>
            </div>
          )}

          {/* ====================================================
              VISTA 2: ENVIAR CÓDIGO DE RECUPERACIÓN (FORGOT)
          ==================================================== */}
          {viewMode === "forgot" && (
            <div>
              {/* Cabecera */}
              <div className="text-center sm:text-left mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider mb-3">
                  📬 Recuperación de Cuenta
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  ¿Olvidaste tu clave?
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 leading-relaxed">
                  Ingresa tu correo registrado y te enviaremos un código seguro para restablecerla.
                </p>
              </div>

              {/* Banner de Seguridad e Independencia */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/70 rounded-2xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-amber-900">
                <span className="text-base shrink-0">🛡️</span>
                <p className="text-[11px] leading-relaxed">
                  <strong>Cuenta independiente:</strong> Por seguridad, el código se enviará exclusivamente al correo oficial con el que registraste tu tienda. Solo se puede cambiar la contraseña, más no el correo.
                </p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                    Correo Registrado de la Tienda
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      ✉️
                    </span>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium text-gray-900 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] disabled:opacity-50 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {recoveryLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Enviando Código...</span>
                    </>
                  ) : (
                    <span>Enviar Código al Correo 📩</span>
                  )}
                </button>
              </form>

              {/* Enlaces de Acción */}
              <div className="border-t border-gray-100 mt-6 pt-5 space-y-2.5 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode("reset")}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors block w-full py-1"
                >
                  ¿Ya tienes el código o enlace en tu correo? Ingrésalo aquí →
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("login")}
                  className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors block w-full py-1"
                >
                  ← Volver a Iniciar Sesión
                </button>
              </div>
            </div>
          )}

          {/* ====================================================
              VISTA 3: RESTAURAR CONTRASEÑA CON CÓDIGO (RESET)
          ==================================================== */}
          {viewMode === "reset" && (
            <div>
              {/* Cabecera */}
              <div className="text-center sm:text-left mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider mb-3">
                  ✨ Nueva Contraseña
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  Restaurar Acceso
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 leading-relaxed">
                  Ingresa el código que te enviamos al correo y tu nueva contraseña.
                </p>
                {recoveryEmail && (
                  <span className="inline-block mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full">
                    📧 {recoveryEmail}
                  </span>
                )}
              </div>

              {/* Formulario */}
              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">
                    Código de Restablecimiento
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      🔑
                    </span>
                    <input
                      type="text"
                      required
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Pega el código o enlace recibido"
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-mono font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">
                    💡 Puedes pegar el código o el enlace completo que te enviamos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      🔒
                    </span>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-12 py-3.5 text-sm outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-medium text-gray-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm p-1 transition-colors"
                      aria-label="Alternar visibilidad"
                    >
                      {showNewPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      🔒
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl pl-11 pr-12 py-3.5 text-sm outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-medium text-gray-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm p-1 transition-colors"
                      aria-label="Alternar visibilidad"
                    >
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  </div>

                  {confirmNewPassword && (
                    <p
                      className={`text-[11px] font-bold mt-1.5 ml-1 flex items-center gap-1 ${
                        newPassword === confirmNewPassword
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {newPassword === confirmNewPassword
                        ? "✓ Las contraseñas coinciden"
                        : "✗ Las contraseñas no coinciden"}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] disabled:opacity-50 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {recoveryLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Restaurando Contraseña...</span>
                    </>
                  ) : (
                    <span>Restaurar y Acceder al Panel 🚀</span>
                  )}
                </button>
              </form>

              {/* Enlaces de Acción */}
              <div className="border-t border-gray-100 mt-6 pt-5 space-y-2.5 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode("forgot")}
                  className="text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors block w-full py-1"
                >
                  ¿No recibiste el correo? Reenviar código
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("login")}
                  className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors block w-full py-1"
                >
                  ← Cancelar y volver al inicio de sesión
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}