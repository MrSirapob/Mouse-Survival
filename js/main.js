// ==========================================================
// main.js — bootstraps the game once the DOM is ready.
// ==========================================================

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  window.__game = new Game(canvas);
});
