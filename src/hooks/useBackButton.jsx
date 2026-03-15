import { useEffect } from "react";

export function useBackButton(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;

    // Cuando el modal se abre, agregamos una entrada ficticia al historial
    // para que el evento popstate tenga algo que "consumir" al pulsar Atrás.
    window.history.pushState({ isModalOpen: true }, "");

    const handlePopState = (e) => {
      // El usuario presionó atrás físico o gesto de deslizar en el móvil.
      // Se consumió la entrada del historial. Cerramos el modal.
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      // NOTA: Quitar el window.history.back() aquí porque provocaba
      // un bug de renderizado que cerraba el modal inmediatamente en algunos dispositivos
      // o corrompe el historial de React Router al desmontar rápido.
    };
  }, [isOpen, onClose]);
}
