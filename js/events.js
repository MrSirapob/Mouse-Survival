// ==========================================================
// events.js — occasional pace-changing Events layered on top
// of normal hazard spawning. Each event has a short warning
// banner before it takes effect, and a defined duration.
//
// To add a new event: add a definition to EVENT_DEFS with
// onStart/onEnd hooks. The manager handles timing/UI.
// ==========================================================

const EVENT_DEFS = {
  blackout: {
    label: 'ไฟดับ! ทัศนวิสัยจำกัด',
    duration: 6,
    warnDuration: 2,
  },
  chaos: {
    label: 'ความโกลาหล! อันตรายถี่ขึ้น',
    duration: 7,
    warnDuration: 1.6,
  },
  shrink: {
    label: 'สนามหด!',
    duration: 8,
    warnDuration: 1.8,
  },
  bonus: {
    label: 'โบนัส! ไอเทมพิเศษปรากฏ',
    duration: 5,
    warnDuration: 1.2,
  },
  rush: {
    label: 'เร่งเอาตัวรอด!',
    duration: 5,
    warnDuration: 2,
  },
};

class EventSystem {
  constructor(arena, hazardManager, powerupManager) {
    this.arena = arena;
    this.hazardManager = hazardManager;
    this.powerupManager = powerupManager;
    this.reset();
  }

  reset() {
    this.timer = CONFIG.EVENTS.firstEventAt;
    this.warningKey = null;
    this.warningTimer = 0;
    this.activeKey = null;
    this.activeTimer = 0;
    this.arena.setShrink(1);
    this._extraBonusSpawned = false;
  }

  update(dt) {
    if (this.activeKey) {
      this.activeTimer -= dt;
      if (this.activeTimer <= 0) this._endEvent();
      return this.activeKey;
    }

    if (this.warningKey) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) this._startEvent();
      return null;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      this._queueRandomEvent();
    }
    return null;
  }

  _queueRandomEvent() {
    const keys = Object.keys(EVENT_DEFS);
    this.warningKey = Utils.pick(keys);
    this.warningTimer = EVENT_DEFS[this.warningKey].warnDuration;
  }

  _startEvent() {
    this.activeKey = this.warningKey;
    this.warningKey = null;
    const def = EVENT_DEFS[this.activeKey];
    this.activeTimer = def.duration;

    if (this.activeKey === 'shrink') this.arena.setShrink(0.62);
    if (this.activeKey === 'bonus') this._extraBonusSpawned = false;
  }

  _endEvent() {
    if (this.activeKey === 'shrink') this.arena.setShrink(1);
    this.activeKey = null;
    this.activeTimer = 0;
    this.timer = Utils.rand(CONFIG.EVENTS.minGapSeconds, CONFIG.EVENTS.maxGapSeconds);
  }

  // Multipliers/effects other systems can query
  get isBlackout() { return this.activeKey === 'blackout'; }
  get isChaos() { return this.activeKey === 'chaos'; }
  get isRush() { return this.activeKey === 'rush'; }

  get hazardSpawnMultiplier() {
    if (this.isChaos || this.isRush) return 1.6;
    return 1;
  }

  maybeSpawnBonusItems() {
    if (this.activeKey === 'bonus' && !this._extraBonusSpawned) {
      this._extraBonusSpawned = true;
      for (let i = 0; i < 3; i++) {
        this.powerupManager._spawnOne();
      }
    }
  }

  get bannerText() {
    if (this.warningKey) return `⚠ กำลังจะเกิด: ${EVENT_DEFS[this.warningKey].label}`;
    if (this.activeKey) return EVENT_DEFS[this.activeKey].label;
    return '';
  }

  get isBannerVisible() {
    return !!(this.warningKey || this.activeKey);
  }
}
