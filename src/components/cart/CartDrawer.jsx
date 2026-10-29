import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useCart } from "../../context/CartContext";
import { useApp } from "../../context/AppContext";
import { useBackButton } from "../../hooks/useBackButton";
import { normalizeImageUrl } from "../../utils/imageNormalizer";
import toast from "react-hot-toast";

export default function CartDrawer({ onSelectProduct }) {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    isOpen, 
    setIsOpen, 
    coupon, 
    setCoupon, 
    subtotal, 
    discount, 
    total, 
    clearCart, 
    createOrder,
    selectedItems,
    selectedStoreId,
    setSelectedStoreId,
    selectStoreOnly,
    toggleItemSelection
  } = useCart();

  const { settings, bsPrice, storeData } = useApp();
  
  const [couponCode, setCouponCode] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [step, setStep] = useState(1); 
  const [customer, setCustomer] = useState({ name: "", phone: "" });

  // 🌟 METADATOS DE TIENDAS EN LA BOLSA (Nombre, teléfono, logo)
  const [storeMetaMap, setStoreMetaMap] = useState({});
  // 🌟 STOCK REAL EN TIEMPO REAL DESDE FIRESTORE
  const [realtimeStock, setRealtimeStock] = useState({});

  // 🌟 ESCUCHANDO BOTÓN ATRÁS DE ANDROID PARA CERRAR EL CARRITO
  useBackButton(isOpen, () => setIsOpen(false));

  // 🌟 AGRUPACIÓN POR TIENDA (TIPO ALIBABA)
  const storeGroups = useMemo(() => {
    const groups = {};
    items.forEach((item) => {
      const sId = item.storeId || item.product?.storeId || storeData?.id || "tienda";
      if (!groups[sId]) {
        groups[sId] = {
          storeId: sId,
          storeName: item.storeName || (sId === storeData?.id ? storeData?.nombre : null) || sId,
          items: []
        };
      }
      groups[sId].items.push(item);
    });
    return Object.values(groups);
  }, [items, storeData]);

  // 🌟 CÁLCULO DE AHORRO TOTAL EN OFERTAS
  const offerSavings = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const unitPrice = Number(item.price ?? item.product?.price ?? 0);
      const rawOldPrice = Number(item.oldPrice ?? item.product?.oldPrice ?? 0);
      const rawBasePrice = Number(item.product?.price ?? 0);
      let crossed = 0;
      if (rawOldPrice > unitPrice) crossed = rawOldPrice;
      else if (rawBasePrice > unitPrice) crossed = rawBasePrice;
      if (crossed > unitPrice) {
        return acc + (crossed - unitPrice) * (Number(item.quantity) || 1);
      }
      return acc;
    }, 0);
  }, [selectedItems]);

  // 🌟 CARGAR INFORMACIÓN DE LAS TIENDAS PRESENTES EN LA BOLSA
  useEffect(() => {
    if (!isOpen) return;

    storeGroups.forEach((group) => {
      const sId = group.storeId;
      if (!sId) return;

      if (sId === storeData?.id && storeData?.nombre) {
        setStoreMetaMap((prev) => (prev[sId]?.nombre ? prev : { ...prev, [sId]: storeData }));
        return;
      }

      setStoreMetaMap((prev) => {
        if (prev[sId]) return prev;
        getDoc(doc(db, "stores", sId))
          .then((sSnap) => {
            if (sSnap.exists()) {
              setStoreMetaMap((p) => ({ ...p, [sId]: { id: sSnap.id, ...sSnap.data() } }));
            }
          })
          .catch((e) => console.warn("No se pudo cargar info de la tienda:", sId, e));
        return prev;
      });
    });
  }, [isOpen, storeGroups, storeData]);

  // 🌟 VERIFICAR Y SINCRONIZAR STOCK REAL DE FIRESTORE AL ABRIR LA BOLSA
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    const checkRealStock = async () => {
      const uniqueProductIds = [...new Set(items.map((i) => i.product.id))];
      const stockMap = {};

      for (const pId of uniqueProductIds) {
        try {
          const pSnap = await getDoc(doc(db, "products", pId));
          if (pSnap.exists()) {
            const data = pSnap.data();
            stockMap[pId] = {
              totalStock: Number(data.totalStock ?? data.stock ?? 0),
              variants: data.variants || []
            };
          }
        } catch (e) {
          console.warn("Error leyendo stock de producto:", pId);
        }
      }

      setRealtimeStock(stockMap);

      // Auto-corregir cantidades si en BD el stock disminuyó por debajo de lo que hay en bolsa (sumando todos los modelos de cada variante)
      const groupedByVariant = {};
      items.forEach((item) => {
        const baseKey = `${item.product.id}-${item.variant?.id || "default"}`;
        if (!groupedByVariant[baseKey]) groupedByVariant[baseKey] = [];
        groupedByVariant[baseKey].push(item);
      });

      Object.values(groupedByVariant).forEach((groupItems) => {
        const first = groupItems[0];
        const pStockInfo = stockMap[first.product.id];
        if (!pStockInfo) return;

        let maxDbStock = pStockInfo.totalStock;
        if (first.variant) {
          const vMatch = pStockInfo.variants.find((v) => v.id === first.variant.id);
          if (vMatch) maxDbStock = Number(vMatch.stock ?? 0);
        }

        const totalQty = groupItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        if (totalQty > maxDbStock) {
          if (maxDbStock <= 0) {
            toast.error(`"${first.product.name}" se encuentra agotado`);
            groupItems.forEach((i) => updateQuantity(i.key, 0));
          } else {
            toast(`Ajustamos "${first.product.name}" al stock disponible (${maxDbStock})`);
            let remainingToAllocate = maxDbStock;
            groupItems.forEach((i) => {
              const allowed = Math.min(i.quantity, remainingToAllocate);
              remainingToAllocate = Math.max(0, remainingToAllocate - allowed);
              if (allowed !== i.quantity) updateQuantity(i.key, allowed);
            });
          }
        }
      });
    };

    checkRealStock();
  }, [isOpen]);

  // 🌟 OBTENER STOCK MÁXIMO DISPONIBLE DE UN ÍTEM
  const getItemMax = useCallback((item) => {
    const liveInfo = realtimeStock[item.product.id];
    if (liveInfo) {
      if (item.variant) {
        const v = liveInfo.variants.find((vr) => vr.id === item.variant.id);
        if (v) return Number(v.stock ?? 0);
      }
      return Number(liveInfo.totalStock ?? 0);
    }
    if (item.variant) {
      return Number(item.variant.stock ?? 0);
    }
    return Number(item.product?.totalStock ?? item.product?.stock ?? 0);
  }, [realtimeStock]);

  // 🌟 DETERMINAR TIENDA ACTIVA PARA LA COMPRA
  const activeCheckoutStoreId = useMemo(() => {
    // 1. Si los productos seleccionados pertenecen a una sola tienda
    const selectedStores = [...new Set(selectedItems.map((i) => i.storeId || i.product?.storeId))];
    if (selectedStores.length === 1) return selectedStores[0];
    if (selectedStoreId) return selectedStoreId;
    if (storeData?.id) return storeData.id;
    if (storeGroups.length > 0) return storeGroups[0].storeId;
    return null;
  }, [selectedItems, selectedStoreId, storeData?.id, storeGroups]);

  const activeStoreData = useMemo(() => {
    if (!activeCheckoutStoreId) return null;
    if (storeData?.id === activeCheckoutStoreId) return storeData;
    return storeMetaMap[activeCheckoutStoreId] || { id: activeCheckoutStoreId, nombre: activeCheckoutStoreId };
  }, [activeCheckoutStoreId, storeData, storeMetaMap]);

  // 🌟 CARGAR MÉTODOS DE PAGO DE LA TIENDA ACTIVA AL FINALIZAR
  useEffect(() => {
    if (isOpen && activeCheckoutStoreId) {
      const loadPayments = async () => {
        try {
          const q = query(collection(db, "payments"), where("storeId", "==", activeCheckoutStoreId));
          const snap = await getDocs(q);
          const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setPaymentMethods(payments);
          if (payments.length > 0) {
            setSelectedPayment(payments[0]);
          } else {
            setSelectedPayment({
              id: "acordar_vendedor",
              bankName: "Acordar con vendedor",
              holderName: "Por WhatsApp (Efectivo / Pago Móvil)",
              idNumber: "N/A"
            });
          }
        } catch (e) {
          console.warn("Error cargando métodos de pago:", e);
        }
      };
      loadPayments();
    } else if (!isOpen) {
      setStep(1); 
      setSelectedPayment(null);
    }
  }, [isOpen, activeCheckoutStoreId]);

  const freeShippingGoal = activeStoreData?.freeShippingGoal || settings?.freeShippingGoal || 50;
  const freeShippingProgress = Math.min(100, (total / freeShippingGoal) * 100);
  const remaining = Math.max(0, freeShippingGoal - total);

  const applyCoupon = async () => {
    if (!couponCode.trim() || !activeCheckoutStoreId) return;
    setCheckingCoupon(true);
    try {
      const q = query(
        collection(db, "coupons"), 
        where("code", "==", couponCode.toUpperCase()), 
        where("active", "==", true),
        where("storeId", "==", activeCheckoutStoreId)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast.error("Cupón inválido o expirado para esta tienda");
      } else {
        const c = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setCoupon(c);
        toast.success(`¡Cupón ${c.code} aplicado! ✨`);
      }
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleProceedToStep2 = () => {
    if (selectedItems.length === 0) {
      return toast.error("Selecciona al menos un artículo para continuar");
    }
    const distinctStores = [...new Set(selectedItems.map((i) => i.storeId || i.product?.storeId))];
    if (distinctStores.length > 1) {
      toast.error("Selecciona solo los productos de una tienda para comprar por WhatsApp (usa 'Comprar solo de esta tienda')");
      // Auto-seleccionar la primera tienda para conveniencia
      selectStoreOnly(distinctStores[0]);
      return;
    }
    setStep(2);
  };

  const sendOrder = async () => {
    if (selectedItems.length === 0) return toast.error("No hay artículos seleccionados");
    if (!customer.name || !customer.phone) return toast.error("Dinos tu nombre y teléfono");

    const effectivePayment = selectedPayment || {
      id: "acordar_vendedor",
      bankName: "Acordar con vendedor",
      holderName: "Por WhatsApp (Efectivo / Pago Móvil)",
      idNumber: "N/A"
    };

    const rawPhone = effectivePayment?.phone || 
                     activeStoreData?.whatsappWidget?.number || 
                     activeStoreData?.telefono || 
                     settings?.whatsappNumber;

    let targetPhone = String(rawPhone || "").replace(/\D/g, "");
    if (targetPhone.startsWith("0")) {
      targetPhone = "58" + targetPhone.slice(1);
    } else if (targetPhone.length === 10 && /^(412|414|424|416|426)/.test(targetPhone)) {
      targetPhone = "58" + targetPhone;
    }

    try {
      const orderData = { 
        ...customer, 
        paymentId: effectivePayment.id,
        paymentMethod: effectivePayment.bankName,
        total 
      };
      await createOrder(orderData, activeCheckoutStoreId, selectedItems, total);

      if (coupon?.id) {
        try {
          await updateDoc(doc(db, "coupons", coupon.id), { usageCount: increment(1) });
        } catch (cErr) {
          console.warn("No se pudo actualizar el uso del cupón:", cErr);
        }
      } 

      const itemLines = selectedItems.map((i) => {
        const uPrice = Number(i.price ?? 0);
        const rOld = Number(i.oldPrice ?? i.product?.oldPrice ?? 0);
        const rBase = Number(i.product?.price ?? 0);
        const crossed = rOld > uPrice ? rOld : (rBase > uPrice ? rBase : 0);
        const offerTag = crossed > uPrice ? ` 🏷️ ~(Antes $${crossed.toFixed(2)})~ *¡Oferta!*` : "";
        const modelTag = i.selectedModelLabel ? ` [${i.selectedModelLabel}]` : "";
        const variantTag = i.variant ? ` [${i.variant.label || i.variant}]` : "";
        return `🔹 *${i.product.name}*${modelTag}${variantTag} (x${i.quantity}) ➔ $${(uPrice * i.quantity).toFixed(2)}${offerTag}`;
      }).join("\n");
      
      const storeDisplayName = (activeStoreData?.nombre || activeCheckoutStoreId || "TIENDA").toUpperCase();

      const paymentDetails = [];
      if (effectivePayment.bankName) {
        paymentDetails.push(`🏦 *Banco / Método:* ${effectivePayment.bankName}`);
      }
      if (effectivePayment.holderName && effectivePayment.id !== "acordar_vendedor") {
        paymentDetails.push(`👤 *Titular:* ${effectivePayment.holderName}`);
      }
      if (effectivePayment.idNumber && effectivePayment.idNumber !== "N/A") {
        paymentDetails.push(`📄 *C.I / RIF:* ${effectivePayment.idNumber}`);
      }
      if (effectivePayment.accountNumber) {
        paymentDetails.push(`🔢 *Nro. de Cuenta:* ${effectivePayment.accountNumber}`);
      }
      if (effectivePayment.phone) {
        paymentDetails.push(`📱 *Teléfono Pago Móvil:* ${effectivePayment.phone}`);
      }
      if (effectivePayment.id === "acordar_vendedor") {
        paymentDetails.push(`🤝 *Modalidad:* Coordinar pago directo (Efectivo / Pago Móvil)`);
      }

      const message = 
`🛍️ *¡NUEVO PEDIDO CONFIRMADO!*
🏪 *Tienda:* ${storeDisplayName}
━━━━━━━━━━━━━━━━━━━━

👤 *DATOS DEL CLIENTE:*
• *Nombre:* ${customer.name}
• *WhatsApp:* ${customer.phone}

📦 *DETALLE DEL PEDIDO:*
${itemLines}

━━━━━━━━━━━━━━━━━━━━
${coupon ? `🎟️ *Cupón Aplicado:* ${coupon.code} (-$${discount.toFixed(2)})\n` : ""}` +
`${offerSavings > 0 ? `⚡ *Ahorro Total en Ofertas:* -$${offerSavings.toFixed(2)}\n` : ""}` +
`💵 *TOTAL USD:* $${total.toFixed(2)}
🇻🇪 *TOTAL BOLÍVARES:* Bs. ${bsPrice(total)}
━━━━━━━━━━━━━━━━━━━━

💳 *INFORMACIÓN DE PAGO:*
${paymentDetails.join("\n")}

⚡ *PASO FINAL:*
_Por favor, adjunte el capture o comprobante de su transferencia/pago móvil por este chat para procesar y despachar su orden de inmediato. ¡Muchas gracias por su compra!_ 🙌`;

      const encodedMsg = encodeURIComponent(message);
      const whatsappUrl = targetPhone 
        ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedMsg}`
        : `https://api.whatsapp.com/send?text=${encodedMsg}`;

      window.open(whatsappUrl, "_blank");
      
      setIsOpen(false);
      setStep(1);
      toast.success(`¡Orden para ${storeDisplayName} procesada! Envía el mensaje de WhatsApp.`);
    } catch (e) {
      toast.error("Error al crear la orden");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300" 
        onClick={() => setIsOpen(false)} 
      />
      
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden">
        
        {/* CABECERA PRINCIPAL */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              {step === 1 ? "Mi Bolsa de Compras" : "Finalizar Pedido"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">
                {items.length} {items.length === 1 ? "producto" : "productos"} en bolsa
              </span>
              {selectedItems.length > 0 && selectedItems.length !== items.length && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {selectedItems.length} seleccionados
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-all active:scale-90"
          >
            ✕
          </button>
        </div>

        {/* 🌟 ENCABEZADO DE TIENDA ESPECIFICADA (REQUERIMIENTO 2) */}
        {activeStoreData && items.length > 0 && (
          <div className="px-6 py-2.5 bg-gradient-to-r from-pink-50/80 via-white to-purple-50/60 border-b border-pink-100/60 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-base flex-shrink-0">🏪</span>
              <div className="truncate">
                <span className="text-[9px] font-black text-pink-600 uppercase tracking-widest block leading-none">
                  Comprando en
                </span>
                <span className="text-xs font-black text-gray-900 uppercase tracking-tight truncate block mt-0.5">
                  {activeStoreData.nombre || activeStoreData.id}
                </span>
              </div>
            </div>
            {storeGroups.length > 1 && (
              <span className="text-[9px] font-black bg-white text-gray-600 px-2.5 py-1 rounded-full border border-gray-200 uppercase tracking-wider flex-shrink-0 shadow-xs">
                {storeGroups.length} tiendas
              </span>
            )}
          </div>
        )}

        {/* CONTENIDO DEL CARRITO */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          
          {step === 1 ? (
            <>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <span className="text-6xl mb-4 animate-bounce">🛍️</span>
                  <p className="text-gray-400 font-medium text-sm">Tu bolsa está vacía.<br/>¡Añade productos de nuestras tiendas!</p>
                  <button 
                    onClick={() => setIsOpen(false)} 
                    className="mt-6 px-8 py-3 bg-black text-white rounded-full text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-md"
                  >
                    Explorar productos
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* AGRUPACIÓN POR TIENDAS ESTILO ALIBABA */}
                  {storeGroups.map((group) => {
                    const sMeta = storeMetaMap[group.storeId] || (group.storeId === storeData?.id ? storeData : null);
                    const storeDisplayName = sMeta?.nombre || group.storeName || group.storeId;
                    
                    // ¿Están seleccionados SOLO los productos de esta tienda?
                    const isOnlyThisStoreSelected = 
                      group.items.every((i) => i.selected !== false) &&
                      items.filter((i) => (i.storeId || i.product?.storeId) !== group.storeId).every((i) => i.selected === false);

                    return (
                      <div 
                        key={group.storeId} 
                        className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                          isOnlyThisStoreSelected 
                            ? "bg-white border-pink-300 shadow-md ring-2 ring-pink-100" 
                            : "bg-gray-50/50 border-gray-200/80"
                        }`}
                      >
                        {/* 🌟 ENCABEZADO DE LA TIENDA CON BOTÓN TIPO ALIBABA */}
                        <div className="p-3.5 bg-white border-b border-gray-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center text-sm flex-shrink-0 border border-pink-100">
                              🏪
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-black text-gray-900 uppercase truncate leading-tight">
                                {storeDisplayName}
                              </h3>
                              <span className="text-[10px] font-bold text-gray-400 block -mt-0.5">
                                {group.items.length} {group.items.length === 1 ? "artículo" : "artículos"}
                              </span>
                            </div>
                          </div>

                          {/* 🌟 BOTÓN TIPO ALIBABA: SELECCIONAR SOLO LOS PRODUCTOS DE ESTA TIENDA */}
                          <button
                            type="button"
                            onClick={() => selectStoreOnly(group.storeId)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 flex-shrink-0 border shadow-xs ${
                              isOnlyThisStoreSelected
                                ? "bg-pink-600 text-white border-pink-600 shadow-pink-200"
                                : "bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:text-pink-600 active:scale-95"
                            }`}
                            title="Seleccionar solo los productos de esta tienda para comprar"
                          >
                            <span>{isOnlyThisStoreSelected ? "✓" : "🔘"}</span>
                            <span>{isOnlyThisStoreSelected ? "Tienda Seleccionada" : "Solo esta tienda"}</span>
                          </button>
                        </div>

                        {/* LISTA DE PRODUCTOS DE ESTA TIENDA */}
                        <div className="p-3 space-y-3">
                          {group.items.map((item) => {
                            const maxStock = getItemMax(item);
                            const baseKeyPrefix = `${item.product?.id}-${item.variant?.id || "default"}`;
                            const totalVariantQtyInCart = items
                              .filter((i) => i.key === baseKeyPrefix || i.key.startsWith(`${baseKeyPrefix}-mod`))
                              .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
                            const isSelected = item.selected !== false;
                            const isMaxReached = totalVariantQtyInCart >= maxStock;

                            const unitPrice = Number(item.price ?? item.product?.price ?? 0);
                            const rawOldPrice = Number(item.oldPrice ?? item.product?.oldPrice ?? 0);
                            const rawBasePrice = Number(item.product?.price ?? 0);

                            let crossedPrice = 0;
                            if (rawOldPrice > unitPrice) {
                              crossedPrice = rawOldPrice;
                            } else if (rawBasePrice > unitPrice) {
                              crossedPrice = rawBasePrice;
                            }
                            const hasOffer = crossedPrice > unitPrice;

                            return (
                              <div 
                                key={item.key} 
                                className={`flex gap-3 bg-white border rounded-2xl p-3 transition-all ${
                                  isSelected 
                                    ? "border-gray-200 shadow-sm" 
                                    : "border-gray-100 opacity-60 bg-gray-50/30"
                                }`}
                              >
                                {/* Checkbox individual */}
                                <div className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleItemSelection(item.key)}
                                    className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                                    title={isSelected ? "Deseleccionar producto" : "Seleccionar para comprar"}
                                  />
                                </div>

                                {/* Miniatura Clickeable para reabrir producto */}
                                <div 
                                  onClick={() => {
                                    setIsOpen(false);
                                    if (onSelectProduct) {
                                      onSelectProduct({
                                        ...item.product,
                                        selectedImageIndex: item.selectedImageIndex ?? 0
                                      });
                                    } else {
                                      window.dispatchEvent(new CustomEvent("open_product_modal", {
                                        detail: { ...item.product, selectedImageIndex: item.selectedImageIndex ?? 0 }
                                      }));
                                    }
                                  }}
                                  className="w-16 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-xs relative cursor-pointer hover:opacity-85 hover:ring-2 hover:ring-pink-400 transition-all group/thumb"
                                  title="Toca para ver este producto"
                                >
                                  <img 
                                    src={normalizeImageUrl(item.selectedImage || item.image || item.product?.selectedImage || item.product?.image || item.product?.images?.[0])} 
                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" 
                                    alt={item.product?.name || "Producto"} 
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/15 transition-colors flex items-center justify-center">
                                    <span className="opacity-0 group-hover/thumb:opacity-100 text-white text-[10px] drop-shadow-md bg-black/60 rounded-full w-5 h-5 flex items-center justify-center">🔍</span>
                                  </div>
                                  {hasOffer && maxStock > 0 && (
                                    <div className="absolute top-1 left-1 bg-gradient-to-r from-pink-600 to-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm flex items-center gap-0.5">
                                      <span>⚡</span>
                                      <span>Oferta</span>
                                    </div>
                                  )}
                                  {maxStock <= 0 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                      <span className="text-[8px] font-black text-white uppercase tracking-tighter">Agotado</span>
                                    </div>
                                  )}
                                </div>

                                {/* Info y Control de Cantidad con Límite Estricto */}
                                <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                                  <div>
                                    <div className="flex justify-between items-start gap-1">
                                      <h4 
                                        onClick={() => {
                                          setIsOpen(false);
                                          if (onSelectProduct) {
                                            onSelectProduct({
                                              ...item.product,
                                              selectedImageIndex: item.selectedImageIndex ?? 0
                                            });
                                          } else {
                                            window.dispatchEvent(new CustomEvent("open_product_modal", {
                                              detail: { ...item.product, selectedImageIndex: item.selectedImageIndex ?? 0 }
                                            }));
                                          }
                                        }}
                                        className="text-xs font-black text-gray-800 uppercase line-clamp-1 leading-snug cursor-pointer hover:text-pink-600 transition-colors"
                                        title="Ver producto"
                                      >
                                        {item.product?.name || item.product?.nombre || "Producto"}
                                      </h4>
                                      <button 
                                        onClick={() => removeItem(item.key)} 
                                        className="text-gray-300 hover:text-red-500 text-xs px-1 transition-colors"
                                        title="Eliminar de la bolsa"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    {item.selectedModelLabel && (
                                      <span className="inline-block text-[9px] font-bold text-pink-600 bg-pink-50 border border-pink-100 px-1.5 py-0.5 rounded-md mt-0.5">
                                        🎨 {item.selectedModelLabel}
                                      </span>
                                    )}
                                    {item.variant && (
                                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                                        {item.variant.label || item.variant}
                                      </span>
                                    )}
                                    
                                    {/* 🌟 INDICADOR DE LÍMITE DE STOCK EN BD */}
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-bold text-gray-400">
                                        Disp: {maxStock}
                                      </span>
                                      {isMaxReached && maxStock > 0 && (
                                        <span className="text-[8px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                          Máx alcanzado
                                        </span>
                                      )}
                                      {maxStock <= 0 && (
                                        <span className="text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                          Sin existencias
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-col">
                                      <div className="flex items-baseline gap-1.5 flex-wrap">
                                        <span className="font-black text-pink-600 text-sm">
                                          ${unitPrice.toFixed(2)}
                                        </span>
                                        {hasOffer && (
                                          <span className="text-[11px] font-semibold text-gray-400 line-through decoration-pink-500/60 decoration-[1.5px]">
                                            ${crossedPrice.toFixed(2)}
                                          </span>
                                        )}
                                        {hasOffer && (
                                          <span className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-[0_1px_2px_rgba(244,63,94,0.06)]">
                                            Oferta
                                          </span>
                                        )}
                                      </div>
                                      {item.quantity > 1 && (
                                        <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                                          Total: ${(unitPrice * item.quantity).toFixed(2)}
                                        </span>
                                      )}
                                    </div>

                                    {/* 🌟 SELECTOR DE CANTIDAD CON TOPE MÁXIMO EN TIENDA */}
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full p-1 shadow-xs">
                                      <button 
                                        type="button"
                                        onClick={() => updateQuantity(item.key, item.quantity - 1)} 
                                        className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold hover:bg-white rounded-full transition-all active:scale-90"
                                      >
                                        -
                                      </button>
                                      
                                      <span className="text-xs font-black w-5 text-center text-gray-900">
                                        {item.quantity}
                                      </span>

                                      <button 
                                        type="button"
                                        onClick={() => {
                                          if (totalVariantQtyInCart >= maxStock) {
                                            toast.error(`Máximo disponible alcanzado (${maxStock} unidades en inventario)`);
                                            return;
                                          }
                                          updateQuantity(item.key, item.quantity + 1);
                                        }} 
                                        disabled={isMaxReached}
                                        className={`w-6 h-6 flex items-center justify-center rounded-full font-bold shadow-xs transition-all ${
                                          isMaxReached 
                                            ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60" 
                                            : "bg-black text-white hover:bg-gray-800 active:scale-90"
                                        }`}
                                        title={isMaxReached ? `Stock máximo: ${maxStock}` : "Aumentar cantidad"}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* PASO 2: FINALIZAR PEDIDO */
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              
              <div className="bg-pink-50/80 border border-pink-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest block">
                  Tienda receptora de la orden:
                </span>
                <p className="text-base font-black text-gray-900 uppercase">
                  {activeStoreData?.nombre || activeCheckoutStoreId}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Se enviará a su WhatsApp con sus métodos de pago oficiales.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Información de Entrega
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <input 
                    placeholder="Nombre completo" 
                    value={customer.name} 
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-pink-300 focus:bg-white transition-all" 
                  />
                  <input 
                    placeholder="Teléfono WhatsApp" 
                    value={customer.phone} 
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-pink-300 focus:bg-white transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Selecciona Método de Pago 🇻🇪
                </label>
                
                {paymentMethods.length === 0 ? (
                  <div className="p-4 bg-pink-50/70 rounded-2xl text-center text-xs text-gray-700 border border-pink-200 space-y-1">
                    <p className="font-bold text-gray-900">💬 Coordinarás el pago con el vendedor por WhatsApp</p>
                    <p className="text-[11px] text-gray-500">Podrás acordar Efectivo, Pago Móvil o Transferencia al enviar la orden.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((pm) => (
                      <button 
                        key={pm.id} 
                        type="button"
                        onClick={() => setSelectedPayment(pm)}
                        className={`w-full flex flex-col p-4 rounded-[1.8rem] border-2 transition-all text-left ${
                          selectedPayment?.id === pm.id 
                            ? "border-pink-500 bg-pink-50 shadow-md scale-[1.01]" 
                            : "border-gray-100 bg-gray-50/50 opacity-70 hover:opacity-100 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm overflow-hidden flex-shrink-0">
                            {pm.logo ? (
                              <img src={pm.logo} alt={pm.bankName} className="w-full h-full object-contain p-1" />
                            ) : (
                              pm.bankName?.toLowerCase().includes("zelle") ? "💎" : "🏦"
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-black text-gray-800 uppercase leading-none mb-1">{pm.bankName}</p>
                            <p className="text-[10px] font-bold text-gray-400">{pm.holderName}</p>
                          </div>
                          {selectedPayment?.id === pm.id && <div className="text-pink-500 font-bold text-xl">✔</div>}
                        </div>

                        {selectedPayment?.id === pm.id && (
                          <div className="mt-4 pt-4 border-t border-pink-200/50 w-full space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                            {pm.idNumber && (
                              <p className="text-xs text-gray-600"><span className="font-bold text-gray-800">C.I / RIF:</span> <span className="select-all">{pm.idNumber}</span></p>
                            )}
                            {pm.accountNumber && (
                              <p className="text-xs text-gray-600"><span className="font-bold text-gray-800">Cuenta / Email:</span> <span className="select-all">{pm.accountNumber}</span></p>
                            )}
                            {pm.phone && (
                              <p className="text-xs text-gray-600"><span className="font-bold text-gray-800">Teléfono:</span> <span className="select-all">{pm.phone}</span></p>
                            )}
                            
                            <div className="mt-3 bg-white rounded-xl py-2 px-3 text-center border border-pink-100 shadow-sm">
                              <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest">👇 Transfiere y luego confirma por WhatsApp 👇</p>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA / TOTALES Y BOTÓN DE ACCIÓN */}
        {items.length > 0 && (
          <div className="px-6 py-6 bg-white border-t border-gray-100 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
            
            {step === 1 && (
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-black text-gray-500 uppercase">Envío Gratis</span>
                  <span className="text-[10px] font-black text-pink-500">{remaining > 0 ? `Faltan $${remaining.toFixed(2)}` : "¡CONSEGUIDO! 🚀"}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all duration-1000" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>
            )}

            {step === 1 && !coupon && (
              <div className="flex gap-2">
                <input 
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value)} 
                  placeholder="CÓDIGO DE CUPÓN" 
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-pink-200"
                />
                <button 
                  type="button"
                  onClick={applyCoupon} 
                  disabled={checkingCoupon}
                  className="px-5 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {checkingCoupon ? "..." : "Aplicar"}
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>SUBTOTAL ({selectedItems.length} seleccionados)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {offerSavings > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-rose-600 bg-rose-50/80 px-2.5 py-1.5 rounded-xl border border-rose-100/80">
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span className="uppercase text-[10px] font-black tracking-wider">Ahorro en Ofertas</span>
                  </span>
                  <span className="font-black text-xs">-${offerSavings.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-xs font-bold text-green-500">
                  <span>DESCUENTO</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-end pt-2 border-t border-gray-50">
                <span className="text-sm font-black text-gray-900 uppercase">Total a Pagar</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-gray-950 leading-none">${total.toFixed(2)}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Bs. {bsPrice(total)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {step === 1 ? (
                <button 
                  type="button"
                  onClick={handleProceedToStep2}
                  disabled={selectedItems.length === 0}
                  className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar al pago 💳
                </button>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={sendOrder}
                    className="w-full py-4 bg-green-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Confirmar por WhatsApp 📲
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-pink-500 transition-colors py-1 text-center"
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