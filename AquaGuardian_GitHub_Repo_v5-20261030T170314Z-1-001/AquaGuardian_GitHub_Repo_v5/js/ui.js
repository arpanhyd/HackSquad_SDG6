/**
 * AquaGuardian: Deep Clean - UI Controller & HUD Manager (Overcharged)
 * Mandatory Quiz Gatekeeping, Fortnite/Roblox Locker with Drone Skins,
 * Level/XP Bar, Active Bounties Tracker, Combo Announcers, and Juice.
 * Built for C://hacks 2026
 */

(function(window) {
  'use strict';

  const WATER_QUIZ_POOL = [
    {
      question: "According to the UN, what percentage of global wastewater is discharged into rivers and seas untreated?",
      options: ["Over 80%", "Around 25%", "Less than 10%", "Exactly 50%"],
      correct: 0,
      fact: "Fact: Globally, more than 80% of all wastewater flows back into ecosystems without being treated, spreading disease and destroying aquatic life."
    },
    {
      question: "What is the primary objective of UN Sustainable Development Goal 6 (SDG 6)?",
      options: ["Ensure clean water and sanitation for all by 2030", "Build deep ocean oil rigs", "Desalinate all polar ice caps", "Eliminate domestic water meters"],
      correct: 0,
      fact: "Fact: SDG 6 aims to ensure availability and sustainable management of water and sanitation for everyone worldwide."
    },
    {
      question: "Which of the following is the single largest source of primary microplastics in our oceans?",
      options: ["Synthetic textiles / laundry fibers", "Discarded glass bottles", "Wooden driftwood", "Natural cotton fabrics"],
      correct: 0,
      fact: "Fact: Synthetic textiles account for roughly 35% of all primary microplastics entering marine environments through home laundry runoff."
    },
    {
      question: "How does installing bio-filters in municipal storm drainage pipes protect river ecosystems?",
      options: ["Traps heavy metals, microplastics & organic waste", "Increases water boiling temperature", "Changes water into carbonated soda", "Dries up the river completely"],
      correct: 0,
      fact: "Fact: Bio-filters physically trap suspended debris and use natural biological films to neutralize toxic chemical runoff."
    },
    {
      question: "Why do 'ghost fishing nets' pose such a severe hazard in marine bays?",
      options: ["They trap marine life indefinitely and shed microplastics", "They sink to form natural rocks", "They accelerate coral growth", "They convert salt water into drinking water"],
      correct: 0,
      fact: "Fact: Abandoned ghost nets continue catching fish, turtles, and dolphins for decades while slowly breaking into microplastics."
    },
    {
      question: "What is the critical danger of toxic chemical barrels leaking into municipal canals?",
      options: ["They leach heavy metals and carcinogens that poison drinking aquifers", "They turn the water into lemonade", "They make boats travel 500% faster", "They create artificial clouds"],
      correct: 0,
      fact: "Fact: Chemical runoff leaches heavy metals like cadmium and lead that bioaccumulate in marine life and poison drinking water tables."
    }
  ];

  class UIManager {
    constructor() {
      this.minimapCanvas = null;
      this.minimapCtx = null;

      // Filter mini-game state
      this.minigameActive = false;
      this.minigameCallback = null;
      this.minigameCursor = 0;
      this.minigameSpeed = 1.35;
      this.minigameDir = 1;
      this.minigameTargetStart = 0.4;
      this.minigameTargetWidth = 0.22;

      this.currentQuiz = null;
      this.quizPassed = false;
      this.currentReportStats = null;

      this._cacheElements();
      this._bindEvents();
    }

    _cacheElements() {
      this.minimapCanvas = document.getElementById('minimapCanvas');
      if (this.minimapCanvas) {
        this.minimapCtx = this.minimapCanvas.getContext('2d');
      }

      this.wqiFill = document.getElementById('wqiFill');
      this.wqiText = document.getElementById('wqiText');
      this.telemetryDO = document.getElementById('telemetryDO');
      this.telemetryTurb = document.getElementById('telemetryTurb');
      this.telemetryPH = document.getElementById('telemetryPH');
      this.energyFill = document.getElementById('energyFill');
      this.energyText = document.getElementById('energyText');
      this.cargoFill = document.getElementById('cargoFill');
      this.cargoText = document.getElementById('cargoText');
      this.creditsText = document.getElementById('creditsText');
      this.timerText = document.getElementById('timerText');
      this.solarStatus = document.getElementById('solarStatus');
      this.karmaText = document.getElementById('karmaText');

      // Player Level & XP elements
      this.playerLvlText = document.getElementById('playerLvlText');
      this.playerXpFill = document.getElementById('playerXpFill');
      this.playerXpText = document.getElementById('playerXpText');

      // Bounties HUD
      this.hudBounties = document.getElementById('hudBounties');

      // Mini-game elements
      this.minigameContainer = document.getElementById('minigame-container');
      this.filterCursor = document.getElementById('filterCursor');
      this.filterSweetSpot = document.getElementById('filterSweetSpot');

      // Modals
      this.modalTitle = document.getElementById('modalTitle');
      this.modalPause = document.getElementById('modalPause');
      this.modalSettings = document.getElementById('modalSettings');
      this.modalControls = document.getElementById('modalControls');
      this.modalHowToPlay = document.getElementById('modalHowToPlay');
      this.modalAchievements = document.getElementById('modalAchievements');
      this.modalCredits = document.getElementById('modalCredits');
      this.modalShop = document.getElementById('modalShop');
      this.modalLocker = document.getElementById('modalLocker');
      this.modalReport = document.getElementById('modalReport');
      this.modalGameOver = document.getElementById('modalGameOver');
      this.modalVictory = document.getElementById('modalVictory');
      this.modalLevelUp = document.getElementById('levelUpBanner');
      this.modalBriefing = document.getElementById('modalBriefing');

      // Briefing Modal Elements
      this.briefingIcon = document.getElementById('briefingIcon');
      this.briefingTitle = document.getElementById('briefingTitle');
      this.briefingSubtitle = document.getElementById('briefingSubtitle');
      this.briefingWqiBadge = document.getElementById('briefingWqiBadge');
      this.briefingObjectives = document.getElementById('briefingObjectives');
      this.briefingIntel = document.getElementById('briefingIntel');
      this.briefingTips = document.getElementById('briefingTips');
      this.btnLaunchMission = document.getElementById('btnLaunchMission');
      this.tutorialBanner = document.getElementById('tutorialBanner');

      // Skill Cooldown overlays
      this.cdSonar = document.getElementById('cdSonar');
      this.cdRecycler = document.getElementById('cdRecycler');
      
      this.cdSwarm = document.getElementById('cdSwarm');
    }

    _bindEvents() {
      window.addEventListener('keydown', (e) => {
        if (this.minigameActive && (e.code === 'Space' || e.code === 'KeyE')) {
          e.preventDefault();
          this.submitMinigame();
        }
      });

      if (this.minigameContainer) {
        this.minigameContainer.addEventListener('pointerdown', (e) => {
          if (this.minigameActive) {
            e.preventDefault();
            this.submitMinigame();
          }
        });
      }

      // Settings Listeners
      const settingDiff = document.getElementById('settingDifficulty');
      const settingSfx = document.getElementById('settingSfx');
      const settingMusic = document.getElementById('settingMusic');
      const settingMute = document.getElementById('settingMute');
      const settingCb = document.getElementById('settingColorblind');
      const settingMotion = document.getElementById('settingMotion');
      const settingTouch = document.getElementById('settingTouch');
      const settingControlMode = document.getElementById('settingControlMode');
      const settingSpeed = document.getElementById('settingSpeed');

      if (settingDiff) {
        settingDiff.addEventListener('change', (e) => {
          window.SaveSystem.data.settings.difficulty = e.target.value;
          window.SaveSystem.save();
        });
      }
      if (settingSfx) {
        settingSfx.addEventListener('input', (e) => {
          window.SaveSystem.data.settings.sfxVolume = parseFloat(e.target.value);
          window.SaveSystem.save();
          if (window.AudioEngine) window.AudioEngine.applySettings();
        });
      }
      if (settingMusic) {
        settingMusic.addEventListener('input', (e) => {
          window.SaveSystem.data.settings.musicVolume = parseFloat(e.target.value);
          window.SaveSystem.save();
          if (window.AudioEngine) window.AudioEngine.applySettings();
        });
      }
      if (settingMute) {
        settingMute.addEventListener('change', (e) => {
          window.SaveSystem.data.settings.muted = e.target.checked;
          window.SaveSystem.save();
          if (window.AudioEngine) window.AudioEngine.applySettings();
        });
      }
      if (settingCb) {
        settingCb.addEventListener('change', (e) => {
          window.SaveSystem.data.settings.colorblind = e.target.value;
          window.SaveSystem.save();
          this.applyColorblindFilter(e.target.value);
        });
      }
      if (settingMotion) {
        settingMotion.addEventListener('change', (e) => {
          window.SaveSystem.data.settings.reduceMotion = e.target.checked;
          window.SaveSystem.save();
        });
      }
      if (settingTouch) {
        settingTouch.addEventListener('change', (e) => {
          window.SaveSystem.data.settings.touchControls = e.target.value;
          window.SaveSystem.save();
          if (window.Input) window.Input.updateTouchVisibility();
        });
      }
      if (settingControlMode) {
        settingControlMode.addEventListener('change', (e) => {
          window.SaveSystem.data.settings.controlMode = e.target.value;
          window.SaveSystem.save();
        });
      }
      if (settingSpeed) {
        settingSpeed.addEventListener('change', (e) => {
          window.SaveSystem.data.settings.gameSpeed = parseFloat(e.target.value);
          window.SaveSystem.save();
        });
      }
    }

    applyColorblindFilter(mode) {
      const el = document.getElementById('colorblind-filter');
      if (!el) return;
      el.className = '';
      if (mode !== 'none') {
        el.className = `cb-${mode}`;
      }
    }

    updateHUD(level) {
      if (!level || !level.drone) return;

      const d = level.drone;

      // Authentic NSF-WQI (National Sanitation Foundation Water Quality Index)
      const wqiVal = Math.min(100, Math.max(0, level.wqi));
      const roundedWQI = Math.round(wqiVal);

      let wqiCategory = 'Fair';
      let wqiColor = '#ffd600';
      if (roundedWQI >= 91) {
        wqiCategory = 'Excellent';
        wqiColor = '#00f2fe';
      } else if (roundedWQI >= 71) {
        wqiCategory = 'Good (SDG 6)';
        wqiColor = '#00e676';
      } else if (roundedWQI >= 51) {
        wqiCategory = 'Medium';
        wqiColor = '#ffd600';
      } else if (roundedWQI >= 26) {
        wqiCategory = 'Poor';
        wqiColor = '#ff9100';
      } else {
        wqiCategory = 'Toxic Sludge';
        wqiColor = '#ff1744';
      }

      if (this.wqiFill) this.wqiFill.style.width = `${wqiVal}%`;
      if (this.wqiText) {
        this.wqiText.innerHTML = `${roundedWQI} / 100 <span style="font-size:11px; color:${wqiColor};">[${wqiCategory}]</span>`;
      }

      // Real physicochemical telemetry
      if (this.telemetryDO) {
        const doVal = (1.8 + (wqiVal / 100) * 7.4).toFixed(1);
        this.telemetryDO.textContent = `${doVal} mg/L`;
      }
      if (this.telemetryTurb) {
        const turbVal = Math.max(2, Math.round(85 - (wqiVal / 100) * 81));
        this.telemetryTurb.textContent = `${turbVal} NTU`;
      }
      if (this.telemetryPH) {
        const phVal = (6.0 + (wqiVal / 100) * 1.4).toFixed(1);
        this.telemetryPH.textContent = `${phVal}`;
      }

      // Energy
      if (this.energyFill) {
        const pct = (d.energy / d.maxEnergy) * 100;
        this.energyFill.style.width = `${pct}%`;
      }
      if (this.energyText) this.energyText.textContent = `${Math.round(d.energy)} / ${d.maxEnergy}`;

      // Cargo Hold
      if (this.cargoFill) {
        const pct = (d.cargo.length / d.holdCapacity) * 100;
        this.cargoFill.style.width = `${pct}%`;
      }
      if (this.cargoText) this.cargoText.textContent = `${d.cargo.length} / ${d.holdCapacity}`;

      // Eco-Credits & Player Level
      if (window.SaveSystem) {
        if (this.creditsText) this.creditsText.textContent = window.SaveSystem.data.ecoCredits;
        if (this.playerLvlText) this.playerLvlText.textContent = `LVL ${window.SaveSystem.data.playerLevel}`;
        if (this.playerXpFill) {
          const xpPct = (window.SaveSystem.data.playerXP / window.SaveSystem.data.xpToNext) * 100;
          this.playerXpFill.style.width = `${Math.min(100, xpPct)}%`;
        }
        if (this.playerXpText) {
          this.playerXpText.textContent = `${window.SaveSystem.data.playerXP} / ${window.SaveSystem.data.xpToNext} XP`;
        }
      }

      // Countdown Timer (3:00 on Level 1, decreasing by 10s each level)
      if (this.timerText) {
        if (level.id === 0) {
          const m = Math.floor(level.timer / 60);
          const s = Math.floor(level.timer % 60);
          this.timerText.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          this.timerText.style.color = 'var(--text-main)';
        } else {
          const remaining = Math.max(0, (level.timeLimit || 180) - level.timer);
          const m = Math.floor(remaining / 60);
          const s = Math.floor(remaining % 60);
          this.timerText.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          this.timerText.style.color = remaining <= 30 ? '#ff3d71' : (remaining <= 60 ? '#ffd600' : 'var(--text-main)');
        }
      }

      // Daylight
      if (this.solarStatus) {
        if (d.activePowerup === 'TURBO') {
          this.solarStatus.innerHTML = `⚡ OVERCHARGE TURBO (${Math.ceil(d.powerupTimer)}s)`;
          this.solarStatus.style.borderColor = '#ff007f';
        } else if (level.sunIntensity > 0.6) {
          this.solarStatus.innerHTML = `☀️ Direct Sun (${Math.round(level.sunIntensity * 100)}%)`;
          this.solarStatus.style.borderColor = 'rgba(255, 235, 59, 0.4)';
        } else if (level.sunIntensity > 0.1) {
          this.solarStatus.innerHTML = `🌅 Twilight (${Math.round(level.sunIntensity * 100)}%)`;
          this.solarStatus.style.borderColor = 'rgba(255, 152, 0, 0.4)';
        } else {
          this.solarStatus.innerHTML = `🌙 Night Mode`;
          this.solarStatus.style.borderColor = 'rgba(33, 150, 243, 0.4)';
        }
      }

      // Eco-Karma
      if (this.karmaText) this.karmaText.textContent = `${Math.round(level.ecoKarma)}%`;

      // Skill Cooldowns
      if (this.cdSonar) {
        const maxCd = 3.5;
        const pct = Math.max(0, (d.sonarCooldown / maxCd) * 100);
        this.cdSonar.style.height = `${pct}%`;
      }
      if (this.cdRecycler) {
        const maxCd = 5.0;
        const pct = Math.max(0, (d.recyclerCooldown / maxCd) * 100);
        this.cdRecycler.style.height = `${pct}%`;
      }

      if (this.cdSwarm) {
        const maxCd = 14.0;
        const pct = Math.max(0, (d.swarmCooldown / maxCd) * 100);
        this.cdSwarm.style.height = `${pct}%`;
      }

      // Bounties HUD
      if (this.hudBounties && level.bounties) {
        let html = '';
        level.bounties.forEach(b => {
          const done = b.completed;
          html += `
            <div style="font-size:11px;margin-bottom:3px;color:${done ? '#00e676' : 'var(--text-main)'};">
              ${done ? '✅' : '🎯'} ${b.title} (${Math.min(b.target, b.current)}/${b.target})
            </div>
          `;
        });
        this.hudBounties.innerHTML = html;
      }

      // Minimap
      this.drawMinimap(level);

      // Alignment minigame
      if (this.minigameActive) {
        this.updateMinigame(1 / 60);
      }
    }

    drawMinimap(level) {
      if (!this.minimapCtx || !level || !level.drone) return;
      const ctx = this.minimapCtx;
      const w = this.minimapCanvas.width;
      const h = this.minimapCanvas.height;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(5, 20, 35, 0.85)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, (w / 2) * 0.4, 0, Math.PI * 2);
      ctx.arc(w / 2, h / 2, (w / 2) * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      const b = level.bounds;
      const worldW = b.maxX - b.minX;
      const worldH = b.maxY - b.minY;

      const toMapX = (wx) => ((wx - b.minX) / worldW) * (w - 20) + 10;
      const toMapY = (wy) => ((wy - b.minY) / worldH) * (h - 20) + 10;

      // Supply Drops (Flashing Gold Dots)
      ctx.fillStyle = '#ffd600';
      level.crates.forEach(c => {
        if (!c.isOpened) {
          ctx.beginPath();
          ctx.arc(toMapX(c.pos.x), toMapY(c.pos.y), 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Slipstream Gates
      if (level.slipstreams) {
        ctx.fillStyle = '#00f2fe';
        level.slipstreams.forEach(s => {
          ctx.beginPath();
          ctx.arc(toMapX(s.pos.x), toMapY(s.pos.y), 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Recycling Buoys
      ctx.fillStyle = '#00e676';
      level.buoys.forEach(buoy => {
        ctx.beginPath();
        ctx.arc(toMapX(buoy.pos.x), toMapY(buoy.pos.y), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Pipes
      level.pipes.forEach(pipe => {
        ctx.fillStyle = pipe.isFiltered ? '#00e676' : '#ff9100';
        ctx.beginPath();
        ctx.arc(toMapX(pipe.pos.x), toMapY(pipe.pos.y), 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Barrels
      level.barrels.forEach(barrel => {
        if (!barrel.isNeutralized) {
          ctx.fillStyle = '#ff1744';
          ctx.beginPath();
          ctx.arc(toMapX(barrel.pos.x), toMapY(barrel.pos.y), 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Debris dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      level.debrisList.forEach(deb => {
        ctx.fillRect(toMapX(deb.pos.x) - 1, toMapY(deb.pos.y) - 1, 2, 2);
      });

      // Boss
      if (level.boss) {
        ctx.fillStyle = level.boss.isPurified ? '#00e5ff' : '#d500f9';
        ctx.beginPath();
        ctx.arc(toMapX(level.boss.pos.x), toMapY(level.boss.pos.y), 6.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Drone
      const px = toMapX(level.drone.pos.x);
      const py = toMapY(level.drone.pos.y);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(level.drone.angle);

      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // --- Filter Mini-Game ---
    startFilterMinigame(callback) {
      this.minigameActive = true;
      this.minigameCallback = callback;
      this.minigameCursor = 0;
      this.minigameDir = 1;

      this.minigameTargetStart = 0.3 + Math.random() * 0.35;
      this.minigameTargetWidth = 0.22;

      if (this.filterSweetSpot) {
        this.filterSweetSpot.style.left = `${this.minigameTargetStart * 100}%`;
        this.filterSweetSpot.style.width = `${this.minigameTargetWidth * 100}%`;
      }
      if (this.minigameContainer) {
        this.minigameContainer.style.display = 'flex';
      }
    }

    updateMinigame(dt) {
      this.minigameCursor += this.minigameDir * this.minigameSpeed * dt;
      if (this.minigameCursor >= 1.0) {
        this.minigameCursor = 1.0;
        this.minigameDir = -1;
      } else if (this.minigameCursor <= 0.0) {
        this.minigameCursor = 0.0;
        this.minigameDir = 1;
      }

      if (this.filterCursor) {
        this.filterCursor.style.left = `${this.minigameCursor * 100}%`;
      }
    }

    submitMinigame() {
      if (!this.minigameActive) return;
      this.minigameActive = false;
      if (this.minigameContainer) {
        this.minigameContainer.style.display = 'none';
      }

      const success =
        this.minigameCursor >= this.minigameTargetStart &&
        this.minigameCursor <= this.minigameTargetStart + this.minigameTargetWidth;

      if (this.minigameCallback) {
        this.minigameCallback(success);
      }
    }

    // --- Modal Navigation ---
    hideAllModals() {
      const modals = document.querySelectorAll('.modal-overlay');
      modals.forEach(m => m.classList.remove('active'));
    }

    showTitleScreen() {
      this.hideAllModals();
      this.updateLevelSelectGrid();
      if (this.modalTitle) this.modalTitle.classList.add('active');
    }

    showPauseMenu() {
      this.hideAllModals();
      if (this.modalPause) this.modalPause.classList.add('active');
    }

    showSettings() {
      this.populateSettingsForm();
      if (this.modalSettings) this.modalSettings.classList.add('active');
    }

    showControls() {
      if (this.modalControls) this.modalControls.classList.add('active');
    }

    showHowToPlay() {
      if (this.modalHowToPlay) this.modalHowToPlay.classList.add('active');
    }

    showAchievements() {
      this.populateAchievementsList();
      if (this.modalAchievements) this.modalAchievements.classList.add('active');
    }

    showCredits() {
      if (this.modalCredits) this.modalCredits.classList.add('active');
    }

    showShop() {
      this.populateShopCards();
      if (this.modalShop) this.modalShop.classList.add('active');
    }

    showLocker() {
      this.populateLockerSkins();
      if (this.modalLocker) this.modalLocker.classList.add('active');
    }

    showReportCard(stats) {
      this.hideAllModals();
      this.currentReportStats = stats;
      this.populateReportCard(stats);
      if (this.modalReport) this.modalReport.classList.add('active');
    }

    showGameOver(reason) {
      this.hideAllModals();
      const reasonEl = document.getElementById('gameOverReason');
      if (reasonEl) reasonEl.textContent = reason || "The aquatic ecosystem suffered catastrophic pollution.";
      if (this.modalGameOver) this.modalGameOver.classList.add('active');
    }

    showVictory() {
      this.hideAllModals();
      if (this.modalVictory) this.modalVictory.classList.add('active');
    }

    showLevelUpCelebration(lvl) {
      const banner = document.getElementById('levelUpBanner');
      const num = document.getElementById('levelUpNum');
      if (num) num.textContent = lvl;
      if (banner) {
        banner.style.display = 'flex';
        setTimeout(() => { banner.style.display = 'none'; }, 3500);
      }
    }

    showNotification(msg) {
      const banner = document.getElementById('notificationBanner');
      if (!banner) return;
      banner.textContent = msg;
      banner.style.display = 'block';
      setTimeout(() => { banner.style.display = 'none'; }, 3200);
    }

    showComboBanner(text) {
      const badge = document.getElementById('comboBanner');
      if (!badge) return;
      badge.textContent = text;
      badge.style.display = 'block';
      setTimeout(() => { badge.style.display = 'none'; }, 1800);
    }

    showMissionBriefing(levelId, onLaunch) {
      this.hideAllModals();
      const b = window.LevelManager.briefings[levelId];
      if (!b) {
        if (onLaunch) onLaunch();
        return;
      }

      if (this.briefingIcon) this.briefingIcon.textContent = b.icon || '🌊';
      if (this.briefingTitle) this.briefingTitle.textContent = b.title;
      if (this.briefingSubtitle) this.briefingSubtitle.textContent = b.subtitle;
      if (this.briefingWqiBadge) this.briefingWqiBadge.textContent = `TARGET: ${b.wqiTarget} WQI`;
      if (this.briefingIntel) this.briefingIntel.textContent = b.intel;
      if (this.briefingTips) this.briefingTips.textContent = b.tips;

      if (this.briefingObjectives) {
        this.briefingObjectives.innerHTML = '';
        b.objectives.forEach(obj => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-main);';
          row.innerHTML = `<span style="color:#00e676; font-size:14px;">✔</span> <span>${obj}</span>`;
          this.briefingObjectives.appendChild(row);
        });
      }

      if (this.btnLaunchMission) {
        this.btnLaunchMission.onclick = () => {
          this.hideAllModals();
          if (window.AudioEngine) window.AudioEngine.play('click');
          if (onLaunch) onLaunch();
        };
      }

      if (this.modalBriefing) {
        this.modalBriefing.classList.add('active');
      }
    }

    showTutorialObjective(text, step, total) {
      if (!this.tutorialBanner) return;
      this.tutorialBanner.innerHTML = `
        <div style="font-size:11px; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">
          🎓 CADET TRAINING PHASE ${step}/${total}
        </div>
        <div style="font-size:14px; font-weight:800; color:#fff;">
          ${text}
        </div>
      `;
      this.tutorialBanner.style.display = 'block';
    }

    hideTutorialObjective() {
      if (this.tutorialBanner) {
        this.tutorialBanner.style.display = 'none';
      }
    }

    showHoldFullAlert() {
      this.showNotification("⚠️ HOLD FULL! Offload plastics at a Recycling Buoy.");
    }

    // --- Content Population ---
    updateLevelSelectGrid() {
      const container = document.getElementById('levelSelectGrid');
      if (!container || !window.SaveSystem) return;
      container.innerHTML = '';

      const levels = [
        { id: 0, name: "🎓 Cadet Academy", desc: "Interactive Flight & Tech Training", isTutorial: true },
        { id: 1, name: "1. Crystal River", desc: "Freshwater Riverine Basin" },
        { id: 2, name: "2. Urban Canal", desc: "Leaking Pipes & Toxic Barrels" },
        { id: 3, name: "3. Ocean Bay", desc: "Reefs, Boids Wildlife & Slicks" },
        { id: 4, name: "4. Sludge Leviathan", desc: "Final Boss Purifying Encounter" }
      ];

      const unlocked = window.SaveSystem.data.unlockedLevel;
      levels.forEach(lvl => {
        const isLevelUnlocked = lvl.id === 0 || lvl.id <= unlocked;
        const card = document.createElement('div');
        card.className = `level-card ${isLevelUnlocked ? '' : 'locked'}`;
        const stat = window.SaveSystem.data.levelStats[lvl.id] || { stars: 0, bestScore: 0 };
        const starsText = lvl.id === 0 ? 'TRAINING' : ('⭐'.repeat(stat.stars) || '☆☆☆');

        card.innerHTML = `
          <h4>${lvl.name}</h4>
          <p style="font-size:12px;color:var(--text-muted);">${lvl.desc}</p>
          <div style="font-size:13px;color:#ffd600;margin-top:6px;font-weight:bold;">${starsText}</div>
          <div style="font-size:11px;color:var(--text-muted);">${lvl.id === 0 ? 'Practice Mode' : `Best: ${stat.bestScore} pts`}</div>
        `;

        if (isLevelUnlocked) {
          card.onclick = () => {
            if (window.AudioEngine) window.AudioEngine.play('click');
            window.MainGame.showBriefing(lvl.id);
          };
        }
        container.appendChild(card);
      });
    }

    populateLockerSkins() {
      const container = document.getElementById('lockerGrid');
      if (!container || !window.SaveSystem) return;
      container.innerHTML = '';

      const skins = [
        { id: 'default', name: 'Eco-Cyan Scout', desc: 'Standard agile marine restoration catamaran.', unlockHint: 'Default Skin' },
        { id: 'neon_cyber', name: 'Cyberpunk Neon', desc: 'Electrified hot-pink hull with neon pulse laser trail.', unlockHint: 'Unlock at Player Level 3 or 300 Credits', cost: 300 },
        { id: 'solar_gold', name: '24K Solar Gold', desc: 'Polished pure gold alloy reflecting intense sunlight.', unlockHint: 'Unlock at Player Level 5 or 600 Credits', cost: 600 },
        { id: 'toxic_slayer', name: 'Toxic Hazard Slayer', desc: 'Reinforced acid-resistant carbon armor with green fire.', unlockHint: 'Unlock for 500 Credits', cost: 500 },
        { id: 'cosmic_void', name: 'Cosmic Star Void', desc: 'Celestial dark matter hull with stardust comet wake.', unlockHint: 'Unlock at Player Level 8 or 1000 Credits', cost: 1000 }
      ];

      const unlockedSkins = window.SaveSystem.data.unlockedSkins;
      const equipped = window.SaveSystem.data.equippedSkin;

      skins.forEach(s => {
        const isUnlocked = unlockedSkins.includes(s.id);
        const isEquipped = equipped === s.id;

        const card = document.createElement('div');
        card.className = `level-card ${isUnlocked ? '' : 'locked'}`;
        card.style.border = isEquipped ? '2px solid var(--primary)' : '1px solid var(--card-border)';

        card.innerHTML = `
          <div style="font-size:24px;margin-bottom:6px;">${s.id === 'default' ? '🚤' : s.id === 'neon_cyber' ? '⚡' : s.id === 'solar_gold' ? '👑' : s.id === 'toxic_slayer' ? '☣️' : '🌌'}</div>
          <h4>${s.name}</h4>
          <p style="font-size:12px;color:var(--text-muted);">${s.desc}</p>
          <div style="margin-top:10px;">
            ${isEquipped ?
              '<span class="btn btn-primary" style="padding:6px 12px;font-size:11px;">EQUIPPED</span>' :
              isUnlocked ?
              '<button class="btn btn-secondary btn-equip" style="padding:6px 12px;font-size:11px;">EQUIP</button>' :
              `<button class="btn btn-eco btn-buy-skin" style="padding:6px 12px;font-size:11px;">Unlock (${s.cost}C)</button><div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${s.unlockHint}</div>`
            }
          </div>
        `;

        const btnEquip = card.querySelector('.btn-equip');
        if (btnEquip) {
          btnEquip.onclick = () => {
            window.SaveSystem.equipSkin(s.id);
            if (window.AudioEngine) window.AudioEngine.play('click');
            this.populateLockerSkins();
            this.showNotification(`Equipped skin: ${s.name}!`);
          };
        }

        const btnBuy = card.querySelector('.btn-buy-skin');
        if (btnBuy) {
          btnBuy.onclick = () => {
            if (window.SaveSystem.spendCredits(s.cost)) {
              window.SaveSystem.unlockSkin(s.id);
              window.SaveSystem.equipSkin(s.id);
              this.populateLockerSkins();
            } else {
              this.showNotification("Not enough Eco-Credits! Recycle more plastic.");
            }
          };
        }

        container.appendChild(card);
      });
    }

    populateShopCards() {
      const container = document.getElementById('shopGrid');
      const shopCredits = document.getElementById('shopCredits');
      if (!container || !window.UpgradeSystem || !window.SaveSystem) return;

      shopCredits.textContent = window.SaveSystem.data.ecoCredits;
      container.innerHTML = '';

      const u = window.UpgradeSystem;
      const config = u.config;

      for (const key in config) {
        const item = config[key];
        const curLevel = u.getUpgradeLevel(key);
        const next = u.getNextTierData(key);
        const isMaxed = !next;

        const card = document.createElement('div');
        card.className = `upgrade-card ${isMaxed ? 'maxed' : ''}`;

        let pips = '';
        for (let i = 1; i <= item.tiers.length; i++) {
          pips += `<div class="tier-pip ${i <= curLevel ? 'filled' : ''}"></div>`;
        }

        card.innerHTML = `
          <div class="upgrade-header">
            <div class="upgrade-icon">${item.icon}</div>
            <div class="upgrade-info">
              <h4>${item.name}</h4>
              <div class="upgrade-tiers">${pips}</div>
            </div>
          </div>
          <p style="font-size:12px;color:var(--text-muted);">${item.desc}</p>
          <div style="font-size:13px;color:var(--primary);font-weight:600;">
            ${isMaxed ? '✨ MAX TIER ACHIEVED' : `Next: ${next.desc}`}
          </div>
          <button class="btn ${isMaxed ? 'btn-secondary' : 'btn-primary'}" ${isMaxed ? 'disabled' : ''}>
            ${isMaxed ? 'MAXED' : `Upgrade (${next.cost} Credits)`}
          </button>
        `;

        const btn = card.querySelector('button');
        if (!isMaxed && btn) {
          btn.onclick = () => {
            if (u.buyUpgrade(key)) {
              this.populateShopCards();
              this.showNotification(`Upgraded ${item.name}!`);
            } else {
              this.showNotification("Not enough Eco-Credits! Recycle more plastic.");
            }
          };
        }

        container.appendChild(card);
      }
    }

    // --- MANDATORY QUIZ REPORT CARD GATEKEEPING ---
    populateReportCard(stats) {
      const titleEl = document.getElementById('reportTitle');
      const scoreEl = document.getElementById('reportScore');
      const starsEl = document.getElementById('reportStars');
      const litersEl = document.getElementById('reportLiters');
      const debrisEl = document.getElementById('reportDebris');
      const pipesEl = document.getElementById('reportPipes');
      const karmaEl = document.getElementById('reportKarma');

      if (titleEl) titleEl.textContent = `${stats.title} Restored!`;
      if (scoreEl) scoreEl.textContent = stats.score;
      if (starsEl) starsEl.textContent = '⭐'.repeat(stats.stars);
      if (litersEl) litersEl.textContent = `${stats.litersCleaned.toLocaleString()} Liters`;
      if (debrisEl) debrisEl.textContent = `${stats.debrisCount} Items`;
      if (pipesEl) pipesEl.textContent = `${stats.pipesCount} Filters / ${stats.barrelsCount} Barrels`;
      if (karmaEl) karmaEl.textContent = `${stats.ecoKarma}%`;

      const reportWqiEl = document.getElementById('reportWQI');
      if (reportWqiEl) {
        const score = stats.wqi;
        let rating = 'Fair';
        if (score >= 91) rating = 'Excellent (Pristine)';
        else if (score >= 71) rating = 'Good (SDG 6 Met)';
        else if (score >= 51) rating = 'Medium';
        else rating = 'Poor';
        reportWqiEl.textContent = `${score} / 100 [${rating}]`;
      }

      // HARD GATE: Next button starts locked until the player proves their learning!
      const btnNext = document.getElementById('btnReportNext');
      this.quizPassed = false;
      if (btnNext) {
        btnNext.disabled = true;
        btnNext.style.opacity = '0.4';
        btnNext.style.cursor = 'not-allowed';
        btnNext.textContent = '🔒 Answer Quiz to Unlock';
      }

      const quizIndex = Math.floor(Math.random() * WATER_QUIZ_POOL.length);
      this.currentQuiz = WATER_QUIZ_POOL[quizIndex];

      const quizQ = document.getElementById('reportQuizQuestion');
      const quizOpts = document.getElementById('reportQuizOptions');
      const quizFact = document.getElementById('reportQuizFact');

      if (quizQ && quizOpts && quizFact) {
        quizQ.textContent = this.currentQuiz.question;
        quizFact.textContent = '⚠️ Mandatory Milestone: You must answer correctly to unlock the next mission!';
        quizFact.style.color = '#ffd600';
        quizOpts.innerHTML = '';

        this.currentQuiz.options.forEach((opt, idx) => {
          const btn = document.createElement('button');
          btn.className = 'quiz-btn';
          btn.textContent = `${String.fromCharCode(65 + idx)}) ${opt}`;
          btn.onclick = () => {
            if (this.quizPassed) return;

            if (idx === this.currentQuiz.correct) {
              btn.classList.add('correct');
              this.quizPassed = true;

              // Unlock Next Level!
              window.SaveSystem.unlockNextLevel(stats.levelId);
              window.SaveSystem.addCredits(60);
              window.SaveSystem.addXP(100);

              quizFact.textContent = `✨ EXCELLENT! Next mission unlocked! ${this.currentQuiz.fact}`;
              quizFact.style.color = '#00e676';
              if (window.AudioEngine) window.AudioEngine.play('filter_success');

              // Enable Next Button with glowing pulse
              if (btnNext) {
                btnNext.disabled = false;
                btnNext.style.opacity = '1';
                btnNext.style.cursor = 'pointer';
                btnNext.className = 'btn btn-primary';
                btnNext.textContent = 'Next Mission ▶';
              }

              const ach = window.SaveSystem.data.achievements.quiz_whiz;
              ach.progress = (ach.progress || 0) + 1;
              if (ach.progress >= 3) {
                window.SaveSystem.unlockAchievement('quiz_whiz');
              }
              window.SaveSystem.save();
            } else {
              btn.classList.add('wrong');
              quizFact.textContent = `❌ Incorrect. Learn this: ${this.currentQuiz.fact} — Try another option!`;
              quizFact.style.color = '#ff80ab';
              if (window.AudioEngine) window.AudioEngine.play('filter_fail');
            }
          };
          quizOpts.appendChild(btn);
        });
      }
    }

    populateAchievementsList() {
      const container = document.getElementById('achievementsList');
      if (!container || !window.SaveSystem) return;
      container.innerHTML = '';

      const achs = window.SaveSystem.data.achievements;
      for (const id in achs) {
        const a = achs[id];
        const card = document.createElement('div');
        card.className = `level-card ${a.unlocked ? '' : 'locked'}`;
        card.style.opacity = a.unlocked ? '1' : '0.5';

        card.innerHTML = `
          <div style="font-size:22px;margin-bottom:4px;">${a.unlocked ? '🏆' : '🔒'}</div>
          <h4>${a.title}</h4>
          <p style="font-size:12px;color:var(--text-muted);">${a.desc}</p>
          <div style="font-size:11px;color:${a.unlocked ? 'var(--eco-green)' : 'var(--text-muted)'};font-weight:bold;margin-top:4px;">
            ${a.unlocked ? 'COMPLETED' : 'LOCKED'}
          </div>
        `;
        container.appendChild(card);
      }
    }

    populateSettingsForm() {
      if (!window.SaveSystem) return;
      const s = window.SaveSystem.data.settings;

      const settingDiff = document.getElementById('settingDifficulty');
      const settingSfx = document.getElementById('settingSfx');
      const settingMusic = document.getElementById('settingMusic');
      const settingMute = document.getElementById('settingMute');
      const settingCb = document.getElementById('settingColorblind');
      const settingMotion = document.getElementById('settingMotion');
      const settingTouch = document.getElementById('settingTouch');
      const settingControlMode = document.getElementById('settingControlMode');
      const settingSpeed = document.getElementById('settingSpeed');

      if (settingDiff) settingDiff.value = s.difficulty;
      if (settingSfx) settingSfx.value = s.sfxVolume;
      if (settingMusic) settingMusic.value = s.musicVolume;
      if (settingMute) settingMute.checked = s.muted;
      if (settingCb) settingCb.value = s.colorblind;
      if (settingMotion) settingMotion.checked = s.reduceMotion;
      if (settingTouch) settingTouch.value = s.touchControls;
      if (settingControlMode) settingControlMode.value = s.controlMode || 'cursor_lock';
      if (settingSpeed) settingSpeed.value = s.gameSpeed;
    }
  }

  window.UI = new UIManager();
})(window);
