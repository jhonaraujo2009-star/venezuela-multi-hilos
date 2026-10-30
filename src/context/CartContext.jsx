import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useApp } from "./AppContext"; // 🌟 MAGIA: Conectamos el carrito con el cerebro
import { prepareProductForCart } from "../utils/pricing";
import toast from "react-hot-toast";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { storeData } = useApp(); // 🌟 Saber en qué tienda estamos
  const [isOpen, setIsOpen] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  // 🌟 MAGIA: Cargar la bolsa unificada de marketplace o migrar claves anteriores (filtrando datos corruptos)
  const [items, setItems] = useState(() => {
    try {
      const unified = localStorage.getItem("marketplace_cart");
      if (unified) {
        const parsed = JSON.parse(unified);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => item && item.product && item.product.id && item.key);
        }
      }
      // Migración desde carritos por tienda individuales
      const merged = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cart_")) {
          try {
            const raw = localStorage.getItem(k);
            const parsed = JSON.parse(raw || "[]");
            if (Array.isArray(parsed)) {
              const sId = k.replace("cart_", "");
              parsed.forEach((item) => {
                if (!item || !item.product || !item.product.id || !item.key) return;
                if (!item.storeId) item.storeId = sId;
                if (!merged.some((m) => m.key === item.key)) {
                  merged.push(item);
                }
              });
            }
          } catch (e) {}
        }
      }
      return merged;
    } catch (e) {
      return [];
    }
  });

  // 🌟 Si entramos a una tienda específica, auto-seleccionar sus productos
  useEffect(() => {
    if (storeData?.id) {
      setSelectedStoreId(storeData.id);
      // Opcionalmente auto-seleccionar productos de esta tienda si existen en la bolsa
      setItems((prev) => {
        const hasThisStore = prev.some(
          (i) => (i.storeId || i.product?.storeId) === storeData.id
        );
        if (hasThisStore) {
          return prev.map((item) => ({
            ...item,
            selected: (item.storeId || item.product?.storeId) === storeData.id
          }));
        }
        return prev;
      });
    }
  }, [storeData?.id]);

  // 🌟 MAGIA: Guardar persistente en marketplace_cart y sincronizar cart_${storeId}
  useEffect(() => {
    try {
      localStorage.setItem("marketplace_cart", JSON.stringify(items));

      // Guardar también por tienda para compatibilidad retroactiva
      const grouped = {};
      items.forEach((item) => {
        const sId = item.storeId || item.product?.storeId || "default";
        if (!grouped[sId]) grouped[sId] = [];
        grouped[sId].push(item);
      });
      Object.keys(grouped).forEach((sId) => {
        localStorage.setItem(`cart_${sId}`, JSON.stringify(grouped[sId]));
      });
    } catch (e) {
      console.warn("Error guardando bolsa:", e);
    }
  }, [items]);

  // 🌟 FUNCIÓN TIPO ALIBABA: Seleccionar SOLO los productos de una tienda específica
  const selectStoreOnly = useCallback((storeId) => {
    setSelectedStoreId(storeId);
    setCoupon((prevCoupon) => (prevCoupon && prevCoupon.storeId && prevCoupon.storeId !== storeId ? null : prevCoupon));
    setItems((prev) =>
      prev.map((item) => {
        const sId = item.storeId || item.product?.storeId || "tienda";
        return {
          ...item,
          selected: sId === storeId
        };
      })
    );
  }, []);

  // 🌟 Conmutar selección de un producto individual
  const toggleItemSelection = useCallback((key) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, selected: item.selected === false } : item
      )
    );
  }, []);

  // 🌟 AÑADIR A LA BOLSA (Con verificación estricta de stock disponible en BD y precio unificado)
  const addItem = useCallback((product, variant, quantity) => {
    const sId = product.storeId || storeData?.id || "tienda";
    const sName = product.storeName || (sId === storeData?.id ? storeData?.nombre : null) || sId;
    const prepared = prepareProductForCart(product);

    // Obtener stock máximo según variantes o totalStock de BD
    const maxStock = variant
      ? Number(variant.stock ?? 0)
      : Number(product.totalStock ?? product.stock ?? 0);

    if (maxStock <= 0) {
      toast.error("Este producto se encuentra agotado.");
      return false;
    }

    let addedSuccessfully = true;

    setItems((prev) => {
      const baseKeyPrefix = `${product.id}-${variant?.id || "default"}`;
      const imgSuffix = product.selectedImageIndex !== undefined ? `-mod${product.selectedImageIndex}` : "";
      const key = `${baseKeyPrefix}${imgSuffix}`;
      const existing = prev.find((i) => i.key === key);

      // Sumar cantidad de todos los modelos del mismo producto/variante ya en la bolsa (comparten el mismo stock físico)
      const totalInCartForVariant = prev
        .filter((i) => i.key === baseKeyPrefix || i.key.startsWith(`${baseKeyPrefix}-mod`))
        .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

      if (totalInCartForVariant + quantity > maxStock) {
        const allowedToAdd = Math.max(0, maxStock - totalInCartForVariant);
        if (allowedToAdd <= 0) {
          toast.error(`Ya tienes el límite disponible (${maxStock} unidades) en tu bolsa`);
          addedSuccessfully = false;
          return prev;
        }
        toast.error(`Solo puedes agregar ${allowedToAdd} más. Stock máximo alcanzado (${maxStock})`);
        if (existing) {
          return prev.map((i) =>
            i.key === key ? { ...i, quantity: existing.quantity + allowedToAdd, selected: true } : i
          );
        }
        quantity = allowedToAdd;
      }

      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: existing.quantity + quantity, selected: true } : i
        );
      }

      const finalQuantity = Math.min(quantity, Math.max(0, maxStock - totalInCartForVariant));
      if (quantity > maxStock) {
        toast.error(`Solo hay ${maxStock} unidades disponibles en inventario`);
      }

      const chosenImg = product.selectedImage || product.image || prepared.image;

      return [
        ...prev,
        {
          key,
          product: {
            ...prepared,
            image: chosenImg,
            selectedImage: chosenImg,
            selectedImageIndex: product.selectedImageIndex ?? 0,
            selectedModelLabel: product.selectedModelLabel ?? null
          },
          variant,
          quantity: finalQuantity,
          price: prepared.price,
          oldPrice: prepared.oldPrice || null,
          selectedImage: chosenImg,
          selectedImageIndex: product.selectedImageIndex ?? 0,
          selectedModelLabel: product.selectedModelLabel ?? null,
          _rawPrice: prepared._rawPrice,
          _rawOldPrice: prepared._rawOldPrice,
          storeId: sId,
          storeName: sName,
          selected: true,
          _origenVenta: prepared._origenVenta
        },
      ];
    });

    return addedSuccessfully;
  }, [storeData]);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  // 🌟 ACTUALIZAR CANTIDAD (Con verificación estricta de stock máximo en BD compartido entre modelos)
  const updateQuantity = useCallback((key, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.key !== key));
      return;
    }
    setItems((prev) => {
      const targetItem = prev.find((i) => i.key === key);
      if (!targetItem) return prev;

      const baseKeyPrefix = `${targetItem.product?.id}-${targetItem.variant?.id || "default"}`;
      const otherModelsQty = prev
        .filter((i) => i.key !== key && (i.key === baseKeyPrefix || i.key.startsWith(`${baseKeyPrefix}-mod`)))
        .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

      const maxStock = targetItem.variant
        ? Number(targetItem.variant.stock ?? 0)
        : Number(targetItem.product?.totalStock ?? targetItem.product?.stock ?? 0);

      const maxAllowedForThisItem = Math.max(0, maxStock - otherModelsQty);

      return prev.map((i) => {
        if (i.key !== key) return i;
        if (quantity > maxAllowedForThisItem) {
          toast.error(`Límite alcanzado: solo hay ${maxStock} unidades disponibles en inventario`);
          return { ...i, quantity: maxAllowedForThisItem };
        }
        return { ...i, quantity };
      });
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  // 🌟 CREAR ORDEN MULTITIENDA
  const createOrder = async (customerData, targetStoreId, customItems, customTotal) => {
    try {
      const itemsToOrder = customItems || items.filter((i) => i.selected !== false);
      const effectiveTotal = customTotal !== undefined ? customTotal : total;
      const effectiveStoreId = targetStoreId || selectedStoreId || storeData?.id || itemsToOrder[0]?.storeId || "tienda";

      const primaryOrigin = itemsToOrder.find((i) => i._origenVenta === "index_super_admin")
        ? "index_super_admin"
        : "tienda_directa";

      const orderData = {
        customerName: customerData.name,
        customerPhone: customerData.phone,
        paymentId: customerData.paymentId || "acordar_vendedor",
        paymentMethod: customerData.paymentMethod || customerData.paymentId || "Acordar con vendedor",
        items: itemsToOrder.map((i) => ({
          id: i.product?.id || i.key?.split('-')[0],
          productId: i.product?.id || i.key?.split('-')[0],
          name: i.product?.name || i.product?.nombre || i.product?.title || "Producto",
          image: i.selectedImage || i.image || i.product?.selectedImage || i.product?.image || i.product?.imageUrl || (Array.isArray(i.product?.images) ? i.product.images[0] : null) || null,
          selectedModelLabel: i.selectedModelLabel || i.product?.selectedModelLabel || null,
          qty: Number(i.quantity) || 1,
          quantity: Number(i.quantity) || 1,
          price: Number(i.price) || 0,
          variant: i.variant?.label || (typeof i.variant === "string" ? i.variant : null),
          storeId: i.storeId || effectiveStoreId,
          _origenVenta: i._origenVenta || i.product?._origenVenta || primaryOrigin
        })),
        totalAmount: Number(effectiveTotal.toFixed(2)),
        total: Number(effectiveTotal.toFixed(2)),
        status: "pending",
        createdAt: serverTimestamp(),
        storeId: effectiveStoreId,
        _origenVenta: primaryOrigin
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);

      // Eliminar de la bolsa solo los artículos que fueron ordenados
      const orderedKeys = new Set(itemsToOrder.map((i) => i.key));
      setItems((prev) => prev.filter((i) => !orderedKeys.has(i.key)));

      return docRef.id;
    } catch (error) {
      console.error("Error creando orden:", error);
      throw error;
    }
  };

  // 🌟 CÁLCULOS: Totales basados en productos SELECCIONADOS
  const selectedItems = useMemo(
    () => items.filter((i) => i.selected !== false),
    [items]
  );
  const subtotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0),
    [selectedItems]
  );
  // Calcular subtotal elegible para el cupón (solo productos de la tienda del cupón)
  const eligibleCouponSubtotal = useMemo(() => {
    if (!coupon) return 0;
    if (!coupon.storeId) return subtotal;
    return selectedItems
      .filter((i) => (i.storeId || i.product?.storeId) === coupon.storeId)
      .reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  }, [coupon, selectedItems, subtotal]);

  const discountAmount = useMemo(() => {
    if (!coupon || eligibleCouponSubtotal <= 0) return 0;
    const rawDiscount = coupon.type === "percent"
      ? eligibleCouponSubtotal * ((Number(coupon.value) || 0) / 100)
      : (Number(coupon.value) || 0);
    return Math.min(eligibleCouponSubtotal, rawDiscount);
  }, [coupon, eligibleCouponSubtotal]);
  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );
  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
    [items]
  );
  const selectedItemCount = useMemo(
    () => selectedItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
    [selectedItems]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        selectedItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
        coupon,
        setCoupon,
        subtotal,
        discount: discountAmount,
        total,
        itemCount,
        selectedItemCount,
        createOrder,
        selectedStoreId,
        setSelectedStoreId,
        selectStoreOnly,
        toggleItemSelection
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);