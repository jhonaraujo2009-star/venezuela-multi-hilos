import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext"; // 🌟 INYECTAMOS LA TIENDA

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { storeData } = useApp(); // 🌟 SABER DE QUÉ TIENDA ES LA PREGUNTA

  useEffect(() => {
    if (!storeData?.id) return;

    const fetchQ = async () => {
      // 🌟 MAGIA: Traer solo las preguntas públicas de ESTA tienda
      const snap = await getDocs(
        query(
          collection(db, "questions"), 
          where("isPublic", "==", true),
          where("storeId", "==", storeData.id),
          orderBy("createdAt", "desc")
        )
      );
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchQ();
  }, [storeData?.id]);

  const handleSubmit = async () => {
    if (!phone.trim() || !text.trim()) {
      toast.error("Completa todos los campos");
      return;
    }
    if (!storeData?.id) {
      toast.error("Error: No se detectó la tienda.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "questions"), {
        phone,
        text,
        createdAt: serverTimestamp(),
        adminReply: null,
        isPublic: false,
        storeId: storeData.id // 🌟 MAGIA: Guardar la pregunta con la etiqueta del dueño
      });
      setPhone("");
      setText("");
      toast.success("¡Pregunta enviada! Te responderemos pronto 📩");
    } catch {
      toast.error("Error al enviar pregunta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        {/* 🌟 MAGIA: El botón de volver regresa a la tienda correcta */}
        <button onClick={() => navigate(`/${storeData?.id || ""}`)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900">💬 Zona de Preguntas</h1>
      </div>

      <div className="bg-gray-50 rounded-3xl p-5 mb-8 space-y-3">
        <p className="text-sm font-semibold text-gray-700">¿Tienes alguna duda?</p>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Tu número de teléfono"
          type="tel"
          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-pink-300"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu pregunta aquí..."
          rows={3}
          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-pink-300 resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {submitting ? "Enviando..." : "Enviar pregunta"}
        </button>
      </div>

      {questions.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-800 mb-4">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-700 mb-2">❓ {q.text}</p>
                {q.adminReply && (
                  <div className="border-l-2 pl-3" style={{ borderColor: "var(--primary)" }}>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--primary)" }}>
                      Respuesta oficial
                    </p>
                    <p className="text-sm text-gray-600">{q.adminReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}