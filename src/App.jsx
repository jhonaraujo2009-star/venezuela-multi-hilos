import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useSearchParams, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Contextos
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Utilidades / Protecciones
import ProtectedRoute from "./components/shared/ProtectedRoute";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import ScrollToTop from "./components/shared/ScrollToTop";

// 🌟 FUNCIÓN SALVAVIDAS: Auto-recuperación de Chunks Dinámicos (Evita el "¡Ups! Algo salió mal")
// Cuando el usuario entra desde un hipervínculo o tras un nuevo deploy, el navegador puede
// intentar cargar un chunk viejo con hash obsoleto. Esta función detecta el fallo y recarga limpio.
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem("chunk_retry_refreshed") || "false"
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem("chunk_retry_refreshed", "false");
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem("chunk_retry_refreshed", "true");
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });
}

// Páginas importadas con Auto-Recuperación
const HomePage = lazyWithRetry(() => import("./pages/HomePage"));
const StorePage = lazyWithRetry(() => import("./pages/StorePage"));
const AdminPage = lazyWithRetry(() => import("./pages/AdminPage"));
const LoginPage = lazyWithRetry(() => import("./pages/LoginPage"));
const QuestionsPage = lazyWithRetry(() => import("./pages/QuestionsPage"));
const RegisterStorePage = lazyWithRetry(() => import("./pages/RegisterStorePage"));
const SuperAdminPage = lazyWithRetry(() => import("./pages/SuperAdminPage"));
const NotFoundPage = lazyWithRetry(() => import("./pages/NotFoundPage"));

// Nuevas Páginas Premium
const SearchPage = lazyWithRetry(() => import("./pages/SearchPage"));
const FlashOffersPage = lazyWithRetry(() => import("./pages/FlashOffersPage"));
const StoreOnboardingPage = lazyWithRetry(() => import("./pages/StoreOnboardingPage"));

// Indicador de carga global durante transiciones
const GlobalLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50/60 to-pink-50/20">
    <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
  </div>
);

// 🌟 Componente puente para hipervínculos que apunten a /api/store-og
function ApiStoreOgRedirect() {
  const [params] = useSearchParams();
  const storeId = params.get("storeId");
  const product = params.get("product");

  if (!storeId) return <Navigate to="/" replace />;
  const target = product ? `/${storeId}?product=${encodeURIComponent(product)}` : `/${storeId}`;
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/60 to-pink-50/20 text-gray-900 selection:bg-pink-200 selection:text-pink-900 transition-colors duration-500">
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <AppProvider>
              <CartProvider>
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 3000,
                    style: {
                      borderRadius: "16px",
                      background: "#fff",
                      color: "#333",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                      fontSize: "14px",
                      fontWeight: "500",
                    },
                  }}
                />
                
                <Suspense fallback={<GlobalLoader />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/ofertas" element={<FlashOffersPage />} />
                    
                    {/* Redirección salvavidas por si se abre un link directo de /api/store-og */}
                    <Route path="/api/store-og" element={<ApiStoreOgRedirect />} />
                    
                    <Route path="/:storeId/preguntas" element={<QuestionsPage />} />
                    <Route path="/:storeId/aprender" element={<StoreOnboardingPage />} />
                    
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/registro-vendedor" element={<RegisterStorePage />} />
                    <Route path="/super-admin" element={<SuperAdminPage />} />
                    
                    <Route
                      path="/:storeId/admin/*"
                      element={
                        <ProtectedRoute>
                          <AdminPage />
                        </ProtectedRoute>
                      }
                    />
                    
                    <Route path="/:storeId" element={<StorePage />} />
                    
                    {/* Página de Error 404 personalizada */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
                
              </CartProvider>
            </AppProvider>
          </AuthProvider>
        </BrowserRouter>
      </div>
    </ErrorBoundary>
  );
}