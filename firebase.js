// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5KEaKntt9wPYcy60DutrqvIH34piXsXk",
  authDomain: "transporte-f7aea.firebaseapp.com",
  projectId: "transporte-f7aea",
  storageBucket: "transporte-f7aea.firebasestorage.app",
  messagingSenderId: "551406731008",
  appId: "1:551406731008:web:90855ffcd9ac0ef1d93de5"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta Firestore e funções úteis
export const db = getFirestore(app);
export { doc, setDoc };
