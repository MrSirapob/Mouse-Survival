// ==========================================================
// powerupManager.js — spawns power-ups on an interval, picks
// a weighted-random type, and occasionally places them in
// riskier spots (near hazards) to create Risk/Reward moments.
// ==========================================================

class PowerUpManager {
  constructor(arena, hazardManager, vfx) {
    this.arena = arena;
    this.hazardManager = hazardManager;
    this.vfx = vfx;
    this.items = [];
    this.spawnTimer = 3.0;
  }

  reset() {
    this.items.length = 0;
    this.spawnTimer = 3.0;
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.items.length < CONFIG.POWERUP.maxOnField) {
      this._spawnOne();
      this.spawnTimer = CONFIG.POWERUP.spawnInterval + Utils.rand(-1, 1.5);
    }
    this.items = this.items.filter((p) => p.update(dt));
  }

  _spawnOne() {
    const entries = Object.entries(POWERUP_TYPES).map(([key, def]) => ({ item: key, weight: def.weight }));
    const type = Utils.weightedPick(entries);

    // find a spot; ~30% chance to deliberately allow a "risky" spot near a hazard
    const allowRisky = Math.random() < 0.3;
    let point = null;
    for (let i = 0; i < 20; i++) {
      const candidate = this.arena.randomPointInside(50);
      const safe = this.hazardManager.isPointSafe(candidate.x, candidate.y, 16);
      if (safe || allowRisky) { point = candidate; if (safe || i > 10) break; }
    }
    if (!point) point = this.arena.randomPointInside(50);

    this.items.push(new PowerUp(type, point.x, point.y));
  }

  spawnSpecific(type) {
    const point = this.arena.randomPointInside(50);
    this.items.push(new PowerUp(type, point.x, point.y));
  }

  // Returns collected power-up defs for score/risk logic, removes item.
  collect(player, game) {
    const collected = [];
    this.items = this.items.filter((p) => {
      if (Collision.playerCollectsPowerup(player, p)) {
        const nearDanger = Collision.playerNearAnyActiveHazard(p.x, p.y, 40, this.hazardManager.hazards)
          || Collision.playerNearAnyWarningHazard(p.x, p.y, 30, this.hazardManager.hazards);
        p.def.apply(player, game);
        this.vfx.burst(p.x, p.y, p.def.color, 18, { speed: 160, life: 0.5 });
        this.vfx.ringPulse(p.x, p.y, 40, p.def.color, 0.4);
        this.vfx.floatText(p.x, p.y - 16, p.def.label, { color: p.def.color, size: 14 });
        collected.push({ def: p.def, nearDanger, type: p.type });
        return false;
      }
      return true;
    });
    return collected;
  }

  // Magnet effect: pull nearby items toward the player with an active magnet
  applyMagnetPull(players, dt) {
    for (const player of players) {
      if (!player.alive || !player.hasMagnet) continue;
      for (const item of this.items) {
        const d = Utils.dist(player.x, player.y, item.x, item.y);
        if (d < 160) {
          const pullStrength = (1 - d / 160) * 340;
          const ang = Math.atan2(player.y - item.y, player.x - item.x);
          item.x += Math.cos(ang) * pullStrength * dt;
          item.y += Math.sin(ang) * pullStrength * dt;
        }
      }
    }
  }

  draw(ctx) {
    for (const p of this.items) p.draw(ctx);
  }
}
