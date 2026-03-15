import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que la próxima vez que se renderice muestre la UI alternativa
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // También puedes reportar el error a un servicio de análisis (p. ej. Sentry)
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Plantilla base cuando la aplicación entera falla
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Ups! Algo salió mal.</h1>
            <p className="text-gray-600 mb-6">
              Ha ocurrido un error inesperado al cargar esta parte de la aplicación.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md w-full"
            >
              Volver a cargar la página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
