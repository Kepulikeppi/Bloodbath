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
        this.levelText = document.getElementById('score-level');
        this.nextBtn = document.getElementById('btn-next-level');
        
        this.isLevelFinished = false;
        this.currentLevel = 1;

        // Bind Next Level Button
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.transitionToNextLevel());
        }
    }

    // --- LOADING LOGIC ---
    loadLevel(level, seed, onComplete) {
        this.currentLevel = level;
        this.isLevelFinished = false;
        
        // 1. Start UI
        this.loadingUI.update(10, "GENERATING SECTOR...");

        // Use timeout to allow UI to render
        setTimeout(() => {
            // 2. Init Systems
            const debrisSystem = new DebrisSystem(this.engine.scene); 
            this.loadingUI.update(30, "GENERATING SECTOR...");

            // 3. Generate Map Data
            const levelScale = 1 + (this.currentLevel * 0.1);
            const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
            const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
            
            console.log(`[LevelManager] Gen: ${mapWidth}x${mapHeight} (Seed: ${seed})`);
            
            const generator = new DungeonGenerator(seed, mapWidth, mapHeight);
            const mapData = generator.generate();
            
            this.loadingUI.update(60, "BUILDING GEOMETRY...");

            // 4. Build 3D World
            const builder = new LevelBuilder(this.engine.scene);
            builder.build(mapData);
            
            // Collect static meshes for Raycasting (Optimization)
            const levelMeshes = [];
            this.engine.scene.traverse(obj => {
                if (obj.isInstancedMesh) levelMeshes.push(obj);
            });

            this.loadingUI.update(80, "SPAWNING ENTITIES...");

            // 5. Spawn Everything (Using Spawner Helper)
            const entities = Spawner.spawnEntities(
                this.engine, 
                mapData, 
                generator, 
                builder, 
                this.audioManager
            );

            this.loadingUI.update(90, "COMPILING SHADERS...");

            // 6. Warmup Render (Prevents stutter)
            this.engine.renderer.render(this.engine.scene, this.engine.camera);
            
            this.loadingUI.complete();

            // 7. Return Data to Game Loop
            onComplete({
                player: entities.player,
                weapon: entities.weapon,
                enemies: entities.enemies,
                exitObject: entities.exit,
                minimapData: mapData,
                debrisSystem: debrisSystem,
                levelMeshes: levelMeshes,
                generator: generator // passed for minimap exit check logic if needed
            });
            
        }, 100);
    }

    // --- GAMEPLAY LOGIC ---
    checkExit(player, exitObject) {
        if (this.isLevelFinished || !exitObject || !player) return;

        const dx = this.engine.camera.position.x - exitObject.position.x;
        const dz = this.engine.camera.position.z - exitObject.position.z;
        
        // Simple distance check
        if (Math.sqrt(dx*dx + dz*dz) < 1.5) {
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

    transitionToNextLevel() {
        // Save Audio State
        if (this.audioManager.isPlaying) {
            sessionStorage.setItem('bloodbath_music_active', 'true');
        } else {
            sessionStorage.setItem('bloodbath_music_active', 'false');
        }

        const nextLevel = this.currentLevel + 1;
        const nextSeed = "SEED-" + Math.floor(Math.random() * 999999);
        
        // Reload page (Soft reset architecture)
        window.location.href = `game.html?seed=${nextSeed}&level=${nextLevel}`;
    }
}