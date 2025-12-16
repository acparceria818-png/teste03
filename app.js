// app.js - Portal AC Transporte (Produção)
import { db, doc, getDoc, setDoc } from './firebase.js';

// ======================= SPA & NAVEGAÇÃO =======================
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(tela => {
    tela.classList.add('hidden');
    tela.classList.remove('ativa');
  });
  const alvo = document.getElementById(id);
  if (alvo) alvo.classList.remove('hidden');
  console.log('Tela exibida:', id);
}

window.entrarNoPortal = () => mostrarTela('telaEscolhaPerfil');

window.selecionarPerfil = (perfil) => {
  localStorage.setItem('perfil', perfil);
  if (perfil === 'motorista') mostrarTela('tela-motorista-login');
  if (perfil === 'passageiro') mostrarTela('tela-passageiro');
  if (perfil === 'admin') mostrarTela('tela-admin-login');
};

function mostrarTelaMenuPrincipal() {
  document.querySelectorAll('.tela').forEach(tela => {
    tela.classList.add('hidden');
    tela.classList.remove('ativa');
  });
  const menu = document.getElementById('mainMenu');
  if (menu) menu.style.display = 'block';
  const firstBtn = menu.querySelector('button, .btn');
  if (firstBtn) firstBtn.focus();
}

// ======================= LOGIN MOTORISTA =======================
window.confirmarMatriculaMotorista = async function () {
  const input = document.getElementById('matriculaMotorista');
  if (!input) return alert('Campo de matrícula não encontrado');

  const matricula = input.value.trim();
  if (!matricula) {
    input.focus();
    return alert('Informe sua matrícula');
  }

  try {
    const ref = doc(db, 'colaboradores', matricula);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert('Matrícula não encontrada');

    const dados = snap.data();
    if (!dados.ativo) return alert('Colaborador inativo');
    if (dados.perfil !== 'motorista') return alert('Acesso exclusivo para motoristas');

    localStorage.setItem('motorista_matricula', matricula);
    localStorage.setItem('motorista_nome', dados.nome);

    const nomeEl = document.getElementById('motoristaNome');
    if (nomeEl) nomeEl.textContent = dados.nome;

    mostrarTelaMenuPrincipal();
    console.log('Motorista autenticado:', dados.nome);

  } catch (erro) {
    console.error('Erro Firebase:', erro);
    alert('Erro ao validar matrícula');
  }
};

// ======================= RASTREAMENTO DE ROTA =======================
window.iniciarRota = function (nomeRota) {
  if (!navigator.geolocation) return alert('Geolocalização não suportada');

  const matricula = localStorage.getItem('motorista_matricula');
  const nome = localStorage.getItem('motorista_nome');
  if (!matricula) return mostrarTela('tela-motorista-login');

  if (!confirm(`Deseja iniciar a rota "${nomeRota}"?`)) return;

  const watchId = navigator.geolocation.watchPosition(
    async ({ coords }) => {
      const { latitude, longitude } = coords;
      console.log(`Localização: ${latitude}, ${longitude}`);
      try {
        await setDoc(doc(db, 'rotas_em_andamento', matricula), {
          motorista: nome,
          matricula,
          rota: nomeRota,
          latitude,
          longitude,
          timestamp: new Date()
        });
      } catch (erro) {
        console.error('Erro ao enviar localização:', erro);
      }
    },
    (erro) => alert('Erro ao obter localização: ' + erro.message),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );

  localStorage.setItem('rota_watchId', watchId);
  alert(`Rota "${nomeRota}" iniciada. Localização em tempo real ativada.`);
};

window.pararRota = function () {
  const watchId = localStorage.getItem('rota_watchId');
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    localStorage.removeItem('rota_watchId');
    alert('Rastreamento encerrado.');
  }
};

// ======================= MODAIS =======================
function openModal(modalType) {
  const modalId = modalType === 'avisosModal' ? 'avisosModalBack' : 'ajudaModalBack';
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  });
  document.body.style.overflow = 'auto';
}

window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;

// ======================= DARK MODE =======================
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const saved = localStorage.getItem('ac_dark');

  if (saved === '1' || (!saved && prefersDark.matches)) document.body.classList.add('dark');

  darkToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('ac_dark', isDark ? '1' : '0');
    darkToggle.textContent = isDark ? '☀️' : '🌙';
  });
  prefersDark.addEventListener('change', e => {
    if (!localStorage.getItem('ac_dark')) {
      document.body.classList.toggle('dark', e.matches);
    }
  });
}

// ======================= PWA =======================
function initPWA() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return alert('App já instalado ou não pode ser instalado.');
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') installBtn.style.display = 'none';
    deferredPrompt = null;
  });

  window.addEventListener('appinstalled', () => installBtn.style.display = 'none');
}

// ======================= EVENT LISTENERS GERAIS =======================
function initEventListeners() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
}

// ======================= INICIALIZAÇÃO =======================
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initPWA();
  initEventListeners();
  mostrarTela('welcome');
  console.log('Portal AC Transporte iniciado');
});
