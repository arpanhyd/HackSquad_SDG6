/**
 * AquaGuardian: Deep Clean - Level Scenarios & Mission Briefings
 * Interactive Cadet Academy Tutorial, Mission Briefings for all levels,
 * Supply drops, active bounties, combo announcer streaks, XP scaling,
 * Day/Night cycles, dynamic water tinting, and Raid Boss phases.
 * Built for C://hacks 2026
 */

(function(window) {
  'use strict';

  const V2 = window.Engine.Vector2;
  const Ent = window.Entities;

  const LEVEL_BRIEFINGS = {
    0: {
      levelId: 0,
      title: "Cadet Training Academy",
      subtitle: "Autonomous Drone Flight & Environmental Remediation Simulator",
      icon: "🎓",
      wqiTarget: "Tutorial",
      objectives: [
        "Master steering, acceleration, and reverse navigation with [W][A][S][D] / Arrows",
        "Engage high-velocity Hydro-Boost [SPACE]",
        "Perform a sharp Hydro-Drift to unlock a Mini-Turbo Boost",
        "Scoop floating plastic bottles into your cargo hold",
        "Dock at the offshore yellow Recycling Buoy to cash in Eco-Credits",
        "Deploy an acoustic Sonar Radar Ping [Q] to scan underwater",
        "Hold [E] to tractor-neutralize a leaking toxic chemical barrel",
        "Approach a drainage sewer pipe and install a bio-filter [E Alignment Mini-game]"
      ],
      intel: "Welcome to the AquaGuardian Ecological Operations Training Center. Over 80% of global wastewater is currently discharged into rivers and seas without any treatment (UN SDG 6). Before deploying to real river basins, you must certify on all drone flight controls and environmental remediation equipment.",
      tips: "Turning sharply at top speed starts a hydro-drift with water sparks. Holding the drift for 1.2s charges your thrusters for a blazing Mini-Turbo!"
    },
    1: {
      levelId: 1,
      title: "Mission 1: Crystal River",
      subtitle: "Freshwater Riverine Basin — Plastic Accumulation Threat",
      icon: "🏞️",
      wqiTarget: "80%",
      objectives: [
        "Raise the Water Quality Index (WQI) from 45% to at least 80%",
        "Scoop floating bottles, polythene bags, and ghost fishing nets",
        "Offload plastics at offshore Recycling Buoys for Eco-Credits & XP",
        "Smash floating Mystery Supply Crates for bonus power-ups",
        "Complete active mission bounties for massive bonus XP"
      ],
      intel: "Crystal River is a vital freshwater drinking source for downstream communities. Illegal municipal dumping has choked the river with floating PET plastics and microplastics that deoxygenate the water and poison fish.",
      tips: "Keep an eye on your solar battery in the HUD. Your panels recharge automatically under direct daylight, but lose power during night cycles!"
    },
    2: {
      levelId: 2,
      title: "Mission 2: Urban Canal",
      subtitle: "Industrial Waterway — Chemical Leach & Storm Sewer Runoff",
      icon: "🏭",
      wqiTarget: "80%",
      objectives: [
        "Raise the Water Quality Index (WQI) to 80% to restore the canal",
        "Neutralize all 4 leaking toxic chemical barrels [HOLD E]",
        "Install molecular bio-filters on all 4 storm drainage pipes [E mini-game]",
        "Evade moving cargo barges and avoid oil slicks",
        "Recycle collected plastic waste at solar buoys"
      ],
      intel: "Heavy urban runoff has deposited corroded chemical barrels into the municipal canal bed. Four untreated storm drainage pipes are continuously spewing raw industrial effluent, collapsing local water quality.",
      tips: "Hold [E] within range of yellow hazard barrels to maintain the containment ring. When clamping bio-filters on drainage pipes, stop the marker inside the green zone!"
    },
    3: {
      levelId: 3,
      title: "Mission 3: Ocean Bay",
      subtitle: "Coastal Coral Lagoon — Endangered Reefs & Wildlife Sanctuary",
      icon: "🪸",
      wqiTarget: "85%",
      objectives: [
        "Purify the marine bay to reach 85% Water Quality Index (WQI)",
        "Protect endangered tropical fish and fragile coral reefs (Maintain Eco-Karma ≥ 80%)",
        "Disperse thick oil slicks using the Recycler Burst shockwave [R]",
        "Collect toxic microplastics and ocean ghost nets",
        "Smash floating supply drops for invincibility shields and speed overcharge"
      ],
      intel: "This delicate coral lagoon houses endangered damselfish, sea turtles, and coral formations. Reckless high-speed collisions with coral or driving through fish schools at boost speed will severely penalize your Eco-Karma and WQI.",
      tips: "Press [R] to deploy the Recycler Burst shockwave to instantly disperse viscous oil slicks. Avoid ramming into coral outcroppings!"
    },
    4: {
      levelId: 4,
      title: "Boss Raid: The Sludge Leviathan",
      subtitle: "Industrial Harbor Estuary — Catastrophic Wastewater Monster",
      icon: "👾",
      wqiTarget: "90%",
      objectives: [
        "Defeat the Sludge Leviathan and clean the harbor estuary",
        "Dodge telegraphed red danger zones and toxic sludge meteors",
        "Approach all 3 industrial sewage outflow nodes",
        "Install master bio-filter clamps on all 3 vents [E mini-game]",
        "Purify the leviathan into the legendary Azure Water Spirit!"
      ],
      intel: "Decades of untreated municipal runoff and industrial chemical dumping have congealed into the Sludge Leviathan. It discharges explosive toxic sludge waves. The only solution is to clamp industrial molecular bio-filters onto its 3 exhaust outflow tentacles.",
      tips: "Watch the water surface for pulsing red danger circles and drift out of the impact zone! Approach each vent when the boss pauses between attacks."
    }
  };

  class BaseLevel {
    constructor(id, title, desc, bounds) {
      this.id = id;
      this.title = title;
      this.desc = desc;
      this.bounds = bounds;

      this.drone = null;
      this.buoys = [];
      this.debrisList = [];
      this.barrels = [];
      this.pipes = [];
      this.fish = [];
      this.coralReefs = [];
      this.oilSlicks = [];
      this.polluters = [];
      this.crates = [];
      this.slipstreams = [];
      this.boss = null;

      // Stats
      this.wqi = 35;
      this.targetWQI = 80;
      this.ecoKarma = 100;
      this.timer = 0;
      // 3 minutes for level 1 (180s), decreasing by 10 seconds each level (L1: 180s, L2: 170s, L3: 160s, L4: 150s)
      this.timeLimit = Math.max(90, 190 - (this.id === 0 ? 0 : this.id) * 10);
      this.timeOfDay = 0.25;
      this.dayCycleSpeed = 0.015;
      this.sunIntensity = 1.0;

      // Stats for Report Card
      this.debrisCollectedCount = 0;
      this.pipesFilteredCount = 0;
      this.barrelsNeutralizedCount = 0;
      this.wildlifeHarmed = 0;
      this.litersCleaned = 0;
      this.score = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.crateSpawnTimer = 0;

      this.bounties = [
        { id: 'b_debris', title: 'Plastic Purge: Scoop 15 Items', target: 15, current: 0, completed: false, xp: 200, credits: 50 },
        { id: 'b_combo', title: 'Flow State: Reach 6x Combo', target: 6, current: 0, completed: false, xp: 250, credits: 60 },
        { id: 'b_filter', title: 'Infrastructure: Filter / Neutralize 2 Hazards', target: 2, current: 0, completed: false, xp: 300, credits: 75 }
      ];

      this.isCompleted = false;
      this.isFailed = false;
    }

    init() {}

    checkBounty(id, inc = 1) {
      const b = this.bounties.find(item => item.id === id);
      if (b && !b.completed) {
        b.current += inc;
        if (b.current >= b.target) {
          b.completed = true;
          window.SaveSystem.addXP(b.xp);
          window.SaveSystem.addCredits(b.credits);
          if (window.AudioEngine) window.AudioEngine.play('achievement');
          window.Engine.camera.shake(6, 0.3);
          window.Engine.floatingTexts.spawn(this.drone.pos.x, this.drone.pos.y - 45, `🎯 BOUNTY COMPLETED! +${b.xp}XP +${b.credits}C`, '#ffd600', 18);
          if (window.UI) window.UI.showNotification(`🎯 Challenge Complete: ${b.title}!`);
        }
      }
    }

    update(dt) {
      this.timer += dt;

      // Show an SDG 6 water fact & gameplay tip every 30 seconds
      if (!this.sdgTipTimer) this.sdgTipTimer = 0;
      if (typeof this.sdgTipIndex !== 'number') this.sdgTipIndex = 0;
      this.sdgTipTimer += dt;
      if (this.sdgTipTimer >= 30.0) {
        this.sdgTipTimer = 0;
        const tips = [
          "💧 SDG 6 Tip: Over 80% of global wastewater flows into rivers untreated — clamp bio-filters on sewer pipes [E] to stop it!",
          "💧 SDG 6 Tip: Leaking chemical drums poison groundwater aquifers. Hover near yellow barrels to neutralize them!",
          "💧 SDG 6 Tip: Plastics break down into toxic microplastics. Scoop trash and dock at yellow Recycling Buoys to raise WQI!",
          "💧 SDG 6 Tip: Dissolved Oxygen (DO) above 6.5 mg/L is needed for healthy fish. Cleaning the water restores oxygen levels!",
          "💧 SDG 6 Tip: High Turbidity (cloudiness) blocks sunlight from aquatic plants. Filtering pipes clears the water!",
          "💧 SDG 6 Tip: Healthy freshwater has a neutral pH around 7.0. Acidic chemical leaks drop pH and harm coral reefs!",
          "💧 SDG 6 Tip: Press [R] or Scroll Down near dark oil slicks to disperse them with your Recycler Burst!",
          "💧 SDG 6 Tip: Press [G] to deploy Helper Mini-Drones that automatically laser-collect nearby plastic waste!"
        ];
        const tip = tips[this.sdgTipIndex % tips.length];
        this.sdgTipIndex++;
        if (window.UI) window.UI.showNotification(tip);
        window.Engine.floatingTexts.spawn(this.drone.pos.x, this.drone.pos.y - 55, "💧 SDG 6 ECO-TIP RECEIVED!", '#00f2fe', 15, 2.5);
      }

      this.timeOfDay = (this.timeOfDay + this.dayCycleSpeed * dt) % 1.0;
      if (this.timeOfDay >= 0.2 && this.timeOfDay <= 0.8) {
        this.sunIntensity = Math.sin(((this.timeOfDay - 0.2) / 0.6) * Math.PI);
      } else {
        this.sunIntensity = 0;
      }

      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.combo = 0;
        }
      }

      this.crateSpawnTimer += dt;
      if (this.crateSpawnTimer >= 22.0 && this.crates.length < 3) {
        this.crateSpawnTimer = 0;
        const cx = this.bounds.minX + 150 + Math.random() * (this.bounds.maxX - this.bounds.minX - 300);
        const cy = this.bounds.minY + 150 + Math.random() * (this.bounds.maxY - this.bounds.minY - 300);
        this.crates.push(new Ent.SupplyCrate(cx, cy));
        window.Engine.floatingTexts.spawn(cx, cy, '📦 SUPPLY DROP INCOMING!', '#ffd600', 16);
        if (window.UI) window.UI.showNotification("📦 Mystery Eco-Supply Drop detected on radar!");
      }

      if (this.drone) {
        this.drone.update(dt, this.sunIntensity, this.bounds);
      }

      this.buoys.forEach(b => b.update(dt));
      this.slipstreams.forEach(s => s.update(dt, this.drone));

      for (let i = this.crates.length - 1; i >= 0; i--) {
        const crate = this.crates[i];
        crate.update(dt);
        if (!crate.isOpened && this.drone.pos.dist(crate.pos) < crate.radius + 20) {
          crate.open(this.drone);
          this.crates.splice(i, 1);
        }
      }

      for (let i = this.debrisList.length - 1; i >= 0; i--) {
        const d = this.debrisList[i];
        d.update(dt, this.drone);

        if (this.drone.sonarActive && this.drone.pos.dist(d.pos) <= this.drone.sonarWaveRadius) {
          d.isHighlighted = true;
        }

        let helperCollected = false;
        if (this.drone.miniDrones && this.drone.miniDrones.length > 0) {
          for (let m = 0; m < this.drone.miniDrones.length; m++) {
            const md = this.drone.miniDrones[m];
            if (md.pos.dist(d.pos) < this.drone.swarmRange * 0.65) {
              md.laserTarget = d.pos.clone();
              md.laserTimer = 0.18;
              helperCollected = true;
              break;
            }
          }
        }

        if (this.drone.pos.dist(d.pos) < this.drone.netWidth || helperCollected) {
          if (this.drone.collectDebris(d)) {
            this.debrisList.splice(i, 1);
            this.debrisCollectedCount++;
            this.combo++;
            this.comboTimer = 3.8;
            this.litersCleaned += 2500;

            this.checkBounty('b_debris', 1);
            if (this.combo >= 6) this.checkBounty('b_combo', this.combo);

            if (this.combo >= 10 && window.SaveSystem) {
              window.SaveSystem.unlockAchievement('combo_god');
            }

            if (this.combo === 2) window.UI.showComboBanner("DOUBLE CLEAN! ⚡");
            else if (this.combo === 4) window.UI.showComboBanner("TRIPLE SPREE! 🔥");
            else if (this.combo === 6) window.UI.showComboBanner("MEGA COMBO! 🌪️");
            else if (this.combo === 8) window.UI.showComboBanner("RAMPAGE! 💥");
            else if (this.combo >= 10) window.UI.showComboBanner("UNSTOPPABLE ECO-GOD! 👑");

            const isDouble = this.drone.activePowerup === 'DOUBLE';
            const multiplier = isDouble ? 2 : 1;
            const comboBonus = Math.floor(this.combo * 2);
            const totalCredits = (d.config.credits + comboBonus) * multiplier;
            const totalXP = (d.config.xp + comboBonus * 2) * multiplier;

            this.score += totalCredits * 15;
            window.SaveSystem.addCredits(totalCredits);
            window.SaveSystem.addXP(totalXP);

            window.Engine.particles.emit(d.pos.x, d.pos.y, 8, { color: d.config.color, speed: 80, size: 3.5 });
            window.Engine.floatingTexts.spawn(d.pos.x, d.pos.y, `+${totalCredits}C +${totalXP}XP (${this.combo}x)`, '#00f2fe', 16);

            if (window.AudioEngine) {
              window.AudioEngine.play('collect', { combo: this.combo });
            }
          }
        }
      }

      this.buoys.forEach(b => {
        const dist = this.drone.pos.dist(b.pos);
        if (dist <= b.dockRadius && this.drone.cargo.length > 0) {
          const items = this.drone.emptyCargo();
          let earned = 0;
          let wqiGain = 0;
          let xpEarned = 0;

          items.forEach(item => {
            earned += item.config.credits;
            wqiGain += item.config.wqiGain;
            xpEarned += item.config.xp;
          });

          this.wqi = Math.min(100, this.wqi + wqiGain);
          window.SaveSystem.addCredits(earned);
          window.SaveSystem.addXP(xpEarned);
          this.score += earned * 20;

          window.Engine.floatingTexts.spawn(b.pos.x, b.pos.y - 20, `RECYCLED! +${earned}C +${xpEarned}XP`, '#00e676', 20);
          window.Engine.particles.emitPurifySparkles(b.pos.x, b.pos.y, 90);

          if (window.AudioEngine) window.AudioEngine.play('deposit');
        }
      });

      let activeTarget = null;
      for (let i = 0; i < this.barrels.length; i++) {
        const barrel = this.barrels[i];
        barrel.update(dt);

        if (!barrel.isNeutralized) {
          // Very gentle WQI drain so gameplay feels relaxed
          this.wqi = Math.max(0, this.wqi - 0.022 * dt);

          const neutRange = this.drone.neutralizeRange || 125;
          const neutSpeed = this.drone.neutralizeSpeed || 0.85;
          const dist = this.drone.pos.dist(barrel.pos);
          if (dist < neutRange) {
            // Auto-neutralize when hovering near barrel in Cursor Mode OR holding E
            if (window.Input.isDown('interact') || window.Input.isCursorMode()) {
              activeTarget = barrel;
              this.drone.neutralizeProgress += dt * neutSpeed;
              if (window.AudioEngine && Math.random() < 0.2) {
                window.AudioEngine.play('neutralize_hum');
              }

              if (this.drone.neutralizeProgress >= 1.0) {
                barrel.isNeutralized = true;
                this.barrelsNeutralizedCount++;
                this.wqi = Math.min(100, this.wqi + 8);
                this.litersCleaned += 12000;
                this.score += 800;

                this.checkBounty('b_filter', 1);
                window.SaveSystem.addCredits(80);
                window.SaveSystem.addXP(150);

                window.Engine.floatingTexts.spawn(barrel.pos.x, barrel.pos.y, 'NEUTRALIZED! +80C +150XP', '#00e676', 18);
                window.Engine.particles.emitPurifySparkles(barrel.pos.x, barrel.pos.y, 70);
                if (window.AudioEngine) window.AudioEngine.play('neutralize_done');
                this.drone.neutralizeProgress = 0;
              }
            } else {
              this.drone.neutralizeProgress = Math.max(0, this.drone.neutralizeProgress - dt * 1.5);
            }
          }
        }
      }
      this.drone.neutralizingTarget = activeTarget;

      this.pipes.forEach(pipe => {
        pipe.update(dt);
        if (!pipe.isFiltered) {
          this.wqi = Math.max(0, this.wqi - 0.032 * dt);
          const dist = this.drone.pos.dist(pipe.pos);
          if (dist < 95 && window.Input.isJustPressed('interact')) {
            window.UI.startFilterMinigame((success) => {
              if (success) {
                pipe.isFiltered = true;
                this.pipesFilteredCount++;
                this.wqi = Math.min(100, this.wqi + 15);
                this.litersCleaned += 35000;
                this.score += 1200;

                this.checkBounty('b_filter', 1);
                window.SaveSystem.addCredits(120);
                window.SaveSystem.addXP(250);

                window.Engine.camera.shake(9, 0.45);
                window.Engine.floatingTexts.spawn(pipe.pos.x, pipe.pos.y, 'BIO-FILTER ACTIVE! +120C +250XP', '#00e676', 20);
                window.Engine.particles.emitPurifySparkles(pipe.pos.x, pipe.pos.y, 100);
                if (window.AudioEngine) window.AudioEngine.play('filter_success');
              } else {
                this.drone.energy = Math.max(0, this.drone.energy - 20);
                window.Engine.floatingTexts.spawn(pipe.pos.x, pipe.pos.y, 'MISALIGNED!', '#ff3d71', 16);
                if (window.AudioEngine) window.AudioEngine.play('filter_fail');
              }
            });
          }
        }
      });

      for (let i = 0; i < this.fish.length; i++) {
        const f = this.fish[i];
        f.flock(this.fish, this.drone, dt);
        f.update(dt, this.bounds);

        if (this.drone.pos.dist(f.pos) < 22 && this.drone.isBoosting && !this.drone.safeForFish && this.drone.activePowerup !== 'SHIELD') {
          const protect = this.drone.wildlifeProtection || 0;
          if (this.drone.collisionCooldown <= 0 && protect < 1.0) {
            this.wildlifeHarmed++;
            this.ecoKarma = Math.max(0, this.ecoKarma - 6 * (1 - protect));
            this.wqi = Math.max(0, this.wqi - 2 * (1 - protect));
            this.drone.collisionCooldown = 0.6;
            window.Engine.floatingTexts.spawn(f.pos.x, f.pos.y, 'Wildlife Disturbed! -Eco-Karma', '#ff3d71', 14);
            if (window.AudioEngine) window.AudioEngine.play('coral_bump');
          }
        }
      }

      for (let i = 0; i < this.coralReefs.length; i++) {
        const coral = this.coralReefs[i];
        const dist = this.drone.pos.dist(coral.pos);
        if (dist < coral.radius + 14) {
          const pushVec = this.drone.pos.clone().sub(coral.pos).normalize().scale(coral.radius + 15);
          this.drone.pos.x = coral.pos.x + pushVec.x;
          this.drone.pos.y = coral.pos.y + pushVec.y;
          this.drone.vel.scale(-0.4);

          const protect = this.drone.wildlifeProtection || 0;
          if (this.drone.activePowerup === 'SHIELD' || protect >= 1.0) {
            window.Engine.floatingTexts.spawn(coral.pos.x, coral.pos.y, 'BUMPER PROTECTED!', '#00f2fe', 15);
          } else if (this.drone.collisionCooldown <= 0) {
            this.wildlifeHarmed++;
            this.ecoKarma = Math.max(0, this.ecoKarma - 8 * (1 - protect));
            this.drone.collisionCooldown = 0.5;
            window.Engine.camera.shake(6, 0.3);
            window.Engine.floatingTexts.spawn(coral.pos.x, coral.pos.y, 'Coral Damaged! -Eco-Karma', '#ff3d71', 14);
            if (window.AudioEngine) window.AudioEngine.play('coral_bump');
          }
        }
      }

      this.oilSlicks.forEach(oil => {
        oil.update(dt);
        if (this.drone.pos.dist(oil.pos) < oil.radius && this.drone.activePowerup !== 'SHIELD') {
          this.drone.vel.scale(0.85);
          this.drone.energy = Math.max(0, this.drone.energy - 8 * dt);
        }
      });

      this.polluters.forEach(p => {
        p.update(dt, (px, py) => {
          const debTypes = ['BOTTLE', 'BAG', 'RINGS', 'NET'];
          const picked = debTypes[Math.floor(Math.random() * debTypes.length)];
          this.debrisList.push(new Ent.Debris(px, py, picked));
          window.Engine.floatingTexts.spawn(px, py, 'Trash Dumped!', '#ff3d71', 13);
        });
      });

      if (this.boss) {
        this.boss.update(dt, this.drone);
        for (let i = 0; i < this.boss.outflows.length; i++) {
          const vent = this.boss.outflows[i];
          if (!vent.isFiltered) {
            const vPos = this.boss.getVentWorldPos(vent);
            if (this.drone.pos.dist(vPos) < 70 && window.Input.isJustPressed('interact')) {
              window.UI.startFilterMinigame((success) => {
                if (success) {
                  this.boss.installFilterOnVent(i);
                  this.wqi = Math.min(100, this.wqi + 25);
                  this.litersCleaned += 100000;
                  this.score += 3000;
                  window.SaveSystem.addCredits(300);
                  window.SaveSystem.addXP(500);
                  window.Engine.floatingTexts.spawn(vPos.x, vPos.y, 'VENT PURIFIED! +300C +500XP', '#00e676', 22);
                } else {
                  this.drone.energy = Math.max(0, this.drone.energy - 30);
                  window.Engine.camera.shake(10, 0.4);
                }
              });
            }
          }
        }
      }

      if (window.AudioEngine) {
        window.AudioEngine.setWQI(this.wqi, !!this.boss);
      }

      this.checkCompletion();
    }

    checkCompletion() {
      if (this.wqi <= 0 && !this.isFailed) {
        this.isFailed = true;
        this.triggerFailure("The aquatic ecosystem collapsed from toxic sludge.");
        return;
      }

      // Check time limit (skip tutorial level 0)
      if (this.id > 0 && this.timer >= this.timeLimit && !this.isCompleted && !this.isFailed) {
        this.isFailed = true;
        this.triggerFailure(`Time limit exceeded (${Math.floor(this.timeLimit/60)}m ${this.timeLimit%60}s)! Water Quality Index target not reached in time.`);
        return;
      }

      if (this.id === 4) {
        if (this.boss && this.boss.isPurified && !this.isCompleted) {
          this.isCompleted = true;
          this.onWin();
        }
      } else {
        if (this.wqi >= this.targetWQI && !this.isCompleted) {
          this.isCompleted = true;
          this.onWin();
        }
      }
    }

    triggerFailure(reason) {
      const res = window.SaveSystem ? window.SaveSystem.recordLevelFailure(this.id) : { penalty: 90, failCount: 1, newLevel: 1 };
      if (window.AudioEngine) window.AudioEngine.play('filter_fail');
      window.MainGame.triggerGameOver(
        `${reason} — ⚠️ Penalty (Attempt #${res.failCount}): -${res.penalty} Coins removed & Level decreased to LVL ${res.newLevel}!`
      );
    }

    onWin() {
      let stars = 1;
      if (this.wqi >= 88 && this.ecoKarma >= 80) stars = 2;
      if (this.wqi >= 94 && this.ecoKarma >= 95) stars = 3;

      if (this.id === 1 && this.timer <= 75) {
        window.SaveSystem.unlockAchievement('speed_cleaner');
      }
      if (this.id === 3 && this.wildlifeHarmed === 0) {
        window.SaveSystem.unlockAchievement('zero_casualties');
      }
      if (this.id === 3 && this.ecoKarma >= 100) {
        window.SaveSystem.unlockAchievement('coral_protector');
      }

      const missionBonus = window.SaveSystem.recordLevelCompletion(this.id, this.score, stars, this.wqi, this.timer);
      window.SaveSystem.addXP(300 + stars * 100);
      if (window.UI) {
        window.UI.showNotification(`🏆 Mission Complete! Earned +${missionBonus} Bonus Coins!`);
      }

      setTimeout(() => {
        window.MainGame.showReportCard({
          levelId: this.id,
          title: this.title,
          score: this.score,
          stars: stars,
          wqi: Math.round(this.wqi),
          litersCleaned: this.litersCleaned,
          debrisCount: this.debrisCollectedCount,
          pipesCount: this.pipesFilteredCount,
          barrelsCount: this.barrelsNeutralizedCount,
          ecoKarma: Math.round(this.ecoKarma),
          timeSec: Math.round(this.timer)
        });
      }, 1000);
    }

    draw(ctx) {
      this.drawWater(ctx);

      this.slipstreams.forEach(s => s.draw(ctx));
      this.oilSlicks.forEach(oil => oil.draw(ctx));
      this.coralReefs.forEach(c => c.draw(ctx, this.wqi));
      this.fish.forEach(f => f.draw(ctx));
      this.pipes.forEach(p => p.draw(ctx, this.drone.pos.dist(p.pos) < 95));

      this.barrels.forEach(b => {
        const isTargeted = this.drone.neutralizingTarget === b;
        b.draw(ctx, isTargeted, this.drone.neutralizeProgress);
      });

      this.buoys.forEach(b => b.draw(ctx, this.drone.pos.dist(b.pos) <= b.dockRadius));
      this.crates.forEach(c => c.draw(ctx));
      this.debrisList.forEach(d => d.draw(ctx));
      this.polluters.forEach(p => p.draw(ctx));

      if (this.boss) this.boss.draw(ctx);
      if (this.drone) this.drone.draw(ctx);

      window.Engine.particles.draw(ctx);
      window.Engine.floatingTexts.draw(ctx);

      this.drawLightingOverlay(ctx);
    }

    drawWater(ctx) {
      let r, g, b;
      const t = this.wqi / 100;

      if (t < 0.5) {
        const sub = t / 0.5;
        r = Math.floor(62 * (1 - sub));
        g = Math.floor(39 * (1 - sub) + 105 * sub);
        b = Math.floor(35 * (1 - sub) + 92 * sub);
      } else {
        const sub = (t - 0.5) / 0.5;
        r = 0;
        g = Math.floor(105 * (1 - sub) + 180 * sub);
        b = Math.floor(92 * (1 - sub) + 230 * sub);
      }

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(this.bounds.minX, this.bounds.minY, this.bounds.maxX - this.bounds.minX, this.bounds.maxY - this.bounds.minY);

      const time = performance.now() * 0.001;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + t * 0.08})`;
      ctx.lineWidth = 1.5;

      const step = 85;
      for (let y = this.bounds.minY; y < this.bounds.maxY; y += step) {
        ctx.beginPath();
        for (let x = this.bounds.minX; x < this.bounds.maxX; x += 40) {
          const waveY = y + Math.sin(x * 0.015 + time * 1.5) * 6 + Math.cos(y * 0.02 + time) * 4;
          if (x === this.bounds.minX) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    drawLightingOverlay(ctx) {
      let nightAlpha = 0;
      if (this.timeOfDay < 0.2 || this.timeOfDay > 0.8) {
        nightAlpha = 0.65;
      } else if (this.timeOfDay < 0.35) {
        nightAlpha = (0.35 - this.timeOfDay) / 0.15 * 0.65;
      } else if (this.timeOfDay > 0.65) {
        nightAlpha = (this.timeOfDay - 0.65) / 0.15 * 0.65;
      }

      if (nightAlpha > 0.02) {
        ctx.save();
        ctx.fillStyle = `rgba(3, 10, 28, ${nightAlpha})`;
        ctx.fillRect(this.bounds.minX, this.bounds.minY, this.bounds.maxX - this.bounds.minX, this.bounds.maxY - this.bounds.minY);
        ctx.restore();
      }
    }
  }

  // --- LEVEL 0: GUIDED INTERACTIVE TUTORIAL CADET ACADEMY ---
  class Level0_Tutorial extends BaseLevel {
    constructor() {
      super(0, "Cadet Training Academy", "Step-by-step interactive flight simulator certifying you on steering, boost, drifting, debris collection, buoys, and hazardous waste filtration.", { minX: 0, minY: 0, maxX: 1800, maxY: 1400 });
      this.wqi = 60;
      this.targetWQI = 100;

      this.step = 1;
      this.stepTimer = 0;
      this.maxSteps = 6;
      this.stepCompleted = false;
    }

    init() {
      this.drone = new Ent.AquaDrone(900, 1000);
      this.buoys.push(new Ent.RecyclingBuoy(900, 650));
      this.slipstreams.push(new Ent.SlipstreamGate(1150, 850, -Math.PI / 2));

      // Spawns starter bottle
      this.debrisList.push(new Ent.Debris(900, 850, 'BOTTLE'));
      this.debrisList.push(new Ent.Debris(860, 820, 'BAG'));

      // Starter Barrel and Pipe
      this.barrels.push(new Ent.ToxicBarrel(600, 650));
      this.pipes.push(new Ent.DrainagePipe(200, 650, 0));

      this.updateTutorialUI();
    }

    updateTutorialUI() {
      const messages = [
        "STEP 1/6: Move your CURSOR anywhere on screen (or use WASD) — the Spaceship follows your cursor directly!",
        "STEP 2/6: Hold [LEFT-CLICK] or [SPACE] to fire the Hydro-Boost thrusters! ([RIGHT-CLICK] to Hydro-Dash!)",
        "STEP 3/6: Glide over the floating plastic bottles to scoop them into your cargo hold!",
        "STEP 4/6: Fly inside the glowing yellow Recycling Buoy to cash in your cargo for Eco-Credits!",
        "STEP 5/6: Press [Q] or [SCROLL UP] to emit an acoustic Sonar Ping radar pulse!",
        "STEP 6/6: Hover near the yellow hazard drum (or hold [E]) to tractor-neutralize the toxic leak!"
      ];

      if (window.UI) {
        window.UI.showTutorialObjective(messages[this.step - 1], this.step, this.maxSteps);
      }
    }

    advanceStep() {
      this.step++;
      if (window.AudioEngine) window.AudioEngine.play('achievement');
      window.Engine.camera.shake(5, 0.25);
      window.Engine.floatingTexts.spawn(this.drone.pos.x, this.drone.pos.y - 35, `✅ STEP COMPLETE!`, '#00e676', 18);

      if (this.step > this.maxSteps) {
        this.completeAcademy();
      } else {
        this.updateTutorialUI();
      }
    }

    completeAcademy() {
      if (this.isCompleted) return;
      this.isCompleted = true;

      window.SaveSystem.addCredits(100);
      window.SaveSystem.addXP(300);
      window.SaveSystem.unlockNextLevel(1);

      window.UI.showNotification("🎓 CADET CERTIFIED! +100 Credits & +300 XP awarded!");
      setTimeout(() => {
        window.MainGame.showBriefing(1);
      }, 1500);
    }

    update(dt) {
      super.update(dt);
      this.stepTimer += dt;

      // Evaluation of steps
      if (this.step === 1) {
        // Did player move?
        if (this.drone.vel.length() > 60 && this.stepTimer > 2.0) {
          this.stepTimer = 0;
          this.advanceStep();
        }
      } else if (this.step === 2) {
        // Did player boost?
        if (this.drone.isBoosting) {
          this.stepTimer = 0;
          this.advanceStep();
        }
      } else if (this.step === 3) {
        // Did player pick up debris?
        if (this.debrisCollectedCount >= 1) {
          this.stepTimer = 0;
          this.advanceStep();
        }
      } else if (this.step === 4) {
        // Did player empty cargo at buoy?
        if (this.drone.cargo.length === 0 && this.debrisCollectedCount >= 1 && this.score > 0) {
          this.stepTimer = 0;
          this.advanceStep();
        }
      } else if (this.step === 5) {
        // Did player fire sonar?
        if (this.drone.sonarActive) {
          this.stepTimer = 0;
          this.advanceStep();
        }
      } else if (this.step === 6) {
        // Did player neutralize barrel?
        if (this.barrelsNeutralizedCount >= 1) {
          this.stepTimer = 0;
          this.advanceStep();
        }
      }
    }
  }

  // --- LEVEL 1: CRYSTAL RIVER ---
  class Level1_CrystalRiver extends BaseLevel {
    constructor() {
      super(1, "Crystal River", "Scoop plastic debris, unlock Supply Drops, and maintain high-speed drift streaks to restore the river.", { minX: 0, minY: 0, maxX: 2200, maxY: 1800 });
      this.wqi = 45;
      this.targetWQI = 80;
    }

    init() {
      this.drone = new Ent.AquaDrone(1100, 1500);
      this.buoys.push(new Ent.RecyclingBuoy(1100, 1300));
      this.buoys.push(new Ent.RecyclingBuoy(1700, 500));
      this.slipstreams.push(new Ent.SlipstreamGate(1100, 1050, -Math.PI / 4));
      this.slipstreams.push(new Ent.SlipstreamGate(1450, 800, -Math.PI / 4));
      this.slipstreams.push(new Ent.SlipstreamGate(750, 900, Math.PI / 3));

      this.crates.push(new Ent.SupplyCrate(900, 1200));
      this.crates.push(new Ent.SupplyCrate(1500, 700));

      // Neutralizer barrels in Level 1
      this.barrels.push(new Ent.ToxicBarrel(750, 1150));
      this.barrels.push(new Ent.ToxicBarrel(1350, 950));
      this.barrels.push(new Ent.ToxicBarrel(1050, 650));

      const debrisTypes = ['BOTTLE', 'BAG', 'RINGS', 'NET', 'MICROPLASTIC'];
      for (let i = 0; i < 40; i++) {
        const x = 200 + Math.random() * 1800;
        const y = 200 + Math.random() * 1400;
        const type = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
        this.debrisList.push(new Ent.Debris(x, y, type));
      }

      for (let i = 0; i < 15; i++) {
        this.fish.push(new Ent.Fish(800 + Math.random() * 200, 700 + Math.random() * 200));
      }
    }
  }

  // --- LEVEL 2: URBAN CANAL ---
  class Level2_UrbanCanal extends BaseLevel {
    constructor() {
      super(2, "Urban Canal", "Neutralize hazardous chemical barrels, filter municipal sewer pipes, and dodge moving barges.", { minX: 0, minY: 0, maxX: 2600, maxY: 2000 });
      this.wqi = 30;
      this.targetWQI = 80;
    }

    init() {
      this.drone = new Ent.AquaDrone(400, 1600);
      this.buoys.push(new Ent.RecyclingBuoy(500, 1400));
      this.buoys.push(new Ent.RecyclingBuoy(2100, 600));
      this.slipstreams.push(new Ent.SlipstreamGate(900, 1200, -Math.PI / 6));
      this.slipstreams.push(new Ent.SlipstreamGate(1600, 850, -Math.PI / 4));
      this.slipstreams.push(new Ent.SlipstreamGate(1500, 1450, Math.PI));

      this.crates.push(new Ent.SupplyCrate(1200, 1100));

      this.pipes.push(new Ent.DrainagePipe(200, 600, 0));
      this.pipes.push(new Ent.DrainagePipe(200, 1100, 0));
      this.pipes.push(new Ent.DrainagePipe(2400, 800, Math.PI));
      this.pipes.push(new Ent.DrainagePipe(2400, 1400, Math.PI));

      this.barrels.push(new Ent.ToxicBarrel(800, 500));
      this.barrels.push(new Ent.ToxicBarrel(1300, 900));
      this.barrels.push(new Ent.ToxicBarrel(1700, 1300));
      this.barrels.push(new Ent.ToxicBarrel(1100, 1600));
      this.barrels.push(new Ent.ToxicBarrel(500, 900));
      this.barrels.push(new Ent.ToxicBarrel(2000, 500));
      this.barrels.push(new Ent.ToxicBarrel(1500, 1700));

      const debrisTypes = ['BOTTLE', 'BAG', 'RINGS', 'NET', 'MICROPLASTIC'];
      for (let i = 0; i < 45; i++) {
        const x = 300 + Math.random() * 2000;
        const y = 300 + Math.random() * 1400;
        const type = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
        this.debrisList.push(new Ent.Debris(x, y, type));
      }

      this.polluters.push(new Ent.PolluterBoat(600, 400, [
        new V2(600, 400), new V2(2000, 400), new V2(2000, 1500), new V2(600, 1500)
      ]));
    }
  }

  // --- LEVEL 3: OCEAN BAY ---
  class Level3_OceanBay extends BaseLevel {
    constructor() {
      super(3, "Ocean Bay", "Disperse oil slicks, protect fragile coral and fish flocks, and prepare for the ultimate boss encounter.", { minX: 0, minY: 0, maxX: 3000, maxY: 2400 });
      this.wqi = 35;
      this.targetWQI = 85;
    }

    init() {
      this.drone = new Ent.AquaDrone(1500, 2000);
      this.buoys.push(new Ent.RecyclingBuoy(1500, 1750));
      this.slipstreams.push(new Ent.SlipstreamGate(1500, 1450, -Math.PI / 2));
      this.slipstreams.push(new Ent.SlipstreamGate(1000, 1000, -Math.PI / 4));
      this.slipstreams.push(new Ent.SlipstreamGate(2000, 1150, -Math.PI * 0.75));
      this.buoys.push(new Ent.RecyclingBuoy(600, 600));
      this.buoys.push(new Ent.RecyclingBuoy(2400, 800));

      this.crates.push(new Ent.SupplyCrate(1500, 1100));
      this.crates.push(new Ent.SupplyCrate(800, 500));

      this.coralReefs.push(new Ent.CoralReef(1100, 1200, 45));
      this.coralReefs.push(new Ent.CoralReef(1300, 1300, 50));
      this.coralReefs.push(new Ent.CoralReef(1900, 900, 55));
      this.coralReefs.push(new Ent.CoralReef(700, 1400, 40));
      this.coralReefs.push(new Ent.CoralReef(2200, 1500, 45));

      this.oilSlicks.push(new Ent.OilSlick(900, 800, 75));
      this.oilSlicks.push(new Ent.OilSlick(1600, 600, 90));
      this.oilSlicks.push(new Ent.OilSlick(2100, 1100, 80));
      this.oilSlicks.push(new Ent.OilSlick(1200, 1700, 65));

      for (let i = 0; i < 35; i++) {
        this.fish.push(new Ent.Fish(1000 + Math.random() * 800, 800 + Math.random() * 800));
      }

      this.barrels.push(new Ent.ToxicBarrel(800, 1000));
      this.barrels.push(new Ent.ToxicBarrel(2200, 700));
      this.barrels.push(new Ent.ToxicBarrel(1400, 1200));
      this.barrels.push(new Ent.ToxicBarrel(1800, 1800));
      this.barrels.push(new Ent.ToxicBarrel(600, 2000));

      const debrisTypes = ['MICROPLASTIC', 'NET', 'BOTTLE', 'BAG'];
      for (let i = 0; i < 50; i++) {
        const x = 300 + Math.random() * 2400;
        const y = 300 + Math.random() * 1800;
        const type = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
        this.debrisList.push(new Ent.Debris(x, y, type));
      }
    }
  }

  // --- LEVEL 4: BOSS SLUDGE LEVIATHAN ---
  class Level4_BossLeviathan extends BaseLevel {
    constructor() {
      super(4, "The Sludge Leviathan", "Epic Boss Raid: Dodge telegraphed toxic meteors and clamp bio-filters onto all 3 industrial outflows!", { minX: 0, minY: 0, maxX: 2600, maxY: 2600 });
      this.wqi = 20;
      this.targetWQI = 90;
    }

    init() {
      this.drone = new Ent.AquaDrone(1300, 2200);
      this.buoys.push(new Ent.RecyclingBuoy(1300, 1950));
      this.slipstreams.push(new Ent.SlipstreamGate(900, 1500, -Math.PI / 3));
      this.slipstreams.push(new Ent.SlipstreamGate(1700, 1500, -Math.PI * 0.65));
      this.slipstreams.push(new Ent.SlipstreamGate(1300, 650, Math.PI));
      this.crates.push(new Ent.SupplyCrate(1100, 1700));
      this.crates.push(new Ent.SupplyCrate(1500, 1700));

      this.boss = new Ent.SludgeLeviathan(1300, 1100);

      // Extra neutralizer barrels around the boss arena
      this.barrels.push(new Ent.ToxicBarrel(850, 1350));
      this.barrels.push(new Ent.ToxicBarrel(1750, 1350));
      this.barrels.push(new Ent.ToxicBarrel(850, 850));
      this.barrels.push(new Ent.ToxicBarrel(1750, 850));

      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 280 + Math.random() * 600;
        const x = 1300 + Math.cos(angle) * dist;
        const y = 1100 + Math.sin(angle) * dist;
        this.debrisList.push(new Ent.Debris(x, y, 'MICROPLASTIC'));
      }
    }
  }

  class LevelManager {
    constructor() {
      this.currentLevelInstance = null;
      this.briefings = LEVEL_BRIEFINGS;
    }

    loadLevel(levelId) {
      switch (levelId) {
        case 0: this.currentLevelInstance = new Level0_Tutorial(); break;
        case 1: this.currentLevelInstance = new Level1_CrystalRiver(); break;
        case 2: this.currentLevelInstance = new Level2_UrbanCanal(); break;
        case 3: this.currentLevelInstance = new Level3_OceanBay(); break;
        case 4: this.currentLevelInstance = new Level4_BossLeviathan(); break;
        default: this.currentLevelInstance = new Level1_CrystalRiver(); break;
      }
      this.currentLevelInstance.init();
      return this.currentLevelInstance;
    }
  }

  window.LevelManager = new LevelManager();
})(window);
