// ==========================================================
// input.js — keyboard state tracking, mouse pointer tracking,
// and virtual joystick / touch dash button handling.
// Prevents touch leakage onto UI buttons and prevents page scroll.
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
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointerDown = false;
      this._resetJoystick();
      this.touchDashDown = false;
    });

    // ---- pointer (mouse / touch) tracking for solo mode ----
    this.pointerX = null;
    this.pointerY = null;
    this.pointerDown = false;
    this.pointerActive = false;

    // ---- mobile touch controls state ----
    this.joystickVector = { x: 0, y: 0 };
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.touchDashDown = false;
    this.dashTouchId = null;

    this._bindPointerEvents();
    this._bindMobileControls();
  }

  _isUIElement(target) {
    if (!target) return false;
    return !!target.closest('.menu-panel, .screen, .hud, .icon-btn, .mobile-controls, .menu-btn');
  }

  _bindPointerEvents() {
    const updateFromClient = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = clientX - rect.left;
      this.pointerY = clientY - rect.top;
      this.pointerActive = true;
    };

    window.addEventListener('mousemove', (e) => {
      if (!this._isUIElement(e.target)) {
        updateFromClient(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (!this._isUIElement(e.target)) {
        updateFromClient(e.clientX, e.clientY);
        this.pointerDown = true;
      }
    });

    window.addEventListener('mouseup', () => {
      this.pointerDown = false;
    });

    // Direct touch on canvas (for tap/drag steering when not using joystick)
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.target === this.canvas && e.touches.length > 0) {
        const touch = e.touches[0];
        updateFromClient(touch.clientX, touch.clientY);
        this.pointerDown = true;
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.target === this.canvas && e.touches.length > 0) {
        const touch = e.touches[0];
        updateFromClient(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.pointerDown = false;
      }
    }, { passive: true });
  }

  _bindMobileControls() {
    const joystickContainer = document.getElementById('joystick-container');
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');
    const dashBtn = document.getElementById('dash-btn');

    if (!joystickContainer || !dashBtn) return;

    // Joystick Touch Handlers
    const handleJoystickStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (this.joystickTouchId === null) {
          const touch = e.changedTouches[i];
          this.joystickTouchId = touch.identifier;
          this.joystickActive = true;
          this._updateJoystickPos(touch.clientX, touch.clientY, joystickBase, joystickStick);
          break;
        }
      }
    };

    const handleJoystickMove = (e) => {
      if (this.joystickTouchId === null) return;
      e.preventDefault();
      e.stopPropagation();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this._updateJoystickPos(touch.clientX, touch.clientY, joystickBase, joystickStick);
          break;
        }
      }
    };

    const handleJoystickEnd = (e) => {
      if (this.joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this._resetJoystick(joystickStick);
          break;
        }
      }
    };

    joystickContainer.addEventListener('touchstart', handleJoystickStart, { passive: false });
    window.addEventListener('touchmove', handleJoystickMove, { passive: false });
    window.addEventListener('touchend', handleJoystickEnd, { passive: true });
    window.addEventListener('touchcancel', handleJoystickEnd, { passive: true });

    // DASH Button Touch Handlers
    const handleDashStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.changedTouches.length > 0) {
        this.dashTouchId = e.changedTouches[0].identifier;
        this.touchDashDown = true;
        dashBtn.classList.add('active');
      }
    };

    const handleDashEnd = (e) => {
      if (this.dashTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.dashTouchId) {
          this.touchDashDown = false;
          this.dashTouchId = null;
          dashBtn.classList.remove('active');
          break;
        }
      }
    };

    dashBtn.addEventListener('touchstart', handleDashStart, { passive: false });
    window.addEventListener('touchend', handleDashEnd, { passive: true });
    window.addEventListener('touchcancel', handleDashEnd, { passive: true });

    // Pointer events fallback (for desktop touch/mouse testing)
    dashBtn.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') {
        this.touchDashDown = true;
        dashBtn.classList.add('active');
      }
    });
    window.addEventListener('pointerup', () => {
      this.touchDashDown = false;
      dashBtn.classList.remove('active');
    });
  }

  _updateJoystickPos(clientX, clientY, baseEl, stickEl) {
    const rect = baseEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const maxRadius = Math.max(20, (rect.width / 2) - 10);
    const clampedDist = Math.min(dist, maxRadius);

    let normX = 0, normY = 0;
    if (dist > 0) {
      normX = dx / dist;
      normY = dy / dist;
    }

    const mag = clampedDist / maxRadius;
    this.joystickVector = { x: normX * mag, y: normY * mag };

    const stickX = normX * clampedDist;
    const stickY = normY * clampedDist;
    if (stickEl) {
      stickEl.style.transform = `translate(${stickX}px, ${stickY}px)`;
    }
  }

  _resetJoystick(stickEl) {
    this.joystickVector = { x: 0, y: 0 };
    this.joystickActive = false;
    this.joystickTouchId = null;
    const stick = stickEl || document.getElementById('joystick-stick');
    if (stick) {
      stick.style.transform = 'translate(0px, 0px)';
    }
  }

  // Direction vector for Solo player movement:
  // Priority: 1. Virtual Joystick vector (if active)
  //           2. Pointer position vector (mouse / direct canvas touch)
  //           3. WASD keys vector
  getPointerVector(fromX, fromY) {
    if (this.joystickActive && (this.joystickVector.x !== 0 || this.joystickVector.y !== 0)) {
      return this.joystickVector;
    }

    if (this.pointerX !== null && this.pointerActive) {
      const dx = this.pointerX - fromX;
      const dy = this.pointerY - fromY;
      const dist = Math.hypot(dx, dy);
      if (dist >= MOUSE_DEADZONE) {
        return { x: dx / dist, y: dy / dist };
      }
    }

    // WASD fallback for solo mode
    const wasd = this.getP1Vector();
    if (wasd.x !== 0 || wasd.y !== 0) return wasd;

    return { x: 0, y: 0 };
  }

  getPointerDash() {
    return this.touchDashDown || this.pointerDown || this.isDown('Space') || this.isDown('ShiftLeft');
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // Player 1: Joystick or WASD movement, Touch Dash or Shift dash
  getP1Vector() {
    if (this.joystickActive && (this.joystickVector.x !== 0 || this.joystickVector.y !== 0)) {
      return this.joystickVector;
    }
    let x = 0, y = 0;
    if (this.isDown('KeyA')) x -= 1;
    if (this.isDown('KeyD')) x += 1;
    if (this.isDown('KeyW')) y -= 1;
    if (this.isDown('KeyS')) y += 1;
    return this._normalize(x, y);
  }

  getP1Dash() {
    return this.touchDashDown || this.isDown('ShiftLeft') || this.isDown('ShiftRight');
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

