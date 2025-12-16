// app.js
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let watchId = null;

// ======== INICIALIZAÇÃO ========
document.addEventListener('DOMContentLoaded', () => {
  console.log('AC Transporte Portal - Inicializando...');
  initDarkMode();
  initPWA();
  initEventListeners();
  initAccessibility();
  mostrarTela('welcome');
});

// ======== DARK MODE ========
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const saved = localStorage.getItem('ac_dark');

  if (saved === '1' || (!saved && prefersDark.matches)) {
    document.body.classList.add('dark');
    updateDarkModeIcon(true);
  }

  darkToggle.addEventListener('click', toggleDarkMode);
  prefersDark.addEventListener('change', e => {
    if (!localStorage.getItem('ac_dark')) {
      document.body.classList.toggle('dark', e.matches);
      updateDarkModeIcon(e.matches);
    }
  });
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('ac_dark', isDark ? '1' : '0');
  updateDarkModeIcon(isDark);
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.style.transform = 'scale(0.95)';
  setTimeout(() => darkToggle.style.transform = '', 150);
}

function updateDarkModeIcon(isDark) {
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.textContent = isDark ? '☀️' : '🌙';
  darkToggle.setAttribute('title', isDark ? 'Alternar para claro' : 'Alternar para escuro');
  darkToggle.setAttribute('aria-label', isDark ? 'Modo escuro ativo' : 'Modo claro ativo');
}

// ======== PWA ========
function initPWA() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;

  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return alert('App já instalado ou não disponível.');
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log(choice.outcome === 'accepted' ? 'Instalado' : 'Recusado');
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => installBtn.style.display = 'none');

  if (window.matchMedia('(display-mode: standalone)').matches) installBtn.style.display = 'none';
}

// ======== EVENT LISTENERS ========
function initEventListeners() {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
  });
  document.querySelectorAll('[onclick]').forEach(el => {
    el.addEventListener('keydown', e => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); el.click(); }});
  });
}

// ======== ACESSIBILIDADE ========
function initAccessibility() {
  document.querySelectorAll('.btn').forEach(btn => {
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', btn.textContent.trim());
    if (!btn.getAttribute('role') && btn.onclick) btn.setAttribute('role', 'button');
  });

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'style') {
        const modal = m.target;
        if (modal.style.display === 'flex') {
          setTimeout(() => {
            const first = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            first?.focus();
          }, 100);
        }
      }
    });
  });
  document.querySelectorAll('.modal-back').forEach(m => observer.observe(m, { attributes:true, attributeFilter:['style'] }));
}

// ======== SPA CONTROLE DE TELAS ========
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.add('hidden'));
  const alvo = document.getElementById(id);
  if (alvo) alvo.classList.remove('hidden');
}

window.entrarNoPortal = () => mostrarTela('telaEscolhaPerfil');

window.selecionarPerfil = perfil => {
  localStorage.setItem('perfil', perfil);
  if (perfil==='motorista') mostrarTela('tela-motorista-login');
  if (perfil==='passageiro') mostrarTela('tela-passageiro');
  if (perfil==='admin') mostrarTela('tela-admin-login');
};

// ======== LOGIN MOTORISTA ========
window.confirmarMatriculaMotorista = async () => {
  const input = document.getElementById('matriculaMotorista');
  const matricula = input.value.trim();
  if (!matricula) return alert('Informe sua matrícula');

  try {
    const ref = doc(db, 'colaboradores', matricula);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert('Matrícula não encontrada');
    const dados = snap.data();
    if (!dados.ativo) return alert('Colaborador inativo');
    if (dados.perfil !== 'motorista') return alert('Acesso exclusivo para motoristas');

    localStorage.setItem('motorista_matricula', matricula);
    localStorage.setItem('motorista_nome', dados.nome);

    mostrarTela('mainMenu');
    console.log('Motorista autenticado:', dados.nome);
  } catch (erro) {
    console.error('Erro Firebase:', erro);
    alert('Erro ao validar matrícula');
  }
};

// ======== MODAIS ========
function openModal(tipo) {
  const id = tipo==='avisosModal'?'avisosModalBack':'ajudaModalBack';
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display='flex';
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display='none';
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow='auto';
}
function closeAllModals() { document.querySelectorAll('.modal-back').forEach(m=>{m.style.display='none'; m.setAttribute('aria-hidden','true');}); document.body.style.overflow='auto'; }

// ======== ROTAS ========
function iniciarRota(nome) {
  if (!navigator.geolocation) return alert('Geolocalização não suportada');
  alert(`Rota iniciada: ${nome}\nLocalização sendo compartilhada`);
  watchId = navigator.geolocation.watchPosition(pos => {
    console.log('Localização:', pos.coords.latitude, pos.coords.longitude);
  }, erro => { alert('Erro ao obter localização'); console.error(erro); }, { enableHighAccuracy:true, maximumAge:5000, timeout:10000 });
}
function pararRota() { if(watchId!==null){navigator.geolocation.clearWatch(watchId); watchId=null; alert('Rota parada');}}

// ======== NAVEGAÇÃO ========
function openSection(id) {
  document.querySelectorAll('main > section').forEach(s=>s.style.display='none');
  const target = document.getElementById(id);
  if(target){ target.style.display='block'; window.scrollTo({top:0, behavior:'smooth'});}
}
function backToMenu() { openSection('mainMenu'); }

// ======== SERVICE WORKER ========
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('service-worker.js').then(r=>console.log('SW registrado',r.scope)).catch(e=>console.log('SW falhou',e));});}
