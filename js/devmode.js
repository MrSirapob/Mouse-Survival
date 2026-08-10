// ==========================================================
// devmode.js — Dev Mode & Debug Tools System
// Provides cheats, spawner tools, event triggers, difficulty
// controls, and hitbox/FPS debug overlay.
// ==========================================================

class DevMode {
  constructor(game) {
    this.game = game;

    // State
    this.active = false;          // Whether panel is visible
    this.godMode = false;         // Invincibility
    this.infiniteDash = false;    // Zero dash cooldown
    this.speedMultiplier = 1.0;   // Player speed modifier
    this.showHitboxes = false;    // Visual debug overlay
    this.freezeHazards = false;   // Pause hazard updates

    // FPS counter helper
    this.fps = 60;
    this._frameCount = 0;
    this._lastFpsUpdate = performance.now();

    this.panelEl = null;
    this._initUI();
    this._bindKeys();
  }

  toggle() {
    this.active = !this.active;
    if (this.panelEl) {
      this.panelEl.classList.toggle('hidden', !this.active);
    }
  }

  show() {
    this.active = true;
    if (this.panelEl) this.panelEl.classList.remove('hidden');
  }

  hide() {
    this.active = false;
    if (this.panelEl) this.panelEl.classList.add('hidden');
  }

  updateFPS() {
    this._frameCount++;
    const now = performance.now();
    if (now - this._lastFpsUpdate >= 500) {
      this.fps = Math.round((this._frameCount * 1000) / (now - this._lastFpsUpdate));
      this._frameCount = 0;
      this._lastFpsUpdate = now;
      const fpsEl = document.getElementById('dev-fps-val');
      if (fpsEl) fpsEl.textContent = this.fps;
    }
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      // Key `~` or `Backquote` or `F2`
      if (e.key === '`' || e.key === '~' || e.key === 'F2') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  _initUI() {
    // Check if already created
    if (document.getElementById('dev-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'dev-panel';
    panel.className = 'dev-panel hidden';
    panel.innerHTML = `
      <div class="dev-header">
        <div class="dev-title">🛠 DEV MODE PANEL</div>
        <div class="dev-header-actions">
          <span class="dev-fps">FPS: <span id="dev-fps-val">60</span></span>
          <button class="dev-close-btn" id="dev-close-btn">✖</button>
        </div>
      </div>

      <div class="dev-tabs">
        <button class="dev-tab active" data-tab="cheats">⚡ Cheats</button>
        <button class="dev-tab" data-tab="spawner">🎯 Spawner</button>
        <button class="dev-tab" data-tab="world">🌐 World</button>
      </div>

      <div class="dev-tab-content active" id="dev-tab-cheats">
        <div class="dev-row">
          <label class="dev-toggle">
            <input type="checkbox" id="dev-godmode">
            <span class="dev-slider"></span>
            <span>🛡 อมตะ (God Mode)</span>
          </label>
        </div>
        <div class="dev-row">
          <label class="dev-toggle">
            <input type="checkbox" id="dev-infdash">
            <span class="dev-slider"></span>
            <span>⚡ Dash ไม่จำกัด</span>
          </label>
        </div>
        <div class="dev-row">
          <label class="dev-toggle">
            <input type="checkbox" id="dev-hitbox">
            <span class="dev-slider"></span>
            <span>📐 แสดง Hitbox & Debug Info</span>
          </label>
        </div>
        <div class="dev-row">
          <label class="dev-label">ความเร็วผู้เล่น:</label>
          <div class="dev-btn-group">
            <button class="dev-btn dev-speed-btn active" data-speed="1.0">1.0x</button>
            <button class="dev-btn dev-speed-btn" data-speed="1.5">1.5x</button>
            <button class="dev-btn dev-speed-btn" data-speed="2.0">2.0x</button>
            <button class="dev-btn dev-speed-btn" data-speed="3.0">3.0x</button>
          </div>
        </div>
        <div class="dev-row dev-grid-2">
          <button class="dev-btn dev-btn--action" id="dev-refill-hp">❤️ เลือดเต็ม / +1 ชีวิต</button>
          <button class="dev-btn dev-btn--action" id="dev-add-shield">🛡 ให้เกราะ (Shield)</button>
        </div>
        <div class="dev-row">
          <button class="dev-btn dev-btn--danger" id="dev-clear-hazards">🧹 ลบอันตรายทั้งหมดบนสนาม</button>
        </div>
      </div>

      <div class="dev-tab-content" id="dev-tab-spawner">
        <div class="dev-section-title">เสกอันตราย (Spawn Hazard)</div>
        <div class="dev-grid-3">
          <button class="dev-btn" data-spawn-hazard="bomb">💣 Bomb</button>
          <button class="dev-btn" data-spawn-hazard="laserH">▬ Laser H</button>
          <button class="dev-btn" data-spawn-hazard="laserV">❚ Laser V</button>
          <button class="dev-btn" data-spawn-hazard="rotatingLaser">🔄 Rotate Laser</button>
          <button class="dev-btn" data-spawn-hazard="falling">☄️ Falling</button>
          <button class="dev-btn" data-spawn-hazard="wallH">🧱 Wall H</button>
          <button class="dev-btn" data-spawn-hazard="wallV">🧱 Wall V</button>
        </div>

        <div class="dev-section-title">เสกไอเทม (Spawn Power-up)</div>
        <div class="dev-grid-3">
          <button class="dev-btn" data-spawn-powerup="shield">🛡️ Shield</button>
          <button class="dev-btn" data-spawn-powerup="speed">⚡ Speed</button>
          <button class="dev-btn" data-spawn-powerup="slow">⏳ Time Slow</button>
          <button class="dev-btn" data-spawn-powerup="magnet">🧲 Magnet</button>
          <button class="dev-btn" data-spawn-powerup="lifeShard">💎 Life Shard</button>
          <button class="dev-btn" data-spawn-powerup="clearField">💥 Clear Field</button>
        </div>
      </div>

      <div class="dev-tab-content" id="dev-tab-world">
        <div class="dev-row">
          <label class="dev-toggle">
            <input type="checkbox" id="dev-freeze">
            <span class="dev-slider"></span>
            <span>❄️ แช่แข็ง Hazard (Freeze Hazards)</span>
          </label>
        </div>
        <div class="dev-section-title">ปรับระดับความยาก (Difficulty Level)</div>
        <div class="dev-row dev-flex-row">
          <input type="range" id="dev-diff-slider" min="0" max="12" step="1" value="0">
          <span id="dev-diff-val" class="dev-badge">Lv. 0</span>
        </div>

        <div class="dev-section-title">เรียกใช้ Event</div>
        <div class="dev-grid-2">
          <button class="dev-btn" data-trigger-event="blackout">🌑 Blackout</button>
          <button class="dev-btn" data-trigger-event="meteorShower">☄️ Meteor Shower</button>
          <button class="dev-btn" data-trigger-event="chaosSpawn">🔥 Chaos Spawn</button>
          <button class="dev-btn" data-trigger-event="shrinkArena">📐 Shrink Arena</button>
          <button class="dev-btn" data-trigger-event="expandArena">↔️ Expand Arena</button>
          <button class="dev-btn" data-trigger-event="speedZone">⚡ Speed Zone</button>
        </div>
        <div class="dev-row" style="margin-top: 10px;">
          <button class="dev-btn dev-btn--action" id="dev-add-time">+30 วินาที เวลาเล่น</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.panelEl = panel;

    this._bindPanelEvents();
  }

  _bindPanelEvents() {
    const panel = this.panelEl;

    // Close button
    panel.querySelector('#dev-close-btn').addEventListener('click', () => this.hide());

    // Tabs
    const tabs = panel.querySelectorAll('.dev-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = `dev-tab-${tab.dataset.tab}`;
        panel.querySelectorAll('.dev-tab-content').forEach((c) => {
          c.classList.toggle('active', c.id === targetId);
        });
      });
    });

    // Toggles
    panel.querySelector('#dev-godmode').addEventListener('change', (e) => {
      this.godMode = e.target.checked;
    });

    panel.querySelector('#dev-infdash').addEventListener('change', (e) => {
      this.infiniteDash = e.target.checked;
    });

    panel.querySelector('#dev-hitbox').addEventListener('change', (e) => {
      this.showHitboxes = e.target.checked;
    });

    panel.querySelector('#dev-freeze').addEventListener('change', (e) => {
      this.freezeHazards = e.target.checked;
    });

    // Speed buttons
    const speedBtns = panel.querySelectorAll('.dev-speed-btn');
    speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        speedBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.speedMultiplier = parseFloat(btn.dataset.speed);
      });
    });

    // Actions
    panel.querySelector('#dev-refill-hp').addEventListener('click', () => {
      if (this.game.players) {
        for (const p of this.game.players) {
          p.restoreLife();
        }
      }
    });

    panel.querySelector('#dev-add-shield').addEventListener('click', () => {
      if (this.game.players) {
        for (const p of this.game.players) {
          p.applyShield();
        }
      }
    });

    panel.querySelector('#dev-clear-hazards').addEventListener('click', () => {
      if (this.game.hazardManager) {
        this.game.hazardManager.hazards.length = 0;
        this.game.hazardManager.pendingSteps.length = 0;
      }
    });

    // Spawn hazards
    panel.querySelectorAll('[data-spawn-hazard]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.spawnHazard;
        if (this.game.hazardManager) {
          const level = this.game.difficulty ? this.game.difficulty.level : 0;
          this.game.hazardManager._spawn(type, level, {}, this.game.players || []);
        }
      });
    });

    // Spawn powerups
    panel.querySelectorAll('[data-spawn-powerup]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.spawnPowerup;
        if (this.game.powerupManager) {
          this.game.powerupManager.spawnSpecific(type);
        }
      });
    });

    // Difficulty slider
    const diffSlider = panel.querySelector('#dev-diff-slider');
    const diffVal = panel.querySelector('#dev-diff-val');
    diffSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      diffVal.textContent = `Lv. ${val}`;
      if (this.game.difficulty) {
        this.game.difficulty.level = val;
      }
    });

    // Trigger events
    panel.querySelectorAll('[data-trigger-event]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const evt = btn.dataset.triggerEvent;
        if (this.game.events) {
          this.game.events.triggerSpecificEvent(evt);
        }
      });
    });

    // Add time
    panel.querySelector('#dev-add-time').addEventListener('click', () => {
      if (this.game.state === GameState.PLAYING) {
        this.game.survivalTime += 30;
      }
    });
  }

  drawDebugOverlay(ctx) {
    if (!this.showHitboxes || !this.game) return;

    ctx.save();

    // 1. Draw Arena Boundary
    if (this.game.arena) {
      const b = this.game.arena.bounds;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);
    }

    // 2. Player Hitboxes
    if (this.game.players) {
      for (const p of this.game.players) {
        if (!p.alive) continue;
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair center
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);

        // Coordinates text
        ctx.font = '10px monospace';
        ctx.fillStyle = '#00ff66';
        ctx.fillText(`P${p.id} (${Math.round(p.x)},${Math.round(p.y)})`, p.x - 20, p.y - p.radius - 6);
      }
    }

    // 3. Hazards Hitboxes
    if (this.game.hazardManager) {
      for (const h of this.game.hazardManager.hazards) {
        ctx.strokeStyle = h.state === HazardState.ACTIVE ? '#ff0055' : '#ffaa00';
        ctx.lineWidth = 1.5;

        if (h.x !== undefined && (h.radius || h.impactRadius)) {
          const r = h.radius || h.impactRadius;
          ctx.beginPath();
          ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (h.orientation && h.pos !== undefined) {
          // Line / Wall lasers
          const b = this.game.arena.bounds;
          ctx.beginPath();
          if (h.orientation === 'horizontal') {
            ctx.moveTo(b.x, h.pos);
            ctx.lineTo(b.x + b.w, h.pos);
          } else {
            ctx.moveTo(h.pos, b.y);
            ctx.lineTo(h.pos, b.y + b.h);
          }
          ctx.stroke();
        }
      }
    }

    // 4. Power-ups Hitboxes
    if (this.game.powerupManager) {
      for (const p of this.game.powerupManager.items) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 5. Top Left Debug Stats Box
    ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
    ctx.strokeStyle = 'rgba(79, 184, 204, 0.5)';
    ctx.lineWidth = 1;
    ctx.fillRect(10, 10, 180, 100);
    ctx.strokeRect(10, 10, 180, 100);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#4fb8cc';
    ctx.fillText(`FPS: ${this.fps}`, 18, 26);
    ctx.fillText(`State: ${this.game.state}`, 18, 42);
    ctx.fillText(`Difficulty Lv: ${this.game.difficulty ? this.game.difficulty.level : 0}`, 18, 58);
    ctx.fillText(`Hazards: ${this.game.hazardManager ? this.game.hazardManager.hazards.length : 0}`, 18, 74);
    ctx.fillText(`PowerUps: ${this.game.powerupManager ? this.game.powerupManager.items.length : 0}`, 18, 90);

    ctx.restore();
  }
}
