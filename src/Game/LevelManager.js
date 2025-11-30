import { Config } from '../Config.js';
import { DungeonGenerator } from '../ProcGen/DungeonGenerator.js';
import { LevelBuilder } from '../ProcGen/LevelBuilder.js';
import { Spawner } from './Spawner.js';
import { DebrisSystem } from './DebrisSystem.js';
import { state } from './GameState.js'; // Added to access runStats

export class LevelManager {
    constructor(engine, loadingUI, audioManager) {
        this.engine = engine;
        this.loadingUI = loadingUI;
        this.audioManager = audioManager;
        
        // UI Elements
        this.ui = document.getElementById('level-screen');
        this.nextBtn = document.getElementById('btn-next-level');
        
        this.isLevelFinished = false;
        this.currentLevel = 1; 

        // Initial Button Setup
        if (this.nextBtn) {
            const newBtn = this.nextBtn.cloneNode(true);
            this.nextBtn.parentNode.replaceChild(newBtn, this.nextBtn);
            this.nextBtn = newBtn;

            this.nextBtn.addEventListener('click', () => {
                if (this.audioManager.isPlaying) {
                    sessionStorage.setItem('bloodbath_music_active', 'true');
                } else {
                    sessionStorage.setItem('bloodbath_music_active', 'false');
                }
                window.location.reload();
            });
        }
    }

    loadLevel(level, seed, onComplete) {
        this.currentLevel = level;
        this.isLevelFinished = false;
        
        if(this.loadingUI) this.loadingUI.update(10, "GENERATING SECTOR...");

        setTimeout(() => {
            const debrisSystem = new DebrisSystem(this.engine.scene); 
            if(this.loadingUI) this.loadingUI.update(30, "GENERATING SECTOR...");

            const levelScale = 1 + (this.currentLevel * 0.1);
            const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
            const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
            
            console.log(`[LevelManager] Gen: ${mapWidth}x${mapHeight} (Seed: ${seed})`);
            
            const generator = new DungeonGenerator(seed, mapWidth, mapHeight);
            const mapData = generator.generate();
            
            if(this.loadingUI) this.loadingUI.update(60, "BUILDING GEOMETRY...");

            const builder = new LevelBuilder(this.engine.scene);
            builder.build(mapData);
            
            const levelMeshes = [];
            this.engine.scene.traverse(obj => {
                if (obj.isInstancedMesh) levelMeshes.push(obj);
            });

            if(this.loadingUI) this.loadingUI.update(80, "SPAWNING ENTITIES...");

            const entities = Spawner.spawnEntities(
                this.engine, 
                mapData, 
                generator, 
                builder, 
                this.audioManager
            );

            if(this.loadingUI) this.loadingUI.update(90, "COMPILING SHADERS...");

            this.engine.renderer.render(this.engine.scene, this.engine.camera);
            
            if(this.loadingUI) this.loadingUI.complete();

            onComplete({
                player: entities.player,
                weapon: entities.weapon,
                enemies: entities.enemies,
                exitObject: entities.exit,
                minimapData: mapData,
                debrisSystem: debrisSystem,
                levelMeshes: levelMeshes,
                generator: generator 
            });
            
        }, 100);
    }

    checkExit(player, exitObject) {
        if (this.isLevelFinished || !exitObject || !player) return;

        const dx = this.engine.camera.position.x - exitObject.position.x;
        const dz = this.engine.camera.position.z - exitObject.position.z;
        
        if (Math.sqrt(dx*dx + dz*dz) < 1.5) {
            this.finishLevel();
        }
    }

    finishLevel() {
        if (this.isLevelFinished) return;
        this.isLevelFinished = true;

        // 1. Pause Controls
        this.engine.controls.unlock();
        document.body.style.cursor = 'default';
        
        // 2. Populate Stats (Fixed to match new HTML)
        if (this.ui) {
            this.ui.style.display = 'flex';
            
            const elLevel = document.getElementById('score-level-num');
            if (elLevel) elLevel.innerText = this.currentLevel;

            const elKills = document.getElementById('score-kills');
            if (elKills) elKills.innerText = state.data.runStats.kills;

            const elAcc = document.getElementById('score-acc');
            if (elAcc) elAcc.innerText = state.getAccuracy();

            const elTime = document.getElementById('score-time');
            if (elTime) elTime.innerText = state.getRunTime();
        }

        // 3. Handle Backend Sync (Optimistic UI)
        if (this.nextBtn) {
            const nextLvl = this.currentLevel + 1;

            // === A. IMMEDIATE UPDATE ===
            // Don't disable the button or show "Uplinking".
            // Assume success and show the next level prompt immediately.
            this.nextBtn.innerText = "ENTER LEVEL " + nextLvl;
            this.nextBtn.disabled = false;
            this.nextBtn.style.opacity = "1.0";

            // Update Cache Immediately so if they click fast, the loading screen is correct
            sessionStorage.setItem('bloodbath_level_cache', nextLvl);

            // === B. BACKGROUND SYNC ===
            fetch('api/level_complete.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status !== 'ok') {
                        // Only show error if it actually failed
                        console.error("Server Error:", data);
                        this.nextBtn.innerText = "SYNC ERROR (TRY AGAIN)";
                        this.nextBtn.disabled = false; // Allow retry via reload
                    }
                })
                .catch(err => {
                    console.error("Level Sync Failed", err);
                    // We don't revert UI here because a reload will fix it anyway,
                    // and flashing "Error" might just confuse them if it was a minor glitch.
                });
        }
    }
}