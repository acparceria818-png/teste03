// app.js - CÓDIGO JAVASCRIPT COMPLETO
document.addEventListener('DOMContentLoaded', () => {
  console.log('AC Transporte Portal - Inicializando...');
  
  // Inicializar todas as funcionalidades
  initDarkMode();
  initPWA();
  initEventListeners();
  initAccessibility();
});

// ========== FUNÇÕES DE TEMA ESCURO ==========
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  // Verificar preferência do sistema
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Verificar preferência salva
  const savedPreference = localStorage.getItem('ac_dark');
  
  // Aplicar tema baseado nas preferências
  if (savedPreference === '1' || (!savedPreference && prefersDark.matches)) {
    document.body.classList.add('dark');
    updateDarkModeIcon(true);
  }
  
  // Configurar alternância de tema
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
  
  // Feedback tátil (opcional)
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
  
  // Detectar evento de instalação
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
    
    console.log('PWA pode ser instalado');
  });
  
  // Clique no botão de instalação
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      alert('Este aplicativo já está instalado ou não pode ser instalado.');
      return;
    }
    
    // Mostrar prompt de instalação
    deferredPrompt.prompt();
    
    // Aguardar escolha do usuário
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
      installBtn.style.display = 'none';
    } else {
      console.log('Usuário recusou a instalação');
    }
    
    deferredPrompt = null;
  });
  
  // Esconder botão se já estiver instalado
  window.addEventListener('appinstalled', () => {
    console.log('PWA instalado com sucesso');
    installBtn.style.display = 'none';
  });
  
  // Verificar se já está instalado (em alguns navegadores)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = 'none';
  }
}

// ========== LISTENERS GERAIS ==========
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
  
  // Adicionar eventos de teclado para botões com onclick
  document.querySelectorAll('[onclick]').forEach(element => {
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        element.click();
      }
    });
  });
  
  // Prevenir comportamento padrão de links externos
  document.querySelectorAll('a[href^="http"]').forEach(link => {
    if (!link.hasAttribute('target')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

// ========== ACESSIBILIDADE ==========
function initAccessibility() {
  // Adicionar roles e labels
  document.querySelectorAll('.btn').forEach(btn => {
    if (!btn.getAttribute('aria-label') && btn.textContent) {
      const label = btn.textContent.trim().replace(/\s+/g, ' ');
      btn.setAttribute('aria-label', label);
    }
    
    if (!btn.getAttribute('role') && btn.onclick) {
      btn.setAttribute('role', 'button');
    }
  });
  
  // Focar no modal quando aberto
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const modal = mutation.target;
        if (modal.style.display === 'flex') {
          setTimeout(() => {
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            firstFocusable?.focus();
          }, 100);
        }
      }
    });
  });
  
  document.querySelectorAll('.modal-back').forEach(modal => {
    observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
  });
}

// ========== FUNÇÕES DE NAVEGAÇÃO ==========
function enterApp() {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'block';
  
  // Focar no primeiro elemento do menu para acessibilidade
  setTimeout(() => {
    const firstMenuItem = document.querySelector('#mainMenu .btn');
    firstMenuItem?.focus();
  }, 100);
  
  // Rolar suavemente para o menu
  document.getElementById('mainMenu').scrollIntoView({ 
    behavior: 'smooth',
    block: 'start'
  });
  
  console.log('Usuário entrou no aplicativo');
}

function openSection(sectionId) {
  // Esconder todas as seções visíveis
  document.querySelectorAll('main > section').forEach(section => {
    if (section.style.display !== 'none') {
      section.style.display = 'none';
    }
  });
  
  // Mostrar a seção solicitada
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = 'block';
    
    // Focar no primeiro elemento da seção
    setTimeout(() => {
      const firstElement = targetSection.querySelector('.btn, button, [tabindex="0"]');
      firstElement?.focus();
    }, 100);
    
    // Rolar para o topo suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log(`Seção aberta: ${sectionId}`);
  }
}

function backToMenu() {
  document.getElementById('rotasSection').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'block';
  
  // Focar no botão de rotas para facilitar navegação
  setTimeout(() => {
    const rotasBtn = document.querySelector('#mainMenu [onclick*="rotasSection"]');
    rotasBtn?.focus();
  }, 100);
  
  console.log('Voltou ao menu principal');
}

// ========== FUNÇÕES DE MODAL ==========
function openModal(modalType) {
  const modalId = modalType === 'avisosModal' ? 'avisosModalBack' : 'ajudaModalBack';
  const modal = document.getElementById(modalId);
  
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevenir scroll do body
    
    console.log(`Modal aberto: ${modalType}`);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto'; // Restaurar scroll
    
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

// ========== FUNÇÕES AUXILIARES ==========
function openMapsWithCoords(query) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  
  console.log(`Abrindo mapa para: ${query}`);
}

// ========== FUNÇÕES ADICIONAIS PARA ROTAS ==========
function searchRoutes() {
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
}

function filterRoutes(type) {
  const routeItems = document.querySelectorAll('.route-item');
  
  routeItems.forEach(item => {
    if (type === 'all') {
      item.style.display = 'flex';
    } else if (type === 'adm' && item.classList.contains('adm')) {
      item.style.display = 'flex';
    } else if (type === 'operacional' && item.classList.contains('operacional')) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// ========== SERVICE WORKER REGISTRATION ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registrado com sucesso: ', registration.scope);
      })
      .catch(error => {
        console.log('Falha ao registrar ServiceWorker: ', error);
      });
  });
}
