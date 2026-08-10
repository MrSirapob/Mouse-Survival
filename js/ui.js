// ==========================================================
// ui.js — all DOM-facing HUD/menu/results rendering.
// Keeps game.js focused on simulation, not DOM strings.
// Every player-facing string here is Thai, per spec.
// ==========================================================

class UI {
  constructor() {
    this.els = {
      app: document.getElementById('app'),
      screens: {
        menu: document.getElementById('screen-menu'),
        how: document.getElementById('screen-how'),
        stats: document.getElementById('screen-stats'),
        pause: document.getElementById('screen-pause'),
        results: document.getElementById('screen-results'),
      },
      hud: document.getElementById('hud'),
      hudSolo: document.getElementById('hud-solo'),
      hudDuo: document.getElementById('hud-duo'),
      hudLives: document.getElementById('hud-lives'),
      hudTimer: document.getElementById('hud-timer'),
      hudTimerDuo: document.getElementById('hud-timer-duo'),
      hudCombo: document.getElementById('hud-combo'),
      hudScore: document.getElementById('hud-score'),
      hudLivesP1: document.getElementById('hud-lives-p1'),
      hudLivesP2: document.getElementById('hud-lives-p2'),
      hudScoreP1: document.getElementById('hud-score-p1'),
      hudScoreP2: document.getElementById('hud-score-p2'),
      eventBanner: document.getElementById('event-banner'),
      statsBody: document.getElementById('stats-body'),
      resultsPanel: document.getElementById('results-panel'),
      mobileControls: document.getElementById('mobile-controls'),
    };
    this.onAction = null; // set by Game
    this._bindClicks();
  }

  _bindClicks() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      this.onAction?.(action);
    });
  }

  showScreen(name) {
    for (const key of Object.keys(this.els.screens)) {
      this.els.screens[key].classList.toggle('active', key === name);
    }
  }

  hideAllOverlayScreens() {
    this.els.screens.pause.classList.remove('active');
    this.els.screens.results.classList.remove('active');
  }

  setHudVisible(visible) {
    this.els.hud.classList.toggle('hidden', !visible);
    this.setMobileControlsVisible(visible);
  }

  setMobileControlsVisible(visible) {
    if (this.els.mobileControls) {
      this.els.mobileControls.classList.toggle('hidden', !visible);
    }
  }

  setHudMode(mode) {
    this.els.hudSolo.classList.toggle('hidden', mode !== 'solo');
    this.els.hudDuo.classList.toggle('hidden', mode !== 'duo');
  }

  renderLives(el, lives, maxLives) {
    el.innerHTML = '';
    for (let i = 0; i < maxLives; i++) {
      const span = document.createElement('span');
      span.textContent = '❤';
      if (i >= lives) span.classList.add('life-lost');
      el.appendChild(span);
    }
  }

  updateSoloHud({ lives, maxLives, time, combo, score }) {
    this.renderLives(this.els.hudLives, lives, maxLives);
    this.els.hudTimer.textContent = Utils.formatTime(time);
    this.els.hudCombo.textContent = combo > 1 ? `คอมโบ x${combo}` : '';
    this.els.hudScore.textContent = Utils.formatScore(score);
  }

  updateDuoHud({ p1, p2, time }) {
    this.renderLives(this.els.hudLivesP1, p1.lives, p1.maxLives);
    this.renderLives(this.els.hudLivesP2, p2.lives, p2.maxLives);
    this.els.hudScoreP1.textContent = Utils.formatScore(p1.score);
    this.els.hudScoreP2.textContent = Utils.formatScore(p2.score);
    this.els.hudTimerDuo.textContent = Utils.formatTime(time);
  }

  updateEventBanner(text) {
    if (!text) {
      this.els.eventBanner.classList.add('hidden');
      return;
    }
    this.els.eventBanner.textContent = text;
    this.els.eventBanner.classList.remove('hidden');
  }

  renderStats() {
    const solo = Persistence.getSolo();
    const duo = Persistence.getDuo();
    this.els.statsBody.innerHTML = `
      <div class="stats-section-title">ผู้เล่นคนเดียว</div>
      <div>คะแนนสูงสุด: <b>${Utils.formatScore(solo.bestScore)}</b></div>
      <div>เวลารอดนานสุด: <b>${Utils.formatTime(solo.bestSurvivalTime)}</b></div>
      <div>คอมโบสูงสุด: <b>${solo.bestCombo}</b></div>
      <div>จำนวนเกมที่เล่น: <b>${solo.gamesPlayed}</b></div>
      <div class="stats-section-title">ผู้เล่น 2 คน</div>
      <div>จำนวนแมตช์: <b>${duo.matchesPlayed}</b></div>
      <div>P1 ชนะ: <b>${duo.p1Wins}</b> ครั้ง · P2 ชนะ: <b>${duo.p2Wins}</b> ครั้ง</div>
      <div>คะแนนสูงสุดที่เคยทำได้: <b>${Utils.formatScore(duo.bestScore)}</b></div>
    `;
  }

  renderSoloResults({ time, score, maxCombo, best }) {
    this.els.resultsPanel.innerHTML = `
      <div class="result-title result-title--lose">เกมจบ</div>
      <div class="result-stats">
        <div><div class="result-stat-label">เวลารอด</div><div class="result-stat-value">${Utils.formatTime(time)}</div>${best.isNewTime ? '<span class="new-best">สถิติใหม่!</span>' : ''}</div>
        <div><div class="result-stat-label">คะแนน</div><div class="result-stat-value">${Utils.formatScore(score)}</div>${best.isNewScore ? '<span class="new-best">สถิติใหม่!</span>' : ''}</div>
        <div><div class="result-stat-label">คอมโบสูงสุด</div><div class="result-stat-value">${maxCombo}</div>${best.isNewCombo ? '<span class="new-best">สถิติใหม่!</span>' : ''}</div>
        <div><div class="result-stat-label">สถิติสูงสุด</div><div class="result-stat-value">${Utils.formatScore(Persistence.getSolo().bestScore)}</div></div>
      </div>
      <nav class="menu-list">
        <button class="menu-btn" data-action="restart">เล่นอีกครั้ง</button>
        <button class="menu-btn menu-btn--ghost" data-action="quit-menu">กลับเมนู</button>
      </nav>
    `;
    this.showScreen('results');
  }

  renderDuoResults({ winner, p1, p2 }) {
    const p1Winner = winner === 1;
    const p2Winner = winner === 2;
    this.els.resultsPanel.innerHTML = `
      <div class="result-title ${winner ? 'result-title--win' : ''}">${winner ? `P${winner} ชนะ!` : 'เสมอ'}</div>
      <div class="result-duo-cols">
        <div class="result-duo-col ${p1Winner ? 'result-duo-col--winner' : ''}">
          <div class="result-duo-tag" style="color:${CONFIG.COLORS.player1}">P1 ${p1Winner ? '' : (p1.lives <= 0 ? '💀' : '')}</div>
          <div>ชีวิต: ${'❤'.repeat(p1.lives)}${'<span style="opacity:.25">' + '❤'.repeat(CONFIG.PLAYER.maxLives - p1.lives) + '</span>'}</div>
          <div>คะแนน: ${Utils.formatScore(p1.score)}</div>
        </div>
        <div class="result-duo-col ${p2Winner ? 'result-duo-col--winner' : ''}">
          <div class="result-duo-tag" style="color:${CONFIG.COLORS.player2}">P2 ${p2Winner ? '' : (p2.lives <= 0 ? '💀' : '')}</div>
          <div>ชีวิต: ${'❤'.repeat(p2.lives)}${'<span style="opacity:.25">' + '❤'.repeat(CONFIG.PLAYER.maxLives - p2.lives) + '</span>'}</div>
          <div>คะแนน: ${Utils.formatScore(p2.score)}</div>
        </div>
      </div>
      <nav class="menu-list">
        <button class="menu-btn" data-action="restart">เล่นอีกครั้ง</button>
        <button class="menu-btn menu-btn--ghost" data-action="quit-menu">กลับเมนู</button>
      </nav>
    `;
    this.showScreen('results');
  }
}
