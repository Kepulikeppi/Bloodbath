import { Config } from '../Config.js';
import { UIConfig } from '../UIConfig.js';
import { DungeonGenerator } from '../ProcGen/DungeonGenerator.js';
import { LevelBuilder } from '../ProcGen/LevelBuilder.js';
import { Spawner } from './Spawner.js';
import { DebrisSystem } from './DebrisSystem.js';
import { state } from './GameState.js'; 
import { TechTreeUI } from '../UI/TechTreeUI.js';
import { Minimap } from './Minimap.js';
import { LightManager } from './LightManager.js';
import { WeaponFactory } from './Weapons/WeaponFactory.js';
import { Pickup } from './Pickup.js';

export class LevelManager {
    constructor(engine, loadingUI, audioManager) {
        this.engine = engine;
        this.loadingUI = loadingUI;
        this.audioManager = audioManager;
        
        this.startTime = null; 

        this.ui = document.getElementById('level-screen');
        this.nextBtn = document.getElementById('btn-next-level');
        
        this.isLevelFinished = false;
        this.currentLevel = 1; 

        this.techTree = new TechTreeUI(() => {
            const payload = { player_data: state.data };
            fetch('api/save_progress.php', {
                method: 'POST',
                body: JSON.stringify(payload)
            }).then(() => this.handleReload())
              .catch(() => this.handleReload());
        });

        if (this.nextBtn) {
            const newBtn = this.nextBtn.cloneNode(true);
            this.nextBtn.parentNode.replaceChild(newBtn, this.nextBtn);
            this.nextBtn = newBtn;
            this.nextBtn.addEventListener('click', () => this.handleReload());
        }
    }

    handleReload() {
        if (this.audioManager.isPlaying) {
            sessionStorage.setItem('bloodbath_music_active', 'true');
        } else {
            sessionStorage.setItem('bloodbath_music_active', 'false');
        }
        window.location.reload();
    }

    startTimer() {
        this.startTime = Date.now();
    }

    getLevelTime() {
        if (!this.startTime) return "00m 00s";
        const ms = Date.now() - this.startTime;
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        const secStr = seconds.length < 2 ? "0" + seconds : seconds;
        return `${minutes}m ${secStr}s`;
    }

    // === MAIN LOADING LOGIC ===
    async loadCurrentLevel(onComplete) {
        let currentSeed = Date.now() + "_" + Math.floor(Math.random() * 1000); 

        // 1. SYNC WAIT: We must await the fetch before doing ANYTHING else.
        try {
            const res = await fetch('api/get_status.php');
            const data = await res.json();
            
            if (data.seed) currentSeed = data.seed;
            
            if (data.active) {
                // Correctly update level before generation starts
                this.currentLevel = parseInt(data.level); 
                
                // Restore player state (Ammo, HP)
                if (data.player_data) {
                    console.log("[LevelManager] Restoring player state...");
                    state.setData(data.player_data);
                }
            }
        } catch(e) {
            console.warn("API Error, using defaults", e);
        }

        // 2. NOW we can update the UI with the correct level number
        this.loadingUI.setTitle(this.currentLevel); 
        this.loadingUI.update(10, UIConfig.LOADING.STEP_GEN);

        // 3. Start Generation Pipeline
        setTimeout(async () => {
            const debrisSystem = new DebrisSystem(this.engine.scene); 
            this.loadingUI.update(30, UIConfig.LOADING.STEP_GEN);

            const levelScale = 1 + (this.currentLevel * 0.1);
            const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
            const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
            
            console.log(`[LevelManager] Gen: ${mapWidth}x${mapHeight} (Level ${this.currentLevel}, Seed: ${currentSeed})`);
            
            const generator = new DungeonGenerator(currentSeed, mapWidth, mapHeight);
            const mapData = generator.generate();
            
            this.loadingUI.update(60, UIConfig.LOADING.STEP_GEO);

            const builder = new LevelBuilder(this.engine.scene);
            builder.build(mapData);
            
            this.loadingUI.update(70, UIConfig.LOADING.STEP_ASSETS);
            await builder.waitForLoad(); 

            const levelMeshes = [];
            this.engine.scene.traverse(obj => {
                if (obj.isInstancedMesh) levelMeshes.push(obj);
            });

            this.loadingUI.update(80, UIConfig.LOADING.STEP_SPAWN);

            LightManager.init(this.engine.scene, 20);
            
            const entities = Spawner.spawnEntities(this.engine, mapData, generator, builder, this.audioManager);
            
            // Create Active Weapon based on loaded state
            const activeId = state.data.activeWeaponId || 'PISTOL_9MM';
            const weapon = WeaponFactory.create(activeId, this.engine.camera, this.audioManager);
            entities.weapon = weapon;

            const pickups = entities.pickups || [];
            const minimap = new Minimap(mapData);
            
            this.loadingUI.update(90, UIConfig.LOADING.STEP_SHADER);

            this.performWarmup(weapon, debrisSystem);

            this.loadingUI.complete();
            
            if (onComplete) {
                onComplete({
                    player: entities.player,
                    weapon: weapon,
                    enemies: entities.enemies,
                    exitObject: entities.exit,
                    pickups: pickups,
                    minimap: minimap,
                    debrisSystem: debrisSystem,
                    levelMeshes: levelMeshes,
                    minimapData: mapData // Important for game.js loop
                });
            }
        }, 100);
    }

    performWarmup(weapon, debrisSystem) {
        const startRotY = this.engine.camera.rotation.y;
        const flash = weapon ? weapon.flashLight : null;
        
        const cullingState = new Map();
        this.engine.scene.traverse(obj => {
            if (obj.isMesh) {
                cullingState.set(obj, obj.frustumCulled);
                obj.frustumCulled = false; 
            }
        });

        if (flash) {
            flash.intensity = 1.0;
            flash.visible = true;
        }

        this.engine.renderer.compile(this.engine.scene, this.engine.camera);

        for(let i = 0; i < 4; i++) {
            this.engine.camera.rotation.y = startRotY + (i * (Math.PI / 2));
            this.engine.camera.updateMatrixWorld(true);
            this.engine.renderer.render(this.engine.scene, this.engine.camera);
        }

        this.engine.camera.rotation.y = startRotY;
        this.engine.camera.updateMatrixWorld(true);
        
        if (flash) flash.intensity = 0.001; 

        this.engine.scene.traverse(obj => {
            if (obj.isMesh && cullingState.has(obj)) {
                obj.frustumCulled = cullingState.get(obj);
            }
        });
        
        if (debrisSystem) debrisSystem.warmup();
        
        this.engine.renderer.render(this.engine.scene, this.engine.camera);
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
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'none';
        
        if (this.ui) {
            this.ui.style.display = 'flex';
            
            const elLevel = document.getElementById('score-level-num');
            if (elLevel) elLevel.innerText = this.currentLevel;

            const elKills = document.getElementById('score-kills');
            if (elKills) elKills.innerText = state.data.runStats.kills;

            const elAcc = document.getElementById('score-acc');
            if (elAcc) elAcc.innerText = state.getAccuracy();

            const elTime = document.getElementById('score-time');
            if (elTime) elTime.innerText = this.getLevelTime();
        }

        if (this.nextBtn) {
            this.nextBtn.disabled = true;
            this.nextBtn.innerText = UIConfig.LEVEL_END.BTN_UPLINKING;

            const payload = { player_data: state.data };

            fetch('api/level_complete.php', {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    const nextLvl = this.currentLevel + 1;
                    sessionStorage.setItem('bloodbath_level_cache', nextLvl);

                    this.nextBtn.innerText = UIConfig.LEVEL_END.BTN_CONTINUE_TECH;
                    this.nextBtn.disabled = false;
                    this.nextBtn.style.opacity = "1.0";
                    
                    const newBtn = this.nextBtn.cloneNode(true);
                    this.nextBtn.parentNode.replaceChild(newBtn, this.nextBtn);
                    this.nextBtn = newBtn;
                    
                    this.nextBtn.addEventListener('click', () => {
                        this.ui.style.display = 'none'; 
                        this.techTree.show();
                        document.body.style.cursor = 'default';
                    });
                } else {
                    this.nextBtn.innerText = UIConfig.LEVEL_END.BTN_ERROR_SERVER;
                    this.nextBtn.disabled = false;
                }
            })
            .catch(err => {
                this.nextBtn.innerText = UIConfig.LEVEL_END.BTN_ERROR_NET;
                this.nextBtn.disabled = false;
            });
        }
    }
}