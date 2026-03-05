import { useApp } from "../../context/AppContext";

export default function AnnouncementBar() {
  const { settings } = useApp();

  if (!settings.announcementText) return null;

  return (
    <div
      className="w-full py-2 px-4 text-center text-xs font-medium text-white"
      style={{ background: "var(--primary)" }}
    >
      {settings.announcementText}
    </div>
  );
}
