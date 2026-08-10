// ==========================================================
// hazard.js — base Hazard class implementing the shared
// Telegraph -> Warning -> Active -> Recovery state machine.
// Concrete hazard types only need to define their geometry
// (overlapsCircle) and how each phase is drawn.
//
// To add a NEW hazard type: extend Hazard, implement
// overlapsCircle() + draw(), then register it in
// hazardManager.js's HAZARD_TYPES table. Nothing else
// needs to change.
// ==========================================================

const HazardState = {
  WARNING: 'warning',   // telegraph — visible, harmless
  ACTIVE: 'active',      // dangerous
  RECOVERY: 'recovery',  // fading out, harmless
  DONE: 'done',           // remove from world
};

class Hazard {
  constructor(arena, opts = {}) {
    this.arena = arena;
    this.type = opts.type || 'generic';
    this.state = HazardState.WARNING;
    this.timer = 0;

    this.warnDuration = opts.warnDuration ?? 1.0;
    this.activeDuration = opts.activeDuration ?? 0.5;
    this.recoveryDuration = opts.recoveryDuration ?? 0.3;

    this.id = Utils.uid();
  }

  get stateProgress() {
    // 0..1 progress through current phase
    const dur = this._currentDuration();
    return dur > 0 ? Utils.clamp(this.timer / dur, 0, 1) : 1;
  }

  _currentDuration() {
    switch (this.state) {
      case HazardState.WARNING: return this.warnDuration;
      case HazardState.ACTIVE: return this.activeDuration;
      case HazardState.RECOVERY: return this.recoveryDuration;
      default: return 0;
    }
  }

  update(dt) {
    this.timer += dt;
    const dur = this._currentDuration();
    if (this.timer >= dur) {
      this.timer = 0;
      this._advanceState();
    }
    this.onUpdate?.(dt);
  }

  _advanceState() {
    if (this.state === HazardState.WARNING) this.state = HazardState.ACTIVE;
    else if (this.state === HazardState.ACTIVE) this.state = HazardState.RECOVERY;
    else if (this.state === HazardState.RECOVERY) this.state = HazardState.DONE;
  }

  isActiveDanger() {
    return this.state === HazardState.ACTIVE;
  }

  isDone() {
    return this.state === HazardState.DONE;
  }

  // Override: does the danger shape overlap a circle (player)?
  overlapsCircle(_x, _y, _r) {
    return false;
  }

  // Override: draw for the current state
  draw(_ctx) {}
}

// -----------------------------------------------------------
// Bomb Zone — circular telegraph that explodes outward once.
// -----------------------------------------------------------
class BombZoneHazard extends Hazard {
  constructor(arena, opts) {
    super(arena, { type: 'bomb', warnDuration: opts.warnDuration, activeDuration: 0.28, recoveryDuration: 0.35 });
    this.x = opts.x;
    this.y = opts.y;
    this.radius = opts.radius ?? 55;
  }
  overlapsCircle(x, y, r) {
    return Utils.circlesOverlap(this.x, this.y, this.radius, x, y, r);
  }
  draw(ctx) {
    if (this.state === HazardState.WARNING) {
      const p = this.stateProgress;
      const pulse = 0.6 + 0.4 * Math.sin(p * Math.PI * 6);
      ctx.strokeStyle = CONFIG.COLORS.warn;
      ctx.lineWidth = 2 + p * 2;
      ctx.globalAlpha = 0.5 + 0.4 * pulse;
      ctx.shadowColor = CONFIG.COLORS.warn;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * (0.3 + 0.7 * p), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    } else if (this.state === HazardState.ACTIVE) {
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      grad.addColorStop(0, 'rgba(255,45,85,0.95)');
      grad.addColorStop(0.7, 'rgba(255,45,85,0.55)');
      grad.addColorStop(1, 'rgba(255,45,85,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.state === HazardState.RECOVERY) {
      const p = 1 - this.stateProgress;
      ctx.globalAlpha = p * 0.4;
      ctx.fillStyle = CONFIG.COLORS.danger;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// -----------------------------------------------------------
// Laser Sweep — a straight beam that telegraphs along a line
// then sweeps across the arena in the active phase.
// -----------------------------------------------------------
class LaserSweepHazard extends Hazard {
  constructor(arena, opts) {
    super(arena, { type: 'laser', warnDuration: opts.warnDuration, activeDuration: 0.55, recoveryDuration: 0.25 });
    this.orientation = opts.orientation || 'horizontal'; // or 'vertical'
    this.pos = opts.pos; // fixed coordinate along the perpendicular axis
    this.thickness = opts.thickness ?? 26;
  }
  _lineRect() {
    const b = this.arena.bounds;
    if (this.orientation === 'horizontal') {
      return { x: b.x, y: this.pos - this.thickness / 2, w: b.w, h: this.thickness };
    }
    return { x: this.pos - this.thickness / 2, y: b.y, w: this.thickness, h: b.h };
  }
  overlapsCircle(x, y, r) {
    const rect = this._lineRect();
    return Utils.circleIntersectsRect(x, y, r, rect.x, rect.y, rect.w, rect.h);
  }
  draw(ctx) {
    const b = this.arena.bounds;
    const rect = this._lineRect();
    if (this.state === HazardState.WARNING) {
      ctx.strokeStyle = CONFIG.COLORS.warn;
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.35 * Math.sin(this.timer * 14);
      ctx.beginPath();
      if (this.orientation === 'horizontal') {
        ctx.moveTo(b.x, this.pos);
        ctx.lineTo(b.x + b.w, this.pos);
      } else {
        ctx.moveTo(this.pos, b.y);
        ctx.lineTo(this.pos, b.y + b.h);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else if (this.state === HazardState.ACTIVE) {
      const grad = this.orientation === 'horizontal'
        ? ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h)
        : ctx.createLinearGradient(rect.x, 0, rect.x + rect.w, 0);
      grad.addColorStop(0, 'rgba(255,45,85,0)');
      grad.addColorStop(0.5, 'rgba(255,45,85,0.95)');
      grad.addColorStop(1, 'rgba(255,45,85,0)');
      ctx.fillStyle = grad;
      ctx.shadowColor = CONFIG.COLORS.danger;
      ctx.shadowBlur = 8;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.shadowBlur = 0;
    } else if (this.state === HazardState.RECOVERY) {
      ctx.globalAlpha = 1 - this.stateProgress;
      ctx.fillStyle = CONFIG.COLORS.danger;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1;
    }
  }
}

// -----------------------------------------------------------
// Rotating Laser — a beam pivoting around a fixed centre point.
// -----------------------------------------------------------
class RotatingLaserHazard extends Hazard {
  constructor(arena, opts) {
    super(arena, { type: 'rotatingLaser', warnDuration: opts.warnDuration, activeDuration: opts.activeDuration ?? 2.2, recoveryDuration: 0.3 });
    this.cx = opts.cx;
    this.cy = opts.cy;
    this.length = opts.length ?? 260;
    this.thickness = opts.thickness ?? 18;
    this.angle = opts.angle ?? 0;
    this.angularSpeed = opts.angularSpeed ?? 1.6; // rad/sec
  }
  onUpdate(dt) {
    if (this.state === HazardState.ACTIVE) this.angle += this.angularSpeed * dt;
  }
  _endpoint() {
    return { x: this.cx + Math.cos(this.angle) * this.length, y: this.cy + Math.sin(this.angle) * this.length };
  }
  overlapsCircle(x, y, r) {
    const end = this._endpoint();
    return Utils.distToSegment
      ? Utils.distToSegment(x, y, this.cx, this.cy, end.x, end.y) < r + this.thickness / 2
      : this._segDist(x, y, end) < r + this.thickness / 2;
  }
  _segDist(px, py, end) {
    const x1 = this.cx, y1 = this.cy, x2 = end.x, y2 = end.y;
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Utils.clamp(t, 0, 1);
    const cx = x1 + t * dx, cy = y1 + t * dy;
    return Utils.dist(px, py, cx, cy);
  }
  draw(ctx) {
    const end = this._endpoint();
    if (this.state === HazardState.WARNING) {
      ctx.strokeStyle = CONFIG.COLORS.warn;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(this.cx, this.cy);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.COLORS.warn;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.state === HazardState.ACTIVE || this.state === HazardState.RECOVERY) {
      const alpha = this.state === HazardState.RECOVERY ? (1 - this.stateProgress) : 1;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = CONFIG.COLORS.danger;
      ctx.lineWidth = this.thickness;
      ctx.lineCap = 'round';
      ctx.shadowColor = CONFIG.COLORS.danger;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(this.cx, this.cy);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = CONFIG.COLORS.danger;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.thickness * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// -----------------------------------------------------------
// Falling Object — telegraphs a shadow, then a shape drops
// and lands with an impact radius.
// -----------------------------------------------------------
class FallingObjectHazard extends Hazard {
  constructor(arena, opts) {
    super(arena, { type: 'falling', warnDuration: opts.warnDuration, activeDuration: 0.3, recoveryDuration: 0.35 });
    this.x = opts.x;
    this.y = opts.y;
    this.impactRadius = opts.impactRadius ?? 44;
  }
  overlapsCircle(x, y, r) {
    return Utils.circlesOverlap(this.x, this.y, this.impactRadius, x, y, r);
  }
  draw(ctx) {
    if (this.state === HazardState.WARNING) {
      const p = this.stateProgress;
      ctx.globalAlpha = 0.3 + 0.3 * p;
      ctx.fillStyle = CONFIG.COLORS.warn;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.impactRadius * 0.6, this.impactRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // falling shape approaching from above (purely visual)
      const dropY = this.y - (1 - p) * 220;
      ctx.fillStyle = CONFIG.COLORS.warn;
      ctx.shadowColor = CONFIG.COLORS.warn;
      ctx.shadowBlur = 5;
      ctx.save();
      ctx.translate(this.x, dropY);
      ctx.rotate(p * 3);
      ctx.beginPath();
      const s = 12;
      ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    } else if (this.state === HazardState.ACTIVE) {
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.impactRadius);
      grad.addColorStop(0, 'rgba(255,45,85,0.95)');
      grad.addColorStop(1, 'rgba(255,45,85,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.impactRadius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.state === HazardState.RECOVERY) {
      ctx.globalAlpha = (1 - this.stateProgress) * 0.4;
      ctx.fillStyle = CONFIG.COLORS.danger;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.impactRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// -----------------------------------------------------------
// Moving Wall — a telegraphed bar that slides across the
// arena along one axis during its active phase.
// -----------------------------------------------------------
class MovingWallHazard extends Hazard {
  constructor(arena, opts) {
    super(arena, { type: 'wall', warnDuration: opts.warnDuration, activeDuration: opts.activeDuration ?? 2.6, recoveryDuration: 0.2 });
    this.orientation = opts.orientation || 'horizontal'; // wall moves along this axis
    this.thickness = opts.thickness ?? 34;
    const b = arena.bounds;
    if (this.orientation === 'horizontal') {
      this.length = opts.length ?? b.h * 0.55;
      this.crossPos = opts.crossPos ?? Utils.rand(b.y + this.length / 2, b.y + b.h - this.length / 2);
      this.from = opts.fromLeft ? b.x - this.thickness : b.x + b.w + this.thickness;
      this.to = opts.fromLeft ? b.x + b.w + this.thickness : b.x - this.thickness;
    } else {
      this.length = opts.length ?? b.w * 0.55;
      this.crossPos = opts.crossPos ?? Utils.rand(b.x + this.length / 2, b.x + b.w - this.length / 2);
      this.from = opts.fromTop ? b.y - this.thickness : b.y + b.h + this.thickness;
      this.to = opts.fromTop ? b.y + b.h + this.thickness : b.y - this.thickness;
    }
    this.travelPos = this.from;
  }
  onUpdate(dt) {
    if (this.state === HazardState.ACTIVE) {
      const t = Utils.easeInCubic ? this.stateProgress : this.stateProgress;
      this.travelPos = Utils.lerp(this.from, this.to, this.stateProgress);
    }
  }
  _rect() {
    if (this.orientation === 'horizontal') {
      return { x: this.travelPos - this.thickness / 2, y: this.crossPos - this.length / 2, w: this.thickness, h: this.length };
    }
    return { x: this.crossPos - this.length / 2, y: this.travelPos - this.thickness / 2, w: this.length, h: this.thickness };
  }
  overlapsCircle(x, y, r) {
    const rect = this._rect();
    return Utils.circleIntersectsRect(x, y, r, rect.x, rect.y, rect.w, rect.h);
  }
  draw(ctx) {
    if (this.state === HazardState.WARNING) {
      const rect = this.orientation === 'horizontal'
        ? { x: this.from < this.to ? this.arena.bounds.x : this.arena.bounds.x, y: this.crossPos - this.length / 2, w: this.arena.bounds.w, h: this.length }
        : { x: this.crossPos - this.length / 2, y: this.arena.bounds.y, w: this.length, h: this.arena.bounds.h };
      ctx.strokeStyle = CONFIG.COLORS.warn;
      ctx.globalAlpha = 0.45 + 0.3 * Math.sin(this.timer * 10);
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // arrow indicating direction
      ctx.fillStyle = CONFIG.COLORS.warn;
      ctx.font = '18px sans-serif';
    } else if (this.state === HazardState.ACTIVE || this.state === HazardState.RECOVERY) {
      const rect = this._rect();
      const alpha = this.state === HazardState.RECOVERY ? 1 - this.stateProgress : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = CONFIG.COLORS.danger;
      ctx.shadowColor = CONFIG.COLORS.danger;
      ctx.shadowBlur = 6;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }
}
