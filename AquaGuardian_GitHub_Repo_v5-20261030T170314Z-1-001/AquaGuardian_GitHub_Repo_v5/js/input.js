/**
 * AquaGuardian: Deep Clean - Unified Input Controller (Cursor-Pilot Edition)
 * Supports Direct Cursor Flight (Mouse Follow), Mouse Clicks, Scroll Wheel Skills,
 * Keyboard Hybrid Override, Gamepad API, and Virtual On-Screen Touch Controls.
 * Built for C://hacks 2026
 */

(function(window) {
  'use strict';

  class InputController {
    constructor() {
      this.keys = {};
      this.prevKeys = {};

      // Normalized steering axis (-1 to 1) for keyboard/gamepad/joystick
      this.moveAxis = { x: 0, y: 0 };

      // Cursor / Mouse tracking
      this.mouseScreen = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
      this.mouseWorld = { x: 0, y: 0 };
      this.mouseActive = true; // Use cursor control by default on desktop
      this.mouseDownLeft = false;
      this.mouseDownRight = false;
      this.mouseDownMiddle = false;
      this.wheelAction = null;

      // Action states
      this.actions = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        boost: false,
        interact: false,
        sonar: false,
        recycler: false,
        
        swarm: false,
        pause: false
      };
      this.justPressedActions = {};

      // Gamepad index
      this.gamepadIndex = null;

      // Touch joystick state
      this.touchStickActive = false;
      this.touchStickCenter = { x: 0, y: 0 };
      this.touchStickPos = { x: 0, y: 0 };
      this.touchStickRadius = 50;

      this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (this.isTouchDevice) {
        this.mouseActive = false;
      }
      this._bindEvents();
    }

    _bindEvents() {
      // Mouse / Cursor Listeners
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        this.mouseScreen.x = e.clientX;
        this.mouseScreen.y = e.clientY;
        this.mouseActive = true;
      });

      window.addEventListener('mousedown', (e) => {
        if (e.target && (e.target.closest('button') || e.target.closest('.skill-card') || e.target.closest('.modal-box') || e.target.closest('select') || e.target.closest('input'))) {
          return;
        }
        if (window.AudioEngine && !window.AudioEngine.isInitialized) {
          window.AudioEngine.init();
        }
        this.mouseActive = true;
        if (e.button === 0) this.mouseDownLeft = true;
        if (e.button === 1) {
          e.preventDefault();
          this.mouseDownMiddle = true;
        }
        if (e.button === 2) {
          e.preventDefault();
          this.mouseDownRight = true;
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouseDownLeft = false;
        if (e.button === 1) this.mouseDownMiddle = false;
        if (e.button === 2) this.mouseDownRight = false;
      });

      window.addEventListener('contextmenu', (e) => {
        if (window.MainGame && window.MainGame.state === 'PLAYING') {
          e.preventDefault();
        }
      });

      window.addEventListener('wheel', (e) => {
        if (window.MainGame && window.MainGame.state === 'PLAYING') {
          if (e.deltaY < -10) {
            this.wheelAction = 'sonar';
          } else if (e.deltaY > 10) {
            this.wheelAction = 'recycler';
          }
        }
      }, { passive: true });

      // Keyboard Listeners
      window.addEventListener('keydown', (e) => {
        if (window.AudioEngine && !window.AudioEngine.isInitialized) {
          window.AudioEngine.init();
        }

        const code = e.code;
        this.keys[code] = true;

        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
          e.preventDefault();
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });

      // Gamepad Listeners
      window.addEventListener('gamepadconnected', (e) => {
        this.gamepadIndex = e.gamepad.index;
      });
      window.addEventListener('gamepaddisconnected', (e) => {
        if (this.gamepadIndex === e.gamepad.index) {
          this.gamepadIndex = null;
        }
      });

      // Touch Virtual Controls
      window.addEventListener('DOMContentLoaded', () => {
        this._setupTouchControls();
      });
    }

    _setupTouchControls() {
      const stickZone = document.getElementById('touchStickZone');
      const stickThumb = document.getElementById('touchStickThumb');

      const btnBoost = document.getElementById('btnTouchBoost');
      const btnInteract = document.getElementById('btnTouchInteract');
      const btnSonar = document.getElementById('btnTouchSonar');
      const btnRecycler = document.getElementById('btnTouchRecycler');
      const btnDash = document.getElementById('btnTouchDash');
      const btnSwarm = document.getElementById('btnTouchSwarm');

      if (!stickZone) return;

      const updateStickUI = () => {
        if (!stickThumb) return;
        const dx = this.touchStickPos.x - this.touchStickCenter.x;
        const dy = this.touchStickPos.y - this.touchStickCenter.y;
        stickThumb.style.transform = `translate(${dx}px, ${dy}px)`;
      };

      stickZone.addEventListener('pointerdown', (e) => {
        if (window.AudioEngine && !window.AudioEngine.isInitialized) window.AudioEngine.init();
        const rect = stickZone.getBoundingClientRect();
        this.touchStickActive = true;
        this.mouseActive = false;
        this.touchStickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        this.touchStickPos = { x: e.clientX, y: e.clientY };
        this._calculateStickAxis();
        updateStickUI();
        stickZone.setPointerCapture(e.pointerId);
      });

      stickZone.addEventListener('pointermove', (e) => {
        if (!this.touchStickActive) return;
        this.touchStickPos = { x: e.clientX, y: e.clientY };
        this._calculateStickAxis();
        updateStickUI();
      });

      const resetStick = () => {
        this.touchStickActive = false;
        this.moveAxis.x = 0;
        this.moveAxis.y = 0;
        if (stickThumb) stickThumb.style.transform = `translate(0px, 0px)`;
      };

      stickZone.addEventListener('pointerup', resetStick);
      stickZone.addEventListener('pointercancel', resetStick);

      const bindTouchBtn = (elem, actionName) => {
        if (!elem) return;
        const start = (e) => {
          e.preventDefault();
          if (window.AudioEngine && !window.AudioEngine.isInitialized) window.AudioEngine.init();
          this.actions[actionName] = true;
        };
        const end = (e) => {
          e.preventDefault();
          this.actions[actionName] = false;
        };
        elem.addEventListener('pointerdown', start);
        elem.addEventListener('pointerup', end);
        elem.addEventListener('pointercancel', end);
      };

      bindTouchBtn(btnBoost, 'boost');
      bindTouchBtn(btnInteract, 'interact');
      bindTouchBtn(btnSonar, 'sonar');
      bindTouchBtn(btnRecycler, 'recycler');
      bindTouchBtn(btnDash, 'dash');
      bindTouchBtn(btnSwarm, 'swarm');

      this.updateTouchVisibility();
    }

    _calculateStickAxis() {
      const dx = this.touchStickPos.x - this.touchStickCenter.x;
      const dy = this.touchStickPos.y - this.touchStickCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) {
        this.moveAxis.x = 0;
        this.moveAxis.y = 0;
        return;
      }

      const clampedDist = Math.min(dist, this.touchStickRadius);
      this.moveAxis.x = (dx / dist) * (clampedDist / this.touchStickRadius);
      this.moveAxis.y = (dy / dist) * (clampedDist / this.touchStickRadius);
    }

    updateTouchVisibility() {
      const touchContainer = document.getElementById('touch-controls');
      if (!touchContainer) return;

      const setting = window.SaveSystem ? window.SaveSystem.data.settings.touchControls : 'auto';
      if (setting === 'always' || (setting === 'auto' && this.isTouchDevice)) {
        touchContainer.style.display = 'block';
      } else {
        touchContainer.style.display = 'none';
      }
    }

    update() {
      const prevActions = { ...this.actions };

      // Update world mouse coordinates via camera
      if (window.Engine && window.Engine.camera) {
        const worldPt = window.Engine.camera.screenToWorld(this.mouseScreen);
        this.mouseWorld.x = worldPt.x;
        this.mouseWorld.y = worldPt.y;
      }

      // 1. Process Keyboard Input
      const k = this.keys;
      const forward = !!(k['KeyW'] || k['ArrowUp']);
      const backward = !!(k['KeyS'] || k['ArrowDown']);
      const left = !!(k['KeyA'] || k['ArrowLeft']);
      const right = !!(k['KeyD'] || k['ArrowRight']);

      // Revamped Hybrid Controls:
      // Left Click or Space = Hydro-Boost
      // Right Click or Shift or F = Hydro-Dash Warp
      // Middle Click or E = Interact / Neutralize / Bio-Filter
      // Q or Scroll Up = Sonar Ping
      // R or Scroll Down = Recycler Burst
      // G or Digit1 / Digit2 = Helper Drone Swarm
      const boost = !!(k['Space'] || this.mouseDownLeft);
      const interact = !!(k['KeyE'] || this.mouseDownMiddle);
      const sonar = !!(k['KeyQ'] || k['Digit1'] || this.wheelAction === 'sonar');
      const recycler = !!(k['KeyR'] || k['Digit2'] || this.wheelAction === 'recycler');
      
      const swarm = !!(k['KeyG'] || k['Digit3']);
      const pause = !!(k['KeyP'] || k['Escape']);

      this.wheelAction = null;

      // Keyboard movement axis
      let kX = 0, kY = 0;
      if (left) kX -= 1;
      if (right) kX += 1;
      if (forward) kY -= 1;
      if (backward) kY += 1;

      if (kX !== 0 || kY !== 0) {
        // Pressing WASD/Arrows temporarily overrides cursor mode if desired, until mouse moves again
      }

      // 2. Process Gamepad Input
      let gpX = 0, gpY = 0;
      let gpBoost = false, gpInteract = false, gpSonar = false, gpRecycler = false, gpDash = false, gpSwarm = false, gpPause = false;

      if (this.gamepadIndex !== null && navigator.getGamepads) {
        const gp = navigator.getGamepads()[this.gamepadIndex];
        if (gp) {
          const deadzone = 0.18;
          const axisX = gp.axes[0] || 0;
          const axisY = gp.axes[1] || 0;

          if (Math.abs(axisX) > deadzone) gpX = axisX;
          if (Math.abs(axisY) > deadzone) gpY = axisY;

          gpBoost = gp.buttons[0] && gp.buttons[0].pressed;
          gpInteract = gp.buttons[2] && gp.buttons[2].pressed;
          gpSonar = gp.buttons[3] && gp.buttons[3].pressed;
          gpRecycler = gp.buttons[1] && gp.buttons[1].pressed;
          
          gpSwarm = gp.buttons[4] && gp.buttons[4].pressed;
          gpPause = gp.buttons[9] && gp.buttons[9].pressed;
        }
      }

      if (this.touchStickActive) {
        // Touch analog stick drives moveAxis
      } else if (kX !== 0 || kY !== 0) {
        this.moveAxis.x = kX;
        this.moveAxis.y = kY;
      } else if (gpX !== 0 || gpY !== 0) {
        this.moveAxis.x = gpX;
        this.moveAxis.y = gpY;
        this.mouseActive = false;
      } else {
        this.moveAxis.x = 0;
        this.moveAxis.y = 0;
      }

      // Action flags
      this.actions.forward = forward || this.moveAxis.y < -0.3;
      this.actions.backward = backward || this.moveAxis.y > 0.3;
      this.actions.left = left || this.moveAxis.x < -0.3;
      this.actions.right = right || this.moveAxis.x > 0.3;

      this.actions.boost = boost || gpBoost;
      this.actions.interact = interact || gpInteract;
      this.actions.sonar = sonar || gpSonar;
      this.actions.recycler = recycler || gpRecycler;
      
      this.actions.swarm = swarm || gpSwarm;
      this.actions.pause = pause || gpPause;

      // Just Pressed detection
      for (const action in this.actions) {
        this.justPressedActions[action] = this.actions[action] && !prevActions[action];
      }
    }

    isDown(action) {
      return !!this.actions[action];
    }

    isJustPressed(action) {
      return !!this.justPressedActions[action];
    }

    getAxis() {
      return this.moveAxis;
    }

    getMouseWorld() {
      return this.mouseWorld;
    }

    isCursorMode() {
      const modeSetting = (window.SaveSystem && window.SaveSystem.data.settings.controlMode) || 'cursor_lock';
      return this.mouseActive && !this.touchStickActive && modeSetting !== 'keyboard_only';
    }

    getControlMode() {
      return (window.SaveSystem && window.SaveSystem.data.settings.controlMode) || 'cursor_lock';
    }
  }

  window.Input = new InputController();
})(window);
