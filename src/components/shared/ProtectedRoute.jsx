import { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
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
          // 👑 1. Si es Super Admin, tiene acceso total a cualquier tienda
          if (
            user.email &&
            SUPER_ADMIN_EMAIL &&
            user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
          ) {
            setIsAuthorized(true);
            return;
          }

          const storeRef = doc(db, "stores", storeId);
          const storeSnap = await getDoc(storeRef);

          if (storeSnap.exists()) {
            const data = storeSnap.data();
            // 2. Es el dueño si coincide su UID o su correo
            const isOwner =
              (data.ownerId && data.ownerId === user.uid) ||
              (data.ownerEmail &&
                user.email &&
                data.ownerEmail.toLowerCase() === user.email.toLowerCase());

            if (isOwner) {
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