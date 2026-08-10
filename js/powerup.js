// ==========================================================
// powerup.js — collectible entities. Each type defines its
// visual glyph/color and what happens on pickup via `apply`.
// To add a new power-up: add an entry to POWERUP_TYPES.
// ==========================================================

const POWERUP_TYPES = {
  shield: {
    color: '#4fb894',
    glyph: '◈',
    weight: 10,
    label: 'โล่',
    apply(player) { player.applyShield(); },
  },
  dash: {
    color: '#4fb8cc',
    glyph: '»',
    weight: 10,
    label: 'พุ่งเร็ว',
    apply(player) { player.dashCooldownTimer = 0; },
  },
  lifeShard: {
    color: '#c98fae',
    glyph: '♥',
    weight: CONFIG.POWERUP.lifeShardWeight,
    label: 'เศษชีวิต',
    apply(player) { player.restoreLife(); },
  },
  scoreOrb: {
    color: '#d1a94a',
    glyph: '●',
    weight: 14,
    label: 'คะแนน',
    apply(player, game) { game.score.addFlat(player.id, 400); },
  },
  magnet: {
    color: '#9c86c9',
    glyph: '⟁',
    weight: 8,
    label: 'แม่เหล็ก',
    apply(player) { player.applyMagnet(8); },
  },
  slow: {
    color: '#6fa8b8',
    glyph: '❄',
    weight: 8,
    label: 'ชะลออันตราย',
    apply(player, game) { game.applyGlobalSlow(4.5); },
  },
};

class PowerUp {
  constructor(type, x, y) {
    this.type = type;
    this.def = POWERUP_TYPES[type];
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.life = CONFIG.POWERUP.lifetime;
    this.bornAt = performance.now();
  }

  update(dt) {
    this.life -= dt;
    return this.life > 0;
  }

  get isExpiring() {
    return this.life < 2.5;
  }

  draw(ctx) {
    const t = (performance.now() - this.bornAt) / 1000;
    const bob = Math.sin(t * 3) * 3;
    const blink = this.isExpiring && Math.floor(this.life * 6) % 2 === 0;
    if (blink) return;

    const y = this.y + bob;
    ctx.save();
    const grad = ctx.createRadialGradient(this.x, y, 0, this.x, y, this.radius * 1.6);
    grad.addColorStop(0, this.def.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, y, this.radius * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,11,16,0.85)';
    ctx.fill();
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = this.def.color;
    ctx.font = '700 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.def.glyph, this.x, y + 1);
    ctx.restore();
  }
}
