import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; 
import App from "./App.jsx";
// Línea mágica para registrar la aplicación móvil
import { registerSW } from 'virtual:pwa-register';

// Limpieza de Service Workers y caché en desarrollo local para evitar bloqueos
if (import.meta.env.DEV && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if (typeof caches !== 'undefined') {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
} else {
  // Registro del Service Worker con actualización inmediata para que nunca sirva versiones viejas en caché
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);