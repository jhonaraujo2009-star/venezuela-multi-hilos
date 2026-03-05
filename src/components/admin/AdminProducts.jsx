import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, getDocs
} from "firebase/firestore";
import { db } from "../../config/firebase";
import toast from "react-hot-toast";

// ==========================================
// 1. VARIANT MANAGER
// ==========================================
function VariantManager({ variants, onChange }) {
  const addVariant = () => {
    onChange([...variants, { id: Date.now().toString(), label: "", stock: 0 }]);
  };
  const removeVariant = (id) => onChange(variants.filter((v) => v.id !== id));
  const updateVariant = (id, field, value) =>
    onChange(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-600">Variantes (Tallas/Colores)</label>
        <button type="button" onClick={addVariant}
          className="text-xs px-3 py-1 rounded-xl font-semibold text-white"
          style={{ background: "var(--primary)" }}>
          + Agregar_Productos
        </button>
      </div>
      <div className="space-y-2">
        {variants.map((v) => (
          <div key={v.id} className="flex gap-2">
            <input
              value={v.label}
              onChange={(e) => updateVariant(v.id, "label", e.target.value)}
              placeholder="Nombre (ej. Talla M)"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
            />
            <input
              type="number"
              value={v.stock}
              onChange={(e) => updateVariant(v.id, "stock", parseInt(e.target.value) || 0)}
              placeholder="Stock"
              className="w-20 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
            />
            <button type="button" onClick={() => removeVariant(v.id)}
              className="px-2 py-2 text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 2. PRODUCT FORM
// ==========================================
function ProductForm({ sessions, product, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    oldPrice: product?.oldPrice || "", 
    sessionId: product?.sessionId || "",
    totalStock: product?.totalStock || 0,
    images: product?.images || [],
    variants: product?.variants || [],
    offerDiscount: product?.offerDiscount || "",
    offerHours: "", 
    offerEndsAt: product?.offerEndsAt || null,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    
    try {
      const urls = await Promise.all(
        files.map(async (f) => {
          const formData = new FormData();
          formData.append("file", f);
          formData.append("upload_preset", "tienda_maquillaje"); 

          const res = await fetch(
            "https://api.cloudinary.com/v1_1/dp3abweme/image/upload", 
            { method: "POST", body: formData }
          );
          const data = await res.json();
          return data.secure_url;
        })
      );
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      toast.success("Imágenes listas");
    } catch (error) {
      console.error(error);
      toast.error("Error al subir a Cloudinary");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((u) => u !== url) }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.sessionId) {
      toast.error("Completa nombre, precio y sesión");
      return;
    }
    setSaving(true);
    try {
      let finalOfferEndsAt = form.offerEndsAt;
      if (form.offerHours && form.offerDiscount) {
        finalOfferEndsAt = Date.now() + (parseFloat(form.offerHours) * 60 * 60 * 1000);
      }

      const data = {
        ...form,
        price: parseFloat(form.price),
        oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
        totalStock: form.variants.length
          ? form.variants.reduce((s, v) => s + (v.stock || 0), 0)
          : parseInt(form.totalStock) || 0,
        offerDiscount: form.offerDiscount ? parseFloat(form.offerDiscount) : null,
        offerEndsAt: finalOfferEndsAt,
        updatedAt: serverTimestamp(),
      };

      if (product?.id) {
        await updateDoc(doc(db, "products", product.id), data);
        toast.success("Producto actualizado ✅");
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp(), salesCount: 0 });
        toast.success("Producto creado ✅");
      }
      onClose();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{product ? "Editar Producto" : "Nuevo Producto"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Sesión</label>
            <select
              value={form.sessionId}
              onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none"
            >
              <option value="">Seleccionar sesión...</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Precio Actual (USD)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full bg-pink-50 border border-pink-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-400 font-bold text-pink-600" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Precio Anterior (Opcional)</label>
              <input type="number" step="0.01" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                placeholder="Opcional"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 text-gray-500 line-through" />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100">
            <label className="block text-sm font-black text-pink-600 mb-2">⚡ Oferta Relámpago</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Descuento (%)</label>
                <input type="number" placeholder="Ej: 15" value={form.offerDiscount} onChange={e => setForm({...form, offerDiscount: e.target.value})} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-sm outline-none font-bold text-pink-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Duración (Horas)</label>
                <input type="number" placeholder="Ej: 24" value={form.offerHours} onChange={e => setForm({...form, offerHours: e.target.value})} className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
            </div>
            {form.offerEndsAt > Date.now() && (
              <div className="mt-3 flex items-center justify-between bg-white p-2 rounded-xl border border-pink-100">
                <span className="text-[10px] font-bold text-red-500 animate-pulse">⏳ Oferta Activa actualmente</span>
                <button type="button" onClick={() => setForm({...form, offerDiscount: "", offerHours: "", offerEndsAt: null})} className="text-[10px] font-bold text-gray-400 hover:text-red-500">✕ Quitar</button>
              </div>
            )}
          </div>

          {form.variants.length === 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Stock total (sin variantes)</label>
              <input type="number" value={form.totalStock} onChange={(e) => setForm({ ...form, totalStock: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pink-300" />
            </div>
          )}

          <VariantManager variants={form.variants} onChange={(v) => setForm({ ...form, variants: v })} />

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Imágenes del producto</label>
            <div className="grid grid-cols-3 gap-2">
              {form.images.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                </div>
              ))}
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-pink-300 transition-colors">
                {uploading ? <span className="text-xs text-gray-400 animate-pulse">Subiendo...</span> : <span className="text-gray-400 text-2xl">+</span>}
                <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || uploading}
            className="w-full py-3 rounded-2xl text-white font-bold disabled:opacity-50"
            style={{ background: "var(--primary)" }}>
            {saving ? "Guardando..." : "Guardar producto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. ADMIN PRODUCTS (BUSCADOR + ACORDEÓN REPARADO CSS GRID)
// ==========================================
export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formProduct, setFormProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // ESTADOS DEL BUSCADOR Y ACORDEÓN
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    getDocs(collection(db, "sessions")).then((snap) =>
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  const deleteProduct = async (id, e) => {
    e.stopPropagation(); 
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteDoc(doc(db, "products", id));
    toast.success("Producto eliminado");
  };

  const editProduct = (p, e) => {
    e.stopPropagation(); 
    setFormProduct(p);
    setShowForm(true);
  };

  // 🔍 LÓGICA DE BÚSQUEDA INTELIGENTE
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedProducts = sessions.map(session => ({
    ...session,
    items: filteredProducts.filter(p => p.sessionId === session.id)
  }));

  const orphanProducts = filteredProducts.filter(p => !sessions.find(s => s.id === p.sessionId));
  if (orphanProducts.length > 0) {
    groupedProducts.push({ id: 'orphans', name: 'Sin Categoría', items: orphanProducts });
  }

  const displayGroups = searchTerm 
    ? groupedProducts.filter(group => group.items.length > 0) 
    : groupedProducts;

  const toggleSession = (id) => {
    setExpandedSessionId(prev => prev === id ? null : id);
  };

  const isExpanded = (groupId) => {
    if (searchTerm !== "") return true; 
    return expandedSessionId === groupId; 
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📦 Inventario</h2>
        <button
          onClick={() => { setFormProduct(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-2xl text-white text-sm font-black shadow-lg hover:scale-105 transition-transform"
          style={{ background: "var(--primary)" }}>
          + Agregar_Productos
        </button>
      </div>

      {/* 🌟 BARRA DE BÚSQUEDA VIP 🌟 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-400 text-lg">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-50 transition-all shadow-sm"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-pink-500"
          >
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {displayGroups.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm p-8 text-center border border-gray-100">
              <span className="text-4xl block mb-3">
                {searchTerm ? "🕵️‍♂️" : "📁"}
              </span>
              <p className="text-gray-500 text-sm font-semibold">
                {searchTerm ? `No se encontraron productos para "${searchTerm}"` : "Crea una categoría y agrega productos."}
              </p>
            </div>
          ) : (
            displayGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
                
                {/* Cabecera del Acordeón */}
                <button 
                  onClick={() => toggleSession(group.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl shadow-inner">
                      {isExpanded(group.id) ? "📂" : "📁"}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 text-sm">{group.name}</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{group.items.length} Productos</p>
                    </div>
                  </div>
                  <div className={`transform transition-transform duration-300 text-gray-400 ${isExpanded(group.id) ? "rotate-180" : ""}`}>
                    ▼
                  </div>
                </button>

                {/* 🌟 LA MAGIA DE CSS GRID: Adiós saltos y cortes 🌟 */}
                <div 
                  className={`grid transition-all duration-500 ease-in-out ${
                    isExpanded(group.id) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-gray-50 divide-y divide-gray-50/50">
                      {group.items.length === 0 ? (
                        <div className="p-5 text-center text-xs text-gray-400 italic">No hay productos en esta categoría.</div>
                      ) : (
                        group.items.map((p) => {
                          const stock = p.variants?.length
                            ? p.variants.reduce((s, v) => s + (v.stock || 0), 0)
                            : (p.totalStock ?? 0);

                          return (
                            <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-pink-50/30 transition-colors group/item">
                              <div className="w-4 border-b-2 border-l-2 border-gray-100 h-8 -mt-8 ml-2 rounded-bl-lg absolute" />
                              
                              <div className="ml-8 w-12 h-12 rounded-xl overflow-hidden bg-gray-50 shadow-sm flex-shrink-0">
                                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full text-gray-300">🖼️</span>}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 truncate flex items-center gap-2">
                                  {p.name} 
                                  {p.offerEndsAt > Date.now() && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] rounded-md font-black animate-pulse">⚡ OFERTA</span>}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-xs font-black ${p.oldPrice || (p.offerEndsAt > Date.now()) ? "text-pink-500" : "text-gray-500"}`}>${p.price}</span>
                                  {p.oldPrice && <span className="line-through text-gray-300 text-[10px]">${p.oldPrice}</span>}
                                  <span className="text-gray-300 text-[10px]">|</span>
                                  <span className="text-[10px] font-bold text-gray-400">Stock: {stock}</span>
                                </div>
                              </div>

                              <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button onClick={(e) => editProduct(p, e)} className="p-2 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-pink-500 hover:border-pink-200 transition-all text-sm">✏️</button>
                                <button onClick={(e) => deleteProduct(p.id, e)} className="p-2 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-red-500 hover:border-red-200 transition-all text-sm">🗑️</button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {showForm && (
        <ProductForm
          sessions={sessions}
          product={formProduct}
          onClose={() => { setShowForm(false); setFormProduct(null); }}
        />
      )}
    </div>
  );
}