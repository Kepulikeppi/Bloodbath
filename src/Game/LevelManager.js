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

            import('./ProcGen/LevelBuilder.js').then(async Module => {
                const builder = new Module.LevelBuilder(this.engine.scene);
                builder.build(mapData);
                
                if(this.loadingUI) this.loadingUI.update(70, UIConfig.LOADING.STEP_ASSETS);
                await builder.waitForLoad(); 

                const levelMeshes = [];
                this.engine.scene.traverse(obj => {
                    if (obj.isInstancedMesh) levelMeshes.push(obj);
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

                // === CORRECTED FIX: TACTICAL FLASHLIGHT WARMUP ===
                
                // 1. Identify the Main Tactical Flashlight (from Engine)
                const tacticalFlash = this.engine.flashlight;
                const startRotY = this.engine.camera.rotation.y;
                let originalIntensity = 0;
                let originalAngle = 0;

                // 2. Disable Frustum Culling globally (Force Geometry Upload)
                const cullingState = new Map();
                this.engine.scene.traverse(obj => {
                    if (obj.isMesh) {
                        cullingState.set(obj, obj.frustumCulled);
                        obj.frustumCulled = false; 
                    }
                });

                // 3. Super-Charge the Tactical Flashlight
                // We make it wide and bright to hit all walls in the frustum
                if (tacticalFlash) {
                    originalIntensity = tacticalFlash.intensity;
                    originalAngle = tacticalFlash.angle;
                    
                    tacticalFlash.intensity = 1.0; 
                    // Make it wide enough to catch corners, but not so wide it breaks the shadow map projection
                    tacticalFlash.angle = Math.PI / 2.5; 
                    tacticalFlash.updateMatrixWorld(true);
                    
                    // Reset shadow map to force clean render
                    if (tacticalFlash.shadow && tacticalFlash.shadow.map) {
                        tacticalFlash.shadow.map.dispose();
                        tacticalFlash.shadow.needsUpdate = true;
                    }
                }

                // 4. Force Shader Compilation
                this.engine.renderer.compile(this.engine.scene, this.engine.camera);

                // 5. THE SPIN CYCLE
                // Rotate camera 360 degrees in 4 steps.
                // This forces the SpotLight (attached to camera) to project shadows 
                // on the North, East, South, and West walls.
                for(let i = 0; i < 4; i++) {
                    this.engine.camera.rotation.y = startRotY + (i * (Math.PI / 2));
                    this.engine.camera.updateMatrixWorld(true);
                    this.engine.renderer.render(this.engine.scene, this.engine.camera);
                }

                // 6. Restore Everything
                this.engine.camera.rotation.y = startRotY;
                this.engine.camera.updateMatrixWorld(true);

                if (tacticalFlash) {
                    // Restore to previous state (Engine defaults to On or KeepAlive)
                    tacticalFlash.intensity = originalIntensity > 0.1 ? originalIntensity : 0.001; 
                    tacticalFlash.angle = originalAngle;
                }

                this.engine.scene.traverse(obj => {
                    if (obj.isMesh && cullingState.has(obj)) {
                        obj.frustumCulled = cullingState.get(obj);
                    }
                });
                // =================================================

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