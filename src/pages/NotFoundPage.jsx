import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-slate-50/60 to-pink-50/20 px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-9xl font-extrabold text-pink-600 drop-shadow-sm">404</h1>
        
        <h2 className="text-3xl font-bold text-gray-900 mt-6 mb-4">
          Página no encontrada
        </h2>
        
        <p className="text-gray-600 mb-8 text-lg">
          Lo sentimos, la tienda o la ruta que estás buscando no existe o fue eliminada. 
          Asegúrate de haber ingresado la dirección correctamente.
        </p>
        
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
