// ==========================================================
// config.js — every frequently-tuned number lives here.
// Adjust freely without touching game logic.
// ==========================================================

const CONFIG = {

  ARENA: {
    padding: 18,          // px from canvas edge to arena boundary
    gridSize: 40,
  },

  PLAYER: {
    radius: 14,
    speed: 260,           // px/sec
    maxLives: 3,
    invulnDuration: 1.6,  // seconds after respawn / hit
    dashSpeed: 900,
    dashDuration: 0.16,
    dashCooldown: 1.1,
  },

  RESPAWN: {
    safeRadius: 100,        // minimum distance from any active/warning hazard
    maxAttempts: 70,
  },

  DIFFICULTY: {
    // difficulty "level" rises over survival time; systems read this to scale up.
    // Tuned so max difficulty lands around 4.5 min — a full arcade run should
    // realistically reach the late-game intensity, not just theorize about it.
    rampSeconds: 15,        // seconds per +1 difficulty level early on
    rampGrowth: 1.07,       // each level takes slightly longer than the previous (soft cap)
    maxLevel: 12,
  },

  HAZARD: {
    baseSpawnInterval: 2.6, // seconds between hazard spawns at level 0
    minSpawnInterval: 0.6,
    telegraphBase: 1.1,     // seconds of warning at level 0
    telegraphMin: 0.55,     // never warn less than this, even at max difficulty
    maxConcurrent: 3,       // simultaneous active/warning hazards at level 0
    maxConcurrentCap: 7,
  },

  POWERUP: {
    spawnInterval: 5.5,
    maxOnField: 2,
    lifetime: 9,             // seconds before an uncollected power-up despawns
    lifeShardWeight: 5,       // relative weight, kept rare vs others (~8-9% of spawns)
  },

  SCORE: {
    perSecond: 10,
    dodgeBase: 100,
    comboStep: 0.12,          // +12% per combo stack, applied multiplicatively (soft)
    comboMax: 3.0,
    comboBreakGraceLoss: 1,
    riskBonusMultiplier: 1.6, // bonus for collecting power-ups near active hazards
  },

  EVENTS: {
    firstEventAt: 22,
    minGapSeconds: 26,
    maxGapSeconds: 42,
  },

  COLORS: {
    player1: '#4fb8cc',
    player2: '#c06aa3',
    danger: '#d1495e',
    warn: '#d1a94a',
    good: '#4fb894',
    ink: '#dfe6ee',
  },
};
