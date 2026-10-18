import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { auth, db } from "../../config/firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function AdminSecurity() {
  const { user, logout } = useAuth();
  const { storeData } = useApp();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  // Email registrado de la cuenta
  const userEmail = user?.email || storeData?.ownerEmail || "";
  const primaryColor = storeData?.primaryColor || "#ec4899";

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Por favor, ingresa tu contraseña actual");
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
    if (newPassword !== confirmPassword) {
      toast.error("Las nuevas contraseñas no coinciden");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    if (!auth.currentUser || !userEmail) {
      toast.error("Sesión no válida. Vuelve a iniciar sesión.");
      return;
    }

    setLoading(true);
    try {
      // 1. Reautenticar al usuario para garantizar la seguridad
      const credential = EmailAuthProvider.credential(userEmail, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // 2. Actualizar la contraseña en Firebase Auth
      await updatePassword(auth.currentUser, newPassword);

      // 3. Registrar fecha de actualización en Firestore si existe la tienda
      if (storeData?.id) {
        try {
          await updateDoc(doc(db, "stores", storeData.id), {
            last_password_change: serverTimestamp(),
          });
        } catch (dbErr) {
          console.warn("No se pudo guardar la fecha en Firestore:", dbErr);
        }
      }

      toast.success("¡Contraseña actualizada con éxito! 🔐");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        toast.error("La contraseña actual es incorrecta ❌");
      } else if (error.code === "auth/weak-password") {
        toast.error("La contraseña es muy débil. Debe tener al menos 6 caracteres.");
      } else if (error.code === "auth/requires-recent-login") {
        toast.error("Por seguridad, debes cerrar sesión e iniciar nuevamente.");
      } else {
        toast.error("Error al actualizar contraseña. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 space-y-8 max-w-xl mx-auto p-2 sm:p-4">
      {/* CABECERA */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
            style={{ background: `${primaryColor}15`, color: primaryColor }}
          >
            🛡️
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Seguridad y Cuenta
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Gestión de credenciales y acceso seguro a tu panel administrativo.
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN: MI CORREO ELECTRÓNICO (SOLO LECTURA) */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Mi Correo Electrónico
          </h3>
          <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
            🔒 No Modificable
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Correo Registrado de la Cuenta
          </label>
          <div className="relative">
            <input
              type="email"
              value={userEmail}
              readOnly
              disabled
              className="w-full bg-gray-100/80 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-700 outline-none cursor-not-allowed select-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔒
            </div>
          </div>
        </div>

        {/* ALERTA DE SEGURIDAD EXPLICATIVA */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 text-xs leading-relaxed text-blue-900">
          <span className="text-lg">ℹ️</span>
          <div>
            <p className="font-bold mb-0.5">Política de Seguridad e Independencia:</p>
            <p className="text-blue-700">
              Solo se permite cambiar la <strong>contraseña</strong>, más no el{" "}
              <strong>correo electrónico</strong>. Cada cuenta es 100% independiente
              y está ligada a tu tienda. Tu correo es la llave única para acceder
              y recibir códigos de recuperación.
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN: CAMBIAR CONTRASEÑA */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Cambiar Contraseña
          </h3>
          <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
            🔑 Clave Protegida
          </span>
        </div>

        <p className="text-xs text-gray-500">
          Ingresa tu contraseña actual y define una nueva para actualizar tus credenciales.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Contraseña Actual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu clave actual"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-pink-500 transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-1"
              >
                {showCurrent ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 my-2"></div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-pink-500 transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-1"
              >
                {showNew ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                required
                minLength={6}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-pink-500 transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm p-1"
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Indicador de coincidencia */}
            {confirmPassword && (
              <p
                className={`text-[11px] font-bold mt-1.5 ml-1 flex items-center gap-1 ${
                  newPassword === confirmPassword ? "text-green-600" : "text-red-500"
                }`}
              >
                {newPassword === confirmPassword
                  ? "✓ Las contraseñas coinciden"
                  : "✗ Las contraseñas no coinciden"}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            style={{ background: primaryColor }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Actualizando Contraseña...
              </>
            ) : (
              "Guardar Nueva Contraseña 🔐"
            )}
          </button>
        </form>
      </div>

      {/* SECCIÓN: INDEPENDENCIA DE LA CUENTA */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          🏛️ Independencia de tu Cuenta
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-black block">
              Tienda Asignada
            </span>
            <span className="font-bold text-gray-800 text-sm">
              {storeData?.nombre || "Mi Tienda"}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-black block">
              Enlace de tu Tienda
            </span>
            <span className="font-bold text-pink-600 text-sm">
              /{storeData?.id || ""}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 sm:col-span-2">
            <span className="text-[10px] text-gray-400 uppercase font-black block">
              Identificador Único (UID)
            </span>
            <span className="font-mono text-[11px] text-gray-600 select-all break-all">
              {user?.uid || "No identificado"}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          ✨ Tu tienda opera de forma completamente autónoma. Tus productos, pagos,
          pedidos y credenciales no están vinculados a ningún otro vendedor.
        </p>

        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-500">¿Deseas salir?</span>
          <button
            type="button"
            onClick={logout}
            className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors"
          >
            Cerrar Sesión 🚪
          </button>
        </div>
      </div>
    </div>
  );
}
