import { Config } from '../Config.js';

export class LevelManager {
    constructor(engine, currentLevel, audioManager) {
        this.engine = engine;
        this.currentLevel = currentLevel;
        this.audioManager = audioManager;
        
        this.ui = document.getElementById('level-screen');
        this.levelText = document.getElementById('score-level');
        this.nextBtn = document.getElementById('btn-next-level');
        
        this.isLevelFinished = false;

        // Bind Next Level Button
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.loadNextLevel());
        }
    }

    checkExit(player, exitObject) {
        if (this.isLevelFinished || !exitObject || !player) return;

        const dx = this.engine.camera.position.x - exitObject.position.x;
        const dz = this.engine.camera.position.z - exitObject.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < 1.5) {
            this.finishLevel();
        }
    }

    finishLevel() {
        this.isLevelFinished = true;
        this.engine.controls.unlock();
        document.body.style.cursor = 'default';
        
        if (this.ui) {
            this.ui.style.display = 'flex';
            if (this.levelText) this.levelText.innerText = this.currentLevel;
        }
    }

    loadNextLevel() {
        // Save Music State
        if (this.audioManager.isPlaying) {
            sessionStorage.setItem('bloodbath_music_active', 'true');
        } else {
            sessionStorage.setItem('bloodbath_music_active', 'false');
        }

        const nextLevel = this.currentLevel + 1;
        const nextSeed = "SEED-" + Math.floor(Math.random() * 999999);
        window.location.href = `game.html?seed=${nextSeed}&level=${nextLevel}`;
    }
}