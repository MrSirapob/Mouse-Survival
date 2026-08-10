// ==========================================================
// hazardManager.js — decides WHEN and WHAT hazards spawn.
// Combines individual hazard types into named Patterns for
// variety, and scales pacing with the Difficulty system.
//
// To add a new hazard type: write the factory function and
// add it to HAZARD_FACTORIES. To add a new pattern: add an
// entry to PATTERNS. Nothing else needs to change.
// ==========================================================

function telegraphFor(level) {
  const t = CONFIG.HAZARD.telegraphBase - level * 0.04;
  return Math.max(CONFIG.HAZARD.telegraphMin, t);
}

const HAZARD_FACTORIES = {
  bomb(arena, level, opts = {}) {
    const p = opts.point || arena.randomPointInside(70);
    return new BombZoneHazard(arena, {
      x: p.x, y: p.y,
      radius: Utils.rand(46, 60) + Math.min(level, 6) * 1.5,
      warnDuration: telegraphFor(level),
    });
  },
  laserH(arena, level, opts = {}) {
    const b = arena.bounds;
    return new LaserSweepHazard(arena, {
      orientation: 'horizontal',
      pos: opts.pos ?? Utils.rand(b.y + 60, b.y + b.h - 60),
      warnDuration: telegraphFor(level),
    });
  },
  laserV(arena, level, opts = {}) {
    const b = arena.bounds;
    return new LaserSweepHazard(arena, {
      orientation: 'vertical',
      pos: opts.pos ?? Utils.rand(b.x + 60, b.x + b.w - 60),
      warnDuration: telegraphFor(level),
    });
  },
  rotatingLaser(arena, level, opts = {}) {
    const p = opts.point || arena.randomPointInside(120);
    return new RotatingLaserHazard(arena, {
      cx: p.x, cy: p.y,
      length: Utils.rand(180, 260),
      angularSpeed: Utils.rand(1.1, 1.9) * (Math.random() < 0.5 ? 1 : -1),
      activeDuration: Utils.clamp(2.6 - level * 0.08, 1.4, 2.6),
      warnDuration: telegraphFor(level),
    });
  },
  falling(arena, level, opts = {}) {
    const p = opts.point || arena.randomPointInside(60);
    return new FallingObjectHazard(arena, {
      x: p.x, y: p.y,
      impactRadius: Utils.rand(40, 52),
      warnDuration: telegraphFor(level) + 0.2,
    });
  },
  wallH(arena, level, opts = {}) {
    return new MovingWallHazard(arena, {
      orientation: 'horizontal',
      fromLeft: opts.fromLeft ?? (Math.random() < 0.5),
      activeDuration: Utils.clamp(2.8 - level * 0.09, 1.5, 2.8),
      warnDuration: telegraphFor(level) + 0.3,
    });
  },
  wallV(arena, level, opts = {}) {
    return new MovingWallHazard(arena, {
      orientation: 'vertical',
      fromTop: opts.fromTop ?? (Math.random() < 0.5),
      activeDuration: Utils.clamp(2.8 - level * 0.09, 1.5, 2.8),
      warnDuration: telegraphFor(level) + 0.3,
    });
  },
};

// Named patterns: sequences of { key, delay, opts? } spawned in order.
// Delay is seconds after the pattern starts (not after previous step).
const PATTERNS = [
  { name: 'single-bomb', minLevel: 0, steps: [{ key: 'bomb', delay: 0 }] },
  { name: 'single-laserH', minLevel: 0, steps: [{ key: 'laserH', delay: 0 }] },
  { name: 'single-laserV', minLevel: 0, steps: [{ key: 'laserV', delay: 0 }] },
  { name: 'single-falling', minLevel: 0, steps: [{ key: 'falling', delay: 0 }] },
  { name: 'bomb-bomb-laser', minLevel: 2, steps: [
    { key: 'bomb', delay: 0 }, { key: 'bomb', delay: 0.5 }, { key: 'laserH', delay: 1.1 },
  ] },
  { name: 'laser-wall-laser', minLevel: 3, steps: [
    { key: 'laserV', delay: 0 }, { key: 'wallH', delay: 0.6 }, { key: 'laserV', delay: 1.4 },
  ] },
  { name: 'bomb-floor-pair', minLevel: 2, steps: [
    { key: 'bomb', delay: 0 }, { key: 'falling', delay: 0.4 },
  ] },
  { name: 'laser-bomb-cross', minLevel: 4, steps: [
    { key: 'laserH', delay: 0 }, { key: 'laserV', delay: 0.3 }, { key: 'bomb', delay: 0.8 },
  ] },
  { name: 'wall-falling', minLevel: 3, steps: [
    { key: 'wallV', delay: 0 }, { key: 'falling', delay: 0.5 },
  ] },
  { name: 'rotating-solo', minLevel: 3, steps: [{ key: 'rotatingLaser', delay: 0 }] },
  { name: 'rotating-plus-bomb', minLevel: 5, steps: [
    { key: 'rotatingLaser', delay: 0 }, { key: 'bomb', delay: 0.7 },
  ] },
  { name: 'double-wall', minLevel: 6, steps: [
    { key: 'wallH', delay: 0 }, { key: 'wallV', delay: 0.5 },
  ] },
];

class HazardManager {
  constructor(arena, vfx) {
    this.arena = arena;
    this.vfx = vfx;
    this.hazards = [];
    this.spawnTimer = 0;
    this.pendingSteps = []; // queued pattern steps: { key, at, opts }
    this.timeSincePatternStart = 0;
  }

  reset() {
    this.hazards.length = 0;
    this.spawnTimer = 1.0; // small initial grace period
    this.pendingSteps.length = 0;
  }

  _spawnInterval(level) {
    const v = CONFIG.HAZARD.baseSpawnInterval - level * 0.14;
    return Math.max(CONFIG.HAZARD.minSpawnInterval, v);
  }

  _maxConcurrent(level) {
    return Math.min(CONFIG.HAZARD.maxConcurrentCap, CONFIG.HAZARD.maxConcurrent + Math.floor(level / 2));
  }

  _choosePattern(level) {
    const available = PATTERNS.filter((p) => p.minLevel <= level);
    return Utils.pick(available);
  }

  _queuePattern(level) {
    const pattern = this._choosePattern(level);
    for (const step of pattern.steps) {
      this.pendingSteps.push({ key: step.key, at: step.delay, opts: step.opts || {} });
    }
    this.timeSincePatternStart = 0;
  }

  update(dt, level, players) {
    // count only hazards that still occupy "danger budget" (warning+active)
    const liveCount = this.hazards.filter((h) => h.state !== HazardState.RECOVERY).length;

    this.spawnTimer -= dt;
    if (this.pendingSteps.length === 0 && this.spawnTimer <= 0 && liveCount < this._maxConcurrent(level)) {
      this._queuePattern(level);
      this.spawnTimer = this._spawnInterval(level);
    }

    if (this.pendingSteps.length > 0) {
      this.timeSincePatternStart += dt;
      const ready = this.pendingSteps.filter((s) => s.at <= this.timeSincePatternStart);
      for (const step of ready) {
        this._spawn(step.key, level, step.opts, players);
      }
      this.pendingSteps = this.pendingSteps.filter((s) => s.at > this.timeSincePatternStart);
    }

    for (const h of this.hazards) {
      const wasWarning = h.state === HazardState.WARNING;
      h.update(dt);
      if (wasWarning && h.state === HazardState.ACTIVE) {
        this._onBecomeActive(h);
      }
    }
    this.hazards = this.hazards.filter((h) => !h.isDone());
  }

  _onBecomeActive(hazard) {
    // visual "ignition" feedback the moment a hazard turns dangerous
    const pt = hazard.x !== undefined ? { x: hazard.x, y: hazard.y } : null;
    if (pt) {
      this.vfx.ringPulse(pt.x, pt.y, (hazard.radius || hazard.impactRadius || 60) * 1.3, CONFIG.COLORS.danger, 0.35);
    }
  }

  _spawn(key, level, opts, players) {
    const factory = HAZARD_FACTORIES[key];
    if (!factory) return;

    // Fairness guard: for point hazards, avoid overlapping an existing
    // warning/active hazard's danger zone directly on spawn where possible.
    let attempt = 0;
    let hazard = factory(this.arena, level, opts);
    while (attempt < 6 && this._overlapsExisting(hazard) && !opts.point) {
      hazard = factory(this.arena, level, opts);
      attempt++;
    }
    this.hazards.push(hazard);
  }

  _overlapsExisting(hazard) {
    if (hazard.x === undefined) return false;
    const r = hazard.radius || hazard.impactRadius || 50;
    return this.hazards.some((h) => {
      if (h.x === undefined) return false;
      const hr = h.radius || h.impactRadius || 50;
      return Utils.dist(hazard.x, hazard.y, h.x, h.y) < r + hr + 20;
    });
  }

  isPointSafe(x, y, radius) {
    return !this.hazards.some((h) => (h.state === HazardState.WARNING || h.state === HazardState.ACTIVE) && h.overlapsCircle(x, y, radius));
  }

  draw(ctx) {
    for (const h of this.hazards) h.draw(ctx);
  }
}
