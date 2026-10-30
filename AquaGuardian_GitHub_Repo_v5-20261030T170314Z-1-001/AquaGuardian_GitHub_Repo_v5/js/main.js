/**
 * AquaGuardian: Deep Clean - Master Game Controller
 * State Machine, Event Wiring, Loop Coordination, and Game Lifecycle.
 * Built for C://hacks 2026
 */

(function(window) {
  'use strict';

  const GameState = {
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    REPORT: 'REPORT',
    SHOP: 'SHOP',
    LOCKER: 'LOCKER',
    GAME_OVER: 'GAME_OVER',
    VICTORY: 'VICTORY'
  };

  class AquaGuardianGame {
    constructor() {
      this.state = GameState.TITLE;
      this.currentLevelId = 1;
      this.currentLevel = null;
      this.transitionAlpha = 0;
    }

    init() {
      window.Engine.init('gameCanvas');
      this._wireButtons();

      window.Engine.start(
        (dt) => this.update(dt),
        (ctx) => this.render(ctx)
      );

      window.UI.showTitleScreen();
    }

    _wireButtons() {
      const btnPlay = document.getElementById('btnTitlePlay');
      const btnTutorial = document.getElementById('btnTitleTutorial');
      const btnTitleShop = document.getElementById('btnTitleShop');
      const btnTitleLocker = document.getElementById('btnTitleLocker');
      const btnTitleSettings = document.getElementById('btnTitleSettings');
      const btnTitleControls = document.getElementById('btnTitleControls');
      const btnTitleHowTo = document.getElementById('btnTitleHowTo');
      const btnTitleAchievements = document.getElementById('btnTitleAchievements');
      const btnTitleCredits = document.getElementById('btnTitleCredits');

      if (btnPlay) {
        btnPlay.onclick = () => {
          this.playClick();
          this.showBriefing(window.SaveSystem.data.unlockedLevel || 1);
        };
      }
      if (btnTutorial) {
        btnTutorial.onclick = () => {
          this.playClick();
          this.showBriefing(0);
        };
      }
      if (btnTitleShop) {
        btnTitleShop.onclick = () => {
          this.playClick();
          window.UI.showShop();
        };
      }
      if (btnTitleLocker) {
        btnTitleLocker.onclick = () => {
          this.playClick();
          window.UI.showLocker();
        };
      }
      if (btnTitleSettings) {
        btnTitleSettings.onclick = () => {
          this.playClick();
          window.UI.showSettings();
        };
      }
      if (btnTitleControls) {
        btnTitleControls.onclick = () => {
          this.playClick();
          window.UI.showControls();
        };
      }
      if (btnTitleHowTo) {
        btnTitleHowTo.onclick = () => {
          this.playClick();
          window.UI.showHowToPlay();
        };
      }
      if (btnTitleAchievements) {
        btnTitleAchievements.onclick = () => {
          this.playClick();
          window.UI.showAchievements();
        };
      }
      if (btnTitleCredits) {
        btnTitleCredits.onclick = () => {
          this.playClick();
          window.UI.showCredits();
        };
      }

      document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.onclick = () => {
          this.playClick();
          window.UI.hideAllModals();
          if (this.state === GameState.TITLE) {
            window.UI.showTitleScreen();
          } else if (this.state === GameState.PAUSED) {
            window.UI.showPauseMenu();
          }
        };
      });

      const btnPauseResume = document.getElementById('btnPauseResume');
      const btnPauseRestart = document.getElementById('btnPauseRestart');
      const btnPauseLocker = document.getElementById('btnPauseLocker');
      const btnPauseSettings = document.getElementById('btnPauseSettings');
      const btnPauseTitle = document.getElementById('btnPauseTitle');

      if (btnPauseResume) {
        btnPauseResume.onclick = () => {
          this.playClick();
          this.resumeGame();
        };
      }
      if (btnPauseRestart) {
        btnPauseRestart.onclick = () => {
          this.playClick();
          this.startLevel(this.currentLevelId);
        };
      }
      if (btnPauseLocker) {
        btnPauseLocker.onclick = () => {
          this.playClick();
          window.UI.showLocker();
        };
      }
      if (btnPauseSettings) {
        btnPauseSettings.onclick = () => {
          this.playClick();
          window.UI.showSettings();
        };
      }
      if (btnPauseTitle) {
        btnPauseTitle.onclick = () => {
          this.playClick();
          this.returnToTitle();
        };
      }

      const btnReportNext = document.getElementById('btnReportNext');
      const btnReportShop = document.getElementById('btnReportShop');
      const btnReportReplay = document.getElementById('btnReportReplay');

      if (btnReportNext) {
        btnReportNext.onclick = () => {
          if (!window.UI.quizPassed) {
            window.UI.showNotification("⚠️ You must answer the SDG 6 Quiz to unlock!");
            return;
          }
          this.playClick();
          if (this.currentLevelId < 4) {
            this.showBriefing(this.currentLevelId + 1);
          } else {
            this.state = GameState.VICTORY;
            window.UI.showVictory();
          }
        };
      }
      if (btnReportShop) {
        btnReportShop.onclick = () => {
          this.playClick();
          window.UI.showShop();
        };
      }
      if (btnReportReplay) {
        btnReportReplay.onclick = () => {
          this.playClick();
          this.startLevel(this.currentLevelId);
        };
      }

      const btnGameOverRetry = document.getElementById('btnGameOverRetry');
      const btnGameOverMenu = document.getElementById('btnGameOverMenu');
      const btnVictoryMenu = document.getElementById('btnVictoryMenu');

      if (btnGameOverRetry) {
        btnGameOverRetry.onclick = () => {
          this.playClick();
          this.startLevel(this.currentLevelId);
        };
      }
      if (btnGameOverMenu) {
        btnGameOverMenu.onclick = () => {
          this.playClick();
          this.returnToTitle();
        };
      }
      if (btnVictoryMenu) {
        btnVictoryMenu.onclick = () => {
          this.playClick();
          this.returnToTitle();
        };
      }
    }

    playClick() {
      if (window.AudioEngine) {
        window.AudioEngine.play('click');
      }
    }

    showBriefing(levelId) {
      window.UI.showMissionBriefing(levelId, () => {
        this.startLevel(levelId);
      });
    }

    startLevel(levelId) {
      this.currentLevelId = levelId;
      if (levelId !== 0) {
        window.UI.hideTutorialObjective();
      }
      this.currentLevel = window.LevelManager.loadLevel(levelId);
      window.Engine.camera.setBounds(
        this.currentLevel.bounds.minX,
        this.currentLevel.bounds.minY,
        this.currentLevel.bounds.maxX,
        this.currentLevel.bounds.maxY
      );

      window.Engine.camera.pos.copy(this.currentLevel.drone.pos);
      window.Engine.particles.clear();
      window.Engine.floatingTexts.clear();

      window.UI.hideAllModals();
      this.state = GameState.PLAYING;
    }

    pauseGame() {
      if (this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
        window.UI.showPauseMenu();
      }
    }

    resumeGame() {
      if (this.state === GameState.PAUSED) {
        window.UI.hideAllModals();
        this.state = GameState.PLAYING;
      }
    }

    returnToTitle() {
      this.state = GameState.TITLE;
      window.UI.showTitleScreen();
    }

    showReportCard(stats) {
      this.state = GameState.REPORT;
      window.UI.showReportCard(stats);
    }

    triggerGameOver(reason) {
      this.state = GameState.GAME_OVER;
      window.UI.showGameOver(reason);
    }

    update(dt) {
      window.Input.update();

      if (window.Input.isJustPressed('pause')) {
        if (this.state === GameState.PLAYING) {
          this.pauseGame();
        } else if (this.state === GameState.PAUSED) {
          this.resumeGame();
        }
      }

      if (this.state === GameState.PLAYING && this.currentLevel) {
        this.currentLevel.update(dt);

        if (this.currentLevel.drone) {
          window.Engine.camera.update(
            this.currentLevel.drone.pos,
            this.currentLevel.drone.vel,
            dt
          );
        }

        window.UI.updateHUD(this.currentLevel);
      }
    }

    render(ctx) {
      const w = window.Engine.width;
      const h = window.Engine.height;

      ctx.fillStyle = '#05131e';
      ctx.fillRect(0, 0, w, h);

      if (this.currentLevel && (this.state === GameState.PLAYING || this.state === GameState.PAUSED)) {
        window.Engine.camera.applyTransform(ctx);
        this.currentLevel.draw(ctx);
        window.Engine.camera.restoreTransform(ctx);
      } else {
        this.renderTitleAmbiance(ctx, w, h);
      }
    }

    renderTitleAmbiance(ctx, w, h) {
      const time = performance.now() * 0.0015;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#041c2c');
      grad.addColorStop(0.6, '#083344');
      grad.addColorStop(1, '#001e28');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(0, 242, 254, 0.12)';
      ctx.lineWidth = 2;
      for (let y = 50; y < h; y += 70) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 30) {
          const cy = y + Math.sin(x * 0.01 + time + y * 0.02) * 12;
          if (x === 0) ctx.moveTo(x, cy);
          else ctx.lineTo(x, cy);
        }
        ctx.stroke();
      }
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.MainGame = new AquaGuardianGame();
    window.MainGame.init();
  });
})(window);
