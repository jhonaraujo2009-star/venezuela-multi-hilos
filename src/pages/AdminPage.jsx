import { useState } from "react";
import { Routes, Route, NavLink, useNavigate, useParams } from "react-router-dom"; 
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// 🌟 NUEVAS IMPORTACIONES PARA EL MEGÁFONO
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useApp } from "../context/AppContext";

// Admin sub-panels
import AdminSettings from "../components/admin/AdminSettings";
import AdminInterface from "../components/admin/AdminInterface";
import AdminSessions from "../components/admin/AdminSessions";
import AdminProducts from "../components/admin/AdminProducts";
import AdminInbox from "../components/admin/AdminInbox";
import AdminPayments from "../components/admin/AdminPayments";
import AdminStatistics from "../components/admin/AdminStatistics";
import AdminPOS from "../components/admin/AdminPOS"; // 🌟 Importamos el nuevo POS
import AdminSalesHistory from "../components/admin/AdminSalesHistory"; // 🌟 Importamos el nuevo Historial de Ventas

export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { storeId } = useParams(); 
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 🌟 EXTRAEMOS LOS DATOS DE LA TIENDA PARA LEER EL MENSAJE DEL SÚPER ADMIN
  const { storeData } = useApp(); 

  const NAV_ITEMS = [
    { path: `/${storeId}/admin`, label: "⚙️ Ajustes", end: true },
    { path: `/${storeId}/admin/pos`, label: "🏪 Punto Venta" }, // 🌟 Link del POS añadido como segundo ítem para agilidad
    { path: `/${storeId}/admin/pedidos`, label: "🛒 Historial de Ventas" }, // 🌟 Renombrado a petición
    { path: `/${storeId}/admin/interfaz`, label: "🎨 Interfaz" },
    { path: `/${storeId}/admin/sesiones`, label: "📂 Sesiones" },
    { path: `/${storeId}/admin/productos`, label: "📦 Productos" },
    { path: `/${storeId}/admin/estadisticas`, label: "📊 Estadísticas" },
    { path: `/${storeId}/admin/inbox`, label: "📦 Pedidos por Confirmar" }, // 🌟 Renombrado Inbox
    { path: `/${storeId}/admin/pagos`, label: "🏦 Pagos" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate(`/${storeId}`); 
    toast.success("Sesión cerrada");
  };

  // 🌟 LÓGICA PARA ELIMINAR EL MENSAJE DEL MEGÁFONO
  const dismissMessage = async () => {
    if (!storeData?.id) return;
    try {
      await updateDoc(doc(db, "stores", storeData.id), { systemMessage: "" });
      toast.success("Mensaje descartado ✅");
    } catch (error) {
      toast.error("Error al descartar el mensaje");
    }
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

        {/* ==========================================
            🌟 ALERTA DEL MEGÁFONO (SÚPER ADMIN) 🌟
        ========================================== */}
        {storeData?.systemMessage && (
          <div className="m-4 lg:mx-8 lg:mt-8 p-4 sm:p-5 bg-red-50 border border-red-100 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
            <div className="pl-2">
              <h4 className="text-red-800 font-black text-xs sm:text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
                <span className="text-lg animate-pulse">📢</span> Aviso del Sistema
              </h4>
              <p className="text-red-600 text-sm font-semibold">{storeData.systemMessage}</p>
            </div>
            <button 
              onClick={dismissMessage} 
              className="whitespace-nowrap bg-white hover:bg-red-100 text-red-600 border border-red-200 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs shadow-sm"
            >
              Entendido ✕
            </button>
          </div>
        )}

        <div className="p-4 lg:p-8 max-w-3xl">
          <Routes>
            <Route index element={<AdminSettings />} />
            <Route path="pos" element={<AdminPOS />} /> {/* 🌟 Conexión del TPV/POS */}
            <Route path="pedidos" element={<AdminSalesHistory />} /> {/* 🌟 Conexión del Historial de Ventas */}
            <Route path="interfaz" element={<AdminInterface />} />
            <Route path="sesiones" element={<AdminSessions />} />
            <Route path="productos" element={<AdminProducts />} />
            <Route path="estadisticas" element={<AdminStatistics />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="pagos" element={<AdminPayments />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}