import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase"; // 🌟 Importamos 'auth' para la seguridad
import { onAuthStateChanged } from "firebase/auth"; // 🌟 El vigilante de sesiones
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function SuperAdminPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false); // 🌟 Estado de seguridad
  const navigate = useNavigate();

  // 👑 EL CORREO MAESTRO (Cámbialo por el tuyo) 👑
  const MASTER_EMAIL = "aea@gmail.com"; 

  // 🌟 VIGILANTE DE SEGURIDAD MÁXIMA 🌟
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Verificamos si hay alguien logueado Y si su correo es el tuyo
      if (user && user.email === MASTER_EMAIL) {
        setIsAuthorized(true);
        fetchAllStores(); // Solo cargamos los datos si es el jefe
      } else {
        // Si es un impostor, lo expulsamos sin piedad
        toast.error("Acceso denegado. Nivel de seguridad insuficiente. 🛑");
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

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

  const toggleStoreStatus = async (storeId, currentStatus) => {
    const confirmMessage = currentStatus 
      ? `¿Estás seguro de INHABILITAR la tienda '${storeId}'? Sus productos no se verán y su página dejará de funcionar.`
      : `¿Quieres VOLVER A ACTIVAR la tienda '${storeId}'?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const storeRef = doc(db, "stores", storeId);
      await updateDoc(storeRef, {
        isActive: !currentStatus
      });
      
      setStores(stores.map(store => 
        store.id === storeId ? { ...store, isActive: !currentStatus } : store
      ));
      
      toast.success(currentStatus ? "Tienda inhabilitada." : "Tienda reactivada con éxito.");
    } catch (error) {
      console.error("Error actualizando estado:", error);
      toast.error("Hubo un problema al cambiar el estado de la tienda.");
    }
  };

  const filteredStores = stores.filter(store => 
    store.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (store.nombre && store.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (store.ownerEmail && store.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeStoresCount = stores.filter(s => s.isActive !== false).length;

  // 🌟 Mientras verifica tu identidad, mostramos una pantalla de carga segura
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">🏪</div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Tiendas</p>
              <p className="text-3xl font-black text-gray-900">{stores.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl">✅</div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tiendas Activas</p>
              <p className="text-3xl font-black text-gray-900">{activeStoresCount}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-2xl">🛑</div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Inhabilitadas</p>
              <p className="text-3xl font-black text-gray-900">{stores.length - activeStoresCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Directorio de Franquicias</h2>
              <p className="text-gray-500 text-sm mt-1">Administra y modera todas las tiendas de la plataforma.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="Buscar por nombre, enlace o correo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:bg-white focus:border-pink-500 transition-all text-sm font-medium"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-bold">
                  <th className="p-4 pl-8">Tienda / Enlace</th>
                  <th className="p-4">Dueño (Correo)</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 pr-8 text-right">Acción (Kill Switch)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-bold animate-pulse">Cargando datos del imperio...</td></tr>
                ) : filteredStores.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">No se encontraron tiendas.</td></tr>
                ) : (
                  filteredStores.map(store => {
                    const isActive = store.isActive !== false; 
                    return (
                      <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 pl-8">
                          <p className="font-bold text-gray-900">{store.nombre || "Sin nombre"}</p>
                          <a href={`/${store.id}`} target="_blank" rel="noreferrer" className="text-pink-500 hover:underline font-medium text-xs flex items-center gap-1 mt-0.5">
                            megastore.com/{store.id} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        </td>
                        <td className="p-4 text-gray-600 font-medium">{store.ownerEmail || "Desconocido"}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {isActive ? 'Activa' : 'Inhabilitada'}
                          </span>
                        </td>
                        <td className="p-4 pr-8 text-right">
                          <button 
                            onClick={() => toggleStoreStatus(store.id, isActive)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-red-500'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}