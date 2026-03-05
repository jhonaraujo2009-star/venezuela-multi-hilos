import { useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Admin sub-panels
import AdminSettings from "../components/admin/AdminSettings";
import AdminInterface from "../components/admin/AdminInterface";
import AdminSessions from "../components/admin/AdminSessions";
import AdminProducts from "../components/admin/AdminProducts";
import AdminInbox from "../components/admin/AdminInbox";
import AdminPayments from "../components/admin/AdminPayments";

// Lógica de "Logística" removida: 
// 1. Borramos el import de AdminLogistics
// 2. Quitamos la ruta del array NAV_ITEMS
// 3. Quitamos el componente <Route path="logistica"... />

const NAV_ITEMS = [
  { path: "/admin", label: "⚙️ Ajustes", end: true },
  { path: "/admin/interfaz", label: "🎨 Interfaz" },
  { path: "/admin/sesiones", label: "📂 Sesiones" },
  { path: "/admin/productos", label: "📦 Productos" },
  { path: "/admin/inbox", label: "💬 Mensajería" },
  { path: "/admin/pagos", label: "🏦 Pagos" },
];

export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Sesión cerrada");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col z-40 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static`}>
        <div className="p-5 border-b border-gray-100">
          <h1 className="font-bold text-lg" style={{ color: "var(--primary)" }}>✨ Admin Panel</h1>
          <p className="text-xs text-gray-400 mt-0.5">CMS No-Code</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: "var(--primary)" } : {}
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <NavLink to="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
            🏠 Ver tienda
          </NavLink>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-50">
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-50">☰</button>
          <span className="font-bold text-gray-900">Admin Panel</span>
        </div>

        <div className="p-4 lg:p-8 max-w-3xl">
          <Routes>
            <Route index element={<AdminSettings />} />
            <Route path="interfaz" element={<AdminInterface />} />
            <Route path="sesiones" element={<AdminSessions />} />
            <Route path="productos" element={<AdminProducts />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="pagos" element={<AdminPayments />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}