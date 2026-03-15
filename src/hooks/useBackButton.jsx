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

      // Si el componente se desmonta o isOpen pasa a false por otra vía (ej. clic en la X)
      // necesitamos limpiar la entrada del historial si sigue ahí, para no romper la navegación real de React Router.
      if (window.history.state?.isModalOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}
