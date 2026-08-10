// ==========================================================
// arena.js — the rectangular play field. Simple background,
// subtle grid, clear boundary. Supports temporary shrinking
// for the Shrinking Arena event/hazard.
// ==========================================================

class Arena {
  constructor(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.pad = CONFIG.ARENA.padding;
    this._recalc();
    this.shrinkFactor = 1; // 1 = full size, <1 = shrunk
    this.targetShrinkFactor = 1;
    this.gridOffset = 0;
  }

  resize(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this._recalc();
  }

  _recalc() {
    this.fullX = this.pad;
    this.fullY = this.pad;
    this.fullW = this.canvasWidth - this.pad * 2;
    this.fullH = this.canvasHeight - this.pad * 2;
  }

  setShrink(factor) {
    this.targetShrinkFactor = Utils.clamp(factor, 0.45, 1);
  }

  update(dt) {
    this.shrinkFactor = Utils.lerp(this.shrinkFactor, this.targetShrinkFactor, Math.min(1, dt * 2));
    this.gridOffset = (this.gridOffset + dt * 8) % CONFIG.ARENA.gridSize;
  }

  // Current playable bounds (accounting for shrink)
  get bounds() {
    const cx = this.fullX + this.fullW / 2;
    const cy = this.fullY + this.fullH / 2;
    const w = this.fullW * this.shrinkFactor;
    const h = this.fullH * this.shrinkFactor;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  clampToArena(x, y, r = 0) {
    const b = this.bounds;
    return {
      x: Utils.clamp(x, b.x + r, b.x + b.w - r),
      y: Utils.clamp(y, b.y + r, b.y + b.h - r),
    };
  }

  randomPointInside(margin = 20) {
    const b = this.bounds;
    return {
      x: Utils.rand(b.x + margin, b.x + b.w - margin),
      y: Utils.rand(b.y + margin, b.y + b.h - margin),
    };
  }

  draw(ctx, blackout = false) {
    const b = this.bounds;

    // backdrop
    ctx.fillStyle = '#06070c';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // subtle grid inside arena
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();

    ctx.strokeStyle = blackout ? 'rgba(79,184,204,0.025)' : 'rgba(79,184,204,0.05)';
    ctx.lineWidth = 1;
    const grid = CONFIG.ARENA.gridSize;
    for (let gx = b.x - (b.x % grid) - grid; gx < b.x + b.w + grid; gx += grid) {
      ctx.beginPath();
      ctx.moveTo(gx, b.y);
      ctx.lineTo(gx, b.y + b.h);
      ctx.stroke();
    }
    for (let gy = b.y - (b.y % grid) - grid; gy < b.y + b.h + grid; gy += grid) {
      ctx.beginPath();
      ctx.moveTo(b.x, gy);
      ctx.lineTo(b.x + b.w, gy);
      ctx.stroke();
    }

    if (blackout) {
      const vg = ctx.createRadialGradient(
        this.canvasWidth / 2, this.canvasHeight / 2, 40,
        this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.5
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.94)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    ctx.restore();

    // boundary
    ctx.strokeStyle = 'rgba(79,184,204,0.45)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4fb8cc';
    ctx.shadowBlur = 4;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
  }
}
