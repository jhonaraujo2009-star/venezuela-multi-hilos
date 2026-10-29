import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    try {
      window.sessionStorage.removeItem("chunk_retry_refreshed");
    } catch (e) {}
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      window.sessionStorage.removeItem("chunk_retry_refreshed");
    } catch (e) {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-pink-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-pink-500 text-6xl mb-4 animate-bounce">🛍️</div>
            <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">¡Ups! Algo salió mal.</h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Hubo una breve interrupción al sincronizar los datos de la página. Puedes volver a cargarla o ir al inicio sin problemas.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md active:scale-95 w-full text-sm uppercase tracking-wider"
              >
                Volver a cargar la página
              </button>
              <button
                onClick={this.handleGoHome}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-2xl transition-all active:scale-95 w-full text-xs uppercase tracking-wider"
              >
                Ir a la Página Principal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

