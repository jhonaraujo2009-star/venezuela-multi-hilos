import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../config/firebase";

const AuthContext = createContext(null);

const TENANT_SESSION_KEY = "vmh_tenant_session_v1";

function readTenantSession() {
  try {
    const raw = window.sessionStorage.getItem(TENANT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tenantSession, setTenantSession] = useState(() => readTenantSession());

  const clearTenantSession = useCallback(() => {
    try {
      window.sessionStorage.removeItem(TENANT_SESSION_KEY);
    } catch (e) {}
    setTenantSession(null);
  }, []);

  // 🌟 AISLAMIENTO DE INQUILINOS (Tenant Isolation):
  // Emite un token de sesión exclusivo para una tienda específica (storeId + uid + email)
  const activateStoreSession = useCallback((storeId, authUser = auth.currentUser) => {
    const cleanStoreId = storeId ? decodeURIComponent(String(storeId)).trim().toLowerCase() : "";
    const cleanEmail = authUser?.email ? authUser.email.trim().toLowerCase() : "";
    const uid = authUser?.uid || "";
    if (!cleanStoreId || !uid || !cleanEmail) return null;

    const sessionObj = {
      role: "store_admin",
      storeId: cleanStoreId,
      uid,
      email: cleanEmail,
      token: `${cleanStoreId}:${uid}:${Date.now().toString(36)}`,
      issuedAt: Date.now(),
    };
    try {
      window.sessionStorage.setItem(TENANT_SESSION_KEY, JSON.stringify(sessionObj));
    } catch (e) {}
    setTenantSession(sessionObj);
    return sessionObj;
  }, []);

  // 🌟 AISLAMIENTO DE SUPER ADMIN:
  // Marca la sesión como global de Super Admin (sin acceso a paneles internos de tiendas)
  const activateSuperAdminSession = useCallback((authUser = auth.currentUser) => {
    const cleanEmail = authUser?.email ? authUser.email.trim().toLowerCase() : "";
    const uid = authUser?.uid || "";
    if (!uid || !cleanEmail) return null;

    const sessionObj = {
      role: "super_admin",
      storeId: null,
      uid,
      email: cleanEmail,
      token: `super_admin:${uid}:${Date.now().toString(36)}`,
      issuedAt: Date.now(),
    };
    try {
      window.sessionStorage.setItem(TENANT_SESSION_KEY, JSON.stringify(sessionObj));
    } catch (e) {}
    setTenantSession(sessionObj);
    return sessionObj;
  }, []);

  // 🌟 VALIDACIÓN ESTRICTA DE TOKEN DE TIENDA:
  // Verifica que exista un token activo emitido específicamente para esta tienda y este usuario
  const hasValidStoreSession = useCallback(
    (targetStoreId, authUser = user) => {
      if (!targetStoreId || !authUser?.uid || !authUser?.email) return false;
      const cleanTarget = decodeURIComponent(String(targetStoreId)).trim().toLowerCase();
      const currentSession = readTenantSession() || tenantSession;
      if (!currentSession) return false;

      // Evitar Session Bleeding: el rol debe ser estrictamente store_admin (nunca super_admin)
      if (currentSession.role !== "store_admin") return false;
      if (!currentSession.token || !currentSession.storeId) return false;

      const cleanEmail = authUser.email.trim().toLowerCase();
      return (
        currentSession.storeId === cleanTarget &&
        currentSession.uid === authUser.uid &&
        currentSession.email === cleanEmail
      );
    },
    [user, tenantSession]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        clearTenantSession();
      } else {
        const existing = readTenantSession();
        const cleanEmail = u.email ? u.email.trim().toLowerCase() : "";
        if (existing && (existing.uid !== u.uid || existing.email !== cleanEmail)) {
          clearTenantSession();
        } else {
          setTenantSession(existing);
        }
      }
      setAuthLoading(false);
    });
    return unsub;
  }, [clearTenantSession]);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    clearTenantSession();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user,
        authLoading,
        tenantSession,
        login,
        logout,
        activateStoreSession,
        activateSuperAdminSession,
        clearTenantSession,
        hasValidStoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
