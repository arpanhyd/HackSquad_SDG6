/**
 * AquaGuardian: Deep Clean - Save System (save.js)
 * Saves player coins, XP, unlocked levels, upgrades, and settings in browser LocalStorage.
 */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'aquaguardian_save_v2';

  const DEFAULT_SAVE_DATA = {
    ecoCredits: 0,
    playerLevel: 1,
    playerXP: 0,
    xpToNext: 400,
    unlockedLevel: 1,
    equippedSkin: 'default',
    unlockedSkins: ['default'],
    upgrades: {
      sonar: 1,
      hold: 1,
      magnet: 1,
      nets: 1,
      solar: 1,
      hull: 1,
      drones: 1,
      multiplier: 1,
      shield: 1,
      neutralizer: 1
    },
    levelStats: {
      1: { bestScore: 0, stars: 0, bestWQI: 0, time: 0, failCount: 0 },
      2: { bestScore: 0, stars: 0, bestWQI: 0, time: 0, failCount: 0 },
      3: { bestScore: 0, stars: 0, bestWQI: 0, time: 0, failCount: 0 },
      4: { bestScore: 0, stars: 0, bestWQI: 0, time: 0, failCount: 0 }
    },
    achievements: {
      zero_casualties: { title: "Zero Casualties", desc: "Complete Level 3 without harming any marine wildlife", unlocked: false },
      speed_cleaner: { title: "Speed Cleaner", desc: "Clear Level 1 in under 75 seconds", unlocked: false },
      pipe_master: { title: "Pipe Master", desc: "Install drainage filters without a single alignment failure", unlocked: false },
      coral_protector: { title: "Coral Protector", desc: "Finish Level 3 with perfect 100 Eco-Karma", unlocked: false },
      sludge_purifier: { title: "Sludge Purifier", desc: "Defeat the Sludge Leviathan and clean the estuary", unlocked: false },
      quiz_whiz: { title: "Water Scholar", desc: "Answer 3 water conservation quiz questions correctly", unlocked: false, progress: 0 },
      master_guardian: { title: "Master Guardian", desc: "Max out all Aqua-Drone technology upgrades", unlocked: false },
      drift_king: { title: "Drift Champion", desc: "Perform a high-speed hydro drift for 3 seconds", unlocked: false },
      combo_god: { title: "Cleaning Frenzy", desc: "Reach a 10x Debris Combo Streak", unlocked: false },
      crate_hunter: { title: "Loot Raider", desc: "Open 3 Mystery Eco-Supply Drops", unlocked: false, progress: 0 },
      swarm_commander: { title: "Swarm Commander", desc: "Deploy Helper Mini-Drones [G] 3 times", unlocked: false, progress: 0 },
      slipstream_rider: { title: "Slipstream Rider", desc: "Ride Hydro-Slipstream Boost Gates 5 times", unlocked: false, progress: 0 }
    },
    settings: {
      difficulty: 'normal',
      sfxVolume: 0.8,
      musicVolume: 0.5,
      muted: false,
      colorblind: 'none',
      reduceMotion: false,
      touchControls: 'auto',
      controlMode: 'cursor_lock',
      gameSpeed: 1.0
    }
  };

  class SaveManager {
    constructor() {
      this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
      this.hasLocalStorage = this._checkStorageSupport();
      this.load();
    }

    _checkStorageSupport() {
      try {
        const testKey = '__agy_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    }

    load() {
      if (!this.hasLocalStorage) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = this._deepMerge(this.data, parsed);
        }
      } catch (e) {
        console.error('Could not load save data:', e);
      }
    }

    save() {
      if (!this.hasLocalStorage) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.error('Could not save data:', e);
      }
    }

    reset() {
      this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
      if (this.hasLocalStorage) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
      }
      this.save();
    }

    _deepMerge(target, source) {
      for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
          Object.assign(source[key], this._deepMerge(target[key], source[key]));
        }
      }
      Object.assign(target || {}, source);
      return target;
    }

    addCredits(amount) {
      if (typeof amount !== 'number' || isNaN(amount)) return;
      const mult = (window.UpgradeSystem && window.UpgradeSystem.getTierData('multiplier').mult) || 1.0;
      this.data.ecoCredits = Math.max(0, Math.floor(this.data.ecoCredits + amount * mult));
      this.save();
    }

    spendCredits(amount) {
      if (this.data.ecoCredits >= amount) {
        this.data.ecoCredits -= amount;
        this.save();
        return true;
      }
      return false;
    }

    addXP(amount) {
      if (typeof amount !== 'number' || isNaN(amount)) return;
      this.data.playerXP += Math.floor(amount);

      let leveledUp = false;
      while (this.data.playerXP >= this.data.xpToNext) {
        this.data.playerXP -= this.data.xpToNext;
        this.data.playerLevel++;
        this.data.xpToNext = Math.floor(this.data.xpToNext * 1.35);
        leveledUp = true;

        // Give bonus money (Eco-Credits) whenever the player levels up
        const levelReward = this.data.playerLevel * 60;
        this.data.ecoCredits += levelReward;

        if (window.UI) {
          window.UI.showNotification(`🎉 Reached Level ${this.data.playerLevel}! Bonus Reward: +${levelReward} Coins!`);
        }

        if (this.data.playerLevel >= 3 && !this.data.unlockedSkins.includes('neon_cyber')) {
          this.unlockSkin('neon_cyber');
        }
        if (this.data.playerLevel >= 5 && !this.data.unlockedSkins.includes('solar_gold')) {
          this.unlockSkin('solar_gold');
        }
        if (this.data.playerLevel >= 8 && !this.data.unlockedSkins.includes('cosmic_void')) {
          this.unlockSkin('cosmic_void');
        }
      }

      this.save();

      if (leveledUp) {
        if (window.AudioEngine) window.AudioEngine.play('levelup');
        if (window.UI) {
          window.UI.showLevelUpCelebration(this.data.playerLevel);
        }
      }
    }

    unlockSkin(skinId) {
      if (!this.data.unlockedSkins.includes(skinId)) {
        this.data.unlockedSkins.push(skinId);
        this.save();
        if (window.UI) {
          window.UI.showNotification(`🎨 New Drone Skin Unlocked: ${skinId.toUpperCase()}!`);
        }
        if (window.AudioEngine) window.AudioEngine.play('achievement');
      }
    }

    equipSkin(skinId) {
      if (this.data.unlockedSkins.includes(skinId)) {
        this.data.equippedSkin = skinId;
        this.save();
        return true;
      }
      return false;
    }

    unlockNextLevel(currentLevel) {
      if (currentLevel >= this.data.unlockedLevel && this.data.unlockedLevel < 4) {
        this.data.unlockedLevel = currentLevel + 1;
        // Give bonus money when unlocking a new mission level
        const unlockBonus = this.data.unlockedLevel * 75;
        this.data.ecoCredits += unlockBonus;
        if (window.UI) {
          window.UI.showNotification(`🌊 Mission ${this.data.unlockedLevel} Unlocked! +${unlockBonus} Bonus Coins!`);
        }
        this.save();
      }
    }

    recordLevelCompletion(levelId, score, stars, wqi, timeSec) {
      if (!this.data.levelStats[levelId]) {
        this.data.levelStats[levelId] = { bestScore: 0, stars: 0, bestWQI: 0, time: 0, failCount: 0 };
      }
      const stat = this.data.levelStats[levelId];
      stat.failCount = 0; // Reset failure streak on win

      // Give a completion money reward
      const missionReward = Math.max(50, levelId * 80 + stars * 25);
      this.data.ecoCredits += missionReward;

      if (score > stat.bestScore) stat.bestScore = score;
      if (stars > stat.stars) stat.stars = stars;
      if (wqi > stat.bestWQI) stat.bestWQI = Math.round(wqi);
      if (stat.time === 0 || timeSec < stat.time) stat.time = Math.round(timeSec);
      this.save();
      return missionReward;
    }

    recordLevelFailure(levelId) {
      if (!this.data.levelStats[levelId]) {
        this.data.levelStats[levelId] = { bestScore: 0, stars: 0, bestWQI: 0, time: 0, failCount: 0 };
      }
      const stat = this.data.levelStats[levelId];
      stat.failCount = (stat.failCount || 0) + 1;

      // Coin penalty increases each time the player fails the level
      const penalty = 40 + stat.failCount * 50;
      this.data.ecoCredits = Math.max(0, this.data.ecoCredits - penalty);

      // Decrease player level and unlocked mission level when failing
      if (this.data.playerLevel > 1) {
        this.data.playerLevel -= 1;
      }
      if (this.data.unlockedLevel > 1) {
        this.data.unlockedLevel = Math.max(1, this.data.unlockedLevel - 1);
      }

      this.save();
      return { penalty, failCount: stat.failCount, newLevel: this.data.playerLevel };
    }

    unlockAchievement(id) {
      if (this.data.achievements[id] && !this.data.achievements[id].unlocked) {
        this.data.achievements[id].unlocked = true;
        this.save();
        if (window.AudioEngine) {
          window.AudioEngine.play('achievement');
        }
        if (window.UI) {
          window.UI.showNotification(`🏆 Achievement Unlocked: ${this.data.achievements[id].title}`);
        }
        return true;
      }
      return false;
    }

    checkUpgradeMaxAchievement() {
      const up = this.data.upgrades;
      const allMax = Object.values(up).every(tier => tier >= 4);
      if (allMax) {
        this.unlockAchievement('master_guardian');
      }
    }
  }

  window.SaveSystem = new SaveManager();
})(window);
