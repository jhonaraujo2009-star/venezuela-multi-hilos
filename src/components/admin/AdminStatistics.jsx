import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useApp } from "../../context/AppContext";

export default function AdminStatistics() {
  const { storeData, bsPrice } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🌟 LÓGICA INTACTA: Escuchamos los productos de la base de datos
  useEffect(() => {
    if (!storeData?.id) return;
    const q = query(collection(db, "products"), where("storeId", "==", storeData.id));
    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prods);
      setLoading(false);
    });
    return () => unsub();
  }, [storeData?.id]);

  // Función para calcular stock
  const getStock = (p) => {
    if (p.variants && p.variants.length > 0) {
      return p.variants.reduce((acc, v) => acc + Number(v.stock || 0), 0);
    }
    return Number(p.totalStock || 0);
  };

  // Función para ingresos de un producto
  const getProductRevenue = (p) => Number(p.price || 0) * Number(p.salesCount || 0);

  // 💰 CÁLCULOS FINANCIEROS MAESTROS
  const totalRevenue = products.reduce((acc, p) => acc + getProductRevenue(p), 0);
  const totalSoldItems = products.reduce((acc, p) => acc + Number(p.salesCount || 0), 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (Number(p.price || 0) * getStock(p)), 0);

  // 🥇 1. CÁLCULO DEL PODIO (Top 3 Productos Estrella)
  const topProducts = [...products]
    .filter(p => getProductRevenue(p) > 0)
    .sort((a, b) => getProductRevenue(b) - getProductRevenue(a))
    .slice(0, 3);

  const maxRevenue = topProducts[0] ? getProductRevenue(topProducts[0]) : 1;

  // 🚨 2. CÁLCULO DE CAPITAL ESTANCADO (Dead Stock)
  const deadStockProducts = products.filter(p => Number(p.salesCount || 0) === 0 && getStock(p) > 0);
  const deadStockValue = deadStockProducts.reduce((acc, p) => acc + (Number(p.price || 0) * getStock(p)), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse opacity-60">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold tracking-widest uppercase text-gray-400">Analizando finanzas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <span>📊</span> Centro de Inteligencia
        </h2>
        <span className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md">
          Reporte en Tiempo Real
        </span>
      </div>

      {/* 🌟 KPIs FINANCIEROS (Tarjetas principales) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2rem] p-7 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute -bottom-4 -right-4 p-4 opacity-10 text-8xl group-hover:scale-110 transition-transform">💰</div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Ingreso Bruto</p>
          <h3 className="text-4xl font-black mb-1 tracking-tighter">${totalRevenue.toLocaleString()}</h3>
          <p className="text-xs font-medium text-gray-400">Bs. {bsPrice(totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-[2rem] p-7 text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-pink-500"></div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pink-500 mb-2">Unidades Vendidas</p>
          <h3 className="text-4xl font-black mb-1 tracking-tighter">{totalSoldItems} <span className="text-lg text-gray-400 font-bold">unds</span></h3>
          <p className="text-xs font-semibold text-gray-500 mt-2">Productos despachados</p>
        </div>

        <div className="bg-white rounded-[2rem] p-7 text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500"></div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-2">Valor en Inventario</p>
          <h3 className="text-4xl font-black mb-1 tracking-tighter">${totalInventoryValue.toLocaleString()}</h3>
          <p className="text-xs font-semibold text-gray-500 mt-2">Capital en mercancía actual</p>
        </div>
      </div>

      {/* 🚨 DETECTOR DE CAPITAL ESTANCADO (Alerta Inteligente) */}
      {deadStockProducts.length > 0 && (
        <div className="bg-orange-50/80 border border-orange-200 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
          <div className="flex items-center gap-4 pl-2">
            <span className="text-3xl animate-bounce">🚨</span>
            <div>
              <h4 className="text-orange-900 font-black text-sm uppercase tracking-widest mb-1">Capital Estancado Detectado</h4>
              <p className="text-orange-700 text-sm font-medium">
                Tienes <strong className="text-orange-900">${deadStockValue.toLocaleString()}</strong> inmovilizados en {deadStockProducts.length} producto(s) sin ventas.
              </p>
            </div>
          </div>
          <button className="whitespace-nowrap bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-full shadow-lg active:scale-95 transition-all">
            Crear Oferta Flash
          </button>
        </div>
      )}

      {/* 🥇 PODIO ESTRELLA (Top 3) */}
      {topProducts.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 ml-2">🏆 Tus Productos Estrella (Top 3)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topProducts.map((p, index) => {
              const rev = getProductRevenue(p);
              const percent = totalRevenue > 0 ? ((rev / totalRevenue) * 100).toFixed(1) : 0;
              const medals = ["🥇", "🥈", "🥉"];
              
              return (
                <div key={p.id} className="bg-white rounded-[2rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute -right-2 -top-2 text-5xl opacity-10 group-hover:scale-125 transition-transform duration-500">
                    {medals[index]}
                  </div>
                  <img src={p.images?.[0] || p.image} className="w-16 h-16 rounded-2xl object-cover shadow-sm z-10" alt="" />
                  <div className="z-10 flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Top {index + 1}</p>
                    <p className="text-sm font-black text-gray-900 line-clamp-1 leading-tight mb-1">{p.name}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-lg font-black text-gray-900 leading-none">${rev.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-green-500 mb-0.5 bg-green-50 px-1.5 py-0.5 rounded-md">
                        {percent}% del total
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 📊 TABLA PREMIUM CON MINI-GRÁFICOS DE BARRAS */}
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Inventario y Rendimiento</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">
                <th className="p-5 pl-7 font-semibold">Producto</th>
                <th className="p-5 font-semibold text-center">Stock</th>
                <th className="p-5 font-semibold text-center">Vendidos</th>
                <th className="p-5 pr-7 font-semibold text-right w-48">Ingreso (Gráfico)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => {
                const stock = getStock(p);
                const sold = Number(p.salesCount || 0);
                const isLowStock = stock <= 5 && stock > 0;
                const isOut = stock === 0;
                const productRevenue = getProductRevenue(p);
                
                // Cálculo para el Mini-Gráfico de barra
                const barWidth = maxRevenue > 0 ? (productRevenue / maxRevenue) * 100 : 0;

                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 pl-7">
                      <div className="flex items-center gap-4">
                        <img 
                          src={p.images?.[0] || p.image || "https://via.placeholder.com/40"} 
                          className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm group-hover:scale-110 transition-transform" 
                          alt="" 
                        />
                        <div>
                          <p className="text-sm font-black text-gray-900 line-clamp-1">{p.name}</p>
                          <p className="text-[11px] font-bold text-gray-400 mt-0.5">${p.price}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase
                        ${isOut ? "bg-red-50 text-red-600" : 
                          isLowStock ? "bg-orange-50 text-orange-600 animate-pulse" : 
                          "bg-gray-50 text-gray-600"}
                      `}>
                        {stock} {isLowStock && "⚠️"}
                      </span>
                    </td>
                    
                    <td className="p-4 text-center">
                      <span className="text-sm font-black text-gray-900">{sold}</span>
                    </td>
                    
                    <td className="p-4 pr-7 align-middle">
                      <div className="flex flex-col items-end w-full">
                        <span className="text-sm font-black text-gray-900 mb-1">${productRevenue.toLocaleString()}</span>
                        {/* 🌟 MINI GRÁFICO DE BARRA */}
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex justify-end">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${barWidth}%`, 
                              background: barWidth > 0 ? "linear-gradient(90deg, #ec4899, #000)" : "transparent" 
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}