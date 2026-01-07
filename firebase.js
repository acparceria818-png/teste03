// firebase.js - Configuração do Firebase e funções de acesso

// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCHQ_Z7A1Itw8zjsq51lyhQ_4JLeRv7O4Q",
  authDomain: "ac-transporte-portal.firebaseapp.com",
  projectId: "ac-transporte-portal",
  storageBucket: "ac-transporte-portal.appspot.com",
  messagingSenderId: "776054424872",
  appId: "1:776054424872:web:dcfef13afb7b8922ea8b8a",
  measurementId: "G-0XLQV83QK6"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ========== FUNÇÕES DE COLABORADORES ==========

// Buscar colaborador por matrícula
export const getColaborador = async (matricula) => {
  try {
    const docRef = doc(db, "colaboradores", matricula);
    return await getDoc(docRef);
  } catch (erro) {
    console.error("Erro ao buscar colaborador:", erro);
    throw erro;
  }
};

// Buscar colaborador por email
export const getColaboradorByEmail = async (email) => {
  try {
    const q = query(collection(db, "colaboradores"), where("email", "==", email));
    const snapshot = await getDocs(q);
    return snapshot;
  } catch (erro) {
    console.error("Erro ao buscar colaborador por email:", erro);
    throw erro;
  }
};

// ========== FUNÇÕES DE LOCALIZAÇÃO E ROTAS ==========

// Atualizar localização do motorista
export const updateLocalizacao = async (matricula, dados) => {
  try {
    const docRef = doc(db, "rotas_em_andamento", matricula);
    await setDoc(docRef, {
      ...dados,
      ultimaAtualizacao: serverTimestamp()
    }, { merge: true });
  } catch (erro) {
    console.error("Erro ao atualizar localização:", erro);
    throw erro;
  }
};

// Monitorar rotas em tempo real
export const monitorarRotas = (callback) => {
  try {
    const q = query(collection(db, "rotas_em_andamento"), orderBy("ultimaAtualizacao", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rotas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(rotas);
    }, (erro) => {
      console.error("Erro ao monitorar rotas:", erro);
    });
    
    return unsubscribe;
  } catch (erro) {
    console.error("Erro ao configurar monitoramento:", erro);
    throw erro;
  }
};

// ========== FUNÇÕES DE EMERGÊNCIA ==========

// Registrar nova emergência
export const registrarEmergencia = async (dados) => {
  try {
    const docRef = await addDoc(collection(db, "emergencias"), {
      ...dados,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (erro) {
    console.error("Erro ao registrar emergência:", erro);
    throw erro;
  }
};

// Monitorar emergências em tempo real
export const monitorarEmergencias = (callback) => {
  try {
    const q = query(collection(db, "emergencias"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emergencias = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(emergencias);
    });
    
    return unsubscribe;
  } catch (erro) {
    console.error("Erro ao monitorar emergências:", erro);
    throw erro;
  }
};

// Resolver emergência
export const resolverEmergencia = async (emergenciaId) => {
  try {
    await updateDoc(doc(db, "emergencias", emergenciaId), {
      status: "resolvida",
      resolvidaEm: serverTimestamp()
    });
  } catch (erro) {
    console.error("Erro ao resolver emergência:", erro);
    throw erro;
  }
};

// ========== FUNÇÕES DE FEEDBACK ==========

// Registrar feedback
export const registrarFeedback = async (dados) => {
  try {
    const docRef = await addDoc(collection(db, "feedbacks"), {
      ...dados,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (erro) {
    console.error("Erro ao registrar feedback:", erro);
    throw erro;
  }
};

// Monitorar feedbacks em tempo real
export const monitorarFeedbacks = (callback) => {
  try {
    const q = query(collection(db, "feedbacks"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbacks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(feedbacks);
    });
    
    return unsubscribe;
  } catch (erro) {
    console.error("Erro ao monitorar feedbacks:", erro);
    throw erro;
  }
};

// Resolver feedback
export const resolverFeedback = async (feedbackId) => {
  try {
    await updateDoc(doc(db, "feedbacks", feedbackId), {
      status: "resolvido",
      resolvidoEm: serverTimestamp()
    });
  } catch (erro) {
    console.error("Erro ao resolver feedback:", erro);
    throw erro;
  }
};

// Responder feedback
export const responderFeedback = async (feedbackId, resposta) => {
  try {
    await updateDoc(doc(db, "feedbacks", feedbackId), {
      resposta: resposta,
      respondidoEm: serverTimestamp(),
      status: "respondido"
    });
  } catch (erro) {
    console.error("Erro ao responder feedback:", erro);
    throw erro;
  }
};

// ========== FUNÇÕES DE AVISOS ==========

// Registrar aviso
export const registrarAviso = async (dados) => {
  try {
    const docRef = await addDoc(collection(db, "avisos"), {
      ...dados,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (erro) {
    console.error("Erro ao registrar aviso:", erro);
    throw erro;
  }
};

// Buscar avisos ativos
export const getAvisos = async () => {
  try {
    const q = query(collection(db, "avisos"), 
      where("ativo", "==", true),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (erro) {
    console.error("Erro ao buscar avisos:", erro);
    throw erro;
  }
};

// Monitorar avisos em tempo real
export const monitorarAvisos = (callback) => {
  try {
    const q = query(collection(db, "avisos"), 
      where("ativo", "==", true),
      orderBy("timestamp", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const avisos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(avisos);
    });
    
    return unsubscribe;
  } catch (erro) {
    console.error("Erro ao monitorar avisos:", erro);
    throw erro;
  }
};

// Atualizar aviso
export const updateAviso = async (avisoId, dados) => {
  try {
    await updateDoc(doc(db, "avisos", avisoId), {
      ...dados,
      timestamp: serverTimestamp()
    });
  } catch (erro) {
    console.error("Erro ao atualizar aviso:", erro);
    throw erro;
  }
};

// Excluir aviso
export const deleteAviso = async (avisoId) => {
  try {
    await deleteDoc(doc(db, "avisos", avisoId));
  } catch (erro) {
    console.error("Erro ao excluir aviso:", erro);
    throw erro;
  }
};

// ========== FUNÇÕES DE ESCALAS ==========

// Buscar todas as escalas
export const getEscalas = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "escalas"));
    const escalas = [];
    
    querySnapshot.forEach(doc => {
      escalas.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Ordenar por data de atualização (mais recente primeiro)
    escalas.sort((a, b) => {
      const dateA = a.dataAtualizacao ? new Date(a.dataAtualizacao) : new Date(a.timestamp || 0);
      const dateB = b.dataAtualizacao ? new Date(b.dataAtualizacao) : new Date(b.timestamp || 0);
      return dateB - dateA;
    });
    
    return escalas;
  } catch (erro) {
    console.error('Erro ao buscar escalas:', erro);
    throw erro;
  }
};

// Buscar escala por matrícula (para motorista)
export const getEscalaPorMatricula = async (matricula) => {
  try {
    const q = query(
      collection(db, "escalas"),
      where("matricula", "==", matricula)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Retornar a escala mais recente
    let escalaMaisRecente = null;
    let dataMaisRecente = 0;
    
    querySnapshot.forEach(doc => {
      const escala = {
        id: doc.id,
        ...doc.data()
      };
      
      const dataEscala = escala.dataAtualizacao ? 
        new Date(escala.dataAtualizacao) : 
        new Date(escala.timestamp || 0);
      
      if (dataEscala > dataMaisRecente) {
        dataMaisRecente = dataEscala;
        escalaMaisRecente = escala;
      }
    });
    
    return escalaMaisRecente;
  } catch (erro) {
    console.error('Erro ao buscar escala por matrícula:', erro);
    throw erro;
  }
};

// Adicionar nova escala
export const addEscala = async (dados) => {
  try {
    const docRef = await addDoc(collection(db, "escalas"), {
      ...dados,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (erro) {
    console.error('Erro ao adicionar escala:', erro);
    throw erro;
  }
};

// Atualizar escala
export const updateEscala = async (id, dados) => {
  try {
    await updateDoc(doc(db, "escalas", id), {
      ...dados,
      dataAtualizacao: new Date().toISOString()
    });
  } catch (erro) {
    console.error('Erro ao atualizar escala:', erro);
    throw erro;
  }
};

// Excluir escala
export const deleteEscala = async (id) => {
  try {
    await deleteDoc(doc(db, "escalas", id));
  } catch (erro) {
    console.error('Erro ao excluir escala:', erro);
    throw erro;
  }
};

// ========== FUNÇÕES DE RELATÓRIOS ==========

// Buscar estatísticas do dashboard
export const getEstatisticasDashboard = async () => {
  try {
    // Buscar rotas ativas
    const rotasQuery = query(collection(db, "rotas_em_andamento"), where("ativo", "==", true));
    const rotasSnapshot = await getDocs(rotasQuery);
    const totalRotasAtivas = rotasSnapshot.size;
    
    // Buscar emergências pendentes
    const emergenciasQuery = query(collection(db, "emergencias"), where("status", "==", "pendente"));
    const emergenciasSnapshot = await getDocs(emergenciasQuery);
    const totalEmergencias = emergenciasSnapshot.size;
    
    // Buscar feedbacks pendentes
    const feedbacksQuery = query(collection(db, "feedbacks"), where("status", "==", "pendente"));
    const feedbacksSnapshot = await getDocs(feedbacksQuery);
    const totalFeedbacks = feedbacksSnapshot.size;
    
    // Agrupar rotas por tipo
    const rotas = rotasSnapshot.docs.map(doc => doc.data());
    const rotasPorTipo = {
      operacional: rotas.filter(r => r.rota && r.rota.includes("ROTA") && !r.rota.includes("ADM") && !r.rota.includes("RETORNO")).length,
      adm: rotas.filter(r => r.rota && r.rota.includes("ADM")).length,
      retorno: rotas.filter(r => r.rota && r.rota.includes("RETORNO")).length
    };
    
    return {
      totalRotasAtivas,
      totalEmergencias,
      totalFeedbacks,
      rotasPorTipo
    };
  } catch (erro) {
    console.error("Erro ao buscar estatísticas:", erro);
    return {
      totalRotasAtivas: 0,
      totalEmergencias: 0,
      totalFeedbacks: 0,
      rotasPorTipo: { operacional: 0, adm: 0, retorno: 0 }
    };
  }
};

// Buscar relatórios
export const getRelatorios = async (tipo, periodo) => {
  try {
    let q;
    const agora = new Date();
    const inicioPeriodo = new Date();
    
    if (periodo === "hoje") {
      inicioPeriodo.setHours(0, 0, 0, 0);
    } else if (periodo === "semana") {
      inicioPeriodo.setDate(agora.getDate() - 7);
    } else if (periodo === "mes") {
      inicioPeriodo.setMonth(agora.getMonth() - 1);
    } else {
      inicioPeriodo.setFullYear(agora.getFullYear() - 1);
    }
    
    const timestampInicio = Timestamp.fromDate(inicioPeriodo);
    
    if (tipo === "rotas") {
      q = query(
        collection(db, "rotas_em_andamento"),
        where("timestamp", ">=", timestampInicio),
        orderBy("timestamp", "desc")
      );
    } else if (tipo === "emergencias") {
      q = query(
        collection(db, "emergencias"),
        where("timestamp", ">=", timestampInicio),
        orderBy("timestamp", "desc")
      );
    } else {
      q = query(
        collection(db, "feedbacks"),
        where("timestamp", ">=", timestampInicio),
        orderBy("timestamp", "desc")
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (erro) {
    console.error("Erro ao buscar relatórios:", erro);
    throw erro;
  }
};

// Buscar rotas por tipo
export const getRotasPorTipo = async (tipo) => {
  try {
    let q;
    
    if (tipo === "todas") {
      q = query(collection(db, "rotas_em_andamento"), orderBy("ultimaAtualizacao", "desc"));
    } else {
      q = query(
        collection(db, "rotas_em_andamento"),
        where("ativo", "==", true),
        orderBy("ultimaAtualizacao", "desc")
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (erro) {
    console.error("Erro ao buscar rotas por tipo:", erro);
    throw erro;
  }
};

// Buscar motoristas ativos
export const getMotoristasAtivos = async () => {
  try {
    const q = query(
      collection(db, "rotas_em_andamento"),
      where("ativo", "==", true),
      where("online", "==", true),
      orderBy("ultimaAtualizacao", "desc")
    );
    
    const snapshot = await getDocs(q);
    
    // Agrupar por matrícula para evitar duplicados
    const motoristasUnicos = new Map();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!motoristasUnicos.has(data.matricula)) {
        motoristasUnicos.set(data.matricula, {
          id: doc.id,
          ...data
        });
      }
    });
    
    return Array.from(motoristasUnicos.values());
  } catch (erro) {
    console.error("Erro ao buscar motoristas ativos:", erro);
    throw erro;
  }
};

// Exportar tudo
export {
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
};

console.log("✅ Firebase configurado com sucesso!");
