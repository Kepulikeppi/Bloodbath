import { Config } from '../Config.js';
import { UIConfig } from '../UIConfig.js';
import { DungeonGenerator } from '../ProcGen/DungeonGenerator.js';
import { LevelBuilder } from '../ProcGen/LevelBuilder.js';
import { Spawner } from './Spawner.js';
import { DebrisSystem } from './DebrisSystem.js';
import { state } from './GameState.js'; 

export class LevelManager {
    constructor(engine, loadingUI, audioManager) {
        this.engine = engine;
        this.loadingUI = loadingUI;
        this.audioManager = audioManager;
        
        this.ui = document.getElementById('level-screen');
        this.nextBtn = document.getElementById('btn-next-level');
        
        this.isLevelFinished = false;
        this.currentLevel = 1; 

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
        
        if(this.loadingUI) this.loadingUI.update(10, UIConfig.LOADING.STEP_GEN);

        setTimeout(() => {
            const debrisSystem = new DebrisSystem(this.engine.scene); 
            if(this.loadingUI) this.loadingUI.update(30, UIConfig.LOADING.STEP_GEN);

            const levelScale = 1 + (this.currentLevel * 0.1);
            const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
            const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
            
            console.log(`[LevelManager] Gen: ${mapWidth}x${mapHeight} (Seed: ${seed})`);
            
            const generator = new DungeonGenerator(seed, mapWidth, mapHeight);
            const mapData = generator.generate();
            
            if(this.loadingUI) this.loadingUI.update(60, UIConfig.LOADING.STEP_GEO);

            import('../ProcGen/LevelBuilder.js').then(async Module => {
                const builder = new Module.LevelBuilder(this.engine.scene);
                builder.build(mapData);
                
                if(this.loadingUI) this.loadingUI.update(70, UIConfig.LOADING.STEP_ASSETS);
                await builder.waitForLoad(); 

                const levelMeshes = [];
                this.engine.scene.traverse(obj => {
                    if (obj.isMesh) levelMeshes.push(obj);
                });

                if(this.loadingUI) this.loadingUI.update(80, UIConfig.LOADING.STEP_SPAWN);

                const entities = Spawner.spawnEntities(
                    this.engine, 
                    mapData, 
                    generator, 
                    builder, 
                    this.audioManager
                );

                if(this.loadingUI) this.loadingUI.update(90, UIConfig.LOADING.STEP_SHADER);

                // === SHADOW MAP WARMUP ===
                
                const tacticalFlash = this.engine.flashlight;
                const startRotY = this.engine.camera.rotation.y;
                let originalIntensity = Config.FL_INTENSITY;
                let originalAngle = Config.FL_ANGLE;

                // 1. Disable Frustum Culling globally
                const cullingState = new Map();
                this.engine.scene.traverse(obj => {
                    if (obj.isMesh) {
                        cullingState.set(obj, obj.frustumCulled);
                        obj.frustumCulled = false; 
                    }
                });

                // 2. Super-Charge the Tactical Flashlight
                if (tacticalFlash) {
                    originalIntensity = tacticalFlash.intensity;
                    originalAngle = tacticalFlash.angle;
                    
                    tacticalFlash.intensity = Config.FL_INTENSITY;
                    tacticalFlash.angle = Math.PI / 2; // Wide angle for maximum coverage
                    tacticalFlash.updateMatrixWorld(true);
                }

                // 3. Force shadow map allocation with initial render
                if (tacticalFlash && tacticalFlash.shadow) {
                    tacticalFlash.shadow.needsUpdate = true;
                }
                this.engine.renderer.shadowMap.needsUpdate = true;
                this.engine.renderer.render(this.engine.scene, this.engine.camera);

                // 4. Spin to render shadows in all 8 directions
                for (let i = 0; i < 8; i++) {
                    this.engine.camera.rotation.y = startRotY + (i * (Math.PI / 4));
                    this.engine.camera.updateMatrixWorld(true);
                    
                    if (tacticalFlash && tacticalFlash.shadow) {
                        tacticalFlash.shadow.needsUpdate = true;
                    }
                    this.engine.renderer.render(this.engine.scene, this.engine.camera);
                }

                // 5. Restore Everything
                this.engine.camera.rotation.y = startRotY;
                this.engine.camera.updateMatrixWorld(true);

                if (tacticalFlash) {
                    tacticalFlash.intensity = originalIntensity > 0.1 ? originalIntensity : 0.001; 
                    tacticalFlash.angle = originalAngle;
                }

                this.engine.scene.traverse(obj => {
                    if (obj.isMesh && cullingState.has(obj)) {
                        obj.frustumCulled = cullingState.get(obj);
                    }
                });

                this.engine.renderer.shadowMap.needsUpdate = false;
                // =========================

                if(this.loadingUI) this.loadingUI.complete();

                onComplete({
                    player: entities.player,
                    weapon: entities.weapon,
                    enemies: entities.enemies,
                    exitObject: entities.exit,
                    pickups: entities.pickups || [],
                    minimapData: mapData,
                    debrisSystem: debrisSystem,
                    levelMeshes: levelMeshes,
                    generator: generator 
                });
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

        this.engine.controls.unlock();
        document.body.style.cursor = 'default';
        
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

        if (this.nextBtn) {
            this.nextBtn.disabled = true;
            this.nextBtn.style.opacity = "0.5";
            this.nextBtn.innerText = UIConfig.LEVEL_END.BTN_UPLINKING;

            fetch('api/level_complete.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'ok') {
                        const nextLvl = this.currentLevel + 1;
                        sessionStorage.setItem('bloodbath_level_cache', nextLvl);

                        this.nextBtn.innerText = UIConfig.LEVEL_END.BTN_ENTER_PREFIX + nextLvl;
                        this.nextBtn.disabled = false;
                        this.nextBtn.style.opacity = "1.0";
                    } else {
                        console.error("Server Error:", data);
                        this.nextBtn.innerText = UIConfig.LEVEL_END.BTN_ERROR_SERVER;
                        this.nextBtn.disabled = false;
                        this.nextBtn.style.opacity = "1.0";
                    }
                })
                .catch(err => {
                    console.error("Level Sync Failed", err);
                    this.nextBtn.innerText = UIConfig.LEVEL_END.BTN_ERROR_NET;
                    this.nextBtn.disabled = false;
                    this.nextBtn.style.opacity = "1.0";
                });
        }
    }
}