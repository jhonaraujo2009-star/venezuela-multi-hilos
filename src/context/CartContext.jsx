import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useApp } from "./AppContext"; // 🌟 MAGIA: Conectamos el carrito con el cerebro

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { storeData } = useApp(); // 🌟 Saber en qué tienda estamos
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [coupon, setCoupon] = useState(null);

  // 🌟 MAGIA: Cargar la bolsa correcta según la tienda
  useEffect(() => {
    if (!storeData?.id) return;
    
    const cartKey = `cart_${storeData.id}`; // Ej: cart_oscar o cart_cuentas_multiples
    try {
      const localData = localStorage.getItem(cartKey);
      if (localData) {
        setItems(JSON.parse(localData));
      } else {
        setItems([]); // Si no hay nada guardado para esta tienda, la bolsa va vacía
      }
    } catch (error) {
      setItems([]);
    }
  }, [storeData?.id]);

  // 🌟 MAGIA: Guardar los productos en la bolsa de esta tienda específica
  useEffect(() => {
    if (!storeData?.id) return;
    
    const cartKey = `cart_${storeData.id}`;
    localStorage.setItem(cartKey, JSON.stringify(items));
  }, [items, storeData?.id]);

  const addItem = useCallback((product, variant, quantity) => {
    setItems((prev) => {
      const key = `${product.id}-${variant?.id || "default"}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          key,
          product,
          variant,
          quantity,
          price: product.price,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.key !== key));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.key === key ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const createOrder = async (customerData) => {
    try {
      const orderData = {
        customerName: customerData.name,
        customerPhone: customerData.phone,
        items: items.map(i => ({
          id: i.product.id,
          name: i.product.name,
          qty: i.quantity,
          price: i.price,
          variant: i.variant?.label || null 
        })),
        totalAmount: total,
        status: "pending",
        createdAt: serverTimestamp(),
        storeId: storeData?.id // 🌟 MAGIA: Le pegamos la etiqueta de la tienda a la orden para que el dueño correcto lo reciba
      };
      const docRef = await addDoc(collection(db, "orders"), orderData);
      return docRef.id;
    } catch (error) {
      console.error("Error creando orden:", error);
      throw error;
    }
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = coupon ? (coupon.type === "percent" ? subtotal * (coupon.value / 100) : coupon.value) : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items, addItem, removeItem, updateQuantity, clearCart,
        isOpen, setIsOpen, coupon, setCoupon, subtotal, 
        discount: discountAmount, total, itemCount, createOrder
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);