import { useState } from "react";
import { Routes, Route, NavLink, useNavigate, useParams } from "react-router-dom"; // 🌟 Añadido useParams
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Admin sub-panels
import AdminSettings from "../components/admin/AdminSettings";
import AdminInterface from "../components/admin/AdminInterface";
import AdminSessions from "../components/admin/AdminSessions";
import AdminProducts from "../components/admin/AdminProducts";
import AdminInbox from "../components/admin/AdminInbox";
import AdminPayments from "../components/admin/AdminPayments";

export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { storeId } = useParams(); // 🌟 MAGIA: Extraemos el nombre de la franquicia actual
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 🌟 MAGIA: Ahora los botones del menú saben a qué tienda pertenecen
  const NAV_ITEMS = [
    { path: `/${storeId}/admin`, label: "⚙️ Ajustes", end: true },
    { path: `/${storeId}/admin/interfaz`, label: "🎨 Interfaz" },
    { path: `/${storeId}/admin/sesiones`, label: "📂 Sesiones" },
    { path: `/${storeId}/admin/productos`, label: "📦 Productos" },
    { path: `/${storeId}/admin/inbox`, label: "💬 Mensajería" },
    { path: `/${storeId}/admin/pagos`, label: "🏦 Pagos" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate(`/${storeId}`); // 🌟 MAGIA: Al cerrar sesión te manda a TU tienda, no a la genérica
    toast.success("Sesión cerrada");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
          {/* 🌟 MAGIA: El botón de "Ver tienda" te lleva a TU franquicia */}
          <NavLink to={`/${storeId}`} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
            🏠 Ver tienda
          </NavLink>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-50">
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 min-w-0">
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