import { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  const { storeId } = useParams(); 
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (user && storeId) {
        try {
          const storeRef = doc(db, "stores", storeId);
          const storeSnap = await getDoc(storeRef);

          if (storeSnap.exists() && storeSnap.data().ownerId === user.uid) {
            setIsAuthorized(true); // Es el dueño correcto
          } else {
            setIsAuthorized(false); // No es su tienda
          }
        } catch (error) {
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