// js/auth.js

window.irParaPerfil = function (perfil) {
  localStorage.setItem('perfil', perfil);
  window.location.href = perfil + '.html';
};

window.verificarAcesso = function (perfilPermitido) {
  const perfil = localStorage.getItem('perfil');

  if (perfil !== perfilPermitido) {
    window.location.href = 'index.html';
  }
};
