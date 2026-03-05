import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; 
import App from "./App.jsx";
// Línea mágica para registrar la aplicación móvil
import { registerSW } from 'virtual:pwa-register';

// Registro del Service Worker para que sea instalable
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);