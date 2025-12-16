// app.js - CÓDIGO JAVASCRIPT COMPLETO ATUALIZADO
import { 
  db, 
  getColaborador, 
  updateLocalizacao, 
  loginEmailSenha,
  monitorarRotas,
  signOut 
} from './firebase.js';

// Estado global
let estadoApp = {
  motorista: null,
  rotaAtiva: null,
  watchId: null,
  isOnline: navigator.onLine,
  perfil: null,
  unsubscribeRotas: null
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('AC Transporte Portal - Inicializando...');
  
  // Verificar sessão existente
  verificarSessao();
  
  // Inicializar todas as funcionalidades
  initDarkMode();
  initPWA();
  initEventListeners();
  initAccessibility();
  initConnectionMonitor();
  
  // Carregar rotas dinamicamente
  carregarRotas();
});

// ========== GERENCIAMENTO DE SESSÃO ==========
function verificarSessao() {
  const matricula = localStorage.getItem('motorista_matricula');
  const nome = localStorage.getItem('motorista_nome');
  
  if (matricula && nome) {
    estadoApp.motorista = { matricula, nome };
    mostrarTela('tela-motorista');
    updateUserStatus(nome, matricula);
  }
}

function updateUserStatus(nome, matricula) {
  const userStatus = document.getElementById('userStatus');
  const userName = document.getElementById('userName');
  const motoristaNome = document.getElementById('motoristaNome');
  const motoristaMatricula = document.getElementById('motoristaMatricula');
  
  if (userStatus) userStatus.style.display = 'flex';
  if (userName) userName.textContent = nome;
  if (motoristaNome) motoristaNome.textContent = nome;
  if (motoristaMatricula) motoristaMatricula.textContent = matricula;
}

// ========== FUNÇÕES DE LOGIN/LOGOUT ==========
window.confirmarMatriculaMotorista = async function () {
  showLoading('Validando matrícula...');
  
  const input = document.getElementById('matriculaMotorista');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!input) {
    alert('Campo de matrícula não encontrado');
    hideLoading();
    return;
  }

  const matricula = input.value.trim().toUpperCase();

  if (!matricula) {
    alert('Informe sua matrícula');
    input.focus();
    hideLoading();
    return;
  }

  if (!validarMatricula(matricula)) {
    alert('Matrícula inválida. Use apenas letras e números (4-10 caracteres).');
    input.focus();
    hideLoading();
    return;
  }

  try {
    // Desabilitar botão durante a validação
    loginBtn.disabled = true;
    loginBtn.textContent = 'Validando...';
    
    const snap = await getColaborador(matricula);

    if (!snap.exists()) {
      alert('Matrícula não encontrada');
      input.focus();
      return;
    }

    const dados = snap.data();

    if (!dados.ativo) {
      alert('Colaborador inativo. Contate a administração.');
      return;
    }

    if (dados.perfil !== 'motorista') {
      alert('Este acesso é exclusivo para motoristas');
      return;
    }

    // ✅ Login autorizado
    localStorage.setItem('motorista_matricula', matricula);
    localStorage.setItem('motorista_nome', dados.nome);
    
    estadoApp.motorista = { matricula, nome: dados.nome };
    
    // Atualizar interface
    updateUserStatus(dados.nome, matricula);
    
    // Mostrar tela do motorista
    mostrarTela('tela-motorista');
    
    console.log('Motorista autenticado:', dados.nome);

  } catch (erro) {
    console.error('Erro Firebase:', erro);
    alert('Erro ao validar matrícula. Verifique sua conexão e tente novamente.');
  } finally {
    hideLoading();
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
  }
};

function validarMatricula(matricula) {
  const regex = /^[A-Z0-9]{4,10}$/;
  return regex.test(matricula);
}

window.loginAdmin = async function () {
  const email = document.getElementById('adminEmail').value;
  const senha = document.getElementById('adminSenha').value;
  
  if (!email || !senha) {
    alert('Preencha e-mail e senha');
    return;
  }
  
  try {
    await loginEmailSenha(email, senha);
    mostrarTela('tela-admin-dashboard');
    iniciarMonitoramentoAdmin();
  } catch (erro) {
    alert('Login falhou: ' + erro.message);
  }
};

window.logout = function () {
  if (estadoApp.watchId) {
    navigator.geolocation.clearWatch(estadoApp.watchId);
    estadoApp.watchId = null;
  }
  
  if (estadoApp.unsubscribeRotas) {
    estadoApp.unsubscribeRotas();
  }
  
  // Limpar estado
  estadoApp = {
    motorista: null,
    rotaAtiva: null,
    watchId: null,
    isOnline: navigator.onLine,
    perfil: null,
    unsubscribeRotas: null
  };
  
  // Limpar storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Resetar interface
  document.getElementById('userStatus').style.display = 'none';
  document.getElementById('pararRotaBtn').style.display = 'none';
  document.getElementById('rotaStatus').textContent = 'Nenhuma rota ativa';
  
  // Voltar para tela inicial
  mostrarTela('welcome');
  
  console.log('Usuário deslogado');
};

// ========== FUNÇÕES DE ROTA ==========
window.iniciarRota = async function (nomeRota) {
  if (!navigator.geolocation) {
    alert('Geolocalização não suportada neste navegador.');
    return;
  }

  if (!estadoApp.motorista) {
    alert('Motorista não autenticado. Faça login novamente.');
    mostrarTela('tela-motorista-login');
    return;
  }

  if (!await checkLocationPermission()) {
    return;
  }

  if (!confirm(`Deseja iniciar a rota "${nomeRota}"?\n\nSua localização será compartilhada em tempo real.`)) {
    return;
  }

  // Atualizar interface
  const btn = event?.target;
  if (btn) {
    btn.classList.add('loading');
    btn.textContent = 'Iniciando...';
  }

  try {
    // Primeira localização imediata
    const position = await getCurrentPosition();
    await enviarLocalizacao(nomeRota, position.coords);
    
    // Iniciar monitoramento contínuo
    estadoApp.watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        await enviarLocalizacao(nomeRota, pos.coords);
      },
      (erro) => {
        console.error('Erro na geolocalização:', erro);
        alert('Erro ao obter localização. Verifique permissões.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    estadoApp.rotaAtiva = nomeRota;
    
    // Atualizar interface
    document.getElementById('rotaStatus').textContent = `Rota ativa: ${nomeRota}`;
    document.getElementById('pararRotaBtn').style.display = 'block';
    
    alert(`Rota "${nomeRota}" iniciada com sucesso!\n\nSua localização está sendo compartilhada.`);
    
    // Voltar para tela do motorista
    mostrarTela('tela-motorista');

  } catch (erro) {
    console.error('Erro ao iniciar rota:', erro);
    alert('Não foi possível iniciar a rota. Verifique sua conexão e permissões de localização.');
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.textContent = '▶️ Iniciar Rota';
    }
  }
};

async function enviarLocalizacao(nomeRota, coords) {
  if (!estadoApp.motorista) return;

  try {
    await updateLocalizacao(estadoApp.motorista.matricula, {
      motorista: estadoApp.motorista.nome,
      matricula: estadoApp.motorista.matricula,
      rota: nomeRota,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: new Date(),
      velocidade: coords.speed || null,
      precisao: coords.accuracy
    });
    
    console.log('Localização enviada:', new Date().toLocaleTimeString());
  } catch (erro) {
    console.error('Erro ao enviar localização:', erro);
  }
}

window.pararRota = function () {
  if (!estadoApp.watchId) return;
  
  navigator.geolocation.clearWatch(estadoApp.watchId);
  estadoApp.watchId = null;
  estadoApp.rotaAtiva = null;
  
  // Limpar do Firebase (opcional)
  if (estadoApp.motorista) {
    updateLocalizacao(estadoApp.motorista.matricula, {
      ativo: false,
      timestamp: new Date()
    });
  }
  
  // Atualizar interface
  document.getElementById('rotaStatus').textContent = 'Nenhuma rota ativa';
  document.getElementById('pararRotaBtn').style.display = 'none';
  
  alert('Rota encerrada. Localização não está mais sendo compartilhada.');
};

// ========== FUNÇÕES AUXILIARES DE GEOLOCALIZAÇÃO ==========
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
}

async function checkLocationPermission() {
  if (!navigator.permissions) return true;
  
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    
    if (permission.state === 'denied') {
      alert('Permissão de localização negada. Por favor, ative nas configurações do seu navegador.');
      return false;
    }
    
    if (permission.state === 'prompt') {
      // O navegador mostrará o prompt automaticamente
      return true;
    }
    
    return true;
  } catch (error) {
    console.warn('API de permissões não suportada:', error);
    return true;
  }
}

// ========== CARREGAMENTO DE ROTAS ==========
function carregarRotas() {
  const rotas = [
    { id: 'adm01', nome: 'ROTA ADM 01', tipo: 'adm', desc: 'Rota administrativa 01', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=18BCgBpobp1Olzmzy0RnPCUEd7Vnkc5s&usp=sharing' },
    { id: 'adm02', nome: 'ROTA ADM 02', tipo: 'adm', desc: 'Rota administrativa 02', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1WxbIX8nw0xyGBLMvvi1SF3DRuwmZ5oM&usp=sharing' },
    { id: 'op01', nome: 'ROTA 01', tipo: 'operacional', desc: 'Rota operacional 01', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1jCfFxq1ZwecS2IcHy7xGFLLgttsM-RQ&usp=sharing' },
    { id: 'op02', nome: 'ROTA 02', tipo: 'operacional', desc: 'Rota operacional 02', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1LCvNJxWBbZ_chpbdn_lk_Dm6NPA194g&usp=sharing' },
    { id: 'op03', nome: 'ROTA 03', tipo: 'operacional', desc: 'Rota operacional 03', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1bdwkrClh5AZml0mnDGlOzYcaR4w1BL0&usp=sharing' },
    { id: 'op04', nome: 'ROTA 04', tipo: 'operacional', desc: 'Rota operacional 04', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1ejibzdZkhX2QLnP9YgvvHdQpZELFvXo&usp=sharing' },
    { id: 'op05', nome: 'ROTA 05', tipo: 'operacional', desc: 'Rota operacional 05', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1L9xjAWFUupMc7eQbqVJz-SNWlYX5SHo&usp=sharing' },
    { id: 'ret01', nome: 'RETORNO OVERLAND - ROTA 01', tipo: 'retorno', desc: 'Rota de retorno Overland 01', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1ClQVIaRLOYYWHU7fvP87r1BVy85a_eg&usp=sharing' },
    { id: 'ret02', nome: 'RETORNO OVERLAND - ROTA 02', tipo: 'retorno', desc: 'Rota de retorno Overland 02', mapsUrl: 'https://www.google.com/maps/d/u/1/edit?mid=1WOIMgeLgV01B8yk7HoX6tazdCHXQnok&usp=sharing' }
  ];
  
  const container = document.getElementById('routesContainer');
  if (!container) return;
  
  container.innerHTML = rotas.map(rota => `
    <div class="route-item ${rota.tipo}" data-tipo="${rota.tipo}">
      <div class="route-info">
        <div style="font-weight:800">
          ${rota.tipo === 'adm' ? '🏢' : rota.tipo === 'retorno' ? '🔄' : '🚛'} 
          ${rota.nome}
        </div>
        <small style="color:#666">${rota.desc}</small>
      </div>
      <div class="route-actions">
        <button class="btn" onclick="iniciarRota('${rota.nome}')" 
                ${!estadoApp.motorista ? 'disabled' : ''}>
          ▶️ Iniciar Rota
        </button>
        <a class="btn secondary" href="${rota.mapsUrl}" target="_blank" rel="noopener noreferrer">
          Abrir no Maps
        </a>
      </div>
    </div>
  `).join('');
}

// ========== FUNÇÕES DE FILTRO E BUSCA ==========
window.searchRoutes = debounce(function() {
  const searchTerm = document.getElementById('routeSearch')?.value.toLowerCase();
  const routeItems = document.querySelectorAll('.route-item');
  
  routeItems.forEach(item => {
    const routeName = item.querySelector('.route-info div').textContent.toLowerCase();
    const routeDesc = item.querySelector('.route-info small').textContent.toLowerCase();
    
    if (routeName.includes(searchTerm) || routeDesc.includes(searchTerm) || !searchTerm) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}, 300);

window.filterRoutes = function(type) {
  const routeItems = document.querySelectorAll('.route-item');
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // Atualizar botões ativos
  filterButtons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  routeItems.forEach(item => {
    const itemType = item.dataset.tipo;
    
    if (type === 'all' || itemType === type) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
};

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========== MONITORAMENTO PARA PASSAGEIRO/ADMIN ==========
function iniciarMonitoramentoPassageiro() {
  if (estadoApp.unsubscribeRotas) return;
  
  estadoApp.unsubscribeRotas = monitorarRotas((rotas) => {
    const container = document.getElementById('rotasAtivasList');
    if (!container) return;
    
    const rotasAtivas = rotas.filter(r => r.ativo !== false);
    
    if (rotasAtivas.length === 0) {
      container.innerHTML = '<p>Nenhuma rota ativa no momento</p>';
      return;
    }
    
    container.innerHTML = rotasAtivas.map(rota => `
      <div class="rota-ativa">
        <strong>${rota.rota}</strong>
        <small>Motorista: ${rota.motorista}</small>
        <small>Última atualização: ${new Date(rota.timestamp?.toDate()).toLocaleTimeString()}</small>
        <button class="btn small" onclick="abrirMapaPassageiro(${rota.latitude}, ${rota.longitude})">
          Ver no mapa
        </button>
      </div>
    `).join('');
  });
}

function iniciarMonitoramentoAdmin() {
  if (estadoApp.unsubscribeRotas) return;
  
  estadoApp.unsubscribeRotas = monitorarRotas((rotas) => {
    const container = document.getElementById('adminRotasList');
    const countElement = document.getElementById('rotasAtivasCount');
    
    if (!container) return;
    
    const rotasAtivas = rotas.filter(r => r.ativo !== false);
    
    if (countElement) {
      countElement.textContent = rotasAtivas.length;
    }
    
    if (rotasAtivas.length === 0) {
      container.innerHTML = '<p>Nenhuma rota ativa no momento</p>';
      return;
    }
    
    container.innerHTML = rotasAtivas.map(rota => `
      <div class="rota-admin">
        <div class="rota-info">
          <strong>${rota.rota}</strong>
          <div class="rota-detalhes">
            <span>Motorista: ${rota.motorista} (${rota.matricula})</span>
            <span>Localização: ${rota.latitude?.toFixed(4)}, ${rota.longitude?.toFixed(4)}</span>
            <span>Última atualização: ${new Date(rota.timestamp?.toDate()).toLocaleTimeString()}</span>
            ${rota.velocidade ? `<span>Velocidade: ${(rota.velocidade * 3.6).toFixed(1)} km/h</span>` : ''}
          </div>
        </div>
        <button class="btn small" onclick="abrirMapaAdmin(${rota.latitude}, ${rota.longitude})">
          Mapa
        </button>
      </div>
    `).join('');
  });
}

window.abrirMapaPassageiro = function(lat, lng) {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

window.abrirMapaAdmin = function(lat, lng) {
  const url = `https://www.google.com/maps/@${lat},${lng},15z`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ========== FUNÇÕES DE TEMA ESCURO ==========
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedPreference = localStorage.getItem('ac_dark');
  
  // Aplicar tema
  if (savedPreference === '1' || (!savedPreference && prefersDark.matches)) {
    document.body.classList.add('dark');
    updateDarkModeIcon(true);
  }
  
  // Configurar alternância
  darkToggle.addEventListener('click', toggleDarkMode);
  
  // Ouvir mudanças no sistema
  prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('ac_dark')) {
      if (e.matches) {
        document.body.classList.add('dark');
        updateDarkModeIcon(true);
      } else {
        document.body.classList.remove('dark');
        updateDarkModeIcon(false);
      }
    }
  });
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('ac_dark', isDark ? '1' : '0');
  updateDarkModeIcon(isDark);
  
  // Feedback tátil
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.style.transform = 'scale(0.95)';
  setTimeout(() => {
    darkToggle.style.transform = '';
  }, 150);
}

function updateDarkModeIcon(isDark) {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  darkToggle.textContent = isDark ? '☀️' : '🌙';
  darkToggle.setAttribute('title', isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro');
  darkToggle.setAttribute('aria-label', isDark ? 'Modo escuro ativo - clique para modo claro' : 'Modo claro ativo - clique para modo escuro');
}

// ========== FUNÇÕES PWA ==========
function initPWA() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;
  
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
    console.log('PWA pode ser instalado');
  });
  
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      alert('Este aplicativo já está instalado ou não pode ser instalado.');
      return;
    }
    
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
      installBtn.style.display = 'none';
    } else {
      console.log('Usuário recusou a instalação');
    }
    
    deferredPrompt = null;
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('PWA instalado com sucesso');
    installBtn.style.display = 'none';
  });
  
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = 'none';
  }
}

// ========== NAVEGAÇÃO ENTRE TELAS ==========
window.mostrarTela = function(id) {
  console.log('Mostrando tela:', id);
  
  // Esconder todas as telas
  document.querySelectorAll('.tela').forEach(tela => {
    tela.classList.add('hidden');
    tela.classList.remove('ativa');
  });
  
  // Mostrar tela alvo
  const alvo = document.getElementById(id);
  if (!alvo) {
    console.error('Tela não encontrada:', id);
    return;
  }
  
  alvo.classList.remove('hidden');
  alvo.classList.add('ativa');
  
  // Rolagem para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Iniciar monitoramento se necessário
  if (id === 'tela-passageiro') {
    iniciarMonitoramentoPassageiro();
  } else if (id === 'tela-admin-dashboard') {
    iniciarMonitoramentoAdmin();
  }
};

window.entrarNoPortal = function () {
  mostrarTela('telaEscolhaPerfil');
};

window.selecionarPerfil = function (perfil) {
  console.log('Perfil selecionado:', perfil);
  estadoApp.perfil = perfil;
  localStorage.setItem('perfil', perfil);

  if (perfil === 'motorista') mostrarTela('tela-motorista-login');
  if (perfil === 'passageiro') mostrarTela('tela-passageiro');
  if (perfil === 'admin') mostrarTela('tela-admin-login');
};

// ========== FUNÇÕES DE MODAL ==========
function openModal(modalType) {
  const modalId = modalType === 'avisosModal' ? 'avisosModalBack' : 'ajudaModalBack';
  const modal = document.getElementById(modalId);
  
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focar no primeiro elemento focável
    setTimeout(() => {
      const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus();
    }, 100);
    
    console.log(`Modal aberto: ${modalType}`);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';
    console.log(`Modal fechado: ${modalId}`);
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  });
  
  document.body.style.overflow = 'auto';
  console.log('Todos os modais fechados');
}

// ========== MONITORAMENTO DE CONEXÃO ==========
function initConnectionMonitor() {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  updateOnlineStatus();
}

function updateOnlineStatus() {
  estadoApp.isOnline = navigator.onLine;
  const statusElement = document.getElementById('connectionStatus');
  const offlineBanner = document.getElementById('offlineBanner');
  
  if (statusElement) {
    statusElement.textContent = estadoApp.isOnline ? '●' : '○';
    statusElement.style.color = estadoApp.isOnline ? '#4CAF50' : '#FF5722';
    statusElement.title = estadoApp.isOnline ? 'Online' : 'Offline';
  }
  
  if (offlineBanner) {
    offlineBanner.style.display = estadoApp.isOnline ? 'none' : 'block';
  }
  
  if (!estadoApp.isOnline) {
    console.warn('Aplicativo offline');
  }
}

// ========== LOADING STATES ==========
function showLoading(message = 'Carregando...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');
  
  if (overlay) overlay.style.display = 'flex';
  if (text) text.textContent = message;
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ========== EVENT LISTENERS ==========
function initEventListeners() {
  // Fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
  
  // Fechar modal clicando fora
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
  
  // Adicionar eventos de teclado para elementos clicáveis
  document.querySelectorAll('[onclick], [role="button"]').forEach(element => {
    element.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && element.getAttribute('tabindex') !== '-1') {
        e.preventDefault();
        element.click();
      }
    });
  });
  
  // Auto-focus no input de matrícula
  document.getElementById('matriculaMotorista')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      confirmarMatriculaMotorista();
    }
  });
}

// ========== ACESSIBILIDADE ==========
function initAccessibility() {
  // Adicionar roles e labels
  document.querySelectorAll('.btn, [role="button"]').forEach(btn => {
    if (!btn.getAttribute('aria-label') && btn.textContent) {
      const label = btn.textContent.trim().replace(/\s+/g, ' ');
      btn.setAttribute('aria-label', label);
    }
  });
  
  // Anúncios de mudança de tela para leitores de tela
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const tela = mutation.target;
        if (tela.classList.contains('ativa')) {
          const h2 = tela.querySelector('h2');
          if (h2) {
            announceScreenChange(h2.textContent);
          }
        }
      }
    });
  });
  
  document.querySelectorAll('.tela').forEach(tela => {
    observer.observe(tela, { attributes: true, attributeFilter: ['class'] });
  });
}

function announceScreenChange(message) {
  const announcer = document.getElementById('liveAnnouncer') || createAnnouncer();
  announcer.textContent = message;
}

function createAnnouncer() {
  const announcer = document.createElement('div');
  announcer.id = 'liveAnnouncer';
  announcer.setAttribute('aria-live', 'assertive');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
  document.body.appendChild(announcer);
  return announcer;
}

// ========== SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registrado:', registration.scope);
      })
      .catch(error => {
        console.log('Falha ao registrar ServiceWorker:', error);
      });
  });
}

// ========== EXPORTAR FUNÇÕES GLOBAIS ==========
// Exportar funções necessárias no escopo global
window.openModal = openModal;
window.closeModal = closeModal;
window.mostrarTela = mostrarTela;
window.entrarNoPortal = entrarNoPortal;
window.selecionarPerfil = selecionarPerfil;
window.confirmarMatriculaMotorista = confirmarMatriculaMotorista;
window.iniciarRota = iniciarRota;
window.pararRota = pararRota;
window.logout = logout;
window.loginAdmin = loginAdmin;
window.searchRoutes = searchRoutes;
window.filterRoutes = filterRoutes;
window.abrirMapaPassageiro = abrirMapaPassageiro;
window.abrirMapaAdmin = abrirMapaAdmin;
