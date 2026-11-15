import { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
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
          // 🔒 1. AISLAMIENTO DE SESIÓN (Anti-Session Bleeding):
          // Verificar sesión vinculada al JWT de Firebase emitida explícitamente para este storeId.
          if (!hasValidStoreSession(cleanStoreId, user)) {
            if (isMounted) {
              toast.error("Debes iniciar sesión con el usuario y clave de esta tienda.", {
                id: "protected-denied",
              });
              setIsAuthorized(false);
            }
            return;
          }

          // 🔒 2. VERIFICACIÓN DEL TOKEN JWT FIRMADO POR EL SERVIDOR DE FIREBASE AUTH:
          const tokenResult = await user.getIdTokenResult();
          const verifiedUid = String(
            tokenResult?.claims?.user_id || tokenResult?.claims?.sub || user.uid || ""
          ).trim();
          const verifiedEmail = String(
            tokenResult?.claims?.email || user.email || ""
          )
            .trim()
            .toLowerCase();

          // 🔒 3. VERIFICACIÓN ESTRICTA E INMUTABLE DE PROPIEDAD EN BASE DE DATOS (Sin reescribir ownerId):
          const storeRef = doc(db, "stores", cleanStoreId);
          const storeSnap = await getDoc(storeRef);

          if (storeSnap.exists() && storeSnap.id.toLowerCase() === cleanStoreId) {
            const data = storeSnap.data();
            const storeOwnerEmail = data.ownerEmail ? data.ownerEmail.trim().toLowerCase() : "";
            const storeOwnerId = data.ownerId ? String(data.ownerId).trim() : "";

            const matchesEmail = Boolean(
              verifiedEmail && storeOwnerEmail && verifiedEmail === storeOwnerEmail
            );
            const matchesOwnerId = Boolean(
              verifiedUid && storeOwnerId && storeOwnerId === verifiedUid
            );

            if (matchesEmail && matchesOwnerId) {
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