// ==========================================================
// collision.js — shared collision queries between players,
// hazards, and power-ups. Kept independent of any one system
// so it can be reused/extended without coupling.
// ==========================================================

const Collision = {
  // Does the player (circle) overlap this hazard's *active* danger shape?
  playerHitByHazard(player, hazard) {
    if (!hazard.isActiveDanger()) return false;
    return hazard.overlapsCircle(player.x, player.y, player.radius);
  },

  playerNearAnyActiveHazard(x, y, radius, hazards) {
    return hazards.some((h) => h.isActiveDanger() && h.overlapsCircle(x, y, radius));
  },

  playerNearAnyWarningHazard(x, y, radius, hazards) {
    return hazards.some(
      (h) => (h.state === 'warning' || h.state === 'active') && h.overlapsCircle(x, y, radius * 3)
    );
  },

  playerCollectsPowerup(player, powerup) {
    return Utils.circlesOverlap(player.x, player.y, player.radius, powerup.x, powerup.y, powerup.radius);
  },
};
