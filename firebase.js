// firebase.js - Profissional
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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

// Firestore
const db = getFirestore(app);

// Auth
const auth = getAuth(app);

// ================= FUNÇÕES DE AUTH =================

// Login com email e senha
async function loginEmailSenha(email, senha) {
  const userCredential = await signInWithEmailAndPassword(auth, email, senha);
  return userCredential.user;
}

// Logout
async function logoutUser() {
  await signOut(auth);
}

// Monitorar estado do login
function monitorAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user); // user=null se deslogado
  });
}

// ================= FUNÇÕES FIRESTORE =================

// Ler documento
async function getDocData(collection, docId) {
  const ref = doc(db, collection, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// Gravar documento
async function setDocData(collection, docId, data) {
  await setDoc(doc(db, collection, docId), data);
}

// Exportar
export { db, auth, loginEmailSenha, logoutUser, monitorAuth, getDocData, setDocData };
