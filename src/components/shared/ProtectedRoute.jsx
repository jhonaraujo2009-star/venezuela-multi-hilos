import { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { SUPER_ADMIN_EMAIL } from "../../config/constants";

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  const { storeId } = useParams(); 
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (user && storeId) {
        try {
          const currentEmail = user.email ? user.email.trim().toLowerCase() : "";

          // 👑 1. Si es Super Admin, tiene acceso total a cualquier tienda
          if (
            currentEmail &&
            SUPER_ADMIN_EMAIL &&
            currentEmail === SUPER_ADMIN_EMAIL.trim().toLowerCase()
          ) {
            setIsAuthorized(true);
            return;
          }

          const storeRef = doc(db, "stores", storeId);
          const storeSnap = await getDoc(storeRef);

          if (storeSnap.exists()) {
            const data = storeSnap.data();
            const storeOwnerEmail = data.ownerEmail ? data.ownerEmail.trim().toLowerCase() : "";

            // 🔒 2. Regla estricta: Solo el correo registrado como dueño legítimo tiene acceso.
            // Se elimina la brecha de comprobación por UID residual que permitía a otro correo entrar.
            const isOwner = Boolean(currentEmail && storeOwnerEmail && currentEmail === storeOwnerEmail);

            if (isOwner) {
              // Auto-sincronizar el ownerId con el UID del dueño actual para purgar cualquier UID de dueños anteriores
              if (data.ownerId !== user.uid) {
                try {
                  await updateDoc(storeRef, { ownerId: user.uid });
                } catch (syncErr) {
                  console.warn("No se pudo sincronizar ownerId:", syncErr);
                }
              }
              setIsAuthorized(true);
              return;
            }
          }
          
          setIsAuthorized(false);
        } catch (error) {
          console.error("Error comprobando acceso a tienda:", error);
          setIsAuthorized(false);
        }
      } else if (!user) {
        setIsAuthorized(false);
      }
    };
    
    if (!authLoading) {
      checkAccess();
    }
  }, [user, storeId, authLoading]);

  if (authLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
      </div>
    );
  }

  if (!user || isAuthorized === false) return <Navigate to="/login" replace />;

  return children;
}