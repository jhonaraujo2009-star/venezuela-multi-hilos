import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../config/firebase";

const AuthContext = createContext(null);

const TENANT_SESSION_KEY = "vmh_tenant_session_v1";

function getFirebaseJwtSignature(authUser) {
  const rawJwt = authUser?.accessToken || authUser?.stsTokenManager?.accessToken || "";
  if (!rawJwt || typeof rawJwt !== "string") return "";
  const parts = rawJwt.split(".");
  return parts.length === 3 ? parts[2].slice(0, 32) : "";
}

function buildBoundSessionToken(role, cleanStoreId, uid, cleanEmail, jwtSig) {
  if (!uid || !cleanEmail || !jwtSig) return "";
  const payload = `${role}:${cleanStoreId || "global"}:${uid}:${cleanEmail}:${jwtSig}`;
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${cleanStoreId || role}:${uid}:${(hash >>> 0).toString(16)}:${jwtSig.slice(0, 16)}`;
}

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
  // Vincula la sesión de la pestaña a la firma RSA del JWT de Firebase Auth del usuario autenticado
  const activateStoreSession = useCallback((storeId, authUser = auth.currentUser) => {
    const cleanStoreId = storeId ? decodeURIComponent(String(storeId)).trim().toLowerCase() : "";
    const cleanEmail = authUser?.email ? authUser.email.trim().toLowerCase() : "";
    const uid = authUser?.uid || "";
    const jwtSig = getFirebaseJwtSignature(authUser);
    if (!cleanStoreId || !uid || !cleanEmail || !jwtSig) return null;

    const boundToken = buildBoundSessionToken("store_admin", cleanStoreId, uid, cleanEmail, jwtSig);
    const sessionObj = {
      role: "store_admin",
      storeId: cleanStoreId,
      uid,
      email: cleanEmail,
      jwtSig,
      token: boundToken,
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
    const jwtSig = getFirebaseJwtSignature(authUser);
    if (!uid || !cleanEmail || !jwtSig) return null;

    const boundToken = buildBoundSessionToken("super_admin", "", uid, cleanEmail, jwtSig);
    const sessionObj = {
      role: "super_admin",
      storeId: null,
      uid,
      email: cleanEmail,
      jwtSig,
      token: boundToken,
      issuedAt: Date.now(),
    };
    try {
      window.sessionStorage.setItem(TENANT_SESSION_KEY, JSON.stringify(sessionObj));
    } catch (e) {}
    setTenantSession(sessionObj);
    return sessionObj;
  }, []);

  // 🌟 VALIDACIÓN ESTRICTA DE TOKEN DE TIENDA VINCULADO AL JWT DE FIREBASE:
  // Verifica que el token de sesión haya sido derivado del JWT firmado por Firebase para este usuario y tienda
  const hasValidStoreSession = useCallback(
    (targetStoreId, authUser = user) => {
      if (!targetStoreId || !authUser?.uid || !authUser?.email) return false;
      const cleanTarget = decodeURIComponent(String(targetStoreId)).trim().toLowerCase();
      const currentSession = readTenantSession() || tenantSession;
      if (!currentSession) return false;

      if (currentSession.role !== "store_admin") return false;
      if (!currentSession.token || !currentSession.storeId || !currentSession.jwtSig) return false;

      const cleanEmail = authUser.email.trim().toLowerCase();
      const liveJwtSig = getFirebaseJwtSignature(authUser);
      if (!liveJwtSig) return false;

      const expectedToken = buildBoundSessionToken(
        "store_admin",
        cleanTarget,
        authUser.uid,
        cleanEmail,
        currentSession.jwtSig
      );

      return (
        currentSession.storeId === cleanTarget &&
        currentSession.uid === authUser.uid &&
        currentSession.email === cleanEmail &&
        currentSession.token === expectedToken
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
