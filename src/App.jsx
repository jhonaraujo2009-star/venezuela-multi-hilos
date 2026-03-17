import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Contextos
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Utilidades / Protecciones
import ProtectedRoute from "./components/shared/ProtectedRoute";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import ScrollToTop from "./components/shared/ScrollToTop";

// Páginas importadas mediante Lazy Loading (carga diferida)
const HomePage = lazy(() => import("./pages/HomePage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const QuestionsPage = lazy(() => import("./pages/QuestionsPage"));
const RegisterStorePage = lazy(() => import("./pages/RegisterStorePage"));
const SuperAdminPage = lazy(() => import("./pages/SuperAdminPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Nuevas Páginas Premium
const SearchPage = lazy(() => import("./pages/SearchPage"));
const FlashOffersPage = lazy(() => import("./pages/FlashOffersPage"));

// Indicador de carga global durante transiciones
const GlobalLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50/60 to-pink-50/20">
    <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
  </div>
);

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
                    
                    <Route path="/:storeId/preguntas" element={<QuestionsPage />} />
                    
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/registro-vendedor" element={<RegisterStorePage />} />
                    <Route path="/super-admin" element={<SuperAdminPage />} /> {/* 🌟 Recuperado */}
                    
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