// ==========================================================
// utils.js — small stateless helpers shared across systems
// ==========================================================

const Utils = {
  rand(min, max) {
    return Math.random() * (max - min) + min;
  },

  randInt(min, max) {
    return Math.floor(Utils.rand(min, max + 1));
  },

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  weightedPick(entries) {
    // entries: [{ item, weight }]
    const total = entries.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const e of entries) {
      if (r < e.weight) return e.item;
      r -= e.weight;
    }
    return entries[entries.length - 1].item;
  },

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  circlesOverlap(x1, y1, r1, x2, y2, r2) {
    return Utils.dist(x1, y1, x2, y2) < r1 + r2;
  },

  pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  },

  pointInCircle(px, py, cx, cy, r) {
    return Utils.dist(px, py, cx, cy) < r;
  },

  circleIntersectsRect(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Utils.clamp(cx, rx, rx + rw);
    const closestY = Utils.clamp(cy, ry, ry + rh);
    return Utils.dist(cx, cy, closestX, closestY) < r;
  },

  formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  },

  formatScore(n) {
    return Math.floor(n).toLocaleString('th-TH');
  },

  uid() {
    return Math.random().toString(36).slice(2, 10);
  },

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  easeInCubic(t) {
    return t * t * t;
  },
};
