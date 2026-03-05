# ✨ E-Commerce App — Ropa & Maquillaje

SPA de E-commerce con React + Tailwind CSS + Firebase.

## 🚀 Instalación rápida

```bash
cd ecommerce-app
npm install
npm run dev
```

## 🔥 Configuración de Firebase

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com)
2. Activa **Authentication** → Email/Password
3. Activa **Firestore Database** (modo producción)
4. Activa **Storage**
5. Copia tu config en `src/config/firebase.js`
6. Crea el primer usuario admin en Firebase Auth Console

## 📁 Estructura del proyecto

```
src/
├── config/
│   ├── firebase.js         # Config Firebase
│   └── schema.js           # Esquema Firestore documentado
├── context/
│   ├── AppContext.jsx       # Tasa cambiaria, settings globales
│   ├── AuthContext.jsx      # Autenticación Firebase
│   └── CartContext.jsx      # Estado del carrito
├── pages/
│   ├── StorePage.jsx        # Tienda principal
│   ├── QuestionsPage.jsx    # Zona de preguntas
│   ├── LoginPage.jsx        # Login admin
│   └── AdminPage.jsx        # Panel admin con rutas
├── components/
│   ├── layout/
│   │   ├── AnnouncementBar.jsx
│   │   ├── Header.jsx
│   │   ├── HeroBanner.jsx
│   │   ├── QuickButtons.jsx
│   │   ├── HappyCustomers.jsx
│   │   └── Footer.jsx
│   ├── product/
│   │   ├── ProductCard.jsx
│   │   ├── ProductCatalog.jsx
│   │   └── ProductModal.jsx
│   ├── cart/
│   │   └── CartDrawer.jsx
│   ├── admin/
│   │   ├── AdminSettings.jsx
│   │   ├── AdminInterface.jsx
│   │   ├── AdminSessions.jsx
│   │   ├── AdminProducts.jsx
│   │   ├── AdminInbox.jsx
│   │   ├── AdminPayments.jsx
│   │   └── AdminLogistics.jsx
│   └── shared/
│       └── ProtectedRoute.jsx
```

## 🗄️ Esquema Firestore

| Colección | Descripción |
|-----------|-------------|
| `config/settings` | Ajustes globales (tasa, WhatsApp, colores) |
| `sessions` | Categorías del catálogo |
| `products` | Productos con variantes y stock |
| `products/{id}/comments` | Comentarios por producto |
| `questions` | Preguntas generales de clientes |
| `payments` | Métodos de pago |
| `coupons` | Códigos de descuento |
| `logistics` | Logos de empresas de envío |

## 📱 Funcionalidades

### Frontend (Cliente)
- ✅ Header fijo con búsqueda en tiempo real
- ✅ Cintillo promocional dinámico
- ✅ Hero banner con foto de perfil
- ✅ Botones de acción rápida
- ✅ Carrusel "Clientes Felices"
- ✅ Catálogo Bento Grid 2 columnas por sesión
- ✅ Lazy loading en imágenes
- ✅ Badge "Agotado" si stock = 0
- ✅ Modal de producto con carrusel de fotos
- ✅ Sistema de variantes con stock individual
- ✅ Comentarios con respuestas admin
- ✅ Zona de preguntas global
- ✅ Carrito flotante con cupones
- ✅ Barra de progreso envío gratis
- ✅ Checkout con métodos de pago
- ✅ Botón WhatsApp con mensaje estructurado

### Panel Admin
- ✅ Login protegido con Firebase Auth
- ✅ Ajustes globales (tasa, WhatsApp, color)
- ✅ Gestor de interfaz (fotos, textos, RRSS)
- ✅ CRUD de sesiones con toggle visible/oculto
- ✅ CRUD de productos con variantes y subida de imágenes
- ✅ Inbox: responder preguntas y comentarios
- ✅ CRUD de métodos de pago (con dato semilla)
- ✅ Gestión logos MRW/Zoom/Tealca
- ✅ Creador de cupones de descuento

## 🔒 Reglas Firestore recomendadas

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Config solo lectura pública, escritura admin
    match /config/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Productos y sesiones: lectura pública
    match /sessions/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
      match /comments/{commentId} {
        allow read: if true;
        allow create: if true; // Clientes pueden comentar
        allow update, delete: if request.auth != null;
      }
    }
    // Preguntas: crear público, gestión admin
    match /questions/{doc} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    // Pagos, cupones, logística: solo admin
    match /{collection}/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
