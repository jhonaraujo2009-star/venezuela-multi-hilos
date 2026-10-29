import { useEffect, useRef } from "react";

// 🌟 PILA GLOBAL DE NAVEGACIÓN INTERNA (Colección -> Categoría -> Modal / Bolsa)
// Permite que al pulsar el botón físico "Atrás" del teléfono se retroceda
// paso a paso (del modal a la categoría, de la categoría a la colección,
// y de la colección al inicio de la tienda) sin cerrar la aplicación.
const backStack = [];
let ignorePopStateCount = 0;
let isGlobalListenerAttached = false;

function ensureGlobalPopStateListener() {
  if (isGlobalListenerAttached || typeof window === "undefined") return;
  isGlobalListenerAttached = true;

  window.addEventListener("popstate", () => {
    if (ignorePopStateCount > 0) {
      ignorePopStateCount--;
      return;
    }

    if (backStack.length > 0) {
      const topEntry = backStack.pop();
      if (topEntry) {
        topEntry.closedByPopState = true;
        topEntry.onClose();
      }
    }
  });
}

export function useBackButton(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    ensureGlobalPopStateListener();

    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry = {
      id: entryId,
      closedByPopState: false,
      onClose: () => {
        if (onCloseRef.current) onCloseRef.current();
      }
    };

    backStack.push(entry);

    // Agregamos una entrada al historial conservando el state de React Router
    const currentState = window.history.state || {};
    window.history.pushState({ ...currentState, _backGuard: entryId }, "");

    return () => {
      const idx = backStack.indexOf(entry);
      if (idx !== -1) {
        backStack.splice(idx, 1);
      }

      // Si se cerró con un botón en pantalla (y no con el botón físico Atrás)
      // limpiamos la entrada ficticia del historial.
      if (!entry.closedByPopState && window.history.state?._backGuard) {
        ignorePopStateCount++;
        window.history.back();
        setTimeout(() => {
          ignorePopStateCount = 0;
        }, 300);
      }
    };
  }, [isOpen]);
}

