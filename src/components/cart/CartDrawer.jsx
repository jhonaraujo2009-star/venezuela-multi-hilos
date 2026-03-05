import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useCart } from "../../context/CartContext";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, isOpen, setIsOpen, coupon, setCoupon, subtotal, discount, total, clearCart, createOrder } = useCart();
  const { settings, bsPrice } = useApp();
  
  const [couponCode, setCouponCode] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [step, setStep] = useState(1); // 1: Bolsa, 2: Checkout
  const [customer, setCustomer] = useState({ name: "", phone: "" });

  const freeShippingProgress = Math.min(100, (total / settings.freeShippingGoal) * 100);
  const remaining = Math.max(0, settings.freeShippingGoal - total);

  // Cargar métodos al abrir
  useEffect(() => {
    if (isOpen) {
      const loadPayments = async () => {
        const snap = await getDocs(collection(db, "payments"));
        setPaymentMethods(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      };
      loadPayments();
    } else {
      setStep(1); // Resetear al cerrar
    }
  }, [isOpen]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    try {
      const snap = await getDocs(query(collection(db, "coupons"), where("code", "==", couponCode.toUpperCase()), where("active", "==", true)));
      if (snap.empty) {
        toast.error("Cupón inválido o expirado");
      } else {
        const c = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setCoupon(c);
        toast.success(`¡Cupón ${c.code} aplicado! ✨`);
      }
    } finally {
      setCheckingCoupon(false);
    }
  };

  const sendOrder = async () => {
    if (!selectedPayment) return toast.error("Elige cómo vas a pagar");
    if (!customer.name || !customer.phone) return toast.error("Dinos tu nombre y teléfono");

    const targetPhone = selectedPayment.phone || settings.whatsappNumber;

    try {
      const orderData = { ...customer, paymentId: selectedPayment.id, total };
      await createOrder(orderData);

      const itemLines = items.map((i) => `• ${i.product.name}${i.variant ? ` [${i.variant.label}]` : ""} (x${i.quantity})`).join("\n");
      
      const message = `🛍️ *LUCKATHYS SHOP - NUEVA ORDEN*\n\n` +
                      `👤 *Cliente:* ${customer.name}\n` +
                      `📞 *Teléfono:* ${customer.phone}\n\n` +
                      `📦 *Pedido:*\n${itemLines}\n\n` +
                      `${coupon ? `🏷️ *Cupón:* ${coupon.code} (-$${discount.toFixed(2)})\n` : ""}` +
                      `💵 *TOTAL A PAGAR: $${total.toFixed(2)}*\n` +
                      `🇻🇪 *BS. TOTAL: ${bsPrice(total)}*\n\n` +
                      `🏦 *MÉTODO DE PAGO:* ${selectedPayment.bankName}\n` +
                      `📌 *DATOS:* ${selectedPayment.holderName} | ${selectedPayment.idNumber}\n\n` +
                      `⚡ _Por favor, envíe el comprobante de pago por aquí._`;

      window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, "_blank");
      
      clearCart();
      setIsOpen(false);
      toast.success("¡Orden procesada! Envía el mensaje de WhatsApp.");
    } catch (e) {
      toast.error("Error al crear la orden");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />
      
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden">
        
        {/* HEADER VIP */}
        <div className="px-6 py-6 border-b border-gray-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              {step === 1 ? "Mi Bolsa" : "Finalizar Pedido"}
            </h2>
            <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">
              {items.length} Artículos seleccionados
            </p>
          </div>
          <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-all">✕</button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          
          {step === 1 ? (
            <>
              {/* VISTA 1: BOLSA DE PRODUCTOS */}
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <span className="text-6xl mb-4">🛍️</span>
                  <p className="text-gray-400 font-medium">Tu bolsa está vacía.<br/>¡Añade algo hermoso!</p>
                  <button onClick={() => setIsOpen(false)} className="mt-6 px-8 py-3 bg-black text-white rounded-full text-xs font-black uppercase tracking-widest">Ir a la tienda</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.key} className="flex gap-4 bg-gray-50/50 border border-gray-100 p-4 rounded-[2rem] group transition-all">
                      <div className="w-20 h-24 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                        <img src={item.product.image || item.product.images?.[0]} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="text-sm font-black text-gray-800 uppercase line-clamp-1">{item.product.name}</h4>
                          {item.variant && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.variant.label}</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-black text-pink-600">${item.price}</span>
                          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                            <button onClick={() => updateQuantity(item.key, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-gray-400 font-bold">-</button>
                            <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.key, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center bg-black text-white rounded-full font-bold shadow-md">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* VISTA 2: FORMULARIO DE PAGO */
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información de Entrega</label>
                <div className="grid grid-cols-1 gap-3">
                  <input placeholder="Nombre completo" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-pink-300 focus:bg-white transition-all" />
                  <input placeholder="Teléfono WhatsApp" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-pink-300 focus:bg-white transition-all" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecciona Método de Pago 🇻🇪</label>
                <div className="space-y-2">
                  {paymentMethods.map((pm) => (
                    <button 
                      key={pm.id} 
                      onClick={() => setSelectedPayment(pm)}
                      className={`w-full flex items-center gap-4 p-4 rounded-[1.8rem] border-2 transition-all ${selectedPayment?.id === pm.id ? "border-pink-500 bg-pink-50 shadow-md scale-[1.02]" : "border-gray-50 bg-gray-50/50 opacity-70 hover:opacity-100"}`}
                    >
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                        {pm.bankName.toLowerCase().includes('zelle') ? "💎" : "🏦"}
                      </div>
                      <div className="text-left">
                        <p className="text-[13px] font-black text-gray-800 uppercase leading-none mb-1">{pm.bankName}</p>
                        <p className="text-[10px] font-bold text-gray-400">{pm.holderName}</p>
                      </div>
                      {selectedPayment?.id === pm.id && <div className="ml-auto text-pink-500">✔</div>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER: TOTALES Y ACCIONES */}
        {items.length > 0 && (
          <div className="px-8 py-8 bg-white border-t border-gray-50 space-y-5 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
            
            {/* BARRA DE ENVÍO GRATIS (Solo en Paso 1) */}
            {step === 1 && (
              <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase">Envío Gratis</span>
                  <span className="text-[10px] font-black text-pink-500">{remaining > 0 ? `Faltan $${remaining.toFixed(2)}` : "¡CONSEGUIDO! 🚀"}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all duration-1000" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>
            )}

            {/* CUPONES (Solo en Paso 1) */}
            {step === 1 && !coupon && (
              <div className="flex gap-2">
                <input 
                  value={couponCode} 
                  onChange={e => setCouponCode(e.target.value)} 
                  placeholder="CÓDIGO DE CUPÓN" 
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 text-[10px] font-black outline-none focus:border-pink-200"
                />
                <button 
                  onClick={applyCoupon} 
                  disabled={checkingCoupon}
                  className="px-6 py-2 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {checkingCoupon ? "..." : "Aplicar"}
                </button>
              </div>
            )}

            {/* RESUMEN DE PRECIOS */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400"><span>SUBTOTAL</span><span>${subtotal.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between text-xs font-bold text-green-500"><span>DESCUENTO</span><span>-${discount.toFixed(2)}</span></div>}
              
              <div className="flex justify-between items-end pt-2 border-t border-gray-50">
                <span className="text-sm font-black text-gray-900 uppercase">Total a Pagar</span>
                <div className="text-right">
                  <p className="text-3xl font-black text-gray-950 leading-none">${total.toFixed(2)}</p>
                  <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">Bs. {bsPrice(total)}</p>
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex flex-col gap-3">
              {step === 1 ? (
                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-5 bg-black text-white rounded-[1.8rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all"
                >
                  Continuar al pago 💳
                </button>
              ) : (
                <>
                  <button 
                    onClick={sendOrder}
                    className="w-full py-5 bg-green-500 text-white rounded-[1.8rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Confirmar por WhatsApp 📲
                  </button>
                  <button 
                    onClick={() => setStep(1)}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-pink-500 transition-colors"
                  >
                    ← Regresar a la bolsa
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}