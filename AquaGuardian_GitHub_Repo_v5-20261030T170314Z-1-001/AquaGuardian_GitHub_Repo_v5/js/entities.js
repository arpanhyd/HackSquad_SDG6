/**
 * AquaGuardian: Deep Clean - Game Entities (Overcharged Edition)
 * Drift physics, unlockable skins, Mystery Supply Drops, Powerups,
 * Drone, Debris, Toxic Barrels, Drainage Pipes, Recycling Buoys,
 * Boids Wildlife, Oil Slicks, and Epic Raid Boss Leviathan.
 * Built for C://hacks 2026
 */

(function(window) {
  'use strict';

  const V2 = window.Engine.Vector2;

  const DEBRIS_TYPES = {
    BOTTLE: { name: 'PET Plastic Bottle', credits: 10, xp: 25, wqiGain: 1.5, size: 10, color: '#4fc3f7' },
    BAG: { name: 'Polythene Bag', credits: 15, xp: 35, wqiGain: 2.0, size: 13, color: '#e0e0e0' },
    RINGS: { name: '6-Pack Soda Rings', credits: 20, xp: 45, wqiGain: 2.5, size: 12, color: '#b2ebf2' },
    NET: { name: 'Ghost Fishing Net', credits: 35, xp: 70, wqiGain: 4.0, size: 18, color: '#78909c' },
    MICROPLASTIC: { name: 'Microplastic Cluster', credits: 25, xp: 50, wqiGain: 3.0, size: 11, color: '#ff80ab' }
  };

  // --- 1. AQUA-DRONE (Overcharged with Drifting & Skins) ---
  class AquaDrone {
    constructor(x, y) {
      this.pos = new V2(x, y);
      this.vel = new V2(0, 0);
      this.angle = -Math.PI / 2;
      this.angularVel = 0;

      // Stats
      this.energy = 100;
      this.maxEnergy = 100;
      this.holdCapacity = 12;
      this.cargo = [];
      this.magnetRadius = 45;
      this.netWidth = 38;
      this.safeForFish = false;
      this.topSpeed = 190; // Supercharged spaceship/drone speed
      this.turnRate = 4.3;
      this.accel = 320;
      this.solarChargeRate = 11;
      this.nightTrickle = 1.0;

      // Hydro-Dash & Autonomous Mini-Drone Swarm
      
      
      
      this.swarmCooldown = 0;
      this.swarmTimer = 0;
      this.swarmCount = 1;
      this.swarmDuration = 10;
      this.swarmRange = 130;
      this.miniDrones = [];

      // Drift Mechanics
      this.isDrifting = false;
      this.driftTime = 0;
      this.driftDir = 0; // -1 left, 1 right
      this.miniTurboReady = false;

      // Power-up States
      this.activePowerup = null; // 'TURBO', 'MAGNET', 'SHIELD', 'DOUBLE'
      this.powerupTimer = 0;

      // State flags & timers
      this.isBoosting = false;
      this.sonarActive = false;
      this.sonarTimer = 0;
      this.sonarMaxRadius = 500;
      this.sonarWaveRadius = 0;
      this.sonarCooldown = 0;
      this.recyclerCooldown = 0;
      this.neutralizingTarget = null;
      this.neutralizeProgress = 0;
      this.health = 100;
      this.maxHealth = 100;
      this.collisionCooldown = 0;

      // Visual animations
      this.bobOffset = 0;
      this.throttleAnim = 0;
      this.propellerAngle = 0;
      this.trailTimer = 0;

      this.applyUpgrades();
    }

    applyUpgrades() {
      if (!window.UpgradeSystem) return;
      const u = window.UpgradeSystem;

      const sonarData = u.getTierData('sonar');
      this.sonarMaxRadius = sonarData.range;

      const holdData = u.getTierData('hold');
      this.holdCapacity = holdData.capacity;

      const magData = u.getTierData('magnet');
      this.magnetRadius = magData.radius;

      const netData = u.getTierData('nets');
      this.netWidth = netData.width;
      this.safeForFish = netData.safeForFish;

      const solarData = u.getTierData('solar');
      this.solarChargeRate = solarData.chargeRate;
      this.maxEnergy = solarData.maxEnergy;
      this.nightTrickle = solarData.nightTrickle;

      const hullData = u.getTierData('hull');
      this.topSpeed = hullData.topSpeed; // Relaxed, easy-to-control cruising speed
      this.turnRate = hullData.turnRate;
      this.accel = hullData.accel;

      if (u.config.drones) {
        const droneData = u.getTierData('drones');
        this.swarmCount = droneData.count;
        this.swarmDuration = droneData.duration;
        this.swarmRange = droneData.range;
      }

      if (u.config.shield) {
        const shieldData = u.getTierData('shield');
        this.wildlifeProtection = shieldData.protection || 0;
      } else {
        this.wildlifeProtection = 0;
      }

      if (u.config.neutralizer) {
        const neutData = u.getTierData('neutralizer');
        this.neutralizeSpeed = neutData.speed || 0.85;
        this.neutralizeRange = neutData.range || 125;
      } else {
        this.neutralizeSpeed = 0.85;
        this.neutralizeRange = 125;
      }
    }

    update(dt, sunIntensity, worldBounds) {
      this.bobOffset += dt * 3.5;
      if (this.collisionCooldown > 0) this.collisionCooldown -= dt;
      if (this.sonarCooldown > 0) this.sonarCooldown -= dt;
      if (this.recyclerCooldown > 0) this.recyclerCooldown -= dt;
      if (this.dashCooldown > 0) this.dashCooldown -= dt;
      if (this.swarmCooldown > 0) this.swarmCooldown -= dt;



      // Update Active Power-up
      if (this.activePowerup) {
        this.powerupTimer -= dt;
        if (this.powerupTimer <= 0) {
          this.activePowerup = null;
          if (window.UI) window.UI.showNotification("Power-up Expired!");
        }
      }

      // Solar energy recharge
      const effectiveRecharge = (this.solarChargeRate * sunIntensity + this.nightTrickle) * dt;
      this.energy = Math.min(this.maxEnergy, this.energy + effectiveRecharge);

      // Handle Steering & Propulsion (Revamped Cursor-Pilot + Hybrid Keyboard)
      const axis = window.Input.getAxis();
      const isThrottling = window.Input.isDown('forward');
      const isReversing = window.Input.isDown('backward');
      const hasKeyboardInput = (axis.x !== 0 || axis.y !== 0 || isThrottling || isReversing);

      const hasInfiniteTurbo = this.activePowerup === 'TURBO';
      this.isBoosting = (window.Input.isDown('boost') && (this.energy > 3 || hasInfiniteTurbo)) || hasInfiniteTurbo;

      let speedMultiplier = 1.0;
      if (this.isBoosting) {
        speedMultiplier = hasInfiniteTurbo ? 2.25 : 1.85;
        if (!hasInfiniteTurbo) {
          this.energy = Math.max(0, this.energy - 13 * dt);
        }
        window.Engine.camera.zoom = 0.94;

        const engineOffset = V2.fromAngle(this.angle + Math.PI, 22);
        const flameColor = hasInfiniteTurbo ? '#ff007f' : '#00f2fe';
        window.Engine.particles.emit(
          this.pos.x + engineOffset.x,
          this.pos.y + engineOffset.y,
          3,
          { color: flameColor, speed: 110, angle: this.angle + Math.PI, spread: 0.6, size: 4.5, type: 'bubble' }
        );
      } else {
        window.Engine.camera.zoom = 1.0;
      }

      const controlMode = window.Input.getControlMode();
      const useCursor = window.Input.isCursorMode() && !hasKeyboardInput;

      let angleDiff = 0;

      if (useCursor) {
        const mw = window.Input.getMouseWorld();
        const dx = mw.x - this.pos.x;
        const dy = mw.y - this.pos.y;
        const distToCursor = Math.sqrt(dx * dx + dy * dy);

        if (distToCursor > 4) {
          const targetAngle = Math.atan2(dy, dx);
          // Shortest angular difference (-PI to PI)
          angleDiff = targetAngle - this.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (controlMode === 'cursor_lock') {
            // Smoothly steer and glide the spaceship toward the cursor
            this.angle += angleDiff * Math.min(1, dt * 14);
            const followResponsiveness = this.isBoosting ? 9.5 : 6.5;
            const desiredVx = dx * followResponsiveness;
            const desiredVy = dy * followResponsiveness;
            const maxCursorSpd = this.topSpeed * speedMultiplier;
            const desLen = Math.sqrt(desiredVx * desiredVx + desiredVy * desiredVy);
            if (desLen > maxCursorSpd) {
              this.vel.set((desiredVx / desLen) * maxCursorSpd, (desiredVy / desLen) * maxCursorSpd);
            } else {
              this.vel.set(desiredVx, desiredVy);
            }
          } else {
            // Smooth Cursor Seek: arcade thruster pursuit toward cursor
            this.angle += angleDiff * Math.min(1, dt * (this.turnRate * 2.8));
            const throttleScale = Math.min(1.0, distToCursor / 90);
            const moveVec = V2.fromAngle(this.angle, throttleScale * this.accel * 1.25 * speedMultiplier * dt);
            this.vel.add(moveVec);
            this.vel.scale(0.94);
          }
          this.throttleAnim = Math.min(1, distToCursor / 60);
        } else {
          this.vel.scale(0.75);
          this.throttleAnim = 0;
        }
      } else {
        // Classic / Keyboard / Gamepad Steering
        if (axis.x !== 0) {
          const driftFactor = this.isDrifting ? 1.3 : 1.0;
          this.angle += axis.x * this.turnRate * driftFactor * dt;
          angleDiff = axis.x;
        }

        let targetForward = 0;
        if (isThrottling) targetForward = 1;
        else if (isReversing) targetForward = -0.55;

        if (targetForward !== 0) {
          const moveVec = V2.fromAngle(this.angle, targetForward * this.accel * speedMultiplier * dt);
          this.vel.add(moveVec);
          this.throttleAnim = Math.min(1, this.throttleAnim + dt * 4);
        } else {
          this.throttleAnim = Math.max(0, this.throttleAnim - dt * 3);
        }

        const drag = this.isDrifting ? 0.968 : 0.955;
        this.vel.scale(drag);
      }

      // Drift Mechanics: works both with sharp cursor whips OR keyboard turns at high speed
      const curSpeed = this.vel.length();
      const sharpTurn = useCursor ? (Math.abs(angleDiff) > 0.38 && curSpeed > 180) : (Math.abs(axis.x) > 0.4 && curSpeed > 140);

      if (sharpTurn) {
        this.isDrifting = true;
        this.driftDir = Math.sign(angleDiff || axis.x || 1);
        this.driftTime += dt;

        const sparkOffset = V2.fromAngle(this.angle + (this.driftDir > 0 ? Math.PI * 0.75 : -Math.PI * 0.75), 18);
        const sparkColor = this.driftTime > 1.0 ? '#ffd600' : '#00e5ff';

        window.Engine.particles.emit(
          this.pos.x + sparkOffset.x,
          this.pos.y + sparkOffset.y,
          2,
          { color: sparkColor, speed: 70, size: 3.5, life: 0.35, type: 'spark' }
        );

        if (this.driftTime > 1.0 && !this.miniTurboReady) {
          this.miniTurboReady = true;
          window.Engine.floatingTexts.spawn(this.pos.x, this.pos.y - 25, 'MINI-TURBO READY!', '#ffd600', 14, 0.6);
          if (window.AudioEngine) window.AudioEngine.play('click');
        }

        if (this.driftTime >= 2.5 && window.SaveSystem) {
          window.SaveSystem.unlockAchievement('drift_king');
        }
      } else {
        if (this.isDrifting && this.miniTurboReady) {
          const boostImpulse = V2.fromAngle(this.angle, 320);
          this.vel.add(boostImpulse);
          this.dashTimer = Math.max(this.dashTimer, 0.28);
          window.Engine.floatingTexts.spawn(this.pos.x, this.pos.y, '⚡ TURBO BOOST! ⚡', '#ffd600', 18);
          window.Engine.camera.shake(8, 0.35);
          if (window.AudioEngine) window.AudioEngine.play('powerup');
        }
        this.isDrifting = false;
        this.driftTime = 0;
        this.miniTurboReady = false;
      }

      if (window.AudioEngine) {
        window.AudioEngine.updateDriftSound(this.isDrifting, this.driftTime);
      }

      // Max Speed Clamp (for non-lock modes)
      const dashBonus = this.dashTimer > 0 ? 1.7 : 1.0;
      const maxSpd = this.topSpeed * (this.isBoosting ? (hasInfiniteTurbo ? 2.25 : 1.85) : 1.0) * dashBonus;
      if (curSpeed > maxSpd && this.dashTimer <= 0 && controlMode !== 'cursor_lock') {
        this.vel.normalize().scale(maxSpd);
      }

      // Movement
      this.pos.add(this.vel.clone().scale(dt));

      // Bounds
      if (worldBounds) {
        const margin = 30;
        this.pos.x = Math.max(worldBounds.minX + margin, Math.min(worldBounds.maxX - margin, this.pos.x));
        this.pos.y = Math.max(worldBounds.minY + margin, Math.min(worldBounds.maxY - margin, this.pos.y));
      }

      // Wake
      if (curSpeed > 20) {
        const wakeOffset = V2.fromAngle(this.angle + Math.PI, 18);
        window.Engine.particles.emitWake(this.pos.x + wakeOffset.x, this.pos.y + wakeOffset.y, this.vel);
      }

      if (window.AudioEngine) {
        window.AudioEngine.updateEngineThrottle(curSpeed / this.topSpeed, this.isBoosting);
      }

      // Sonar
      if (window.Input.isJustPressed('sonar') && this.sonarCooldown <= 0) {
        this.triggerSonar();
      }
      if (this.sonarActive) {
        this.sonarTimer -= dt;
        this.sonarWaveRadius += (this.sonarMaxRadius / 1.5) * dt;
        if (this.sonarTimer <= 0 || this.sonarWaveRadius > this.sonarMaxRadius) {
          this.sonarActive = false;
        }
      }

      // Recycler Burst
      if (window.Input.isJustPressed('recycler') && this.recyclerCooldown <= 0 && this.energy >= 15) {
        this.triggerRecyclerBurst();
      }



      // Autonomous Helper Mini-Drone Swarm [G]
      if (window.Input.isJustPressed('swarm') && this.swarmCooldown <= 0 && this.energy >= 20) {
        this.triggerHelperSwarm();
      }

      // Update active Helper Mini-Drones
      if (this.swarmTimer > 0) {
        this.swarmTimer -= dt;
        for (let i = 0; i < this.miniDrones.length; i++) {
          const md = this.miniDrones[i];
          md.orbitAngle += dt * 3.4;
          const targetX = this.pos.x + Math.cos(md.orbitAngle) * 58;
          const targetY = this.pos.y + Math.sin(md.orbitAngle) * 58;
          md.pos.x += (targetX - md.pos.x) * 10 * dt;
          md.pos.y += (targetY - md.pos.y) * 10 * dt;
          if (md.laserTimer > 0) md.laserTimer -= dt;
        }
        if (this.swarmTimer <= 0) {
          this.miniDrones = [];
        }
      }
    }



    triggerHelperSwarm() {
      this.energy = Math.max(0, this.energy - 20);
      this.swarmCooldown = 14.0;
      this.swarmTimer = this.swarmDuration;
      this.miniDrones = [];
      for (let i = 0; i < this.swarmCount; i++) {
        const ang = (i / this.swarmCount) * Math.PI * 2;
        this.miniDrones.push({
          pos: new V2(this.pos.x + Math.cos(ang) * 58, this.pos.y + Math.sin(ang) * 58),
          orbitAngle: ang,
          laserTarget: null,
          laserTimer: 0
        });
      }
      if (window.AudioEngine) window.AudioEngine.play('powerup');
      window.Engine.floatingTexts.spawn(this.pos.x, this.pos.y - 30, `🤖 ${this.swarmCount}x HELPER DRONES DEPLOYED!`, '#00e676', 17);

      if (window.SaveSystem && window.SaveSystem.data.achievements.swarm_commander) {
        const ach = window.SaveSystem.data.achievements.swarm_commander;
        ach.progress = (ach.progress || 0) + 1;
        if (ach.progress >= 3) window.SaveSystem.unlockAchievement('swarm_commander');
        window.SaveSystem.save();
      }
    }

    triggerSonar() {
      this.sonarActive = true;
      this.sonarTimer = 2.5;
      this.sonarWaveRadius = 0;
      this.sonarCooldown = 3.5;
      if (window.AudioEngine) window.AudioEngine.play('sonar');
      window.Engine.particles.emit(this.pos.x, this.pos.y, 1, {
        color: '#00f2fe',
        size: this.sonarMaxRadius,
        life: 1.5,
        type: 'ring'
      });
    }

    triggerRecyclerBurst() {
      this.energy -= 15;
      this.recyclerCooldown = 5.0;
      if (window.AudioEngine) window.AudioEngine.play('recycler_burst');
      window.Engine.camera.shake(8, 0.4);

      window.Engine.particles.emit(this.pos.x, this.pos.y, 25, {
        color: '#00e676',
        speed: 250,
        size: 5,
        life: 0.6,
        type: 'spark'
      });
      window.Engine.particles.emit(this.pos.x, this.pos.y, 1, {
        color: '#00e676',
        size: 280,
        life: 0.6,
        type: 'ring'
      });

      if (window.LevelManager && window.LevelManager.currentLevelInstance) {
        const level = window.LevelManager.currentLevelInstance;
        level.oilSlicks = level.oilSlicks.filter(oil => {
          if (oil.pos.dist(this.pos) < 240) {
            window.Engine.floatingTexts.spawn(oil.pos.x, oil.pos.y, 'Oil Dispersed! +50 XP', '#00e676', 15);
            window.SaveSystem.addXP(50);
            return false;
          }
          return true;
        });

        level.debrisList.forEach(deb => {
          if (deb.pos.dist(this.pos) < 260) {
            const pullDir = this.pos.clone().sub(deb.pos).normalize().scale(450);
            deb.vel.add(pullDir);
          }
        });
      }
    }

    collectDebris(debris) {
      if (this.cargo.length >= this.holdCapacity) {
        window.UI.showHoldFullAlert();
        return false;
      }
      this.cargo.push(debris);
      return true;
    }

    emptyCargo() {
      const items = [...this.cargo];
      this.cargo = [];
      return items;
    }

    draw(ctx) {


      // Draw Autonomous Helper Mini-Drones
      for (let i = 0; i < this.miniDrones.length; i++) {
        const md = this.miniDrones[i];
        if (md.laserTarget && md.laserTimer > 0) {
          ctx.save();
          ctx.strokeStyle = '#00e676';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#00e676';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(md.pos.x, md.pos.y);
          ctx.lineTo(md.laserTarget.x, md.laserTarget.y);
          ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        ctx.translate(md.pos.x, md.pos.y);
        ctx.rotate(md.orbitAngle * 2);
        ctx.fillStyle = '#0f385c';
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(this.angle + Math.PI / 2);

      const overallTier = window.UpgradeSystem ? window.UpgradeSystem.getOverallTier() : 1;
      const equippedSkin = (window.SaveSystem && window.SaveSystem.data.equippedSkin) || 'default';

      // 1. Boat Shadow
      ctx.fillStyle = 'rgba(2, 10, 20, 0.45)';
      ctx.beginPath();
      ctx.ellipse(4, 6, 17, 27, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Drone Searchlight Beam
      const lightGrad = ctx.createRadialGradient(0, -25, 5, 0, -150, 100);
      let beamColor = 'rgba(0, 242, 254, ';
      if (equippedSkin === 'neon_cyber') beamColor = 'rgba(255, 0, 128, ';
      else if (equippedSkin === 'solar_gold') beamColor = 'rgba(255, 215, 0, ';
      else if (equippedSkin === 'toxic_slayer') beamColor = 'rgba(118, 255, 3, ';
      else if (equippedSkin === 'cosmic_void') beamColor = 'rgba(179, 136, 255, ';

      lightGrad.addColorStop(0, beamColor + '0.45)');
      lightGrad.addColorStop(0.6, beamColor + '0.15)');
      lightGrad.addColorStop(1, beamColor + '0)');

      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(-12, -22);
      ctx.lineTo(-80, -160);
      ctx.lineTo(80, -160);
      ctx.lineTo(12, -22);
      ctx.closePath();
      ctx.fill();

      // 3. Magnet Vacuum Field Glow
      const effectiveMagRadius = this.activePowerup === 'MAGNET' ? 350 : this.magnetRadius;
      if (effectiveMagRadius > 45) {
        ctx.strokeStyle = this.activePowerup === 'MAGNET' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(0, 242, 254, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, effectiveMagRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Catamaran Pontoons
      let hullColor = '#0f385c';
      let strokeColor = '#00e676';
      let accentColor = '#00f2fe';

      if (equippedSkin === 'neon_cyber') {
        hullColor = '#1a0033'; strokeColor = '#ff007f'; accentColor = '#00ffff';
      } else if (equippedSkin === 'solar_gold') {
        hullColor = '#3e2723'; strokeColor = '#ffd600'; accentColor = '#fff59d';
      } else if (equippedSkin === 'toxic_slayer') {
        hullColor = '#212121'; strokeColor = '#76ff03'; accentColor = '#ffeb3b';
      } else if (equippedSkin === 'cosmic_void') {
        hullColor = '#0d001a'; strokeColor = '#b388ff'; accentColor = '#e040fb';
      }

      if (overallTier >= 2) {
        ctx.fillStyle = hullColor;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;

        // Left pontoon
        ctx.beginPath();
        ctx.roundRect(-22, -18, 6, 36, 3);
        ctx.fill();
        ctx.stroke();

        // Right pontoon
        ctx.beginPath();
        ctx.roundRect(16, -18, 6, 36, 3);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
        ctx.stroke();
      }

      // Main Hull
      ctx.fillStyle = hullColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(0, -27);
      ctx.lineTo(15, -10);
      ctx.lineTo(14, 18);
      ctx.lineTo(-14, 18);
      ctx.lineTo(-15, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 5. Solar Panels
      const solarGrad = ctx.createLinearGradient(-10, -8, 10, 10);
      solarGrad.addColorStop(0, '#001a33');
      solarGrad.addColorStop(1, accentColor);
      ctx.fillStyle = solarGrad;
      ctx.fillRect(-8, -5, 16, 12);
      ctx.strokeRect(-8, -5, 16, 12);

      // 6. Cargo Bay
      const holdFillRatio = this.cargo.length / this.holdCapacity;
      const cargoColor = holdFillRatio >= 1.0 ? '#ff1744' : holdFillRatio > 0.6 ? '#ffd600' : '#00e676';
      ctx.fillStyle = cargoColor;
      ctx.beginPath();
      ctx.arc(0, 11, 4, 0, Math.PI * 2);
      ctx.fill();

      // 7. Shield Bubble Overlay
      if (this.activePowerup === 'SHIELD') {
        ctx.strokeStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 8. Thruster Jet Flame
      ctx.fillStyle = this.isBoosting ? '#ff3d71' : accentColor;
      ctx.fillRect(-5, 18, 10, 4);

      ctx.restore();

      // Sonar Wave
      if (this.sonarActive) {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 242, 254, ${Math.max(0, 1 - this.sonarWaveRadius / this.sonarMaxRadius)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.sonarWaveRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Tractor Beam
      if (this.neutralizingTarget) {
        ctx.save();
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.neutralizingTarget.pos.x, this.neutralizingTarget.pos.y);
        ctx.stroke();
        ctx.restore();
      }

      // Holographic Cursor Pilot Reticle & Tether Line
      if (window.Input && window.Input.isCursorMode()) {
        const mw = window.Input.getMouseWorld();
        const dist = this.pos.dist(mw);
        ctx.save();
        if (dist > 18) {
          ctx.strokeStyle = 'rgba(0, 242, 254, 0.28)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(this.pos.x, this.pos.y);
          ctx.lineTo(mw.x, mw.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.translate(mw.x, mw.y);
        ctx.rotate(this.bobOffset * 0.8);
        ctx.strokeStyle = this.isBoosting ? '#ff007f' : '#00f2fe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair ticks
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
          ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // --- 2. MYSTERY ECO-SUPPLY DROP / CRATE ---
  class SupplyCrate {
    constructor(x, y) {
      this.pos = new V2(x, y);
      this.radius = 22;
      this.bobOffset = Math.random() * Math.PI * 2;
      this.isOpened = false;
      this.beaconAngle = 0;
    }

    update(dt) {
      this.bobOffset += dt * 3;
      this.beaconAngle += dt * 4;
    }

    open(drone) {
      this.isOpened = true;
      if (window.AudioEngine) window.AudioEngine.play('crate_open');
      window.Engine.camera.shake(10, 0.4);

      // Massive confetti shower!
      const colors = ['#ffd600', '#00f2fe', '#00e676', '#ff007f', '#ffffff'];
      for (let i = 0; i < 40; i++) {
        window.Engine.particles.emit(this.pos.x, this.pos.y, 1, {
          color: colors[Math.floor(Math.random() * colors.length)],
          speed: 150 + Math.random() * 100,
          size: 4 + Math.random() * 4,
          life: 1.0,
          type: 'spark'
        });
      }

      // Reward jackpot
      const bonusCredits = 80 + Math.floor(Math.random() * 80);
      const bonusXP = 150 + Math.floor(Math.random() * 150);
      window.SaveSystem.addCredits(bonusCredits);
      window.SaveSystem.addXP(bonusXP);

      // Random power-up roll
      const powerups = ['TURBO', 'MAGNET', 'SHIELD', 'DOUBLE'];
      const grantedPower = powerups[Math.floor(Math.random() * powerups.length)];
      drone.activePowerup = grantedPower;
      drone.powerupTimer = 9.0;

      window.Engine.floatingTexts.spawn(this.pos.x, this.pos.y - 30, `🎁 SUPPLY CRATE! +${bonusCredits}C +${bonusXP}XP`, '#ffd600', 18);
      window.Engine.floatingTexts.spawn(this.pos.x, this.pos.y, `⚡ POWER-UP: ${grantedPower}!`, '#00f2fe', 16);

      // Progress loot achievement
      const ach = window.SaveSystem.data.achievements.crate_hunter;
      ach.progress = (ach.progress || 0) + 1;
      if (ach.progress >= 3) {
        window.SaveSystem.unlockAchievement('crate_hunter');
      }
      window.SaveSystem.save();
    }

    draw(ctx) {
      if (this.isOpened) return;
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y + Math.sin(this.bobOffset) * 3);

      // Glowing aura
      ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.fill();

      // Crate body
      ctx.fillStyle = '#bf360c';
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-14, -14, 28, 28, 4);
      ctx.fill();
      ctx.stroke();

      // Hazard Cross Straps
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -14); ctx.lineTo(14, 14);
      ctx.moveTo(14, -14); ctx.lineTo(-14, 14);
      ctx.stroke();

      // Flashing loot beacon
      ctx.fillStyle = '#ffd600';
      ctx.shadowColor = '#ffd600';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -18, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- 3. DEBRIS / PLASTIC WASTE ---
  class Debris {
    constructor(x, y, typeKey = 'BOTTLE') {
      this.pos = new V2(x, y);
      this.vel = new V2(0, 0);
      this.typeKey = typeKey;
      this.config = DEBRIS_TYPES[typeKey] || DEBRIS_TYPES.BOTTLE;
      this.size = this.config.size;
      this.angle = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 1.5;
      this.bobOffset = Math.random() * Math.PI * 2;
      this.isCollected = false;
      this.isHighlighted = false;
    }

    update(dt, drone) {
      this.bobOffset += dt * 2.5;
      this.angle += this.rotSpeed * dt;

      // Magnet suction with super-magnet powerup support
      if (drone) {
        const effectiveRad = drone.activePowerup === 'MAGNET' ? 350 : drone.magnetRadius;
        const dist = this.pos.dist(drone.pos);
        if (dist < effectiveRad) {
          const pullForce = (1 - dist / effectiveRad) * (drone.activePowerup === 'MAGNET' ? 420 : 220);
          const pullDir = drone.pos.clone().sub(this.pos).normalize().scale(pullForce * dt);
          this.vel.add(pullDir);
        }
      }

      this.vel.scale(0.92);
      this.pos.add(this.vel.clone().scale(dt));
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y + Math.sin(this.bobOffset) * 2);
      ctx.rotate(this.angle);

      if (this.isHighlighted) {
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, this.size + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      switch (this.typeKey) {
        case 'BOTTLE': {
          ctx.fillStyle = 'rgba(79, 195, 247, 0.85)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(-4, -8, 8, 16, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#0288d1';
          ctx.fillRect(-2, -10, 4, 3);
          break;
        }
        case 'BAG': {
          ctx.fillStyle = 'rgba(240, 240, 240, 0.7)';
          ctx.strokeStyle = 'rgba(180, 200, 220, 0.8)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-7, -6);
          ctx.quadraticCurveTo(-10, 2, -5, 8);
          ctx.quadraticCurveTo(0, 10, 5, 8);
          ctx.quadraticCurveTo(10, 2, 7, -6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'RINGS': {
          ctx.strokeStyle = 'rgba(178, 235, 242, 0.85)';
          ctx.lineWidth = 2;
          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 3; c++) {
              ctx.beginPath();
              ctx.arc((c - 1) * 7, (r - 0.5) * 7, 3, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          break;
        }
        case 'NET': {
          ctx.strokeStyle = '#78909c';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-9, -9, 18, 18);
          ctx.beginPath();
          ctx.moveTo(-9, -3); ctx.lineTo(9, -3);
          ctx.moveTo(-9, 3); ctx.lineTo(9, 3);
          ctx.moveTo(-3, -9); ctx.lineTo(-3, 9);
          ctx.moveTo(3, -9); ctx.lineTo(3, 9);
          ctx.stroke();
          break;
        }
        case 'MICROPLASTIC': {
          const colors = ['#ff80ab', '#ffd180', '#80d8ff'];
          colors.forEach((col, idx) => {
            ctx.fillStyle = col;
            const ox = Math.cos(idx * 2) * 5;
            const oy = Math.sin(idx * 2) * 5;
            ctx.beginPath();
            ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }
        default:
          ctx.fillStyle = this.config.color;
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- 4. RECYCLING BUOY ---
  class RecyclingBuoy {
    constructor(x, y) {
      this.pos = new V2(x, y);
      this.radius = 28;
      this.dockRadius = 95;
      this.beaconAngle = 0;
      this.bobOffset = 0;
    }

    update(dt) {
      this.beaconAngle += dt * 3.5;
      this.bobOffset += dt * 2;
    }

    draw(ctx, playerNear = false) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y + Math.sin(this.bobOffset) * 2.5);

      ctx.strokeStyle = playerNear ? '#00e676' : 'rgba(0, 242, 254, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, this.dockRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ffd600';
      ctx.strokeStyle = '#ff6f00';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0288d1';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(this.beaconAngle);
      ctx.fillStyle = 'rgba(0, 230, 118, 0.8)';
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = 12;
      ctx.fillRect(this.radius * 0.4, -3, 8, 6);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♻️', 0, 0);

      ctx.restore();
    }
  }

  // --- 5. TOXIC CHEMICAL BARREL ---
  class ToxicBarrel {
    constructor(x, y) {
      this.pos = new V2(x, y);
      this.radius = 20;
      this.isNeutralized = false;
      this.leakTimer = 0;
      this.bobOffset = Math.random() * Math.PI * 2;
      this.rot = Math.random() * Math.PI * 2;
      this.leakInterval = 1.2;
    }

    update(dt) {
      if (this.isNeutralized) return;
      this.bobOffset += dt * 2.5;
      this.leakTimer += dt;

      if (this.leakTimer >= this.leakInterval) {
        this.leakTimer = 0;
        window.Engine.particles.emit(this.pos.x, this.pos.y, 4, {
          color: '#76ff03',
          speed: 25,
          size: 6,
          life: 1.8,
          type: 'bubble'
        });
      }
    }

    draw(ctx, isTargeted = false, progress = 0) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y + Math.sin(this.bobOffset) * 2);
      ctx.rotate(this.rot);

      if (this.isNeutralized) {
        ctx.fillStyle = '#263238';
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-10, -14, 20, 28, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00e676';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SAFE', 0, 4);
        ctx.restore();
        return;
      }

      ctx.fillStyle = '#fbc02d';
      ctx.strokeStyle = '#bf360c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-10, -14, 20, 28, 4);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#212121';
      ctx.beginPath();
      ctx.moveTo(-10, -5); ctx.lineTo(10, -5);
      ctx.moveTo(-10, 5); ctx.lineTo(10, 5);
      ctx.stroke();

      ctx.fillStyle = '#212121';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☣️', 0, 0);

      if (isTargeted && progress > 0) {
        ctx.restore();
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(progress * 100)}%`, 0, -38);
        ctx.restore();
        return;
      }

      ctx.restore();
    }
  }

  // --- 6. DRAINAGE PIPE ---
  class DrainagePipe {
    constructor(x, y, angle = 0) {
      this.pos = new V2(x, y);
      this.angle = angle;
      this.isFiltered = false;
      this.radius = 32;
      this.outflowTimer = 0;
    }

    update(dt) {
      this.outflowTimer += dt;
      if (this.outflowTimer >= 0.15) {
        this.outflowTimer = 0;
        const outVec = V2.fromAngle(this.angle, 25);
        const spawnX = this.pos.x + outVec.x;
        const spawnY = this.pos.y + outVec.y;

        if (this.isFiltered) {
          window.Engine.particles.emit(spawnX, spawnY, 2, {
            color: '#80d8ff',
            speed: 60,
            angle: this.angle,
            spread: 0.4,
            size: 3.5,
            life: 0.8,
            type: 'bubble'
          });
        } else {
          window.Engine.particles.emit(spawnX, spawnY, 3, {
            color: '#6d4c41',
            speed: 55,
            angle: this.angle,
            spread: 0.5,
            size: 5,
            life: 1.2,
            type: 'circle'
          });
        }
      }
    }

    draw(ctx, playerNear = false) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(this.angle);

      ctx.fillStyle = '#37474f';
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.isFiltered ? '#00b0ff' : '#4e342e';
      ctx.beginPath();
      ctx.ellipse(6, 0, 6, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      if (this.isFiltered) {
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, -14, 6, 28);
        ctx.beginPath();
        ctx.moveTo(7, -14); ctx.lineTo(7, 14);
        ctx.stroke();
      }

      if (playerNear && !this.isFiltered) {
        ctx.restore();
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y - 36);
        ctx.fillStyle = 'rgba(0, 242, 254, 0.95)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('[HOLD E] Install Bio-Filter', 0, 0);
        ctx.restore();
        return;
      }

      ctx.restore();
    }
  }

  // --- 7. WILDLIFE: BOIDS FISH FLOCK & CORAL ---
  class Fish {
    constructor(x, y) {
      this.pos = new V2(x, y);
      this.vel = V2.fromAngle(Math.random() * Math.PI * 2, 40 + Math.random() * 40);
      this.acc = new V2(0, 0);
      this.maxSpeed = 95;
      this.maxForce = 130;
      this.size = 6 + Math.random() * 3;
      this.color = ['#ff7043', '#26c6da', '#ffca28', '#ab47bc'][Math.floor(Math.random() * 4)];
      this.tailWag = Math.random() * Math.PI * 2;
    }

    flock(boids, drone, dt) {
      const sep = this.separate(boids).scale(1.5);
      const ali = this.align(boids).scale(1.0);
      const coh = this.cohere(boids).scale(1.0);
      const flee = this.fleeDrone(drone).scale(2.5);

      this.acc.add(sep).add(ali).add(coh).add(flee);
    }

    separate(boids) {
      const steer = new V2(0, 0);
      let count = 0;
      const desiredSeparation = 24;
      for (let i = 0; i < boids.length; i++) {
        const other = boids[i];
        const d = this.pos.dist(other.pos);
        if (d > 0 && d < desiredSeparation) {
          const diff = this.pos.clone().sub(other.pos).normalize().scale(1 / d);
          steer.add(diff);
          count++;
        }
      }
      if (count > 0) steer.scale(1 / count);
      return steer;
    }

    align(boids) {
      const sum = new V2(0, 0);
      let count = 0;
      const neighborDist = 60;
      for (let i = 0; i < boids.length; i++) {
        const other = boids[i];
        const d = this.pos.dist(other.pos);
        if (d > 0 && d < neighborDist) {
          sum.add(other.vel);
          count++;
        }
      }
      if (count > 0) {
        sum.scale(1 / count).normalize().scale(this.maxSpeed);
        return sum.sub(this.vel);
      }
      return new V2(0, 0);
    }

    cohere(boids) {
      const sum = new V2(0, 0);
      let count = 0;
      const neighborDist = 70;
      for (let i = 0; i < boids.length; i++) {
        const other = boids[i];
        const d = this.pos.dist(other.pos);
        if (d > 0 && d < neighborDist) {
          sum.add(other.pos);
          count++;
        }
      }
      if (count > 0) {
        sum.scale(1 / count);
        const desired = sum.sub(this.pos).normalize().scale(this.maxSpeed);
        return desired.sub(this.vel);
      }
      return new V2(0, 0);
    }

    fleeDrone(drone) {
      if (!drone) return new V2(0, 0);
      const d = this.pos.dist(drone.pos);
      const safeRadius = drone.isBoosting ? 160 : 90;
      if (d < safeRadius) {
        const fleeVec = this.pos.clone().sub(drone.pos).normalize().scale(this.maxSpeed * 1.8);
        return fleeVec.sub(this.vel);
      }
      return new V2(0, 0);
    }

    update(dt, bounds) {
      this.vel.add(this.acc.clone().scale(dt));
      const spd = this.vel.length();
      if (spd > this.maxSpeed) this.vel.normalize().scale(this.maxSpeed);

      this.pos.add(this.vel.clone().scale(dt));
      this.acc.set(0, 0);
      this.tailWag += dt * 12;

      if (bounds) {
        if (this.pos.x < bounds.minX) this.pos.x = bounds.maxX;
        if (this.pos.x > bounds.maxX) this.pos.x = bounds.minX;
        if (this.pos.y < bounds.minY) this.pos.y = bounds.maxY;
        if (this.pos.y > bounds.maxY) this.pos.y = bounds.minY;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(this.vel.angle());

      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      const wag = Math.sin(this.tailWag) * 3;
      ctx.beginPath();
      ctx.moveTo(-this.size * 0.8, 0);
      ctx.lineTo(-this.size * 1.4, -this.size * 0.5 + wag);
      ctx.lineTo(-this.size * 1.4, this.size * 0.5 + wag);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  class CoralReef {
    constructor(x, y, radius = 35) {
      this.pos = new V2(x, y);
      this.radius = radius;
      this.health = 100;
      this.branches = [];
      const count = 7 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        this.branches.push({
          angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
          len: radius * (0.6 + Math.random() * 0.5),
          color: ['#ff4081', '#7c4dff', '#00e5ff', '#ff6e40'][Math.floor(Math.random() * 4)]
        });
      }
    }

    draw(ctx, wqi = 50) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);
      const isBleached = wqi < 40;

      ctx.fillStyle = isBleached ? '#cfd8dc' : '#455a64';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < this.branches.length; i++) {
        const b = this.branches[i];
        ctx.strokeStyle = isBleached ? '#eceff1' : b.color;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';

        const ex = Math.cos(b.angle) * b.len;
        const ey = Math.sin(b.angle) * b.len;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(ex * 0.5 + Math.sin(b.angle) * 8, ey * 0.5, ex, ey);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // --- 8. HAZARDS ---
  class OilSlick {
    constructor(x, y, radius = 55) {
      this.pos = new V2(x, y);
      this.radius = radius;
      this.anim = Math.random() * 10;
    }

    update(dt) {
      this.anim += dt * 0.8;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);

      const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, this.radius);
      grad.addColorStop(0, 'rgba(30, 20, 45, 0.85)');
      grad.addColorStop(0.5, 'rgba(100, 40, 90, 0.6)');
      grad.addColorStop(0.85, 'rgba(0, 180, 160, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  class PolluterBoat {
    constructor(startX, startY, waypoints = []) {
      this.pos = new V2(startX, startY);
      this.waypoints = waypoints;
      this.currentWp = 0;
      this.speed = 70;
      this.angle = 0;
      this.dumpTimer = 0;
      this.dumpInterval = 6.0;
    }

    update(dt, onDumpTrash) {
      if (this.waypoints.length === 0) return;
      const target = this.waypoints[this.currentWp];
      const diff = target.clone().sub(this.pos);
      const dist = diff.length();

      if (dist < 25) {
        this.currentWp = (this.currentWp + 1) % this.waypoints.length;
      } else {
        this.angle = diff.angle();
        this.pos.add(diff.normalize().scale(this.speed * dt));
      }

      this.dumpTimer += dt;
      if (this.dumpTimer >= this.dumpInterval) {
        this.dumpTimer = 0;
        if (onDumpTrash) onDumpTrash(this.pos.x, this.pos.y);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(this.angle + Math.PI / 2);

      ctx.fillStyle = '#37474f';
      ctx.strokeStyle = '#d32f2f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-12, -22, 24, 44, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-8, -10, 16, 20);

      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(0, -14, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- 9. EPIC RAID BOSS: THE SLUDGE LEVIATHAN ---
  class SludgeLeviathan {
    constructor(x, y) {
      this.pos = new V2(x, y);
      this.radius = 95;
      this.phase = 1;
      this.maxHealth = 3;
      this.filtersInstalled = 0;
      this.isPurified = false;

      this.outflows = [
        { id: 1, angleOffset: -Math.PI * 0.6, dist: 130, isFiltered: false },
        { id: 2, angleOffset: 0, dist: 145, isFiltered: false },
        { id: 3, angleOffset: Math.PI * 0.6, dist: 130, isFiltered: false }
      ];

      this.rot = 0;
      this.pulseTimer = 0;
      this.attackTimer = 0;
      this.telegraphedAttack = null; // { x, y, radius, timer, maxTimer }
      this.tentacles = [];
      for (let i = 0; i < 8; i++) {
        this.tentacles.push({ angle: (i / 8) * Math.PI * 2, length: 120, phaseOffset: i * 0.7 });
      }
    }

    update(dt, drone) {
      if (this.isPurified) return;

      this.rot += dt * 0.45;
      this.pulseTimer += dt * 2.2;
      this.attackTimer += dt;

      // Telegraphed Attack (Red circle danger zone like Fortnite/Roblox bosses)
      if (this.telegraphedAttack) {
        this.telegraphedAttack.timer -= dt;
        if (this.telegraphedAttack.timer <= 0) {
          // Detonate sludge meteor!
          const tx = this.telegraphedAttack.x;
          const ty = this.telegraphedAttack.y;
          const rad = this.telegraphedAttack.radius;

          if (drone.pos.dist(new V2(tx, ty)) < rad) {
            drone.energy = Math.max(0, drone.energy - 35);
            drone.vel.add(drone.pos.clone().sub(new V2(tx, ty)).normalize().scale(300));
            window.Engine.camera.shake(12, 0.4);
            window.Engine.floatingTexts.spawn(drone.pos.x, drone.pos.y, '💥 SLUDGE METEOR HIT!', '#ff1744', 18);
          }

          window.Engine.particles.emit(tx, ty, 30, {
            color: '#76ff03',
            speed: 180,
            size: 8,
            life: 1.0,
            type: 'bubble'
          });
          this.telegraphedAttack = null;
        }
      }

      const attackCooldown = this.phase === 3 ? 3.0 : this.phase === 2 ? 4.0 : 5.5;
      if (this.attackTimer >= attackCooldown) {
        this.attackTimer = 0;
        this.fireSludgeWave(drone);
      }
    }

    fireSludgeWave(drone) {
      if (window.AudioEngine) window.AudioEngine.play('boss_roar');
      window.Engine.camera.shake(10, 0.5);

      // Target player position with danger zone
      this.telegraphedAttack = {
        x: drone.pos.x + (Math.random() - 0.5) * 40,
        y: drone.pos.y + (Math.random() - 0.5) * 40,
        radius: 95,
        timer: 1.5,
        maxTimer: 1.5
      };

      window.Engine.particles.emit(this.pos.x, this.pos.y, 1, {
        color: '#bf360c',
        size: 340,
        life: 1.0,
        type: 'ring'
      });
    }

    installFilterOnVent(ventIndex) {
      if (this.outflows[ventIndex] && !this.outflows[ventIndex].isFiltered) {
        this.outflows[ventIndex].isFiltered = true;
        this.filtersInstalled++;
        this.phase = this.filtersInstalled + 1;

        if (window.AudioEngine) window.AudioEngine.play('filter_success');
        window.Engine.camera.shake(14, 0.6);
        window.Engine.particles.emitPurifySparkles(this.pos.x, this.pos.y, 160);

        if (this.filtersInstalled >= 3) {
          this.purify();
        }
        return true;
      }
      return false;
    }

    purify() {
      this.isPurified = true;
      if (window.AudioEngine) window.AudioEngine.play('achievement');
      if (window.SaveSystem) {
        window.SaveSystem.unlockAchievement('sludge_purifier');
        window.SaveSystem.addXP(1000);
      }
    }

    getVentWorldPos(vent) {
      const angle = this.rot + vent.angleOffset;
      return new V2(
        this.pos.x + Math.cos(angle) * vent.dist,
        this.pos.y + Math.sin(angle) * vent.dist
      );
    }

    draw(ctx) {
      // Draw Telegraphed Danger Zone on water
      if (this.telegraphedAttack) {
        const ta = this.telegraphedAttack;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 23, 68, 0.25)';
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ta.x, ta.y, ta.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pulsing countdown ring
        const pct = 1 - (ta.timer / ta.maxTimer);
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ta.x, ta.y, ta.radius * pct, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ff1744';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ SLUDGE IMPACT ZONE', ta.x, ta.y - ta.radius - 8);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);

      if (this.isPurified) {
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.ellipse(0, 0, 75, 48, this.rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ RESTORED ECO-GUARDIAN ✨', 0, -65);
        ctx.restore();
        return;
      }

      // Tentacles
      for (let i = 0; i < this.tentacles.length; i++) {
        const t = this.tentacles[i];
        const tentAngle = this.rot + t.angle + Math.sin(this.pulseTimer + t.phaseOffset) * 0.35;
        const tx = Math.cos(tentAngle) * t.length;
        const ty = Math.sin(tentAngle) * t.length;

        ctx.strokeStyle = '#4e342e';
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(tx * 0.5 + Math.sin(this.pulseTimer) * 20, ty * 0.5, tx, ty);
        ctx.stroke();
      }

      // Main Pulsating Body
      const pulseScale = 1.0 + Math.sin(this.pulseTimer) * 0.09;
      const coreGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.radius * pulseScale);
      coreGrad.addColorStop(0, '#2e1c11');
      coreGrad.addColorStop(0.6, '#4e342e');
      coreGrad.addColorStop(0.9, '#76ff03');
      coreGrad.addColorStop(1, 'rgba(118, 255, 3, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      // Glowing malevolent toxic eyes
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(-24, -16, 9, 0, Math.PI * 2);
      ctx.arc(24, -16, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Vent Nodes
      for (let i = 0; i < this.outflows.length; i++) {
        const vent = this.outflows[i];
        const vPos = this.getVentWorldPos(vent);

        ctx.save();
        ctx.translate(vPos.x, vPos.y);

        ctx.fillStyle = vent.isFiltered ? '#00e676' : '#bf360c';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vent.isFiltered ? 'CLEAN' : `VENT ${i + 1}`, 0, 0);

        ctx.restore();
      }
    }
  }

  // --- 10. HYDRO-SLIPSTREAM BOOST GATE ---
  class SlipstreamGate {
    constructor(x, y, angle = 0) {
      this.pos = new V2(x, y);
      this.angle = angle;
      this.radius = 42;
      this.pulse = Math.random() * Math.PI * 2;
      this.cooldown = 0;
    }

    update(dt, drone) {
      this.pulse += dt * 4.5;
      if (this.cooldown > 0) this.cooldown -= dt;

      if (drone && this.cooldown <= 0 && drone.pos.dist(this.pos) < this.radius + 16) {
        this.cooldown = 1.8;
        const boostVec = V2.fromAngle(this.angle, 480);
        drone.vel.copy(boostVec);
        drone.angle = this.angle;
        drone.dashTimer = 0.45;
        drone.energy = Math.min(drone.maxEnergy, drone.energy + 20);

        if (window.AudioEngine) window.AudioEngine.play('powerup');
        window.Engine.camera.shake(6, 0.25);
        window.Engine.floatingTexts.spawn(this.pos.x, this.pos.y - 25, '🌊 SLIPSTREAM TURBO! +20⚡', '#00f2fe', 17);
        window.Engine.particles.emit(this.pos.x, this.pos.y, 20, {
          color: '#00f2fe',
          speed: 200,
          angle: this.angle,
          spread: 0.5,
          size: 4,
          life: 0.5,
          type: 'spark'
        });

        if (window.SaveSystem && window.SaveSystem.data.achievements.slipstream_rider) {
          const ach = window.SaveSystem.data.achievements.slipstream_rider;
          ach.progress = (ach.progress || 0) + 1;
          if (ach.progress >= 5) window.SaveSystem.unlockAchievement('slipstream_rider');
          window.SaveSystem.save();
        }
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(this.angle);

      const glow = 0.55 + Math.sin(this.pulse) * 0.25;
      ctx.strokeStyle = `rgba(0, 242, 254, ${glow})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 38, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Chevrons pointing in boost direction
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) {
        const ox = i * 9 + ((this.pulse * 6) % 9);
        ctx.beginPath();
        ctx.moveTo(ox - 6, -14);
        ctx.lineTo(ox + 4, 0);
        ctx.lineTo(ox - 6, 14);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  window.Entities = {
    DEBRIS_TYPES,
    AquaDrone,
    SlipstreamGate,
    SupplyCrate,
    Debris,
    RecyclingBuoy,
    ToxicBarrel,
    DrainagePipe,
    Fish,
    CoralReef,
    OilSlick,
    PolluterBoat,
    SludgeLeviathan
  };
})(window);
