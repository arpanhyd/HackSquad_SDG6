/**
 * AquaGuardian: Deep Clean - Audio System (audio.js)
 * Uses the browser's built-in WebAudio API to play background music and sound effects
 * without needing external MP3 files.
 * Includes a compressor and volume ducking so music and sound effects never clash.
 */

(function(window) {
  'use strict';

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.compressor = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.ambientGain = null;
      this.engineGain = null;

      this.isInitialized = false;
      this.isMuted = false;

      // Boat engine sound nodes
      this.engineOsc = null;
      this.engineSubOsc = null;
      this.engineFilter = null;

      // Water drift sound nodes
      this.driftOsc = null;
      this.driftGain = null;

      // Background water sound nodes
      this.ambientNoiseNode = null;
      this.ambientFilter = null;

      // Background music loop state
      this.musicInterval = null;
      this.musicStep = 0;
      this.currentWQI = 50;
      this.isBossMusic = false;

      // Musical notes (in Hz) that change based on how clean the water is
      this.scales = {
        polluted: [130.81, 155.56, 174.61, 196.00, 233.08, 261.63],
        transition: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63],
        pristine: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25],
        boss: [110.00, 116.54, 130.81, 146.83, 164.81, 220.00]
      };
    }

    init() {
      if (this.isInitialized) return;

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();

        // Dynamics compressor stops music and sound effects from clashing or clipping
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Separate volume channels for SFX, Music, and Water Ambiance
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.compressor);

        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.compressor);

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.connect(this.compressor);

        this.applySettings();
        this._setupEngineSound();
        this._setupDriftSound();
        this._setupWaterAmbiance();
        this.startMusic();

        this.isInitialized = true;
      } catch (err) {
        console.warn('WebAudio could not start:', err);
      }
    }

    applySettings() {
      if (!this.ctx) return;
      const settings = window.SaveSystem ? window.SaveSystem.data.settings : { sfxVolume: 0.8, musicVolume: 0.5, muted: false };
      this.isMuted = settings.muted;

      const masterVol = this.isMuted ? 0 : 0.9;
      this.masterGain.gain.setTargetAtTime(masterVol, this.ctx.currentTime, 0.05);
      this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, this.ctx.currentTime, 0.05);
      // Keep music slightly softer than sound effects so SFX always stand out clearly
      this.musicGain.gain.setTargetAtTime(settings.musicVolume * 0.32, this.ctx.currentTime, 0.05);
      this.ambientGain.gain.setTargetAtTime(settings.sfxVolume * 0.14, this.ctx.currentTime, 0.05);
    }

    // Briefly lowers music volume when an important sound effect plays so they never collide
    _duckMusic(duration = 0.25) {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      const settings = window.SaveSystem ? window.SaveSystem.data.settings : { musicVolume: 0.5 };
      const normalVol = settings.musicVolume * 0.32;
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(normalVol * 0.4, now);
      this.musicGain.gain.linearRampToValueAtTime(normalVol, now + duration);
    }

    _resumeIfSuspended() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    _setupEngineSound() {
      try {
        this.engineOsc = this.ctx.createOscillator();
        this.engineSubOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineFilter = this.ctx.createBiquadFilter();

        this.engineOsc.type = 'sine';
        this.engineOsc.frequency.setValueAtTime(42, this.ctx.currentTime);

        this.engineSubOsc.type = 'triangle';
        this.engineSubOsc.frequency.setValueAtTime(84, this.ctx.currentTime);

        // Low-pass filter keeps the engine hum in the deep bass range so it doesn't clash with music
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(110, this.ctx.currentTime);

        this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

        this.engineOsc.connect(this.engineFilter);
        this.engineSubOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ambientGain);

        this.engineOsc.start();
        this.engineSubOsc.start();
      } catch (e) {
        console.warn('Engine sound setup issue:', e);
      }
    }

    _setupDriftSound() {
      try {
        this.driftOsc = this.ctx.createOscillator();
        this.driftGain = this.ctx.createGain();
        this.driftFilter = this.ctx.createBiquadFilter();

        this.driftOsc.type = 'sine';
        this.driftOsc.frequency.setValueAtTime(220, this.ctx.currentTime);

        this.driftFilter.type = 'bandpass';
        this.driftFilter.frequency.setValueAtTime(500, this.ctx.currentTime);
        this.driftFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

        this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

        this.driftOsc.connect(this.driftFilter);
        this.driftFilter.connect(this.driftGain);
        this.driftGain.connect(this.ambientGain);

        this.driftOsc.start();
      } catch (e) {
        console.warn('Drift sound setup issue:', e);
      }
    }

    updateDriftSound(isDrifting, driftLevel) {
      if (!this.driftGain || !this.driftOsc) return;
      this._resumeIfSuspended();
      const targetGain = isDrifting ? Math.min(0.09, 0.03 + driftLevel * 0.03) : 0.0001;
      const targetFreq = 200 + driftLevel * 55;
      this.driftGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
      this.driftOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
    }

    updateEngineThrottle(throttle, isBoosting) {
      if (!this.engineOsc || !this.engineGain) return;
      this._resumeIfSuspended();

      const clampedThrottle = Math.min(1.2, Math.max(0, throttle));
      const baseFreq = 42 + clampedThrottle * 32 + (isBoosting ? 28 : 0);
      const filterFreq = 95 + clampedThrottle * 140 + (isBoosting ? 180 : 0);
      const targetGain = 0.02 + clampedThrottle * 0.06 + (isBoosting ? 0.05 : 0);

      this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.08);
      this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 2, this.ctx.currentTime, 0.08);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    }

    _setupWaterAmbiance() {
      try {
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99 * b0 + white * 0.05;
          b1 = 0.96 * b1 + white * 0.1;
          b2 = 0.86 * b2 + white * 0.2;
          output[i] = (b0 + b1 + b2) * 0.4;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        this.ambientFilter = this.ctx.createBiquadFilter();
        this.ambientFilter.type = 'bandpass';
        this.ambientFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
        this.ambientFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(120, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(this.ambientFilter.frequency);
        lfo.start();

        whiteNoise.connect(this.ambientFilter);
        this.ambientFilter.connect(this.ambientGain);
        whiteNoise.start();
      } catch (e) {
        console.warn('Water ambiance setup issue:', e);
      }
    }

    startMusic() {
      if (this.musicInterval) clearInterval(this.musicInterval);
      // Relaxed 115 BPM background music groove
      this.musicInterval = setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        this._playProceduralBeat();
      }, 260);
    }

    stopMusic() {
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
    }

    setWQI(wqi, isBoss = false) {
      this.currentWQI = wqi;
      this.isBossMusic = isBoss;
    }

    _playProceduralBeat() {
      this._resumeIfSuspended();
      const step = this.musicStep % 16;
      this.musicStep++;

      let activeScale;
      if (this.isBossMusic) {
        activeScale = this.scales.boss;
      } else if (this.currentWQI >= 75) {
        activeScale = this.scales.pristine;
      } else if (this.currentWQI >= 40) {
        activeScale = this.scales.transition;
      } else {
        activeScale = this.scales.polluted;
      }

      const now = this.ctx.currentTime;

      // Soft warm bass note every 4 beats
      if (step % 4 === 0) {
        const rootFreq = activeScale[0];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(rootFreq * 0.5, now);

        bassGain.gain.setValueAtTime(0.18, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.36);
      }

      // Gentle marimba/synth melody note on even steps
      if (step % 2 === 0) {
        const pattern = [0, 2, 4, 2, 3, 5, 4, 1];
        const noteIdx = pattern[(step / 2) % pattern.length] % activeScale.length;
        const noteFreq = activeScale[noteIdx];

        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        const leadFilter = this.ctx.createBiquadFilter();

        leadOsc.type = 'sine';
        leadOsc.frequency.setValueAtTime(noteFreq, now);

        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(900 + this.currentWQI * 12, now);

        const decay = 0.24;
        leadGain.gain.setValueAtTime(0.11, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

        leadOsc.connect(leadFilter);
        leadFilter.connect(leadGain);
        leadGain.connect(this.musicGain);

        leadOsc.start(now);
        leadOsc.stop(now + decay + 0.02);
      }
    }

    play(soundType, options = {}) {
      if (!this.ctx || this.isMuted) return;
      this._resumeIfSuspended();
      const now = this.ctx.currentTime;

      // Duck music slightly so the sound effect never collides with the background track
      if (soundType !== 'neutralize_hum') {
        this._duckMusic(0.22);
      }

      switch (soundType) {
        case 'collect': {
          const combo = options.combo || 1;
          const baseFreq = 587.33; // D5
          const pitchFactor = Math.pow(1.08, Math.min(combo, 12));
          const freq = baseFreq * pitchFactor;

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.11);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case 'crate_open': {
          [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + idx * 0.05);
            gain.gain.setValueAtTime(0.2, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.32);
          });
          break;
        }

        case 'powerup': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);

          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.34);
          break;
        }

        case 'levelup': {
          [440, 554.37, 659.25, 880].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + idx * 0.07);
            gain.gain.setValueAtTime(0.24, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.42);
          });
          break;
        }

        case 'sonar': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(750, now + 0.65);

          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.92);
          break;
        }

        case 'deposit': {
          [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + idx * 0.05);
            gain.gain.setValueAtTime(0.18, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.36);
          });
          break;
        }

        case 'filter_success': {
          [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + idx * 0.06);
            gain.gain.setValueAtTime(0.22, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.42);
          });
          break;
        }

        case 'filter_fail': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(175, now);
          osc.frequency.linearRampToValueAtTime(110, now + 0.28);
          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }

        case 'neutralize_hum': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.linearRampToValueAtTime(380, now + 0.09);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'neutralize_done': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.34);
          break;
        }

        case 'recycler_burst': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(480, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);

          gain.gain.setValueAtTime(0.26, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.38);
          break;
        }

        case 'coral_bump': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
        }

        case 'boss_roar': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(95, now);
          osc.frequency.linearRampToValueAtTime(45, now + 0.65);
          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.72);
          break;
        }

        case 'achievement': {
          [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + idx * 0.07);
            gain.gain.setValueAtTime(0.2, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.36);
          });
          break;
        }

        case 'click': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        default:
          break;
      }
    }
  }

  window.AudioEngine = new AudioEngine();
})(window);
