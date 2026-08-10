// ==========================================================
// game.js — orchestrates all systems: state machine, main
// loop, spawning players, collision resolution, respawn,
// and wiring the UI. Individual systems stay decoupled;
// this is the only place that knows about all of them.
// ==========================================================

const GameState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY',
  RESULTS: 'RESULTS',
};

const NEAR_MISS_BUFFER = 42; // extra radius for "close call" dodge detection

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = new UI();
    this.input = new InputManager(canvas);
    this.vfx = new VFX();

    this.state = GameState.MENU;
    this.mode = 'solo';

    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 200));
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this._resize());
    }

    this.arena = new Arena(this._cssWidth, this._cssHeight);
    this.hazardManager = new HazardManager(this.arena, this.vfx);
    this.powerupManager = new PowerUpManager(this.arena, this.hazardManager, this.vfx);
    this.difficulty = new DifficultySystem();
    this.events = new EventSystem(this.arena, this.hazardManager, this.powerupManager);
    this.score = null;

    this.players = [];
    this.survivalTime = 0;
    this.globalSlowTimer = 0;

    this._lastTs = 0;

    this.devMode = new DevMode(this);
    window.game = this;

    this.ui.onAction = (action) => this._handleAction(action);
    this.ui.showScreen('menu');

    requestAnimationFrame((ts) => this._loop(ts));
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Use visualViewport when available — on mobile it gives the *actual*
    // visible area, excluding browser chrome (URL bar, toolbars).
    const vp = window.visualViewport;
    const w = vp ? vp.width : window.innerWidth;
    const h = vp ? vp.height : window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.style.top = (vp ? vp.offsetTop : 0) + 'px';
    this.canvas.style.left = (vp ? vp.offsetLeft : 0) + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._cssWidth = w;
    this._cssHeight = h;
    if (this.arena) this.arena.resize(w, h);
  }

  // -------------------- UI actions --------------------
  _handleAction(action) {
    switch (action) {
      case 'start-solo': this.startGame('solo'); break;
      case 'start-duo': this.startGame('duo'); break;
      case 'how-to-play': this.ui.showScreen('how'); break;
      case 'stats': this.ui.renderStats(); this.ui.showScreen('stats'); break;
      case 'back-menu': this.ui.showScreen('menu'); break;
      case 'pause': this.pause(); break;
      case 'resume': this.resume(); break;
      case 'restart': this.startGame(this.mode); break;
      case 'quit-menu': this.returnToMenu(); break;
      case 'toggle-dev': this.devMode.toggle(); break;
      default: break;
    }
  }

  // -------------------- Lifecycle --------------------
  startGame(mode) {
    this.mode = mode;
    this.state = GameState.PLAYING;

    this.arena.setShrink(1);
    this.hazardManager.reset();
    this.powerupManager.reset();
    this.difficulty.reset();
    this.events.reset();
    this.vfx.reset();
    this.globalSlowTimer = 0;
    this.survivalTime = 0;

    this.score = new ScoreSystem(mode);

    this.players = [];
    const p1 = new Player(1, CONFIG.COLORS.player1, this.arena);
    const start1 = this.arena.randomPointInside(120);
    p1.spawnAt(start1.x, start1.y);
    this.players.push(p1);

    if (mode === 'duo') {
      const p2 = new Player(2, CONFIG.COLORS.player2, this.arena);
      const b = this.arena.bounds;
      p2.spawnAt(b.x + b.w * 0.75, b.y + b.h * 0.5);
      p1.x = b.x + b.w * 0.25;
      p1.y = b.y + b.h * 0.5;
      this.players.push(p2);
    }

    this.ui.hideAllOverlayScreens();
    this.ui.showScreen(null);
    this.ui.setHudVisible(true);
    this.ui.setHudMode(mode);
  }

  pause() {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    this.ui.showScreen('pause');
  }

  resume() {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this.ui.hideAllOverlayScreens();
    this.ui.showScreen(null);
  }

  returnToMenu() {
    this.state = GameState.MENU;
    this.ui.setHudVisible(false);
    this.ui.hideAllOverlayScreens();
    this.ui.showScreen('menu');
  }

  applyGlobalSlow(duration) {
    this.globalSlowTimer = Math.max(this.globalSlowTimer, duration);
  }

  // -------------------- Main loop --------------------
  _loop(ts) {
    const dt = Math.min(0.033, (ts - this._lastTs) / 1000 || 0);
    this._lastTs = ts;

    if (this.state === GameState.PLAYING) {
      this._update(dt);
    }
    this._draw();

    requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this.survivalTime += dt;

    if (this.devMode) this.devMode.updateFPS();

    if (this.globalSlowTimer > 0) this.globalSlowTimer -= dt;
    const hazardDt = this.globalSlowTimer > 0 ? dt * 0.4 : dt;

    this.arena.update(dt);
    this.difficulty.update(dt);
    this.events.update(dt);
    this.events.maybeSpawnBonusItems();

    const effectiveLevel = this.difficulty.level;
    const chaosBoost = this.events.hazardSpawnMultiplier;
    this._hazardEventBoost = chaosBoost;

    // update hazards unless freeze feature is toggled on in DevMode
    if (!this.devMode || !this.devMode.freezeHazards) {
      this.hazardManager.update(hazardDt * chaosBoost, effectiveLevel, this.players);
    }
    this.powerupManager.update(dt);
    this.powerupManager.applyMagnetPull(this.players, dt);

    this._updatePlayers(dt);
    this._resolveCollisions();
    this._trackDodges();

    this.score.update(dt, this.players);
    this.vfx.update(dt);

    this._updateHud();
    this._checkEndConditions();
  }

  _updatePlayers(dt) {
    for (const player of this.players) {
      if (!player.alive) continue;
      let move, dash;
      if (player.id === 1 && this.mode === 'solo') {
        // Single Player: P1 is steered by the mouse/touch pointer.
        move = this.input.getPointerVector(player.x, player.y);
        dash = this.input.getPointerDash();
      } else if (player.id === 1) {
        move = this.input.getP1Vector();
        dash = this.input.getP1Dash();
      } else {
        move = this.input.getP2Vector();
        dash = this.input.getP2Dash();
      }
      player.update(dt, move, dash, this.devMode);
    }
  }

  _resolveCollisions() {
    for (const player of this.players) {
      if (!player.alive) continue;

      // hazards
      for (const hazard of this.hazardManager.hazards) {
        if (hazard.isActiveDanger() && hazard.overlapsCircle(player.x, player.y, player.radius)) {
          hazard.hitBy = hazard.hitBy || new Set();
          const wasAlreadyHit = hazard.hitBy.has(player.id);
          hazard.hitBy.add(player.id);
          if (!wasAlreadyHit || !player.isInvulnerable) {
            const lostLife = player.takeHit(this.vfx, this.devMode);
            if (lostLife) {
              this.score.forPlayer(player.id).breakCombo();
              if (player.alive) this._respawnPlayer(player);
            }
          }
        }
      }

      // power-ups
      const collected = this.powerupManager.collect(player, this);
      for (const c of collected) {
        if (c.nearDanger) {
          const bonus = this.score.forPlayer(player.id).addRiskBonus(150);
          this.vfx.floatText(player.x, player.y - 34, `+${bonus} เสี่ยงคุ้ม!`, { color: CONFIG.COLORS.warn, size: 13 });
        }
      }
    }
  }

  _trackDodges() {
    for (const hazard of this.hazardManager.hazards) {
      if (hazard.state === HazardState.ACTIVE) {
        hazard.dangerTracked = hazard.dangerTracked || new Set();
        for (const player of this.players) {
          if (!player.alive) continue;
          if (hazard.overlapsCircle(player.x, player.y, player.radius + NEAR_MISS_BUFFER)) {
            hazard.dangerTracked.add(player.id);
          }
        }
      }
      if (hazard.state === HazardState.RECOVERY && !hazard._dodgeResolved) {
        hazard._dodgeResolved = true;
        const tracked = hazard.dangerTracked || new Set();
        const hit = hazard.hitBy || new Set();
        for (const pid of tracked) {
          if (!hit.has(pid)) {
            const player = this.players.find((p) => p.id === pid);
            if (player && player.alive) {
              const gained = this.score.forPlayer(pid).addDodge();
              this.vfx.floatText(player.x, player.y - 26, `+${gained}`, { color: CONFIG.COLORS.good, size: 13 });
            }
          }
        }
      }
    }
  }

  _respawnPlayer(player) {
    let point = null;
    let fallback = null;
    for (let i = 0; i < CONFIG.RESPAWN.maxAttempts; i++) {
      const candidate = this.arena.randomPointInside(60);
      if (this.hazardManager.isPointSafe(candidate.x, candidate.y, CONFIG.RESPAWN.safeRadius)) {
        point = candidate;
        break;
      }
      // Track a lesser fallback: a spot that isn't inside an *actively*
      // dangerous hazard right now, even if a warning zone is nearby.
      // Far better than blindly defaulting to the arena's exact center,
      // which can itself sit inside a hazard when the field is crowded.
      if (!fallback) {
        const inActiveDanger = this.hazardManager.hazards.some(
          (h) => h.state === HazardState.ACTIVE && h.overlapsCircle(candidate.x, candidate.y, player.radius + 12)
        );
        if (!inActiveDanger) fallback = candidate;
      }
    }
    if (!point) point = fallback || { x: this.arena.bounds.x + this.arena.bounds.w / 2, y: this.arena.bounds.y + this.arena.bounds.h / 2 };
    this.vfx.ringPulse(point.x, point.y, 60, player.color, 0.5);
    player.spawnAt(point.x, point.y);
  }

  _updateHud() {
    if (this.mode === 'solo') {
      const p = this.players[0];
      const s = this.score.forPlayer(1);
      this.ui.updateSoloHud({
        lives: p.lives, maxLives: CONFIG.PLAYER.maxLives,
        time: this.survivalTime, combo: s.combo, score: s.score,
      });
    } else {
      const p1 = this.players[0], p2 = this.players[1];
      const s1 = this.score.forPlayer(1), s2 = this.score.forPlayer(2);
      this.ui.updateDuoHud({
        p1: { lives: p1.lives, maxLives: CONFIG.PLAYER.maxLives, score: s1.score },
        p2: { lives: p2.lives, maxLives: CONFIG.PLAYER.maxLives, score: s2.score },
        time: this.survivalTime,
      });
    }
    this.ui.updateEventBanner(this.events.isBannerVisible ? this.events.bannerText : '');
  }

  _checkEndConditions() {
    if (this.mode === 'solo') {
      const p = this.players[0];
      if (!p.alive) this._endSolo();
    } else {
      const p1 = this.players[0], p2 = this.players[1];
      if (!p1.alive || !p2.alive) this._endDuo();
    }
  }

  _endSolo() {
    this.state = GameState.RESULTS;
    const s = this.score.forPlayer(1);
    const best = Persistence.recordSolo({
      score: s.score, survivalTime: this.survivalTime, maxCombo: s.maxCombo,
    });
    this.ui.renderSoloResults({ time: this.survivalTime, score: s.score, maxCombo: s.maxCombo, best });
  }

  _endDuo() {
    this.state = GameState.RESULTS;
    const p1 = this.players[0], p2 = this.players[1];
    const s1 = this.score.forPlayer(1), s2 = this.score.forPlayer(2);
    let winner = null;
    if (!p1.alive && p2.alive) winner = 2;
    else if (!p2.alive && p1.alive) winner = 1;
    Persistence.recordDuo({ winner, p1Score: s1.score, p2Score: s2.score });
    this.ui.renderDuoResults({
      winner,
      p1: { lives: p1.lives, score: s1.score },
      p2: { lives: p2.lives, score: s2.score },
    });
  }

  // -------------------- Rendering --------------------
  _draw() {
    const ctx = this.ctx;
    const w = this._cssWidth, h = this._cssHeight;

    ctx.save();
    const shakeActive = this.state === GameState.PLAYING;
    const shake = shakeActive ? this.vfx.getShakeOffset() : { x: 0, y: 0 };
    ctx.translate(shake.x, shake.y);

    this.arena.draw(ctx, this.events.isBlackout);

    if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
      this.hazardManager.draw(ctx);
      this.powerupManager.draw(ctx);
      for (const p of this.players) p.draw(ctx);
      this.vfx.drawWorld(ctx);
    }

    ctx.restore();

    this.vfx.drawScreenFlash(ctx, w, h);
    if (this.devMode) this.devMode.drawDebugOverlay(ctx);
  }
}
