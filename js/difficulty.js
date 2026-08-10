// ==========================================================
// difficulty.js — converts elapsed survival time into a
// single "level" number that every other system (hazards,
// power-ups, events) reads to scale itself up. Levels take
// progressively longer to reach (soft cap) so the late game
// stays intense without needing to move impossibly fast.
// ==========================================================

class DifficultySystem {
  constructor() {
    this.elapsed = 0;
    this.level = 0;
  }

  reset() {
    this.elapsed = 0;
    this.level = 0;
  }

  update(dt) {
    this.elapsed += dt;
    // find level such that sum of ramp thresholds <= elapsed
    let threshold = 0;
    let interval = CONFIG.DIFFICULTY.rampSeconds;
    let level = 0;
    while (level < CONFIG.DIFFICULTY.maxLevel) {
      threshold += interval;
      if (this.elapsed < threshold) break;
      interval *= CONFIG.DIFFICULTY.rampGrowth;
      level += 1;
    }
    this.level = level;
  }

  get stageLabel() {
    if (this.level <= 2) return 'ช่วงต้น';
    if (this.level <= 6) return 'ช่วงกลาง';
    return 'ช่วงปลาย';
  }
}
