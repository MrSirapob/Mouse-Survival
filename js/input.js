// ==========================================================
// input.js — keyboard state tracking for P2 (Arrows + / or
// RightControl) in Two Player mode, plus mouse/touch pointer
// tracking used to control Player 1 in Single Player mode
// (P1 uses WASD only when sharing the keyboard in Duo mode).
// ==========================================================

const MOUSE_DEADZONE = 6; // px — avoids jitter when cursor sits on the core

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (this.blockScrollKeys.has(e.code)) e.preventDefault();
      if (this.onKeyDown) this.onKeyDown(e.code);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this.blockScrollKeys = new Set([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    ]);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', () => { this.keys.clear(); this.pointerDown = false; });

    // ---- pointer (mouse / touch) tracking for mouse-controlled solo mode ----
    this.pointerX = null;
    this.pointerY = null;
    this.pointerDown = false;
    this.pointerActive = false;

    const updateFromClient = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = clientX - rect.left;
      this.pointerY = clientY - rect.top;
      this.pointerActive = true;
    };

    window.addEventListener('mousemove', (e) => updateFromClient(e.clientX, e.clientY));
    window.addEventListener('mousedown', (e) => { updateFromClient(e.clientX, e.clientY); this.pointerDown = true; });
    window.addEventListener('mouseup', () => { this.pointerDown = false; });

    window.addEventListener('touchstart', (e) => {
      if (e.touches[0]) { updateFromClient(e.touches[0].clientX, e.touches[0].clientY); this.pointerDown = true; }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) updateFromClient(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => { this.pointerDown = false; });
  }

  // Direction from (fromX, fromY) toward the current pointer position,
  // normalized, with a small deadzone so the core doesn't vibrate once
  // it reaches the cursor.
  getPointerVector(fromX, fromY) {
    if (this.pointerX === null || !this.pointerActive) return { x: 0, y: 0 };
    const dx = this.pointerX - fromX;
    const dy = this.pointerY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist < MOUSE_DEADZONE) return { x: 0, y: 0 };
    return { x: dx / dist, y: dy / dist };
  }

  getPointerDash() {
    return this.pointerDown || this.isDown('Space');
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // Player 1: WASD movement, Shift dash
  getP1Vector() {
    let x = 0, y = 0;
    if (this.isDown('KeyA')) x -= 1;
    if (this.isDown('KeyD')) x += 1;
    if (this.isDown('KeyW')) y -= 1;
    if (this.isDown('KeyS')) y += 1;
    return this._normalize(x, y);
  }
  getP1Dash() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  // Player 2: Arrow keys movement, Slash or RightControl dash
  getP2Vector() {
    let x = 0, y = 0;
    if (this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('ArrowRight')) x += 1;
    if (this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('ArrowDown')) y += 1;
    return this._normalize(x, y);
  }
  getP2Dash() {
    return this.isDown('Slash') || this.isDown('ControlRight');
  }

  _normalize(x, y) {
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }
}
