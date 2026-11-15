import { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import toast from "react-hot-toast";

export default function ProtectedRoute({ children }) {
  const { user, authLoading, hasValidStoreSession } = useAuth();
  const { storeId } = useParams();
  const [isAuthorized, setIsAuthorized] = useState(null);

  const cleanStoreId = storeId ? decodeURIComponent(storeId).trim().toLowerCase() : "";

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      if (user && cleanStoreId) {
        setIsAuthorized(null);
        try {
          const currentEmail = user.email ? user.email.trim().toLowerCase() : "";

          // 🔒 1. AISLAMIENTO DE SESIÓN (Anti-Session Bleeding):
          // Verificar que exista un token de sesión activo emitido específicamente para este storeId.
          // Ni el Super Admin ni otra tienda pueden reutilizar su sesión global para entrar aquí.
          if (!hasValidStoreSession(cleanStoreId, user)) {
            if (isMounted) {
              toast.error("Debes iniciar sesión con el usuario y clave de esta tienda.", {
                id: "protected-denied",
              });
              setIsAuthorized(false);
            }
            return;
          }

          // 🔒 2. VERIFICACIÓN ESTRICTA DE PROPIEDAD EN BASE DE DATOS (Tenant Isolation):
          // El usuario autenticado debe coincidir exactamente con el storeId, ownerEmail y ownerId de la tienda.
          const storeRef = doc(db, "stores", cleanStoreId);
          const storeSnap = await getDoc(storeRef);

          if (storeSnap.exists() && storeSnap.id.toLowerCase() === cleanStoreId) {
            const data = storeSnap.data();
            const storeOwnerEmail = data.ownerEmail ? data.ownerEmail.trim().toLowerCase() : "";
            const storeOwnerId = data.ownerId ? String(data.ownerId).trim() : "";

            const matchesEmail = Boolean(
              currentEmail && storeOwnerEmail && currentEmail === storeOwnerEmail
            );
            const matchesOwnerId = Boolean(!storeOwnerId || storeOwnerId === user.uid);

            if (matchesEmail && matchesOwnerId) {
              if (!storeOwnerId) {
                try {
                  await updateDoc(storeRef, { ownerId: user.uid });
                } catch (syncErr) {
                  console.warn("No se pudo sincronizar ownerId:", syncErr);
                }
              }
              if (isMounted) setIsAuthorized(true);
              return;
            }
          }

          if (isMounted) {
            toast.error("No tienes permisos para administrar esta tienda. Inicia sesión con la cuenta de esta tienda.", {
              id: "protected-denied",
            });
            setIsAuthorized(false);
          }
        } catch (error) {
          console.error("Error comprobando acceso a tienda:", error);
          if (isMounted) setIsAuthorized(false);
        }
      } else {
        if (isMounted) setIsAuthorized(false);
      }
    };

    if (!authLoading) {
      checkAccess();
    }

    return () => {
      isMounted = false;
    };
  }, [user, cleanStoreId, authLoading, hasValidStoreSession]);

  if (authLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
      </div>
    );
  }

  // 🔒 3. REDIRECCIÓN ESTRICTA AL LOGIN DE LA TIENDA ESPECÍFICA
  if (!user || isAuthorized === false) {
    const loginTarget = cleanStoreId
      ? `/login?store=${encodeURIComponent(cleanStoreId)}`
      : "/login";
    return <Navigate to={loginTarget} replace />;
  }

  return children;
}