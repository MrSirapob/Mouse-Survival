// ==========================================================
// player.js — the Energy Core the player controls.
// Handles movement, dash, lives, invulnerability, shield,
// and its own trail/pulse rendering (no external sprites).
// ==========================================================

class Player {
  constructor(id, color, arena) {
    this.id = id; // 1 or 2
    this.color = color;
    this.arena = arena;
    this.radius = CONFIG.PLAYER.radius;
    this.lives = CONFIG.PLAYER.maxLives;
    this.alive = true;
    this.x = 0;
    this.y = 0;
    this.trail = [];

    this.invulnTimer = 0;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashDir = { x: 0, y: 0 };

    this.hasShield = false;
    this.hasMagnet = false;
    this.magnetTimer = 0;
    this.slowFactor = 1;

    this._prevDashKey = false;
  }

  spawnAt(x, y) {
    this.x = x;
    this.y = y;
    this.trail.length = 0;
    this.invulnTimer = CONFIG.PLAYER.invulnDuration;
    this.alive = true;
  }

  get isInvulnerable() {
    return this.invulnTimer > 0;
  }

  get isDashing() {
    return this.dashTimer > 0;
  }

  update(dt, moveVec, dashPressed, devMode) {
    if (!this.alive) return;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (devMode && devMode.infiniteDash) {
      this.dashCooldownTimer = 0;
    } else if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= dt;
    }

    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
      if (this.magnetTimer <= 0) this.hasMagnet = false;
    }

    // start dash
    const dashJustPressed = dashPressed && !this._prevDashKey;
    this._prevDashKey = dashPressed;
    if (dashJustPressed && this.dashCooldownTimer <= 0 && (moveVec.x !== 0 || moveVec.y !== 0) && this.dashTimer <= 0) {
      this.dashTimer = CONFIG.PLAYER.dashDuration;
      this.dashCooldownTimer = devMode && devMode.infiniteDash ? 0 : CONFIG.PLAYER.dashCooldown;
      this.dashDir = { ...moveVec };
    }

    let speedMultiplier = devMode ? devMode.speedMultiplier : 1.0;
    let speed = CONFIG.PLAYER.speed * this.slowFactor * speedMultiplier;
    let vx = moveVec.x, vy = moveVec.y;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      vx = this.dashDir.x;
      vy = this.dashDir.y;
      speed = CONFIG.PLAYER.dashSpeed * speedMultiplier;
    }

    this.x += vx * speed * dt;
    this.y += vy * speed * dt;

    const clamped = this.arena.clampToArena(this.x, this.y, this.radius);
    this.x = clamped.x;
    this.y = clamped.y;

    // trail
    if (vx !== 0 || vy !== 0) {
      this.trail.push({ x: this.x, y: this.y, life: 0.28 });
    }
    this.trail = this.trail.filter((t) => {
      t.life -= dt;
      return t.life > 0;
    });
  }

  // Returns true if the hit actually removed a life (false if absorbed/invuln)
  takeHit(vfx, devMode) {
    if (devMode && devMode.godMode) return false;
    if (this.isInvulnerable || !this.alive) return false;

    if (this.hasShield) {
      this.hasShield = false;
      this.invulnTimer = 0.5;
      vfx.ringPulse(this.x, this.y, 50, this.color, 0.4);
      vfx.burst(this.x, this.y, this.color, 14, { speed: 140, life: 0.4 });
      return false; // shield absorbed it
    }

    this.lives -= 1;
    vfx.burst(this.x, this.y, CONFIG.COLORS.danger, 26, { speed: 260, life: 0.6, size: 4 });
    vfx.shake(8, 0.28);
    vfx.flash(CONFIG.COLORS.danger, 0.28);

    if (this.lives <= 0) {
      this.alive = false;
      return true;
    }
    this.invulnTimer = CONFIG.PLAYER.invulnDuration;
    return true;
  }

  applyShield() { this.hasShield = true; }
  applyMagnet(duration) { this.hasMagnet = true; this.magnetTimer = duration; }
  applySlowImmune() { /* placeholder hook for future modifiers */ }
  restoreLife() {
    this.lives = Math.min(CONFIG.PLAYER.maxLives, this.lives + 1);
  }

  draw(ctx) {
    if (!this.alive) return;

    // trail
    for (const t of this.trail) {
      const a = Utils.clamp(t.life / 0.28, 0, 1) * 0.35;
      ctx.globalAlpha = a;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const blinking = this.isInvulnerable && Math.floor(performance.now() / 90) % 2 === 0;

    ctx.save();
    if (blinking) ctx.globalAlpha = 0.4;

    // shield ring
    if (this.hasShield) {
      ctx.strokeStyle = CONFIG.COLORS.good;
      ctx.lineWidth = 3;
      ctx.shadowColor = CONFIG.COLORS.good;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // soft core glow (subtle, not a full neon halo)
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.6);
    grad.addColorStop(0, this.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // core body
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // inner white core
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
