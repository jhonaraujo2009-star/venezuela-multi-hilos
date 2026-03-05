// src/seedFirestore.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// Credenciales reales de TiendaJhonAraujo
const firebaseConfig = {
  apiKey: "AIzaSyD5_Qv9QJ2u8z-p6mX_v7k6L0N5L-XzY", 
  authDomain: "tiendajhonaraujo.firebaseapp.com",
  projectId: "tiendajhonaraujo",
  storageBucket: "tiendajhonaraujo.appspot.com",
  messagingSenderId: "105678912345",
  appId: "1:105678912345:web:a1b2c3d4e5f6g7h8i9j0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// PRODUCTOS: MOTOS
const motos = [
  {
    nombre: "Honda CB 190R",
    categoria: "moto",
    marca: "Honda",
    precio: 4200000,
    stock: 8,
    descripcion: "Moto deportiva 190cc, ideal para ciudad y carretera.",
    imagen: "https://via.placeholder.com/400x300?text=Honda+CB190R",
    destacado: true,
  },
  {
    nombre: "Yamaha FZ 25",
    categoria: "moto",
    marca: "Yamaha",
    precio: 5100000,
    stock: 5,
    descripcion: "Naked sport 250cc con motor de alto rendimiento.",
    imagen: "https://via.placeholder.com/400x300?text=Yamaha+FZ25",
    destacado: true,
  }
];

// PRODUCTOS: REPUESTOS
const repuestos = [
  {
    nombre: "Aceite Motor 4T 10W40 1L",
    categoria: "repuesto",
    subcategoria: "lubricantes",
    marca: "Motul",
    precio: 28000,
    stock: 80,
    descripcion: "Aceite semi-sintético para motores 4 tiempos.",
    imagen: "https://via.placeholder.com/400x300?text=Aceite+Motul",
    destacado: false,
  },
  {
    nombre: "Bujía NGK CR8E",
    categoria: "repuesto",
    subcategoria: "encendido",
    marca: "NGK",
    precio: 18000,
    stock: 100,
    descripcion: "Bujía estándar para motos 4T. Alta durabilidad.",
    imagen: "https://via.placeholder.com/400x300?text=Bujia+NGK",
    destacado: false,
  }
];

async function seedDatabase() {
  console.log("🚀 Iniciando carga de datos en Firestore...\n");
  const productos = [...motos, ...repuestos];

  for (const producto of productos) {
    try {
      const docRef = await addDoc(collection(db, "productos"), {
        ...producto,
        creadoEn: new Date(),
      });
      console.log(`✅ ${producto.nombre} → ID: ${docRef.id}`);
    } catch (error) {
      console.error(`❌ Error al subir "${producto.nombre}":`, error.message);
    }
  }

  console.log(`\n🎉 Seed completado: ${productos.length} productos cargados.`);
  process.exit(0);
}

seedDatabase();