import { Config } from '../Config.js';
import { DungeonGenerator } from '../ProcGen/DungeonGenerator.js';
import { LevelBuilder } from '../ProcGen/LevelBuilder.js';
import { Spawner } from './Spawner.js';
import { DebrisSystem } from './DebrisSystem.js';

export class LevelManager {
    constructor(engine, loadingUI, audioManager) {
        this.engine = engine;
        this.loadingUI = loadingUI;
        this.audioManager = audioManager;
        
        // UI Elements
        this.ui = document.getElementById('level-screen');
        // Note: Using the ID from your provided snippet. 
        // If your HTML uses 'level-reached-val', ensure this ID matches your HTML.
        this.levelText = document.getElementById('score-level') || document.getElementById('level-reached-val');
        this.nextBtn = document.getElementById('btn-next-level');
        
        this.isLevelFinished = false;
        this.currentLevel = 1; // Will be overwritten by loadLevel

        // Initial Button Setup (Simple Reload)
        if (this.nextBtn) {
            // Clone to strip old listeners
            const newBtn = this.nextBtn.cloneNode(true);
            this.nextBtn.parentNode.replaceChild(newBtn, this.nextBtn);
            this.nextBtn = newBtn;

            this.nextBtn.addEventListener('click', () => {
                // Save Audio State before reloading
                if (this.audioManager.isPlaying) {
                    sessionStorage.setItem('bloodbath_music_active', 'true');
                } else {
                    sessionStorage.setItem('bloodbath_music_active', 'false');
                }
                
                // Reload Page to load new level from Server
                window.location.reload();
            });
        }
    }

    // --- LOADING LOGIC ---
    loadLevel(level, seed, onComplete) {
        this.currentLevel = level;
        this.isLevelFinished = false;
        
        // 1. Start UI
        if(this.loadingUI) this.loadingUI.update(10, "GENERATING SECTOR...");

        // Use timeout to allow UI to render
        setTimeout(() => {
            // 2. Init Systems
            const debrisSystem = new DebrisSystem(this.engine.scene); 
            if(this.loadingUI) this.loadingUI.update(30, "GENERATING SECTOR...");

            // 3. Generate Map Data
            const levelScale = 1 + (this.currentLevel * 0.1);
            const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
            const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
            
            console.log(`[LevelManager] Gen: ${mapWidth}x${mapHeight} (Seed: ${seed})`);
            
            const generator = new DungeonGenerator(seed, mapWidth, mapHeight);
            const mapData = generator.generate();
            
            if(this.loadingUI) this.loadingUI.update(60, "BUILDING GEOMETRY...");

            // 4. Build 3D World
            const builder = new LevelBuilder(this.engine.scene);
            builder.build(mapData);
            
            // Collect static meshes for Raycasting (Optimization)
            const levelMeshes = [];
            this.engine.scene.traverse(obj => {
                if (obj.isInstancedMesh) levelMeshes.push(obj);
            });

            if(this.loadingUI) this.loadingUI.update(80, "SPAWNING ENTITIES...");

            // 5. Spawn Everything (Using Spawner Helper)
            const entities = Spawner.spawnEntities(
                this.engine, 
                mapData, 
                generator, 
                builder, 
                this.audioManager
            );

            if(this.loadingUI) this.loadingUI.update(90, "COMPILING SHADERS...");

            // 6. Warmup Render (Prevents stutter)
            this.engine.renderer.render(this.engine.scene, this.engine.camera);
            
            if(this.loadingUI) this.loadingUI.complete();

            // 7. Return Data to Game Loop
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

    // --- GAMEPLAY LOGIC ---
    checkExit(player, exitObject) {
        if (this.isLevelFinished || !exitObject || !player) return;

        const dx = this.engine.camera.position.x - exitObject.position.x;
        const dz = this.engine.camera.position.z - exitObject.position.z;
        
        // Simple distance check (1.5 meters)
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
        
        // 2. Show UI
        if (this.ui) {
            this.ui.style.display = 'flex';
            if (this.levelText) this.levelText.innerText = this.currentLevel;
        }

        // 3. Handle Backend Sync
        if (this.nextBtn) {
            // Lock button while saving
            this.nextBtn.disabled = true;
            this.nextBtn.style.opacity = "0.5";
            this.nextBtn.innerText = "UPLINKING...";

            // Call PHP API
            fetch('api/level_complete.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'ok') {
                        // Success! 
                        const nextLvl = this.currentLevel + 1;
                        
                        // Update Cache so Loading Screen is instant on reload
                        sessionStorage.setItem('bloodbath_level_cache', nextLvl);

                        // Unlock Button
                        this.nextBtn.disabled = false;
                        this.nextBtn.style.opacity = "1.0";
                        this.nextBtn.innerText = "ENTER LEVEL " + nextLvl;
                    } else {
                        // Error handling
                        this.nextBtn.innerText = "UPLINK ERROR (RETRY?)";
                        this.nextBtn.disabled = false;
                        this.nextBtn.style.opacity = "1.0";
                    }
                })
                .catch(err => {
                    console.error("Level Sync Failed", err);
                    this.nextBtn.innerText = "CONNECTION LOST (FORCE RELOAD)";
                    this.nextBtn.disabled = false;
                    this.nextBtn.style.opacity = "1.0";
                });
        }
    }
}