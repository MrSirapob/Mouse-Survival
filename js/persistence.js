// ==========================================================
// persistence.js — simple localStorage-backed high scores.
// No accounts, no servers — everything stays on this device.
// ==========================================================

const STORAGE_KEY = 'survivalHazard_v1';

const DEFAULT_DATA = {
  solo: {
    bestScore: 0,
    bestSurvivalTime: 0,
    bestCombo: 0,
    gamesPlayed: 0,
  },
  duo: {
    matchesPlayed: 0,
    p1Wins: 0,
    p2Wins: 0,
    bestScore: 0,
  },
};

const Persistence = {
  _cache: null,

  load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this._cache = raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : structuredCloneSafe(DEFAULT_DATA);
    } catch (e) {
      this._cache = structuredCloneSafe(DEFAULT_DATA);
    }
    return this._cache;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._cache));
    } catch (e) {
      // storage unavailable (private mode, quota, etc.) — fail silently
    }
  },

  // Returns { isNewScore, isNewTime, isNewCombo }
  recordSolo({ score, survivalTime, maxCombo }) {
    const data = this.load();
    const s = data.solo;
    s.gamesPlayed += 1;
    const isNewScore = score > s.bestScore;
    const isNewTime = survivalTime > s.bestSurvivalTime;
    const isNewCombo = maxCombo > s.bestCombo;
    if (isNewScore) s.bestScore = Math.floor(score);
    if (isNewTime) s.bestSurvivalTime = survivalTime;
    if (isNewCombo) s.bestCombo = maxCombo;
    this.save();
    return { isNewScore, isNewTime, isNewCombo };
  },

  recordDuo({ winner, p1Score, p2Score }) {
    const data = this.load();
    const d = data.duo;
    d.matchesPlayed += 1;
    if (winner === 1) d.p1Wins += 1;
    else if (winner === 2) d.p2Wins += 1;
    d.bestScore = Math.max(d.bestScore, Math.floor(p1Score), Math.floor(p2Score));
    this.save();
  },

  getSolo() { return this.load().solo; },
  getDuo() { return this.load().duo; },
};

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}
