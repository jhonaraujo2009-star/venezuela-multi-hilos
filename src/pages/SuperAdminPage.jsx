import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase"; 
import { onAuthStateChanged } from "firebase/auth"; 
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function SuperAdminPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("directorio"); 
  
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [megaphoneMsg, setMegaphoneMsg] = useState("");
  
  // 🌟 ESTADO DE LA LLAVE MAESTRA
  const [isCommissionActive, setIsCommissionActive] = useState(false);
  
  const navigate = useNavigate();

  const MASTER_EMAIL = "aea@gmail.com"; 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === MASTER_EMAIL) {
        setIsAuthorized(true);
        fetchAllStores();
      } else {
        toast.error("Acceso denegado. Nivel de seguridad insuficiente. 🛑");
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 🌟 Leemos si la Llave Maestra está encendida al cargar el panel
  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          setIsCommissionActive(snap.data().isCommissionActive || false);
        }
      } catch (error) {
        console.error("Error leyendo configuración global", error);
      }
    };
    if (isAuthorized) fetchGlobalSettings();
  }, [isAuthorized]);

  const fetchAllStores = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "stores"));
      const storesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStores(storesList);
    } catch (error) {
      console.error("Error cargando tiendas:", error);
      toast.error("Error al cargar la base de datos de tiendas.");
    } finally {
      setLoading(false);
    }
  };

  // 🌟 Función para encender o apagar el cobro a todos
  const toggleGlobalCommission = async () => {
    const newValue = !isCommissionActive;
    if (!window.confirm(`¿Seguro que quieres ${newValue ? 'ACTIVAR' : 'APAGAR'} el cobro de comisiones global?`)) return;
    
    try {
      setIsCommissionActive(newValue);
      await setDoc(doc(db, "settings", "global"), { isCommissionActive: newValue }, { merge: true });
      toast.success(`Comisiones ${newValue ? 'ACTIVADAS 💸' : 'APAGADAS 🛑'}`);
    } catch (error) {
      toast.error("Error al cambiar la configuración");
      setIsCommissionActive(!newValue); // Revertir si falla
    }
  };

  const toggleStoreStatus = async (storeId, currentStatus) => {
    const confirmMessage = currentStatus 
      ? `¿Estás seguro de INHABILITAR la tienda '${storeId}'? Sus productos no se verán y su página dejará de funcionar.`
      : `¿Quieres VOLVER A ACTIVAR la tienda '${storeId}'?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const storeRef = doc(db, "stores", storeId);
      await updateDoc(storeRef, { isActive: !currentStatus });
      setStores(stores.map(store => store.id === storeId ? { ...store, isActive: !currentStatus } : store));
      toast.success(currentStatus ? "Tienda inhabilitada." : "Tienda reactivada con éxito.");
    } catch (error) {
      toast.error("Hubo un problema al cambiar el estado de la tienda.");
    }
  };

  const updateCommission = async (storeId, newPercentage) => {
    try {
      const val = parseFloat(newPercentage);
      if (isNaN(val) || val < 0) return toast.error("Porcentaje inválido");
      await updateDoc(doc(db, "stores", storeId), { comision_porcentaje: val });
      setStores(stores.map(s => s.id === storeId ? { ...s, comision_porcentaje: val } : s));
      toast.success("Comisión actualizada ✅");
    } catch (e) {
      toast.error("Error al actualizar comisión");
    }
  };

  const resetDebt = async (storeId) => {
    if (!window.confirm("¿Confirmas que esta tienda ya te pagó su deuda? Se reiniciará a 0.")) return;
    try {
      await updateDoc(doc(db, "stores", storeId), { deuda_comision: 0 });
      setStores(stores.map(s => s.id === storeId ? { ...s, deuda_comision: 0 } : s));
      toast.success("Deuda saldada ✅");
    } catch (e) {
      toast.error("Error al saldar la deuda");
    }
  };

  const handleVerification = async (storeId, newStatus) => {
    try {
      await updateDoc(doc(db, "stores", storeId), { "verification.status": newStatus });
      setStores(stores.map(s => s.id === storeId ? { ...s, verification: { ...s.verification, status: newStatus } } : s));
      toast.success(`Tienda ${newStatus === 'verified' ? 'Verificada ✅' : 'Rechazada ❌'}`);
    } catch (e) {
      toast.error("Error al actualizar estado");
    }
  };

  const broadcastMessage = async () => {
    if (!megaphoneMsg.trim()) return toast.error("Escribe un mensaje primero.");
    if (!window.confirm("¿Seguro que quieres enviar esta alerta a TODAS las tiendas?")) return;
    
    const toastId = toast.loading("Transmitiendo mensaje global...");
    try {
      const promises = stores.map(s => updateDoc(doc(db, "stores", s.id), { systemMessage: megaphoneMsg }));
      await Promise.all(promises);
      toast.success("Mensaje enviado a todas las tiendas 📢", { id: toastId });
      setMegaphoneMsg("");
    } catch(e) { 
      toast.error("Error al enviar el mensaje", { id: toastId }); 
    }
  };

  const exportToCSV = () => {
    const headers = ["ID Tienda,Nombre Tienda,Email,Ventas Consolidadas,Comision (%),Deuda Pendiente ($),Estado"];
    const rows = stores.map(s => 
      `"${s.id}","${s.nombre || 'Sin nombre'}","${s.ownerEmail || ''}",${s.ventas_consolidadas || 0},${s.comision_porcentaje || 5},${s.deuda_comision || 0},${s.isActive !== false ? 'Activa' : 'Inhabilitada'}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Finanzas_SúperAdmin_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte descargado 📊");
  };

  const deleteStoreCompletely = async (storeId) => {
    const confirmMessage = `⚠️ ADVERTENCIA NUCLEAR ⚠️\n\n¿Estás 100% seguro de eliminar la tienda '${storeId}'?\n\nSe borrarán TODOS sus productos, pedidos, categorías, métodos de pago y su perfil de Firebase. Esta acción NO se puede deshacer.`;
    if (!window.confirm(confirmMessage)) return;

    const toastId = toast.loading(`Iniciando destrucción de la tienda ${storeId}...`);

    try {
      const productsQ = query(collection(db, "products"), where("storeId", "==", storeId));
      const productsSnap = await getDocs(productsQ);
      await Promise.all(productsSnap.docs.map(d => deleteDoc(doc(db, "products", d.id))));

      const ordersQ = query(collection(db, "orders"), where("storeId", "==", storeId));
      const ordersSnap = await getDocs(ordersQ);
      await Promise.all(ordersSnap.docs.map(d => deleteDoc(doc(db, "orders", d.id))));

      const sessionsQ = query(collection(db, "sessions"), where("storeId", "==", storeId));
      const sessionsSnap = await getDocs(sessionsQ);
      await Promise.all(sessionsSnap.docs.map(d => deleteDoc(doc(db, "sessions", d.id))));

      const paymentsQ = query(collection(db, "payments"), where("storeId", "==", storeId));
      const paymentsSnap = await getDocs(paymentsQ);
      await Promise.all(paymentsSnap.docs.map(d => deleteDoc(doc(db, "payments", d.id))));

      await deleteDoc(doc(db, "stores", storeId));

      setStores(stores.filter(store => store.id !== storeId));
      toast.success("Tienda eliminada de la Base de Datos ☢️\n(Recuerda borrar su carpeta de fotos en Cloudinary)", { id: toastId, duration: 6000 });
    } catch (error) {
      console.error("Error en el borrado:", error);
      toast.error("Hubo un error al intentar borrar la base de datos de la tienda.", { id: toastId });
    }
  };

  const getDaysInactive = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime();
    const diff = Date.now() - date;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const totalDebt = stores.reduce((acc, s) => acc + (s.deuda_comision || 0), 0);
  const totalSales = stores.reduce((acc, s) => acc + (s.ventas_consolidadas || 0), 0);
  const activeStoresCount = stores.filter(s => s.isActive !== false).length;

  const filteredStores = stores.filter(store => 
    store.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (store.nombre && store.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (store.ownerEmail && store.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  let processedStores = [...filteredStores];
  if (sortConfig.key) {
    processedStores.sort((a, b) => {
      let valA = sortConfig.key === 'inactiveDays' ? getDaysInactive(a.last_login) : (a[sortConfig.key] || 0);
      let valB = sortConfig.key === 'inactiveDays' ? getDaysInactive(b.last_login) : (b[sortConfig.key] || 0);
      if (valA === "N/A") valA = -1;
      if (valB === "N/A") valB = -1;

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const pendingVerificationStores = stores.filter(s => s.verification?.status === "pending");

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-pink-500 font-bold tracking-widest uppercase text-sm">Verificando Credenciales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      
      <header className="bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/30">
              <span className="text-white font-black text-xl">👑</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-tight">Panel Súper Admin</h1>
              <p className="text-xs text-pink-400 font-bold uppercase tracking-widest">Nivel de Acceso: Dios</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
            Volver a la tienda →
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        <div className="flex overflow-x-auto gap-2 mb-8 hide-scrollbar">
          {[
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "directorio", icon: "🏪", label: "Directorio" },
            { id: "finanzas", icon: "💰", label: "Finanzas" },
            { id: "verificacion", icon: "🛡️", label: "Verificación" },
            { id: "megafono", icon: "📢", label: "Megáfono" },
            { id: "mantenimiento", icon: "☢️", label: "Mantenimiento" }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === t.id ? "bg-gray-900 text-white shadow-lg" : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
              }`}>
              <span>{t.icon}</span> {t.label}
              {t.id === "verificacion" && pendingVerificationStores.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingVerificationStores.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center text-xl mb-4">💰</div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Comisiones por Cobrar</p>
              <p className="text-4xl font-black text-gray-900 mt-1">${totalDebt.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl mb-4">📈</div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ventas Globales</p>
              <p className="text-4xl font-black text-gray-900 mt-1">{totalSales}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-4">🏪</div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tiendas Activas</p>
              <p className="text-4xl font-black text-gray-900 mt-1">{activeStoresCount}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-xl mb-4">🛑</div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inhabilitadas</p>
              <p className="text-4xl font-black text-gray-900 mt-1">{stores.length - activeStoresCount}</p>
            </div>
          </div>
        )}

        {activeTab === "megafono" && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-6xl block mb-4">📢</span>
              <h2 className="text-2xl font-black text-gray-900">Aviso del Sistema</h2>
              <p className="text-gray-500 text-sm mt-2">Escribe un mensaje aquí y aparecerá como una alerta crítica en el panel de control de todas las tiendas de tus vendedores.</p>
            </div>
            <textarea 
              rows="4" 
              placeholder="Ej: Mantenimiento programado para esta noche a las 3:00 AM..." 
              value={megaphoneMsg}
              onChange={(e) => setMegaphoneMsg(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-medium outline-none focus:border-pink-500 focus:bg-white transition-all resize-none mb-4"
            ></textarea>
            <button onClick={broadcastMessage} className="w-full bg-gray-900 hover:bg-pink-600 text-white font-black py-4 rounded-2xl transition-colors shadow-lg uppercase tracking-widest text-sm">
              Transmitir a todos
            </button>
          </div>
        )}

        {activeTab === "verificacion" && (
          <div className="space-y-4">
            {pendingVerificationStores.length === 0 ? (
              <div className="bg-white rounded-[2rem] shadow-sm p-10 text-center border border-gray-100">
                <span className="text-5xl block mb-4">🛡️</span>
                <p className="text-gray-500 font-bold">No hay solicitudes de verificación pendientes.</p>
              </div>
            ) : (
              pendingVerificationStores.map(store => (
                <div key={store.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{store.nombre}</h3>
                    <p className="text-xs text-gray-500 mb-3">{store.ownerEmail}</p>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-bold text-gray-400 w-24 inline-block">Cédula/RIF:</span> {store.verification?.cedula}</p>
                      <p className="text-sm"><span className="font-bold text-gray-400 w-24 inline-block">Registro:</span> {store.verification?.registroComercio}</p>
                      <p className="text-sm">
                        <span className="font-bold text-gray-400 w-24 inline-block">YouTube:</span> 
                        <a href={store.verification?.youtubeLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Ver Video ↗</a>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => handleVerification(store.id, 'none')} className="flex-1 sm:flex-none px-6 py-3 bg-red-50 text-red-600 font-black rounded-xl text-sm hover:bg-red-100 transition-colors">Rechazar</button>
                    <button onClick={() => handleVerification(store.id, 'verified')} className="flex-1 sm:flex-none px-6 py-3 bg-blue-500 text-white font-black rounded-xl text-sm shadow-lg hover:bg-blue-600 transition-colors">Aprobar Placa</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {["directorio", "finanzas", "mantenimiento"].includes(activeTab) && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-gray-900">
                  {activeTab === "directorio" && "Directorio de Franquicias"}
                  {activeTab === "finanzas" && "Panel de Cobranza y Comisiones"}
                  {activeTab === "mantenimiento" && "Auditoría e Inactividad"}
                </h2>
                
                {activeTab === "finanzas" && (
                  <div className="flex items-center gap-4 ml-4">
                    <button onClick={exportToCSV} className="bg-green-100 text-green-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2">
                      📥 Excel
                    </button>
                    <button 
                      onClick={toggleGlobalCommission} 
                      className={`flex items-center gap-2 text-xs font-black px-4 py-2 rounded-lg transition-colors border ${
                        isCommissionActive 
                          ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                          : "bg-gray-900 text-white border-gray-900 hover:bg-black"
                      }`}
                    >
                      {isCommissionActive ? "🛑 Apagar Cobros" : "⚡ Encender Cobros"}
                    </button>
                  </div>
                )}
              </div>
              <div className="relative w-full sm:w-72">
                <input type="text" placeholder="Buscar tienda..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:bg-white focus:border-pink-500 text-sm font-medium" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                    <th className="p-4 pl-6">Tienda</th>
                    
                    {activeTab === "directorio" && (
                      <>
                        <th className="p-4 cursor-pointer hover:text-pink-500" onClick={() => handleSort('ventas_consolidadas')}>
                          Métricas {sortConfig.key === 'ventas_consolidadas' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-4">Seguridad / País</th>
                        <th className="p-4 pr-6 text-right">Kill Switch</th>
                      </>
                    )}

                    {activeTab === "finanzas" && (
                      <>
                        <th className="p-4 cursor-pointer hover:text-pink-500" onClick={() => handleSort('ventas_consolidadas')}>
                          Ventas (Éxitos) {sortConfig.key === 'ventas_consolidadas' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-4">Tasa de Comisión</th>
                        <th className="p-4 pr-6 text-right cursor-pointer hover:text-pink-500" onClick={() => handleSort('deuda_comision')}>
                          Bolsa de Deuda {sortConfig.key === 'deuda_comision' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                      </>
                    )}

                    {activeTab === "mantenimiento" && (
                      <>
                        <th className="p-4">Última Conexión</th>
                        <th className="p-4 cursor-pointer hover:text-pink-500" onClick={() => handleSort('inactiveDays')}>
                          Días Inactiva {sortConfig.key === 'inactiveDays' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-4 pr-6 text-right text-red-500">☢️ Acción Destructiva</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-bold animate-pulse">Cargando base de datos...</td></tr>
                  ) : processedStores.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-400">No se encontraron coincidencias.</td></tr>
                  ) : (
                    processedStores.map(store => {
                      const isActive = store.isActive !== false;
                      const isSuspicious = store.pais_registro && store.pais_operacion && store.pais_registro !== store.pais_operacion;
                      const inactiveDays = getDaysInactive(store.last_login);
                      
                      return (
                        <tr key={store.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900">{store.nombre || "Sin nombre"}</p>
                              {store.verification?.status === "verified" && <span className="text-blue-500 text-xs" title="Tienda Verificada">🛡️</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">{store.ownerEmail}</p>
                            <a href={`/${store.id}`} target="_blank" rel="noreferrer" className="text-pink-500 hover:underline font-bold text-[10px] uppercase tracking-wider mt-1 block">
                              Ver Tienda ↗
                            </a>
                          </td>

                          {activeTab === "directorio" && (
                            <>
                              <td className="p-4">
                                <div className="flex gap-3">
                                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg font-bold">📦 {store.total_productos || 0} Prod.</span>
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-lg font-bold">📈 {store.ventas_consolidadas || 0} Ventas</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="text-xs">
                                    <p className="text-gray-800">C: {store.pais_registro || "Desconocido"}</p>
                                    <p className="text-gray-500">A: {store.pais_operacion || "Desconocido"}</p>
                                  </div>
                                  {isSuspicious && <span className="text-xl" title="Alerta: Registrada en un país, operando desde otro">🚩</span>}
                                </div>
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <button onClick={() => toggleStoreStatus(store.id, isActive)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                              </td>
                            </>
                          )}

                          {activeTab === "finanzas" && (
                            <>
                              <td className="p-4 font-bold text-gray-600">{store.ventas_consolidadas || 0} ventas</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    defaultValue={store.comision_porcentaje || 5} 
                                    onBlur={(e) => updateCommission(store.id, e.target.value)}
                                    className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none focus:border-pink-300"
                                  />
                                  <span className="text-gray-500 font-bold">%</span>
                                </div>
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <span className={`font-black text-lg ${store.deuda_comision > 0 ? "text-red-500" : "text-gray-400"}`}>
                                    ${(store.deuda_comision || 0).toFixed(2)}
                                  </span>
                                  {store.deuda_comision > 0 && (
                                    <button onClick={() => resetDebt(store.id)} className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors">
                                      Saldar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}

                          {activeTab === "mantenimiento" && (
                            <>
                              <td className="p-4 text-xs text-gray-500 font-medium">
                                {store.last_login?.toDate ? store.last_login.toDate().toLocaleDateString() : "Sin registro"}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${inactiveDays > 30 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                                  {inactiveDays} días
                                </span>
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <button onClick={() => deleteStoreCompletely(store.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-red-500 hover:text-white transition-colors border border-red-200 uppercase tracking-widest">
                                  ☢️ Eliminar Todo
                                </button>
                              </td>
                            </>
                          )}

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}