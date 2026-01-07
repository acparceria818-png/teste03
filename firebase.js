// firebase.js - VERSÃO FINAL COM BASE64 NO FIRESTORE
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
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ================= CONFIGURAÇÃO FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyA5KEaKntt9wPYcy60DutrqvIH34piXsXk",
  authDomain: "transporte-f7aea.firebaseapp.com",
  databaseURL: "https://transporte-f7aea-default-rtdb.firebaseio.com",
  projectId: "transporte-f7aea",
  storageBucket: "transporte-f7aea.firebasestorage.app", // Não usado
  messagingSenderId: "551406731008",
  appId: "1:551406731008:web:90855ffcd9ac0ef1d93de5"
};

// ================= INICIALIZAÇÃO =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================= FUNÇÕES DE PROCESSAMENTO DE IMAGENS =================

// Função para otimizar imagem (reduzir tamanho)
function otimizarImagem(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type.match('image.*')) {
      resolve(file);
      return;
    }
    
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = function(e) {
      img.src = e.target.result;
      
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calcular novo tamanho mantendo proporção
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }
        
        // Configurar canvas
        canvas.width = width;
        canvas.height = height;
        
        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converter para base64 com qualidade reduzida
        const base64 = canvas.toDataURL('image/jpeg', quality);
        
        // Criar novo arquivo otimizado
        const byteString = atob(base64.split(',')[1]);
        const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        const arquivoOtimizado = new File([blob], file.name, { 
          type: mimeString,
          lastModified: Date.now()
        });
        
        console.log(`📊 Imagem otimizada: ${file.size} bytes → ${arquivoOtimizado.size} bytes (${Math.round((1 - arquivoOtimizado.size/file.size) * 100)}% menor)`);
        
        resolve({
          arquivo: arquivoOtimizado,
          base64: base64,
          largura: width,
          altura: height,
          tamanhoKB: (arquivoOtimizado.size / 1024).toFixed(1)
        });
      };
      
      img.onerror = reject;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Função para converter arquivo para Base64
function converterParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      resolve({
        base64: e.target.result,
        tamanhoKB: (file.size / 1024).toFixed(1),
        tipo: file.type,
        nome: file.name
      });
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Função para validar e processar imagem
async function processarImagemParaFirestore(file) {
  try {
    console.log('🔄 Processando imagem...');
    
    // Validar tipo de arquivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!tiposPermitidos.includes(file.type.toLowerCase())) {
      throw new Error('Tipo de arquivo não suportado. Use JPG, PNG ou GIF.');
    }
    
    // Validar tamanho máximo (1MB para plano gratuito)
    const MAX_SIZE_MB = 1;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`Imagem muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Limite: ${MAX_SIZE_MB}MB.`);
    }
    
    // Se imagem for maior que 500KB, otimizar
    let resultado;
    if (file.size > 500 * 1024) {
      resultado = await otimizarImagem(file, 800, 0.7);
    } else {
      resultado = await converterParaBase64(file);
    }
    
    console.log('✅ Imagem processada com sucesso');
    
    return {
      imagemBase64: resultado.base64,
      tipoImagem: resultado.tipo || file.type,
      nomeArquivo: resultado.nome || file.name,
      tamanhoKB: resultado.tamanhoKB,
      resolucao: resultado.largura ? `${resultado.largura}x${resultado.altura}` : 'Original'
    };
    
  } catch (error) {
    console.error('❌ Erro ao processar imagem:', error);
    throw error;
  }
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

// ================= AVISOS =================
async function getAvisos() {
  try {
    const q = query(collection(db, 'avisos'), 
      where("ativo", "==", true),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Erro ao buscar avisos:', error);
    return [];
  }
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

// ================= ESCALAS - COM BASE64 =================
async function getEscalas() {
  try {
    const snapshot = await getDocs(collection(db, 'escalas'));
    const escalas = snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data(),
      // Garantir que tenha os campos necessários
      motorista: d.data().motorista || '',
      matricula: d.data().matricula || '',
      dataAtualizacao: d.data().dataAtualizacao || d.data().timestamp || null
    }));
    
    // Ordenar por data de atualização (mais recente primeiro)
    escalas.sort((a, b) => {
      const dateA = a.dataAtualizacao ? new Date(a.dataAtualizacao) : new Date();
      const dateB = b.dataAtualizacao ? new Date(b.dataAtualizacao) : new Date();
      return dateB - dateA;
    });
    
    console.log(`📊 ${escalas.length} escalas carregadas`);
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
      console.log('📭 Nenhuma escala encontrada para:', matricula);
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
        new Date();
      
      if (dataEscala > dataMaisRecente) {
        dataMaisRecente = dataEscala;
        escalaMaisRecente = escala;
      }
    });
    
    console.log('✅ Escala encontrada para:', matricula);
    return escalaMaisRecente;
  } catch (error) {
    console.error('Erro ao buscar escala por matrícula:', error);
    return null;
  }
}

async function addEscala(dados) {
  try {
    const docRef = await addDoc(collection(db, 'escalas'), {
      ...dados,
      timestamp: serverTimestamp()
    });
    
    console.log('➕ Escala adicionada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar escala:', error);
    throw error;
  }
}

async function updateEscala(escalaId, dados) {
  try {
    await updateDoc(doc(db, 'escalas', escalaId), {
      ...dados,
      dataAtualizacao: new Date().toISOString(),
      timestamp: serverTimestamp()
    });
    
    console.log('✏️ Escala atualizada:', escalaId);
  } catch (error) {
    console.error('Erro ao atualizar escala:', error);
    throw error;
  }
}

async function deleteEscala(escalaId) {
  try {
    await deleteDoc(doc(db, 'escalas', escalaId));
    console.log('🗑️ Escala excluída:', escalaId);
  } catch (error) {
    console.error('Erro ao excluir escala:', error);
    throw error;
  }
}

// ================= MONITORAMENTO =================
function monitorarRotas(callback) {
  try {
    const q = query(collection(db, 'rotas_em_andamento'), 
      where("ativo", "==", true)
    );
    
    return onSnapshot(q, 
      (snapshot) => {
        const rotas = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.ativo !== false) {
            rotas.push({ id: docSnap.id, ...data });
          }
        });
        callback(rotas);
      }, 
      (error) => {
        console.error('Erro monitorar rotas:', error);
      }
    );
  } catch (error) {
    console.error('Erro ao configurar monitoramento de rotas:', error);
  }
}

function monitorarEmergencias(callback) {
  try {
    const q = query(collection(db, 'emergencias'), 
      where("status", "==", "pendente"),
      orderBy("timestamp", "desc")
    );
    
    return onSnapshot(q, 
      (snapshot) => {
        const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(dados);
      },
      (error) => {
        console.error('Erro monitorar emergências:', error);
      }
    );
  } catch (error) {
    console.error('Erro ao configurar monitoramento de emergências:', error);
  }
}

function monitorarFeedbacks(callback) {
  try {
    const q = query(collection(db, 'feedbacks'), 
      where("status", "==", "pendente"),
      orderBy("timestamp", "desc")
    );
    
    return onSnapshot(q, 
      (snapshot) => {
        const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(dados);
      },
      (error) => {
        console.error('Erro monitorar feedbacks:', error);
      }
    );
  } catch (error) {
    console.error('Erro ao configurar monitoramento de feedbacks:', error);
  }
}

function monitorarAvisos(callback) {
  try {
    const q = query(collection(db, 'avisos'), 
      where("ativo", "==", true),
      orderBy("timestamp", "desc")
    );
    
    return onSnapshot(q, 
      (snapshot) => {
        const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(dados);
      },
      (error) => {
        console.error('Erro monitorar avisos:', error);
      }
    );
  } catch (error) {
    console.error('Erro ao configurar monitoramento de avisos:', error);
  }
}

// ================= FUNÇÕES ADMIN =================
async function resolverEmergencia(emergenciaId) {
  const docRef = doc(db, 'emergencias', emergenciaId);
  return await updateDoc(docRef, {
    status: 'resolvida',
    resolvidaEm: serverTimestamp()
  });
}

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
    const [rotasSnapshot, emergenciasSnapshot, feedbacksSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'rotas_em_andamento'), where('ativo', '==', true))),
      getDocs(query(collection(db, 'emergencias'), where('status', '==', 'pendente'))),
      getDocs(query(collection(db, 'feedbacks'), where('status', '==', 'pendente')))
    ]);

    return {
      totalRotasAtivas: rotasSnapshot.docs.length,
      totalEmergencias: emergenciasSnapshot.docs.length,
      totalFeedbacks: feedbacksSnapshot.docs.length
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      totalRotasAtivas: 0,
      totalEmergencias: 0,
      totalFeedbacks: 0
    };
  }
}

// ================= EXPORTAÇÕES =================
export {
  // Firebase
  db,
  auth,
  
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
  
  // Colaboradores
  getColaborador,
  getColaboradorByEmail,
  
  // Rotas
  updateLocalizacao,
  
  // Registros
  registrarEmergencia,
  registrarFeedback,
  registrarAviso,
  
  // Processamento de Imagens
  processarImagemParaFirestore,
  
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
  
  // Monitoramento
  monitorarRotas,
  monitorarEmergencias,
  monitorarFeedbacks,
  monitorarAvisos,
  
  // Emergências
  resolverEmergencia,
  
  // Feedbacks
  resolverFeedback,
  responderFeedback,
  
  // Dashboard
  getEstatisticasDashboard
};

console.log("✅ Firebase configurado com sucesso!");
