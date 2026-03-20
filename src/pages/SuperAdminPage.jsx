import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase"; 
import { onAuthStateChanged } from "firebase/auth"; 
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function SuperAdminPage() {
  const [stores, setStores] = useState([]);
  const [adminStoreId, setAdminStoreId] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // 🌟 Iniciamos en el nuevo Dashboard
  
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [megaphoneMsg, setMegaphoneMsg] = useState("");
  
  // 🌟 ESTADO DE LA LLAVE MAESTRA
  const [isCommissionActive, setIsCommissionActive] = useState(false);

  // 🌟 ESTADOS PARA EL BRANDING GLOBAL MATRIZ Y PIXEL
  const [globalCompanyName, setGlobalCompanyName] = useState("");
  const [globalCompanyLogo, setGlobalCompanyLogo] = useState("");
  const [facebookPixel, setFacebookPixel] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // 🌟 SECCIONES DEL HOMEPAGE
  const [homepageSections, setHomepageSections] = useState({
    topStores: true,
    randomProducts: true,
    bestSellers: true,
    offers: true,
    dailyTop: true
  });
  
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

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          setIsCommissionActive(snap.data().isCommissionActive || false);
          // 🌟 LEEMOS EL BRANDING MATRIZ DE LA BASE DE DATOS
          setGlobalCompanyName(snap.data().companyName || "");
          setGlobalCompanyLogo(snap.data().companyLogo || "");
          setFacebookPixel(snap.data().facebookPixel || "");
          if (snap.data().homepageSections) setHomepageSections(snap.data().homepageSections);
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
      const storesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storesList);
      // Buscar el storeId que pertenece al Super Admin
      const myStore = storesList.find(s => s.ownerEmail === MASTER_EMAIL);
      if (myStore) setAdminStoreId(myStore.id);
    } catch (error) {
      toast.error("Error al cargar la base de datos de tiendas.");
    } finally {
      setLoading(false);
    }
  };

  const toggleGlobalCommission = async () => {
    const newValue = !isCommissionActive;
    if (!window.confirm(`¿Seguro que quieres ${newValue ? 'ACTIVAR' : 'APAGAR'} el cobro de comisiones global?`)) return;
    try {
      setIsCommissionActive(newValue);
      await setDoc(doc(db, "settings", "global"), { isCommissionActive: newValue }, { merge: true });
      toast.success(`Comisiones ${newValue ? 'ACTIVADAS 💸' : 'APAGADAS 🛑'}`);
    } catch (error) {
      toast.error("Error al cambiar la configuración");
      setIsCommissionActive(!newValue);
    }
  };

  // 🌟 FUNCIÓN PARA GUARDAR EL NOMBRE DE LA EMPRESA MATRIZ Y PIXEL
  const saveGlobalBranding = async () => {
    try {
      await setDoc(doc(db, "settings", "global"), { 
        companyName: globalCompanyName,
        facebookPixel: facebookPixel 
      }, { merge: true });
      toast.success("Configuraciones Guardadas ✅");
    } catch (error) {
      toast.error("Error al guardar configuraciones.");
    }
  };

  const toggleSection = async (sectionKey) => {
    const updatedSections = { ...homepageSections, [sectionKey]: !homepageSections[sectionKey] };
    setHomepageSections(updatedSections);
    try {
      await setDoc(doc(db, "settings", "global"), { homepageSections: updatedSections }, { merge: true });
      toast.success("Vista actualizada en vivo 👁️");
    } catch (e) {
      toast.error("Error al actualizar la sección");
      setHomepageSections(homepageSections); // reverts if error
    }
  };

  // 🌟 FUNCIÓN PARA SUBIR LOGO A CLOUDINARY
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "tienda_maquillaje"); 
      const res = await fetch("https://api.cloudinary.com/v1_1/dp3abweme/image/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error en la subida");
      const data = await res.json();
      
      const newLogoUrl = data.secure_url;
      setGlobalCompanyLogo(newLogoUrl);
      await setDoc(doc(db, "settings", "global"), { companyLogo: newLogoUrl }, { merge: true });
      toast.success("Logo de la Empresa actualizado 👑");
    } catch (error) {
      toast.error("Error al subir el logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  // 🌟 FUNCIÓN PARA BORRAR EL LOGO
  const removeGlobalLogo = async () => {
    if(!window.confirm("¿Deseas volver a usar solo el texto enchapado en oro?")) return;
    try {
      setGlobalCompanyLogo("");
      await setDoc(doc(db, "settings", "global"), { companyLogo: "" }, { merge: true });
      toast.success("Logo eliminado");
    } catch (error) {
      toast.error("Error al eliminar logo");
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
      toast.error("Hubo un problema al cambiar el estado.");
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
    const rows = stores.map(s => `"${s.id}","${s.nombre || 'Sin nombre'}","${s.ownerEmail || ''}",${s.ventas_consolidadas || 0},${s.comision_porcentaje || 5},${s.deuda_comision || 0},${s.isActive !== false ? 'Activa' : 'Inhabilitada'}`);
    
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
    if (!window.confirm(`⚠️ ADVERTENCIA NUCLEAR ⚠️\n\nEstás a punto de borrar la tienda '${storeId}' y TODOS sus datos (productos, pedidos, sesiones, etc.).\n\n¿Estás 100% seguro? Esta acción NO se puede deshacer.`)) return;

    const toastId = toast.loading(`Iniciando destrucción de la tienda ${storeId}...`);

    try {
      const collectionsToClean = ["products", "orders", "sessions", "payments"];
      for(const col of collectionsToClean) {
        const q = query(collection(db, col), where("storeId", "==", storeId));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
      }

      await deleteDoc(doc(db, "stores", storeId));
      setStores(stores.filter(store => store.id !== storeId));
      
      toast.success("Tienda eliminada de la Base de Datos ☢️", { id: toastId, duration: 6000 });
    } catch (error) {
      console.error("Error al borrar tienda:", error);
      toast.error("Hubo un error al intentar borrar la base de datos de la tienda.", { id: toastId });
    }
  };

  const getDaysInactive = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime();
    return Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Métricas Globales
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
      
      {/* HEADER SUPER ADMIN */}
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
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="hidden sm:flex items-center gap-2 text-xs font-black bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors tracking-widest uppercase border border-white/10"
              title="Ir a la página principal MegaStore"
            >
              <span>🏪</span> Catálogo Principal
            </button>
            
            <button 
              onClick={() => adminStoreId ? navigate(`/${adminStoreId}/admin`) : toast.error("No se encontró tu tienda. Verifica que tu email esté registrado como dueño.")}
              className="hidden sm:flex items-center gap-2 text-xs font-black bg-pink-500/20 hover:bg-pink-500/40 text-pink-400 px-4 py-2 rounded-xl transition-colors tracking-widest uppercase border border-pink-500/30"
              title={adminStoreId ? `Ir a /${adminStoreId}/admin` : "Buscando tu tienda..."}
            >
              <span>🛍️</span> {adminStoreId ? `Mi Tienda (${adminStoreId})` : "Mi Panel Admin"}
            </button>

            <button onClick={() => navigate('/')} className="text-sm font-bold text-gray-400 hover:text-white transition-colors ml-2">
              Salir →
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex overflow-x-auto gap-2 mb-8 hide-scrollbar">
          {[
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "secciones", icon: "🧩", label: "Tiendas/Secciones" },
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

        {/* 🌟 PESTAÑA 1: DASHBOARD (NUEVA ZONA DE BRANDING Y PIXEL) */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* BRANDING MATRIZ */}
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm mb-8">
              <h2 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2"><span>✨</span> Branding de Empresa Matriz</h2>
              <p className="text-sm text-gray-500 mb-6">Este nombre o logo aparecerá en la barra superior de TODAS las tiendas (Header).</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Texto Enchapado y Pixel */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nombre de la Empresa</label>
                    <input 
                      type="text" 
                      value={globalCompanyName} 
                      onChange={(e) => setGlobalCompanyName(e.target.value)}
                      placeholder="Ej: GLOBAL MARKET CORP"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-yellow-500 focus:bg-white text-sm font-bold text-gray-900" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <span className="text-blue-500 text-lg">📈</span> ID Pixel de Facebook (Opcional)
                    </label>
                    <input 
                      type="text" 
                      value={facebookPixel} 
                      onChange={(e) => setFacebookPixel(e.target.value)}
                      placeholder="Ej: 123456789012345"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:bg-white text-sm font-bold text-gray-900" 
                    />
                  </div>
                  
                  <button onClick={saveGlobalBranding} className="w-full bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-black transition-colors mt-2">Guardar Configuraciones</button>
                  <p className="text-[10px] text-gray-400">Si no subes un logo, este texto se mostrará con un <span className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-transparent bg-clip-text font-black">Efecto de Enchapado en Oro</span>.</p>
                </div>

                {/* Logo Opcional */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Logo Oficial (Opcional)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                      {globalCompanyLogo ? (
                        <img src={globalCompanyLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-2xl opacity-20">🖼️</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors inline-block mb-2">
                        {uploadingLogo ? "Subiendo..." : "Subir Logo PNG/JPG"}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                      </label>
                      {globalCompanyLogo && (
                        <button onClick={removeGlobalLogo} className="block text-xs font-bold text-red-500 hover:underline">Quitar logo y usar texto</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TARJETAS KPI (ESTADÍSTICAS GLOBALES) */}
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
          </div>
        )}

        {/* 🌟 PESTAÑA: SECCIONES / HOMEPAGE */}
        {activeTab === "secciones" && (
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm max-w-4xl mx-auto">
             <div className="text-center mb-8">
                <span className="text-5xl block mb-4">🧩</span>
                <h2 className="text-2xl font-black text-gray-900">Módulos de la Página Principal</h2>
                <p className="text-gray-500 text-sm mt-2">Enciende o apaga las secciones que quieres mostrar a los clientes al entrar a la web.</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'randomProducts', title: 'Productos Aleatorios', desc: 'Muestra productos al azar independientemente de si la tienda está verificada o no.', icon: '🎲' },
                  { key: 'bestSellers', title: 'Los Más Vendidos', desc: 'Top de productos con más ventas globales.', icon: '🔥' },
                  { key: 'offers', title: 'Ofertas Destacadas', desc: 'Sugerencias de promociones y descuentos rápidos.', icon: '⚡' },
                  { key: 'dailyTop', title: 'Tendencias del Día', desc: 'Los artículos que son tendencia hoy.', icon: '📈' },
                  { key: 'topStores', title: 'Tiendas Oficiales', desc: 'Muestra las tiendas verificadas en la cabecera.', icon: '🏪' }
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between p-5 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow bg-gray-50/50">
                     <div className="flex items-center gap-4">
                        <div className="text-2xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">{s.icon}</div>
                        <div>
                           <h3 className="font-bold text-gray-900">{s.title}</h3>
                           <p className="text-[11px] text-gray-500 leading-tight mt-1">{s.desc}</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => toggleSection(s.key)}
                       className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${homepageSections[s.key] ? 'bg-green-500' : 'bg-gray-300'}`}
                     >
                       <span className={`inline-block h-5 w-5 bg-white rounded-full transition-transform shadow-sm transform ${homepageSections[s.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                     </button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* PESTAÑA: MEGÁFONO */}
        {activeTab === "megafono" && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-6xl block mb-4">📢</span>
              <h2 className="text-2xl font-black text-gray-900">Aviso del Sistema</h2>
              <p className="text-gray-500 text-sm mt-2">Escribe un mensaje aquí y aparecerá como alerta roja en el panel de administrador de TODAS las tiendas.</p>
            </div>
            <textarea 
              rows="4" 
              value={megaphoneMsg} 
              onChange={(e) => setMegaphoneMsg(e.target.value)}
              placeholder="Ej: Mantenimiento del servidor a las 3:00 AM..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-medium outline-none focus:border-pink-500 focus:bg-white transition-all resize-none mb-4"
            ></textarea>
            <button 
              onClick={broadcastMessage} 
              className="w-full bg-gray-900 hover:bg-pink-600 text-white font-black py-4 rounded-2xl transition-colors shadow-lg uppercase tracking-widest text-sm"
            >
              Transmitir a todas las tiendas
            </button>
          </div>
        )}

        {/* PESTAÑA: VERIFICACIÓN */}
        {activeTab === "verificacion" && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-gray-900 mb-4">Solicitudes de Verificación</h2>
            {pendingVerificationStores.length === 0 ? (
              <div className="bg-white rounded-[2rem] shadow-sm p-10 text-center border border-gray-100">
                <span className="text-5xl block mb-4">🛡️</span>
                <p className="text-gray-500 font-bold">No hay solicitudes pendientes en este momento.</p>
              </div>
            ) : (
              pendingVerificationStores.map(store => (
                <div key={store.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{store.nombre}</h3>
                    <p className="text-xs text-gray-500 mb-3">Solicitante: {store.ownerEmail}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => handleVerification(store.id, 'none')} className="px-6 py-3 bg-red-50 text-red-600 font-black rounded-xl text-sm hover:bg-red-100 transition-colors">Rechazar</button>
                    <button onClick={() => handleVerification(store.id, 'verified')} className="px-6 py-3 bg-blue-500 text-white font-black rounded-xl text-sm hover:bg-blue-600 transition-colors shadow-md">Aprobar Verificación</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TABLAS DE DATOS: DIRECTORIO, FINANZAS Y MANTENIMIENTO */}
        {["directorio", "finanzas", "mantenimiento"].includes(activeTab) && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mt-6">
            
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-gray-900">
                  {activeTab === "directorio" && "Directorio de Franquicias"}
                  {activeTab === "finanzas" && "Panel de Cobranza y Comisiones"}
                  {activeTab === "mantenimiento" && "Auditoría e Inactividad"}
                </h2>
                
                {/* Botones Especiales para Finanzas */}
                {activeTab === "finanzas" && (
                  <div className="flex items-center gap-4 ml-4">
                    <button onClick={exportToCSV} className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                      📥 Descargar Excel
                    </button>
                    <button onClick={toggleGlobalCommission} className={`text-xs font-black px-4 py-2 rounded-lg border transition-colors ${isCommissionActive ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-gray-900 text-white hover:bg-black"}`}>
                      {isCommissionActive ? "🛑 Apagar Cobros Globales" : "⚡ Encender Cobros Globales"}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="relative w-full sm:w-72">
                <input 
                  type="text" 
                  placeholder="Buscar por ID, nombre o email..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:bg-white focus:border-pink-300 transition-all text-sm font-medium" 
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">🔍</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                    <th className="p-4 pl-6 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => handleSort('id')}>
                      Tienda e ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    
                    {activeTab === "directorio" && (
                      <>
                        <th className="p-4 cursor-pointer hover:text-gray-900" onClick={() => handleSort('total_productos')}>
                          Métricas {sortConfig.key === 'total_productos' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-4">Estado (Activar/Apagar)</th>
                      </>
                    )}

                    {activeTab === "finanzas" && (
                      <>
                        <th className="p-4 cursor-pointer hover:text-gray-900" onClick={() => handleSort('ventas_consolidadas')}>
                          Total Ventas {sortConfig.key === 'ventas_consolidadas' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-4">Tasa Comisión (%)</th>
                        <th className="p-4 pr-6 text-right cursor-pointer hover:text-gray-900" onClick={() => handleSort('deuda_comision')}>
                          Deuda Pendiente {sortConfig.key === 'deuda_comision' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                      </>
                    )}

                    {activeTab === "mantenimiento" && (
                      <>
                        <th className="p-4 cursor-pointer hover:text-gray-900" onClick={() => handleSort('last_login')}>
                          Última Conexión {sortConfig.key === 'last_login' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-4 cursor-pointer hover:text-gray-900" onClick={() => handleSort('inactiveDays')}>
                          Inactividad {sortConfig.key === 'inactiveDays' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-4 pr-6 text-right">Acción Destructiva</th>
                      </>
                    )}
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-400 font-bold animate-pulse">
                        Cargando base de datos del sistema...
                      </td>
                    </tr>
                  ) : processedStores.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-400">
                        No se encontraron tiendas con esos datos.
                      </td>
                    </tr>
                  ) : (
                    processedStores.map(store => {
                      const isActive = store.isActive !== false;
                      const inactiveDays = getDaysInactive(store.last_login);
                      
                      return (
                        <tr key={store.id} className={`hover:bg-gray-50/50 transition-colors ${!isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                          
                          {/* Columna 1 (COMÚN PARA TODAS LAS PESTAÑAS) */}
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 uppercase">
                                {store.nombre ? store.nombre.substring(0,2) : "ID"}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 flex items-center gap-2">
                                  {store.nombre || "Sin nombre configurado"}
                                  {store.verification?.status === 'verified' && <span title="Verificada">✅</span>}
                                </p>
                                <p className="text-[10px] text-gray-400 flex items-center gap-2">
                                  <span>ID: {store.id}</span>
                                  <span>•</span>
                                  <span>{store.ownerEmail}</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Columnas DIRECTORIO */}
                          {activeTab === "directorio" && (
                            <>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                                    📦 {store.total_productos || 0} Prod.
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <button 
                                  onClick={() => toggleStoreStatus(store.id, isActive)} 
                                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-red-500'}`}
                                >
                                  <span className={`inline-block h-5 w-5 bg-white rounded-full transition-transform shadow-sm ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                              </td>
                            </>
                          )}

                          {/* Columnas FINANZAS */}
                          {activeTab === "finanzas" && (
                            <>
                              <td className="p-4 font-bold text-gray-700">
                                {store.ventas_consolidadas || 0} ventas
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    defaultValue={store.comision_porcentaje || 5} 
                                    onBlur={(e) => updateCommission(store.id, e.target.value)} 
                                    className="w-16 border border-gray-200 bg-gray-50 rounded-lg px-2 py-1 text-center font-bold outline-none focus:border-pink-300" 
                                  /> 
                                  <span className="text-gray-400 font-bold">%</span>
                                </div>
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <span className={`font-black text-lg ${store.deuda_comision > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    ${(store.deuda_comision || 0).toFixed(2)}
                                  </span>
                                  {store.deuda_comision > 0 && (
                                    <button onClick={() => resetDebt(store.id)} className="text-[10px] font-bold bg-green-50 text-green-600 hover:bg-green-100 px-2 py-1 rounded-lg border border-green-200 uppercase tracking-widest transition-colors">
                                      Saldar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}

                          {/* Columnas MANTENIMIENTO */}
                          {activeTab === "mantenimiento" && (
                            <>
                              <td className="p-4 text-xs text-gray-500 font-medium">
                                {store.last_login?.toDate ? store.last_login.toDate().toLocaleDateString() : "Sin registro"}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${inactiveDays > 30 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                                  {inactiveDays === "N/A" ? "N/A" : `${inactiveDays} días`}
                                </span>
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <button 
                                  onClick={() => deleteStoreCompletely(store.id)} 
                                  className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-red-500 hover:text-white transition-colors border border-red-200 uppercase tracking-widest"
                                >
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