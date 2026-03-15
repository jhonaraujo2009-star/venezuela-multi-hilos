import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";

export default function AdminPOS() {
  const { storeData, bsPrice, settings } = useApp();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados del POS
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [discountType, setDiscountType] = useState("null"); // "null", "amount", "percentage"
  const [discountValue, setDiscountValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  
  // UI States
  const [isCartOpen, setIsCartOpen] = useState(false); // Para móviles
  const [selectedProduct, setSelectedProduct] = useState(null); // Para modal de variantes
  const [processing, setProcessing] = useState(false);

  // 1. Cargar productos de la tienda actual
  useEffect(() => {
    if (!storeData?.id) return;
    const q = query(collection(db, "products"), where("storeId", "==", storeData.id));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [storeData?.id]);

  // Filtrado
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Cálculos del Carrito
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let discountAmount = 0;
  if (discountType === "amount" && discountValue) {
    discountAmount = parseFloat(discountValue);
  } else if (discountType === "percentage" && discountValue) {
    discountAmount = subtotal * (parseFloat(discountValue) / 100);
  }
  
  const total = Math.max(0, subtotal - discountAmount);

  // Funciones de Carrito
  const handleProductClick = (product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product); // Abre modal
    } else {
      if ((product.totalStock || 0) <= 0) return toast.error("Sin stock disponible");
      addToCart(product, null);
    }
  };

  const addToCart = (product, variant) => {
    const stockAvailable = variant ? variant.stock : product.totalStock;
    if (stockAvailable <= 0) return toast.error("Sin stock suficiente en inventario");

    setCart(prev => {
      const existingKey = variant ? `${product.id}-${variant.id}` : product.id;
      const existingItemIndex = prev.findIndex(item => item.key === existingKey);
      
      if (existingItemIndex >= 0) {
        const currentQty = prev[existingItemIndex].quantity;
        if (currentQty >= stockAvailable) {
          toast.error("Alcanzaste el límite de stock de este producto.");
          return prev;
        }
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      }

      return [...prev, {
        key: existingKey,
        productId: product.id,
        name: product.name,
        image: product.image || product.images?.[0] || null,
        price: product.price,
        variant: variant || null,
        quantity: 1,
        maxStock: stockAvailable
      }];
    });
    
    if (selectedProduct) setSelectedProduct(null); // Cierra modal de variantes si estaba abierto
    toast.success("Agregado al ticket");
  };

  const updateQuantity = (key, delta) => {
    setCart(prev => prev.map(item => {
      if (item.key === key) {
        const newQ = item.quantity + delta;
        if (newQ > item.maxStock) {
          toast.error("Stock máximo superado");
          return item;
        }
        if (newQ < 1) return item; // Se elimina con otro botón
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (key) => {
    setCart(prev => prev.filter(item => item.key !== key));
  };


  // ==========================================
  // TRANSACCIÓN PRINCIPAL (EL CHECKOUT POS)
  // ==========================================
  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("El ticket está vacío");
    if (!storeData?.id) return toast.error("Error crítico de tienda");

    setProcessing(true);
    try {
      const batch = writeBatch(db);

      // 1. Crear la Orden (Pedido)
      const orderRef = doc(collection(db, "orders"));
      batch.set(orderRef, {
        storeId: storeData.id,
        customerName: customerName || "Cliente Mostrador",
        origin: "POS_Manual",
        status: "completed",
        items: cart,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        createdAt: serverTimestamp(),
      });

      // 2. Restar Inventario
      for (const item of cart) {
        const prodRef = doc(db, "products", item.productId);
        
        if (item.variant) {
          // Si tiene variante, leer la data del producto fresca o confiar en el estado, 
          // pero escribiendo un payload donde el array de variantes esté actualizado.
          // Para ser 100% seguros y limpios en Firestore con arrays complejos, lo mejor es actualizar el objeto dentro del array
          // Dado que Firestore no permite un `increment` fácil dentro de un array de objetos sin leerlo primero, 
          // usaremos la metadata de products local (que está up to date gracias a onSnapshot)
          const productInState = products.find(p => p.id === item.productId);
          if (productInState && productInState.variants) {
             const updatedVariants = productInState.variants.map(v => {
                if (v.id === item.variant.id) {
                   return { ...v, stock: Math.max(0, v.stock - item.quantity) };
                }
                return v;
             });
             batch.update(prodRef, { variants: updatedVariants });
          }
        } else {
          // Producto simple, restamos el stock natural
          batch.update(prodRef, { totalStock: increment(-item.quantity) });
        }
      }

      // 3. Comisiones y Ventas en la Tienda
      const commissionRate = storeData.comision_porcentaje || 5; 
      const commissionAmount = (total * commissionRate) / 100;
      const storeRef = doc(db, "stores", storeData.id);

      batch.update(storeRef, {
        ventas_consolidadas: increment(1),
        deuda_comision: increment(commissionAmount)
      });

      // Ejecutar todo el bloque mágico de Firebase de una sola vez
      await batch.commit();

      toast.success("¡Venta Registrada Exitosamente! 🎉");
      
      // Limpiar POS
      setCart([]);
      setCustomerName("");
      setDiscountValue("");
      setDiscountType("null");
      setIsCartOpen(false);

    } catch (e) {
      console.error(e);
      toast.error("Error al procesar la venta");
    } finally {
      setProcessing(false);
    }
  };

  const primaryColor = storeData?.primaryColor || settings?.primaryColor || "#000000";

  return (
    <div className="relative h-[calc(100vh-140px)] flex flex-col lg:flex-row bg-gray-50 border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
      
      {/* =======================
          COLUMNA IZQUIERDA: CATÁLOGO (70%)
          ======================= */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-white/80 backdrop-blur-md z-10 sticky top-0">
          <h2 className="text-xl font-black text-gray-900 hidden sm:block w-24">POS 🛒</h2>
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar para vender..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
             <div className="flex items-center justify-center p-10"><span className="animate-pulse text-gray-400 font-bold">Cargando inventario...</span></div>
          ) : filteredProducts.length === 0 ? (
             <div className="text-center p-10 text-gray-400">No se encontraron productos coincidentes.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-20 lg:pb-0">
              {filteredProducts.map(p => {
                const stock = p.variants?.length ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : (p.totalStock ?? 0);
                const isOut = stock <= 0;
                return (
                  <button 
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    disabled={isOut}
                    className={`text-left bg-white rounded-[1.5rem] border ${isOut ? 'border-red-100 opacity-60' : 'border-gray-100 hover:border-pink-200'} p-2 group active:scale-95 transition-all shadow-sm flex flex-col relative`}
                  >
                    <div className="w-full aspect-square rounded-2xl bg-gray-50 overflow-hidden mb-3 relative">
                      {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} /> : <div className="w-full h-full flex items-center justify-center text-gray-300">🖼️</div>}
                      {isOut && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex justify-center items-center"><span className="bg-red-500 text-white text-[10px] uppercase font-black px-2 py-1 rounded-full shadow-lg">Agotado</span></div>}
                      {p.variants?.length > 0 && !isOut && <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[9px] font-black uppercase px-2 py-1 rounded-full shadow-sm">Variantes</div>}
                    </div>
                    <div className="px-1 flex-1 flex flex-col">
                      <h3 className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight mb-1">{p.name}</h3>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-sm font-black" style={{ color: primaryColor }}>${p.price}</span>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">Stk: {stock}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botón Flotante para Móviles */}
        <div className="lg:hidden absolute bottom-4 left-4 right-4 z-20">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex justify-between items-center px-6 shadow-2xl active:scale-95 transition-transform border border-gray-700"
          >
            <span>Ver Ticket ({cart.length})</span>
            <span>${total.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* =======================
          COLUMNA DERECHA / DRAWER: TICKET (30%)
          ======================= */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-96 bg-gray-50 flex flex-col shadow-2xl transition-transform duration-300 lg:static lg:w-1/3 lg:translate-x-0 lg:border-l lg:border-gray-200 lg:shadow-none ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        {/* Cabecera del Ticket */}
        <div className="p-5 border-b border-gray-200 bg-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Ticket actual</h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase">{cart.length} Ítems seleccionados</p>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="lg:hidden w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold relative -right-2">✕</button>
        </div>

        {/* Lista del Ticket */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
               <span className="text-5xl mb-3">🧾</span>
               <p className="text-sm font-bold text-gray-500">El ticket de venta está vacío.<br/>Agrega productos del catálogo.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.key} className="bg-white p-3 rounded-2xl flex gap-3 shadow-sm border border-gray-100 group relative">
                <div className="w-14 h-14 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-xs">🖼️</span>}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                    {item.variant && <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 rounded uppercase">{item.variant.label}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                      <button onClick={() => updateQuantity(item.key, -1)} className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold hover:bg-white rounded-md transition-colors">-</button>
                      <span className="text-xs font-black min-w-[12px] text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.key, 1)} className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold hover:bg-white rounded-md transition-colors">+</button>
                    </div>
                  </div>
                </div>
                {/* Botón Borrar Absoluto en Hover */}
                <button onClick={() => removeFromCart(item.key)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-50 text-red-500 rounded-full text-[10px] font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-red-100 flex items-center justify-center">✕</button>
              </div>
            ))
          )}
        </div>

        {/* Zona de Cobro */}
        <div className="bg-white border-t border-gray-200 p-5 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] pb-8 pb:safe">
          
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Nombre del Cliente (Opcional)" 
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-gray-300 transition-colors"
            />
            
            <div className="flex gap-2">
              <select value={discountType} onChange={e => {setDiscountType(e.target.value); setDiscountValue("");}} className="bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-xs font-bold text-gray-500 outline-none w-2/5">
                <option value="null">Sin Descuento</option>
                <option value="amount">Dto. en $</option>
                <option value="percentage">Dto. en %</option>
              </select>
              {discountType !== "null" && (
                <input 
                  type="number" 
                  placeholder={discountType === "amount" ? "$ Monto" : "% Porcentaje"}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className="w-3/5 bg-gray-50 border border-red-100 rounded-xl px-3 py-2 text-xs font-bold text-red-500 outline-none focus:border-red-300"
                />
              )}
            </div>

            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-gray-300">
              <option value="Efectivo">💵 Efectivo / Divisas</option>
              <option value="Zelle">💎 Zelle</option>
              <option value="Pago Móvil">📱 Pago Móvil</option>
              <option value="Punto de Venta">💳 Punto de Venta / Débito</option>
            </select>
          </div>

          <div className="border-t border-dashed border-gray-200 mt-4 pt-4 mb-2 space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-gray-400"><span>Subtotal:</span> <span>${subtotal.toFixed(2)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-[11px] font-bold text-red-500"><span>Descuento:</span> <span>-${discountAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between items-end pt-2">
              <span className="text-xs font-black text-gray-900 uppercase">Total:</span>
              <div className="text-right">
                <span className="text-2xl font-black text-gray-900 leading-none block">${total.toFixed(2)}</span>
                <span className="text-[10px] font-bold text-gray-400">Bs. {bsPrice(total)}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={processing || cart.length === 0}
            className={`w-full py-4 rounded-xl text-white font-black uppercase tracking-[0.1em] text-xs transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${processing || cart.length === 0 ? "bg-gray-300 cursor-not-allowed shadow-none" : "bg-black hover:bg-gray-900"}`}
          >
            {processing ? <span className="animate-pulse">Procesando...</span> : "🧾 Registrar Venta"}
          </button>
        </div>
      </div>

      {/* =======================
          MODAL DE VARIANTES
          ======================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center pb:safe animate-in fade-in duration-200" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full text-gray-500 font-bold flex items-center justify-center">✕</button>
            
            <div className="flex gap-4 items-center mb-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                {selectedProduct.images?.[0] ? <img src={selectedProduct.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex justify-center items-center text-xl">🖼️</div>}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1 pr-6">{selectedProduct.name}</h3>
                <p className="text-xs font-black" style={{color: primaryColor}}>${selectedProduct.price}</p>
              </div>
            </div>

            <p className="text-[11px] font-black uppercase text-gray-400 mb-3 tracking-widest">Elige Variante:</p>
            <div className="flex flex-wrap gap-2 mb-6 max-h-40 overflow-y-auto">
              {selectedProduct.variants.map(v => {
                const isOut = v.stock <= 0;
                return (
                  <button 
                    key={v.id}
                    onClick={() => addToCart(selectedProduct, v)}
                    disabled={isOut}
                    className={`px-4 py-2 text-xs font-bold uppercase rounded-xl border-2 transition-all active:scale-95 ${isOut ? 'border-dashed border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed' : 'border-gray-200 text-gray-700 bg-white hover:border-black hover:text-black'}`}
                  >
                    {v.label} <span className="text-[9px] block text-gray-400 normal-case bg-transparent p-0">Stk: {v.stock}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
