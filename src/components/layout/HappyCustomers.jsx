import { useApp } from "../../context/AppContext";

export default function HappyCustomers() {
  const { settings, storeData } = useApp(); // 🌟 Agregamos storeData
  
  // 🌟 MAGIA: Buscamos las fotos de la tienda actual
  const images = storeData?.happyCustomerImages || settings.happyCustomerImages || [];

  if (images.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-gray-800 px-4 mb-3">
        ❤️ Clientes Felices
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
        {images.map((img, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-48 h-56 rounded-2xl overflow-hidden shadow-sm snap-start"
          >
            <img
              src={img}
              alt={`Cliente ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}