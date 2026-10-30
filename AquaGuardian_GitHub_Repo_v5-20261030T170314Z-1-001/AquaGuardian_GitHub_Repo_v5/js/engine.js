/**
 * AquaGuardian: Deep Clean - Core Game Engine
 * Vector math, 2D Camera with look-ahead & screen-shake, Object Pooling,
 * 2D Spatial Grid collision broad-phase, DPR-aware Canvas, and Fixed-Timestep Loop.
 * Built for C://hacks 2026
 */

(function(window) {
  'use strict';

  // Ensure roundRect polyfill for older browser support
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r = 0) {
      if (typeof r === 'number') r = [r, r, r, r];
      const [tl, tr, br, bl] = r;
      this.beginPath();
      this.moveTo(x + tl, y);
      this.lineTo(x + w - tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + tr);
      this.lineTo(x + w, y + h - br);
      this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
      this.lineTo(x + bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - bl);
      this.lineTo(x, y + tl);
      this.quadraticCurveTo(x, y, x + tl, y);
      this.closePath();
      return this;
    };
  }

  // --- 2D Vector Math ---
  class Vector2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    set(x, y) { this.x = x; this.y = y; return this; }
    copy(v) { this.x = v.x; this.y = v.y; return this; }
    clone() { return new Vector2(this.x, this.y); }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    scale(s) { this.x *= s; this.y *= s; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() {
      const len = this.length();
      if (len > 0.00001) {
        this.x /= len;
        this.y /= len;
      }
      return this;
    }
    dist(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
    distSq(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      return dx * dx + dy * dy;
    }
    angle() { return Math.atan2(this.y, this.x); }
    static fromAngle(angle, len = 1) {
      return new Vector2(Math.cos(angle) * len, Math.sin(angle) * len);
    }
  }

  // --- Object Pooling for Zero-Allocation GC ---
  class ObjectPool {
    constructor(factory, initialSize = 100) {
      this.factory = factory;
      this.pool = [];
      for (let i = 0; i < initialSize; i++) {
        this.pool.push(this.factory());
      }
    }

    obtain() {
      return this.pool.length > 0 ? this.pool.pop() : this.factory();
    }

    free(obj) {
      if (obj && obj.reset) obj.reset();
      this.pool.push(obj);
    }
  }

  // --- 2D Spatial Grid Collision Broad-Phase ---
  class SpatialGrid {
    constructor(cellSize = 120) {
      this.cellSize = cellSize;
      this.cells = new Map();
    }

    clear() {
      this.cells.clear();
    }

    _key(cx, cy) {
      return `${cx},${cy}`;
    }

    insert(entity) {
      const cx = Math.floor(entity.pos.x / this.cellSize);
      const cy = Math.floor(entity.pos.y / this.cellSize);
      const key = this._key(cx, cy);

      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key).push(entity);
    }

    queryRadius(center, radius) {
      const results = [];
      const minCx = Math.floor((center.x - radius) / this.cellSize);
      const maxCx = Math.floor((center.x + radius) / this.cellSize);
      const minCy = Math.floor((center.y - radius) / this.cellSize);
      const maxCy = Math.floor((center.y + radius) / this.cellSize);

      const radSq = radius * radius;
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cy = minCy; cy <= maxCy; cy++) {
          const list = this.cells.get(this._key(cx, cy));
          if (list) {
            for (let i = 0; i < list.length; i++) {
              const ent = list[i];
              if (ent.pos.distSq(center) <= radSq) {
                results.push(ent);
              }
            }
          }
        }
      }
      return results;
    }
  }

  // --- 2D Follow Camera ---
  class Camera2D {
    constructor(width, height) {
      this.pos = new Vector2(0, 0);
      this.target = new Vector2(0, 0);
      this.viewportWidth = width;
      this.viewportHeight = height;
      this.bounds = { minX: 0, minY: 0, maxX: 3000, maxY: 3000 };
      this.shakeIntensity = 0;
      this.shakeDuration = 0;
      this.zoom = 1.0;
      this.lookAheadFactor = 0.45;
    }

    resize(w, h) {
      this.viewportWidth = w;
      this.viewportHeight = h;
    }

    setBounds(minX, minY, maxX, maxY) {
      this.bounds = { minX, minY, maxX, maxY };
    }

    shake(intensity = 8, durationSec = 0.35) {
      if (window.SaveSystem && window.SaveSystem.data.settings.reduceMotion) {
        return; // Accessibility: disable camera shake
      }
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
      this.shakeDuration = Math.max(this.shakeDuration, durationSec);
    }

    update(targetPos, targetVel, dt) {
      // Look-ahead vector
      const lookAhead = targetVel ? targetVel.clone().scale(this.lookAheadFactor) : new Vector2(0, 0);
      this.target.x = targetPos.x + lookAhead.x;
      this.target.y = targetPos.y + lookAhead.y;

      // Smooth camera follow lerp
      const lerpSpeed = 4.5 * dt;
      this.pos.x += (this.target.x - this.pos.x) * lerpSpeed;
      this.pos.y += (this.target.y - this.pos.y) * lerpSpeed;

      // Clamping within map bounds
      const halfW = (this.viewportWidth * 0.5) / this.zoom;
      const halfH = (this.viewportHeight * 0.5) / this.zoom;

      this.pos.x = Math.max(this.bounds.minX + halfW, Math.min(this.bounds.maxX - halfW, this.pos.x));
      this.pos.y = Math.max(this.bounds.minY + halfH, Math.min(this.bounds.maxY - halfH, this.pos.y));

      // Shake decay
      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
        if (this.shakeDuration <= 0) {
          this.shakeIntensity = 0;
        }
      }
    }

    applyTransform(ctx) {
      let ox = 0, oy = 0;
      if (this.shakeIntensity > 0) {
        ox = (Math.random() * 2 - 1) * this.shakeIntensity;
        oy = (Math.random() * 2 - 1) * this.shakeIntensity;
      }

      ctx.save();
      ctx.translate(this.viewportWidth * 0.5 + ox, this.viewportHeight * 0.5 + oy);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.pos.x, -this.pos.y);
    }

    restoreTransform(ctx) {
      ctx.restore();
    }

    worldToScreen(worldPos) {
      return new Vector2(
        (worldPos.x - this.pos.x) * this.zoom + this.viewportWidth * 0.5,
        (worldPos.y - this.pos.y) * this.zoom + this.viewportHeight * 0.5
      );
    }

    screenToWorld(screenPos) {
      return new Vector2(
        (screenPos.x - this.viewportWidth * 0.5) / this.zoom + this.pos.x,
        (screenPos.y - this.viewportHeight * 0.5) / this.zoom + this.pos.y
      );
    }

    isVisible(worldPos, margin = 80) {
      const halfW = (this.viewportWidth * 0.5) / this.zoom + margin;
      const halfH = (this.viewportHeight * 0.5) / this.zoom + margin;
      return (
        worldPos.x >= this.pos.x - halfW &&
        worldPos.x <= this.pos.x + halfW &&
        worldPos.y >= this.pos.y - halfH &&
        worldPos.y <= this.pos.y + halfH
      );
    }
  }

  // --- Particles & Effects ---
  class Particle {
    constructor() {
      this.pos = new Vector2();
      this.vel = new Vector2();
      this.color = '#ffffff';
      this.size = 2;
      this.maxLife = 1;
      this.life = 0;
      this.alpha = 1;
      this.type = 'circle'; // circle, ring, spark, bubble
      this.active = false;
    }

    reset() {
      this.active = false;
    }

    init(x, y, vx, vy, color, size, life, type = 'circle') {
      this.pos.set(x, y);
      this.vel.set(vx, vy);
      this.color = color;
      this.size = size;
      this.maxLife = life;
      this.life = life;
      this.alpha = 1;
      this.type = type;
      this.active = true;
    }

    update(dt) {
      if (!this.active) return;
      this.life -= dt;
      if (this.life <= 0) {
        this.active = false;
        return;
      }
      this.pos.add(this.vel.clone().scale(dt));
      this.alpha = Math.max(0, this.life / this.maxLife);
      if (this.type === 'bubble') {
        this.vel.y -= 12 * dt; // upward buoyancy
        this.pos.x += Math.sin(this.life * 10) * 0.5;
      }
    }

    draw(ctx) {
      if (!this.active || this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;

      if (this.type === 'circle' || this.type === 'bubble') {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        if (this.type === 'bubble') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (this.type === 'ring') {
        const currentRadius = this.size * (1 - this.alpha + 0.2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.type === 'spark') {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x - this.vel.x * 0.05, this.pos.y - this.vel.y * 0.05);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  class ParticleSystem {
    constructor() {
      this.pool = new ObjectPool(() => new Particle(), 300);
      this.activeParticles = [];
    }

    emit(x, y, count = 5, config = {}) {
      const color = config.color || '#4facfe';
      const speed = config.speed || 60;
      const size = config.size || 3;
      const life = config.life || 0.6;
      const type = config.type || 'circle';
      const spread = config.spread || Math.PI * 2;
      const baseAngle = config.angle || 0;

      for (let i = 0; i < count; i++) {
        const p = this.pool.obtain();
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const spd = speed * (0.5 + Math.random() * 0.8);
        const vx = Math.cos(angle) * spd + (config.vx || 0);
        const vy = Math.sin(angle) * spd + (config.vy || 0);

        p.init(x, y, vx, vy, color, size * (0.8 + Math.random() * 0.4), life * (0.7 + Math.random() * 0.6), type);
        this.activeParticles.push(p);
      }
    }

    emitWake(x, y, droneVel) {
      // Boat wake water foam particles
      const speed = droneVel.length();
      if (speed < 15) return;
      const count = Math.min(3, Math.ceil(speed / 80));
      const oppAngle = droneVel.angle() + Math.PI;

      this.emit(x, y, count, {
        color: 'rgba(220, 245, 255, 0.75)',
        speed: speed * 0.25,
        angle: oppAngle,
        spread: 0.8,
        size: 3.5,
        life: 0.5,
        type: 'bubble'
      });
    }

    emitPurifySparkles(x, y, radius = 50) {
      const colors = ['#00e676', '#00f2fe', '#ffffff', '#e0f7fa'];
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        this.emit(px, py, 1, {
          color: colors[Math.floor(Math.random() * colors.length)],
          speed: 40,
          size: 4,
          life: 0.8,
          type: 'spark'
        });
      }
    }

    update(dt) {
      for (let i = this.activeParticles.length - 1; i >= 0; i--) {
        const p = this.activeParticles[i];
        p.update(dt);
        if (!p.active) {
          this.pool.free(p);
          this.activeParticles.splice(i, 1);
        }
      }
    }

    draw(ctx) {
      for (let i = 0; i < this.activeParticles.length; i++) {
        this.activeParticles[i].draw(ctx);
      }
    }

    clear() {
      for (let i = 0; i < this.activeParticles.length; i++) {
        this.pool.free(this.activeParticles[i]);
      }
      this.activeParticles.length = 0;
    }
  }

  // --- Floating Pop-up Text ---
  class FloatingText {
    constructor() {
      this.pos = new Vector2();
      this.text = '';
      this.color = '#ffffff';
      this.size = 16;
      this.life = 0;
      this.maxLife = 1;
      this.active = false;
    }

    reset() { this.active = false; }

    init(x, y, text, color = '#00f2fe', size = 16, life = 1.0) {
      this.pos.set(x, y);
      this.text = text;
      this.color = color;
      this.size = size;
      this.life = life;
      this.maxLife = life;
      this.active = true;
    }

    update(dt) {
      if (!this.active) return;
      this.life -= dt;
      if (this.life <= 0) {
        this.active = false;
        return;
      }
      this.pos.y -= 30 * dt; // float upwards
    }

    draw(ctx) {
      if (!this.active) return;
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${this.size}px 'Segoe UI', sans-serif`;
      ctx.fillStyle = this.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(this.text, this.pos.x, this.pos.y);
      ctx.restore();
    }
  }

  class FloatingTextSystem {
    constructor() {
      this.pool = new ObjectPool(() => new FloatingText(), 40);
      this.items = [];
    }

    spawn(x, y, text, color = '#00f2fe', size = 16, life = 1.0) {
      const ft = this.pool.obtain();
      ft.init(x, y, text, color, size, life);
      this.items.push(ft);
    }

    update(dt) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        item.update(dt);
        if (!item.active) {
          this.pool.free(item);
          this.items.splice(i, 1);
        }
      }
    }

    draw(ctx) {
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].draw(ctx);
      }
    }

    clear() {
      for (let i = 0; i < this.items.length; i++) {
        this.pool.free(this.items[i]);
      }
      this.items.length = 0;
    }
  }

  // --- Fixed Timestep Game Loop ---
  class Engine {
    constructor() {
      this.Vector2 = Vector2;
      this.SpatialGrid = SpatialGrid;
      this.Camera2D = Camera2D;
      this.ParticleSystem = ParticleSystem;
      this.FloatingTextSystem = FloatingTextSystem;

      this.canvas = null;
      this.ctx = null;
      this.camera = null;
      this.particles = new ParticleSystem();
      this.floatingTexts = new FloatingTextSystem();
      this.grid = new SpatialGrid(120);

      this.dpr = window.devicePixelRatio || 1;
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.isRunning = false;
      this.lastTime = 0;
      this.accumulator = 0;
      this.timestep = 1 / 60; // 60 updates per second
      this.fps = 60;
      this.fpsFrames = 0;
      this.fpsTimer = 0;

      this.updateCallback = null;
      this.renderCallback = null;
    }

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.camera = new Camera2D(this.width, this.height);

      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for smooth 60fps on retina

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.scale(this.dpr, this.dpr);
      this.camera.resize(this.width, this.height);
    }

    start(updateCb, renderCb) {
      this.updateCallback = updateCb;
      this.renderCallback = renderCb;
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame(time => this._tick(time));
    }

    stop() {
      this.isRunning = false;
    }

    _tick(currentTime) {
      if (!this.isRunning) return;

      let delta = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Avoid spiral of death on lag spikes
      if (delta > 0.1) delta = 0.1;

      // Game speed scaling from settings
      const speedMult = (window.SaveSystem && window.SaveSystem.data.settings.gameSpeed) || 1.0;
      delta *= speedMult;

      this.accumulator += delta;
      while (this.accumulator >= this.timestep) {
        if (this.updateCallback) {
          this.updateCallback(this.timestep);
        }
        this.particles.update(this.timestep);
        this.floatingTexts.update(this.timestep);
        this.accumulator -= this.timestep;
      }

      // Render
      if (this.renderCallback) {
        this.renderCallback(this.ctx);
      }

      // FPS tracking
      this.fpsFrames++;
      this.fpsTimer += delta;
      if (this.fpsTimer >= 1.0) {
        this.fps = this.fpsFrames;
        this.fpsFrames = 0;
        this.fpsTimer = 0;
      }

      requestAnimationFrame(time => this._tick(time));
    }
  }

  window.Engine = new Engine();
})(window);
