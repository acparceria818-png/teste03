// firebase.js - CONFIGURAÇÃO COMPLETA ATUALIZADA COM FUNÇÕES DE ESCALA
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ================= CONFIGURAÇÃO FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyA5KEaKntt9wPYcy60DutrqvIH34piXsXk",
  authDomain: "transporte-f7aea.firebaseapp.com",
  databaseURL: "https://transporte-f7aea-default-rtdb.firebaseio.com",
  projectId: "transporte-f7aea",
  storageBucket: "transporte-f7aea.firebasestorage.app",
  messagingSenderId: "551406731008",
  appId: "1:551406731008:web:90855ffcd9ac0ef1d93de5"
};

// ================= INICIALIZAÇÃO =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ================= AUTENTICAÇÃO =================
async function loginEmailSenha(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    return userCredential.user;
  } catch (error) {
    throw new Error(getErrorMessage(error.code));
  }
}

async function loginAnonimo() {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Erro login anônimo:', error);
    throw error;
  }
}

function monitorarAutenticacao(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

function getErrorMessage(errorCode) {
  const messages = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-disabled': 'Usuário desativado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
  };
  return messages[errorCode] || 'Erro ao fazer login';
}

// ================= COLABORADORES =================
async function getColaborador(matricula) {
  const docRef = doc(db, 'colaboradores', matricula);
  return await getDoc(docRef);
}

async function getColaboradorByEmail(email) {
  const q = query(
    collection(db, 'colaboradores'),
    where("email", "==", email)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : querySnapshot.docs[0];
}

// ================= ROTAS =================
async function updateLocalizacao(matricula, dados) {
  const docRef = doc(db, 'rotas_em_andamento', matricula);
  return await setDoc(
    docRef,
    { ...dados, ultimaAtualizacao: serverTimestamp() },
    { merge: true }
  );
}

// ================= REGISTROS =================
async function registrarEmergencia(dados) {
  return await addDoc(collection(db, 'emergencias'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function registrarFeedback(dados) {
  return await addDoc(collection(db, 'feedbacks'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function registrarAviso(dados) {
  return await addDoc(collection(db, 'avisos'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

// ================= AVISOS - CRUD completo =================
async function getAvisos() {
  const q = query(collection(db, 'avisos'), 
    where("ativo", "==", true),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updateAviso(avisoId, dados) {
  const docRef = doc(db, 'avisos', avisoId);
  return await updateDoc(docRef, {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function deleteAviso(avisoId) {
  const docRef = doc(db, 'avisos', avisoId);
  return await deleteDoc(docRef);
}

// ================= ESCALAS - CRUD completo =================
async function getEscalas() {
  try {
    const snapshot = await getDocs(collection(db, 'escalas'));
    const escalas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Ordenar por data de atualização (mais recente primeiro)
    escalas.sort((a, b) => {
      const dateA = a.dataAtualizacao ? new Date(a.dataAtualizacao) : new Date(a.timestamp || 0);
      const dateB = b.dataAtualizacao ? new Date(b.dataAtualizacao) : new Date(b.timestamp || 0);
      return dateB - dateA;
    });
    
    return escalas;
  } catch (error) {
    console.error('Erro ao buscar escalas:', error);
    return [];
  }
}

async function getEscalaPorMatricula(matricula) {
  try {
    const q = query(
      collection(db, 'escalas'),
      where("matricula", "==", matricula)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('Nenhuma escala encontrada para matrícula:', matricula);
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
  } catch (error) {
    console.error('Erro ao buscar escala por matrícula:', error);
    return null;
  }
}

async function addEscala(dados) {
  return await addDoc(collection(db, 'escalas'), {
    ...dados,
    timestamp: serverTimestamp()
  });
}

async function updateEscala(escalaId, dados) {
  const docRef = doc(db, 'escalas', escalaId);
  return await updateDoc(docRef, {
    ...dados,
    dataAtualizacao: new Date().toISOString(),
    timestamp: serverTimestamp()
  });
}

async function deleteEscala(escalaId) {
  const docRef = doc(db, 'escalas', escalaId);
  return await deleteDoc(docRef);
}

// ================= STORAGE - UPLOAD DE IMAGENS =================
async function uploadImagemEscala(file, motorista, matricula) {
  try {
    console.log('📤 Iniciando upload da imagem...');
    
    // Criar nome único para o arquivo
    const timestamp = Date.now();
    const nomeArquivo = `escala_${matricula}_${timestamp}.${file.name.split('.').pop()}`;
    const caminhoStorage = `escalas/${nomeArquivo}`;
    
    // Referência no Storage
    const storageRef = ref(storage, caminhoStorage);
    
    // Metadata do arquivo
    const metadata = {
      contentType: file.type,
      customMetadata: {
        motorista: motorista,
        matricula: matricula,
        dataUpload: new Date().toISOString()
      }
    };
    
    // Fazer upload
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('✅ Upload concluído:', snapshot.metadata.name);
    
    // Obter URL de download
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('🔗 URL da imagem:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Erro no upload da imagem:', error);
    throw error;
  }
}

async function deletarImagemEscala(urlImagem) {
  try {
    // Extrair o caminho da URL
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    const pathStart = urlImagem.indexOf('/o/') + 3;
    const pathEnd = urlImagem.indexOf('?');
    const filePath = urlImagem.substring(pathStart, pathEnd);
    const decodedPath = decodeURIComponent(filePath);
    
    const storageRef = ref(storage, decodedPath);
    await deleteObject(storageRef);
    console.log('🗑️ Imagem excluída:', decodedPath);
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    throw error;
  }
}

// ================= MONITORAMENTO =================
function monitorarRotas(callback) {
  // Primeiro faz login anônimo para acessar dados
  loginAnonimo().then(() => {
    const q = query(collection(db, 'rotas_em_andamento'), 
      where("ativo", "==", true)
    );
    
    return onSnapshot(q, snapshot => {
      const rotas = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.ativo !== false) {
          rotas.push({ id: docSnap.id, ...data });
        }
      });
      callback(rotas);
    }, (error) => {
      console.error('Erro monitorar rotas:', error);
    });
  }).catch(error => {
    console.error('Erro login anônimo para monitoramento:', error);
  });
}

function monitorarEmergencias(callback) {
  loginAnonimo().then(() => {
    const q = query(collection(db, 'emergencias'), 
      where("status", "==", "pendente"),
      orderBy("timestamp", "desc")
    );
    
    return onSnapshot(q, snapshot => {
      const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(dados);
    });
  });
}

function monitorarFeedbacks(callback) {
  loginAnonimo().then(() => {
    const q = query(collection(db, 'feedbacks'), 
      where("status", "==", "pendente"),
      orderBy("timestamp", "desc")
    );
    
    return onSnapshot(q, snapshot => {
      const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(dados);
    });
  });
}

function monitorarAvisos(callback) {
  loginAnonimo().then(() => {
    const q = query(collection(db, 'avisos'), 
      where("ativo", "==", true),
      orderBy("timestamp", "desc")
    );
    
    return onSnapshot(q, snapshot => {
      const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(dados);
    });
  });
}

// ================= RELATÓRIOS =================
async function getRelatorios() {
  try {
    // Verificar se a coleção existe
    const snapshot = await getDocs(collection(db, 'relatorios'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    return [];
  }
}

// ================= ADMIN - FUNÇÕES DE EMERGÊNCIA =================
async function resolverEmergencia(emergenciaId) {
  const docRef = doc(db, 'emergencias', emergenciaId);
  return await updateDoc(docRef, {
    status: 'resolvida',
    resolvidaEm: serverTimestamp()
  });
}

// ================= ADMIN - FUNÇÕES DE FEEDBACK =================
async function resolverFeedback(feedbackId) {
  const docRef = doc(db, 'feedbacks', feedbackId);
  return await updateDoc(docRef, {
    status: 'resolvido',
    resolvidoEm: serverTimestamp()
  });
}

async function responderFeedback(feedbackId, resposta) {
  const docRef = doc(db, 'feedbacks', feedbackId);
  return await updateDoc(docRef, {
    status: 'respondido',
    resposta: resposta,
    respondidoEm: serverTimestamp()
  });
}

// ================= DASHBOARD =================
async function getEstatisticasDashboard() {
  try {
    // Fazer login anônimo primeiro
    await loginAnonimo();
    
    const [rotasSnapshot, emergenciasSnapshot, feedbacksSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'rotas_em_andamento'), where('ativo', '==', true))),
      getDocs(query(collection(db, 'emergencias'), where('status', '==', 'pendente'))),
      getDocs(query(collection(db, 'feedbacks'), where('status', '==', 'pendente')))
    ]);

    return {
      totalRotasAtivas: rotasSnapshot.docs.length,
      totalEmergencias: emergenciasSnapshot.docs.length,
      totalFeedbacks: feedbacksSnapshot.docs.length,
      rotasPorTipo: await getRotasPorTipo(),
      motoristasAtivos: await getMotoristasAtivos()
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      totalRotasAtivas: 0,
      totalEmergencias: 0,
      totalFeedbacks: 0,
      rotasPorTipo: { adm: 0, operacional: 0, retorno: 0 },
      motoristasAtivos: 0
    };
  }
}

async function getRotasPorTipo() {
  try {
    const snapshot = await getDocs(query(collection(db, 'rotas_em_andamento'), where('ativo', '==', true)));
    
    const tipos = {
      'adm': 0,
      'operacional': 0,
      'retorno': 0
    };
    
    snapshot.docs.forEach(doc => {
      const rota = doc.data();
      const nomeRota = rota.rota || '';
      if (nomeRota.includes('ADM')) tipos.adm++;
      else if (nomeRota.includes('RETORNO')) tipos.retorno++;
      else tipos.operacional++;
    });
    
    return tipos;
  } catch (error) {
    console.error('Erro ao buscar rotas por tipo:', error);
    return { adm: 0, operacional: 0, retorno: 0 };
  }
}

async function getMotoristasAtivos() {
  try {
    const snapshot = await getDocs(query(collection(db, 'rotas_em_andamento'), where('ativo', '==', true)));
    return snapshot.docs.length;
  } catch (error) {
    console.error('Erro ao buscar motoristas ativos:', error);
    return 0;
  }
}

// ================= INICIALIZAÇÃO =================
async function inicializarFirebase() {
  try {
    // Fazer login anônimo para acessar dados
    await loginAnonimo();
    console.log('✅ Firebase inicializado com login anônimo');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    return false;
  }
}

// ================= EXPORTAÇÕES =================
export {
  // Firebase
  db,
  auth,
  storage,
  
  // Firestore
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
  
  // Autenticação
  signInWithEmailAndPassword,
  signOut,
  loginAnonimo,
  monitorarAutenticacao,
  
  // Colaboradores
  getColaborador,
  getColaboradorByEmail,
  
  // Rotas
  updateLocalizacao,
  
  // Registros
  registrarEmergencia,
  registrarFeedback,
  registrarAviso,
  
  // Avisos
  getAvisos,
  updateAviso,
  deleteAviso,
  
  // Escalas
  getEscalas,
  getEscalaPorMatricula,
  addEscala,
  updateEscala,
  deleteEscala,
  
  // Storage
  uploadImagemEscala,
  deletarImagemEscala,
  
  // Monitoramento
  monitorarRotas,
  monitorarEmergencias,
  monitorarFeedbacks,
  monitorarAvisos,
  
  // Relatórios
  getRelatorios,
  
  // Emergências
  resolverEmergencia,
  
  // Feedbacks
  resolverFeedback,
  responderFeedback,
  
  // Dashboard
  getEstatisticasDashboard,
  getRotasPorTipo,
  getMotoristasAtivos,
  
  // Inicialização
  inicializarFirebase
};
