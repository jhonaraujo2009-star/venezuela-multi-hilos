import { useState, useEffect, useRef, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import toast from "react-hot-toast";

/**
 * Sonido nativo de alerta / campana de caja registradora usando Web Audio API.
 * No depende de descargas externas de archivos mp3 y suena directamente en el dispositivo.
 */
export const playOrderChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Tono 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tono 2: A5 (880 Hz) - Brillo tipo campana
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.warn("No se pudo reproducir el sonido del pedido:", e);
  }
};

/**
 * Hook para escuchar pedidos entrantes en tiempo real y disparar notificaciones Push,
 * vibración y sonido en el teléfono del administrador.
 */
export function useOrderNotifications(storeId) {
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [pendingCount, setPendingCount] = useState(0);
  const knownOrdersRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  // Solicitar permiso oficial del sistema
  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones");
      return "unsupported";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("¡Notificaciones Push activadas en tu teléfono! 🔔");
        // Prueba de sonido y vibración inmediata
        playOrderChime();
        if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
      } else if (result === "denied") {
        toast.error("Permiso de notificaciones bloqueado en el navegador");
      }
      return result;
    } catch (e) {
      console.error("Error pidiendo permiso de notificación:", e);
      return "denied";
    }
  }, []);

  useEffect(() => {
    if (!storeId) return;

    // Escuchar únicamente pedidos pendientes de esta tienda
    const q = query(
      collection(db, "orders"),
      where("storeId", "==", storeId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingCount(snapshot.size);

        if (isInitialLoadRef.current) {
          // Carga inicial: registramos las órdenes existentes para no spamear
          snapshot.docs.forEach((doc) => knownOrdersRef.current.add(doc.id));
          isInitialLoadRef.current = false;
          return;
        }

        // Inspeccionar cambios en tiempo real
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !knownOrdersRef.current.has(change.doc.id)) {
            knownOrdersRef.current.add(change.doc.id);
            const order = change.doc.data();

            const customerName = order.customerName || order.customer?.name || "Un cliente";
            const orderTotal = Number(order.totalAmount || order.total || 0).toFixed(2);

            // 1. Sonido de campana / caja registradora
            playOrderChime();

            // 2. Vibración fuerte en móvil
            if ("vibrate" in navigator) {
              try {
                navigator.vibrate([200, 100, 200, 100, 400]);
              } catch (e) {}
            }

            // 3. Notificación nativa del sistema (Push de PWA)
            const title = `🛍️ ¡Nuevo Pedido de ${customerName}!`;
            const body = `Total: $${orderTotal} - Toca aquí para ver en Pedidos por Confirmar`;

            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.showNotification(title, {
                    body,
                    icon: "/logo192.png",
                    badge: "/logo192.png",
                    vibrate: [200, 100, 200],
                    tag: `order-${change.doc.id}`,
                    data: { url: `/${storeId}/admin/inbox` }
                  });
                });
              } else {
                try {
                  const notif = new Notification(title, {
                    body,
                    icon: "/logo192.png"
                  });
                  notif.onclick = () => {
                    window.focus();
                    window.location.href = `/${storeId}/admin/inbox`;
                  };
                } catch (e) {}
              }
            }

            // 4. Toast visible en pantalla
            toast(
              (t) => (
                <div 
                  onClick={() => {
                    toast.dismiss(t.id);
                    window.location.href = `/${storeId}/admin/inbox`;
                  }}
                  className="cursor-pointer"
                >
                  <p className="font-black text-sm text-gray-900">🛍️ ¡NUEVO PEDIDO RECIBIDO!</p>
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">
                    {customerName} acaba de ordenar <strong className="text-pink-600">${orderTotal}</strong>
                  </p>
                  <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider block mt-1">
                    Toca para confirmar ➔
                  </span>
                </div>
              ),
              { duration: 12000, icon: "🔔", id: `toast-order-${change.doc.id}` }
            );
          }
        });
      },
      (error) => {
        console.warn("Error en listener de pedidos para notificaciones:", error);
      }
    );

    return () => unsubscribe();
  }, [storeId]);

  return {
    permission,
    requestPermission,
    pendingCount
  };
}
