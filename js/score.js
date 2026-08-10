// ==========================================================
// score.js — Score & Combo systems for one or two players.
// Score accrues from survival time, dodges, combo bonuses,
// power-ups, and risk bonuses. Combo breaks on hit.
// ==========================================================

class PlayerScore {
  constructor() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0; // grace window during which combo doesn't decay from idling
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
  }

  addSurvivalTick(dt) {
    this.score += CONFIG.SCORE.perSecond * dt;
  }

  addDodge() {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const multiplier = Math.min(CONFIG.SCORE.comboMax, 1 + this.combo * CONFIG.SCORE.comboStep);
    const gained = Math.round(CONFIG.SCORE.dodgeBase * multiplier);
    this.score += gained;
    this.comboTimer = 4.5;
    return gained;
  }

  addFlat(amount) {
    this.score += amount;
  }

  addRiskBonus(baseAmount) {
    const bonus = Math.round(baseAmount * CONFIG.SCORE.riskBonusMultiplier);
    this.score += bonus;
    return bonus;
  }

  breakCombo() {
    this.combo = 0;
    this.comboTimer = 0;
  }

  update(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0; // idle too long — combo cools down
    }
  }
}

class ScoreSystem {
  constructor(mode) {
    this.mode = mode; // 'solo' | 'duo'
    this.p1 = new PlayerScore();
    this.p2 = mode === 'duo' ? new PlayerScore() : null;
  }

  reset() {
    this.p1.reset();
    if (this.p2) this.p2.reset();
  }

  forPlayer(id) {
    return id === 2 ? this.p2 : this.p1;
  }

  addFlat(playerId, amount) {
    this.forPlayer(playerId).addFlat(amount);
  }

  update(dt, players) {
    for (const player of players) {
      if (!player.alive) continue;
      const s = this.forPlayer(player.id);
      s.addSurvivalTick(dt);
      s.update(dt);
    }
  }
}
