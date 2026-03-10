import { useApp } from "../../context/AppContext";

export default function AnnouncementBar() {
  const { settings, storeData } = useApp(); // 🌟 Agregamos storeData

  // 🌟 MAGIA: Leemos el texto de la tienda actual, si no tiene, usamos el global
  const text = storeData?.announcementText ?? settings.announcementText;

  if (!text) return null;

  return (
    <div
      className="w-full py-2 px-4 text-center text-xs font-medium text-white"
      style={{ background: "var(--primary)" }}
    >
      {text}
    </div>
  );
}