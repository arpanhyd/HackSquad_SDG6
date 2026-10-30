/**
 * AquaGuardian: Deep Clean - Tech Upgrades Shop (upgrades.js)
 * Defines all ship upgrades that players can buy using Eco-Credits.
 */

(function(window) {
  'use strict';

  const UPGRADES_CONFIG = {
    sonar: {
      name: "Deep Sonar Array",
      icon: "📡",
      desc: "Expands your sonar ping radius to highlight submerged plastics and hazards.",
      tiers: [
        { level: 1, cost: 0, range: 450, duration: 2.5, desc: "Standard acoustic echo" },
        { level: 2, cost: 120, range: 700, duration: 3.5, desc: "High-frequency pulse" },
        { level: 3, cost: 250, range: 1050, duration: 4.5, desc: "Wide-beam sonar radar" },
        { level: 4, cost: 450, range: 1500, duration: 6.0, desc: "Full-map satellite sonar" }
      ]
    },
    hold: {
      name: "Recycling Cargo Hold",
      icon: "📦",
      desc: "Lets you carry more plastic items before needing to unload at a Recycling Buoy.",
      tiers: [
        { level: 1, cost: 0, capacity: 12, desc: "12-item cargo bay" },
        { level: 2, cost: 100, capacity: 22, desc: "22-item compactor bay" },
        { level: 3, cost: 220, capacity: 36, desc: "36-item hydraulic baler" },
        { level: 4, cost: 400, capacity: 55, desc: "55-item heavy storage bay" }
      ]
    },
    magnet: {
      name: "Magnetic Vacuum Collector",
      icon: "🧲",
      desc: "Pulls nearby floating trash toward your ship automatically.",
      tiers: [
        { level: 1, cost: 0, radius: 45, pullSpeed: 100, desc: "Basic intake scoop" },
        { level: 2, cost: 140, radius: 85, pullSpeed: 160, desc: "Wide suction vortex" },
        { level: 3, cost: 280, radius: 140, pullSpeed: 230, desc: "High-power magnetic skimmer" },
        { level: 4, cost: 500, radius: 210, pullSpeed: 320, desc: " Long-range turbine vacuum" }
      ]
    },
    nets: {
      name: "Biodegradable Smart Nets",
      icon: "🕸️",
      desc: "Widens your collection scoop. Higher levels warn fish so you don't bump into them.",
      tiers: [
        { level: 1, cost: 0, width: 38, safeForFish: false, desc: "Standard collection net" },
        { level: 2, cost: 110, width: 55, safeForFish: false, desc: "Wide bio-fiber net" },
        { level: 3, cost: 240, width: 75, safeForFish: true, desc: "Fish-safe acoustic net" },
        { level: 4, cost: 420, width: 100, safeForFish: true, desc: "Zero-harm wide eco-funnel" }
      ]
    },
    solar: {
      name: "Solar Panel Wings",
      icon: "☀️",
      desc: "Recharges your battery faster in daylight and keeps charging slowly at night.",
      tiers: [
        { level: 1, cost: 0, chargeRate: 8, maxEnergy: 100, nightTrickle: 0.5, desc: "Basic solar cells" },
        { level: 2, cost: 130, chargeRate: 13, maxEnergy: 130, nightTrickle: 1.5, desc: "Dual solar wings" },
        { level: 3, cost: 260, chargeRate: 19, maxEnergy: 170, nightTrickle: 3.5, desc: "High-efficiency solar array" },
        { level: 4, cost: 480, chargeRate: 27, maxEnergy: 220, nightTrickle: 6.0, desc: "Full-hull solar coating" }
      ]
    },
    hull: {
      name: "Hydrofoil Engine & Hull",
      icon: "⚡",
      desc: "Improves your ship's cruising speed, acceleration, and turning control.",
      tiers: [
        { level: 1, cost: 0, topSpeed: 180, turnRate: 3.2, accel: 310, armor: 1.0, desc: "Standard electric hull" },
        { level: 2, cost: 150, topSpeed: 215, turnRate: 3.6, accel: 380, armor: 0.8, desc: "Twin hydrofoil stabilizers" },
        { level: 3, cost: 300, topSpeed: 255, turnRate: 4.0, accel: 460, armor: 0.6, desc: "Carbon-fiber hull" },
        { level: 4, cost: 520, topSpeed: 300, turnRate: 4.4, accel: 550, armor: 0.4, desc: "High-output hydro-jet drive" }
      ]
    },
    drones: {
      name: "Helper Mini-Drones",
      icon: "🤖",
      desc: "Press [G] to launch helper drones that orbit your ship and collect nearby trash.",
      tiers: [
        { level: 1, cost: 0, count: 1, duration: 10, range: 130, desc: "1 Helper Drone (10s)" },
        { level: 2, cost: 160, count: 2, duration: 13, range: 165, desc: "2 Helper Drones (13s)" },
        { level: 3, cost: 320, count: 3, duration: 16, range: 200, desc: "3 Helper Drones (16s)" },
        { level: 4, cost: 550, count: 4, duration: 20, range: 250, desc: "4 Helper Drones (20s)" }
      ]
    },
    multiplier: {
      name: "Eco-Credit Booster",
      icon: "🪙",
      desc: "Increases the Eco-Credits you earn from picking up trash and recycling.",
      tiers: [
        { level: 1, cost: 0, mult: 1.0, desc: "Standard coin payout (1.0x)" },
        { level: 2, cost: 150, mult: 1.25, desc: "Sorting bonus (1.25x coins)" },
        { level: 3, cost: 300, mult: 1.5, desc: "Recycling plant bonus (1.5x coins)" },
        { level: 4, cost: 500, mult: 2.0, desc: "Double coin payout (2.0x coins)" }
      ]
    },
    shield: {
      name: "Coral & Wildlife Bumpers",
      icon: "🛡️",
      desc: "Reduces Eco-Karma penalties if you accidentally bump into coral reefs or fish.",
      tiers: [
        { level: 1, cost: 0, protection: 0.0, desc: "Standard hull bumpers" },
        { level: 2, cost: 140, protection: 0.35, desc: "Soft bumpers (35% less penalty)" },
        { level: 3, cost: 280, protection: 0.70, desc: "Acoustic repeller (70% less penalty)" },
        { level: 4, cost: 480, protection: 1.00, desc: "Full wildlife protection (No penalty)" }
      ]
    },
    neutralizer: {
      name: "Chemical Neutralizer Beam",
      icon: "🧪",
      desc: "Speeds up how fast your tractor beam neutralizes leaking toxic barrels.",
      tiers: [
        { level: 1, cost: 0, speed: 0.75, range: 120, desc: "Standard containment beam" },
        { level: 2, cost: 135, speed: 1.10, range: 145, desc: "Fast chemical scrubber" },
        { level: 3, cost: 270, speed: 1.50, range: 170, desc: "High-power neutralizer ray" },
        { level: 4, cost: 460, speed: 2.10, range: 200, desc: "Instant hazard containment" }
      ]
    }
  };

  class UpgradeManager {
    constructor() {
      this.config = UPGRADES_CONFIG;
    }

    getUpgradeLevel(key) {
      if (!window.SaveSystem) return 1;
      return window.SaveSystem.data.upgrades[key] || 1;
    }

    getTierData(key, level = null) {
      if (!this.config[key]) return {};
      const currentLevel = level !== null ? level : this.getUpgradeLevel(key);
      const tiers = this.config[key].tiers;
      return tiers[Math.min(currentLevel - 1, tiers.length - 1)];
    }

    getNextTierData(key) {
      if (!this.config[key]) return null;
      const currentLevel = this.getUpgradeLevel(key);
      const tiers = this.config[key].tiers;
      if (currentLevel >= tiers.length) return null;
      return tiers[currentLevel];
    }

    canAfford(key) {
      const next = this.getNextTierData(key);
      if (!next) return false;
      return window.SaveSystem.data.ecoCredits >= next.cost;
    }

    buyUpgrade(key) {
      const next = this.getNextTierData(key);
      if (!next) return false;

      if (window.SaveSystem.spendCredits(next.cost)) {
        window.SaveSystem.data.upgrades[key] = (window.SaveSystem.data.upgrades[key] || 1) + 1;
        window.SaveSystem.save();
        window.SaveSystem.checkUpgradeMaxAchievement();

        if (window.AudioEngine) {
          window.AudioEngine.play('filter_success');
        }
        return true;
      }
      return false;
    }

    getOverallTier() {
      const upgrades = window.SaveSystem ? window.SaveSystem.data.upgrades : { sonar: 1, hold: 1, magnet: 1, nets: 1, solar: 1, hull: 1 };
      const values = Object.values(upgrades);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg >= 3.5) return 4;
      if (avg >= 2.5) return 3;
      if (avg >= 1.5) return 2;
      return 1;
    }
  }

  window.UpgradeSystem = new UpgradeManager();
})(window);
