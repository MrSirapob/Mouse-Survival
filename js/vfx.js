// ==========================================================
// vfx.js — particles, screen shake, flashes, pulses.
// The game has no audio, so all feedback happens here.
// ==========================================================

class Particle {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    const angle = opts.angle ?? Utils.rand(0, Math.PI * 2);
    const speed = opts.speed ?? Utils.rand(60, 220);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = opts.life ?? Utils.rand(0.35, 0.8);
    this.maxLife = this.life;
    this.size = opts.size ?? Utils.rand(2, 5);
    this.color = opts.color ?? '#38f2ff';
    this.gravity = opts.gravity ?? 0;
    this.drag = opts.drag ?? 2.2;
    this.shrink = opts.shrink ?? true;
  }

  update(dt) {
    this.vx -= this.vx * this.drag * dt;
    this.vy -= this.vy * this.drag * dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const t = Utils.clamp(this.life / this.maxLife, 0, 1);
    const size = this.shrink ? this.size * t : this.size;
    ctx.globalAlpha = t;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(size, 0.1), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class FloatingText {
  constructor(x, y, text, opts = {}) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.life = opts.life ?? 0.8;
    this.maxLife = this.life;
    this.color = opts.color ?? '#38ffab';
    this.size = opts.size ?? 16;
    this.vy = opts.vy ?? -40;
  }
  update(dt) {
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }
  draw(ctx) {
    const t = Utils.clamp(this.life / this.maxLife, 0, 1);
    ctx.globalAlpha = t;
    ctx.fillStyle = this.color;
    ctx.font = `700 ${this.size}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 4;
    ctx.fillText(this.text, this.x, this.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

class VFX {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.flashColor = null;
    this.flashAlpha = 0;
    this.pulses = []; // expanding ring effects {x,y,r,maxR,life,maxLife,color}
  }

  reset() {
    this.particles.length = 0;
    this.texts.length = 0;
    this.pulses.length = 0;
    this.shakeTime = 0;
    this.flashAlpha = 0;
  }

  burst(x, y, color, count = 16, opts = {}) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, { color, ...opts }));
    }
  }

  ringPulse(x, y, maxR, color, life = 0.5) {
    this.pulses.push({ x, y, r: 0, maxR, life, maxLife: life, color });
  }

  floatText(x, y, text, opts = {}) {
    this.texts.push(new FloatingText(x, y, text, opts));
  }

  shake(magnitude, duration) {
    this.shakeMag = Math.max(this.shakeMag, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  flash(color, alpha = 0.35) {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  getShakeOffset() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const t = this.shakeTime;
    return {
      x: Utils.rand(-1, 1) * this.shakeMag * t,
      y: Utils.rand(-1, 1) * this.shakeMag * t,
    };
  }

  update(dt) {
    this.particles = this.particles.filter((p) => p.update(dt));
    this.texts = this.texts.filter((t) => t.update(dt));
    this.pulses = this.pulses.filter((p) => {
      p.life -= dt;
      p.r = Utils.lerp(0, p.maxR, 1 - p.life / p.maxLife);
      return p.life > 0;
    });
    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.8);
  }

  drawWorld(ctx) {
    for (const p of this.pulses) {
      const t = 1 - p.life / p.maxLife;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    for (const p of this.particles) p.draw(ctx);
    for (const t of this.texts) t.draw(ctx);
  }

  drawScreenFlash(ctx, width, height) {
    if (this.flashAlpha > 0 && this.flashColor) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }
}
