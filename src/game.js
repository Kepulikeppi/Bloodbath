import * as THREE from 'https://esm.sh/three@0.160.0';
import { Engine } from './Core/Engine.js';
import { Input } from './Core/Input.js';
import { Config } from './Config.js';
import { AudioManager } from './Core/AudioManager.js';
import { Minimap } from './Game/Minimap.js';
import { WeaponConfig } from './WeaponConfig.js';
import { GameState, state } from './Game/GameState.js';

// Managers
import { LoadingScreen } from './UI/LoadingScreen.js';
import { LevelManager } from './Game/LevelManager.js';
import { HUD } from './UI/HUD.js';
import { MusicPlayerUI } from './UI/MusicPlayerUI.js';
import { Spawner } from './Game/Spawner.js';

console.log("1. Game Script Loaded");

// --- 1. GET SETTINGS ---
const urlParams = new URLSearchParams(window.location.search);
const seed = urlParams.get('seed') || "DEFAULT";
let currentLevel = parseInt(urlParams.get('level')) || 1;

const loadingUI = new LoadingScreen();
loadingUI.setTitle(currentLevel);

let savedVolume = Config.AUDIO_DEFAULT_VOL;
try {
    const v = localStorage.getItem('bloodbath_volume');
    if(v !== null) savedVolume = parseFloat(v);
} catch(e) {}

// --- 2. DECLARE STATE ---
let player = null;
let weapon = null;
let minimap = null;
let enemies = []; 
let exitObject = null; 
let debrisSystem = null;
let levelMeshes = []; 

let gameActive = false; 
let isLevelReady = false;
let isDying = false; 
let deathFallDirection = 0; // 0=Left, 1=Right, 2=Back

// --- 3. SETUP SYSTEMS ---
const input = new Input();
const raycaster = new THREE.Raycaster();

// Audio
const audioManager = new AudioManager();
audioManager.setPlaylist(Config.PLAYLIST);
audioManager.setVolume(savedVolume);

if(Config.SFX_PLAYER_DEATH) {
    const l = new THREE.AudioLoader();
    l.load(Config.SFX_PLAYER_DEATH, (b) => audioManager.sfxBuffers['player_death'] = b);
}

// UI
state.load();
const hud = new HUD();
const musicUI = new MusicPlayerUI(audioManager);

// Engine
const engine = new Engine((delta) => {
    
    // A. DEATH SEQUENCE ANIMATION (UPDATED)
    if (isDying) {
        // 1. Gravity Drop
        if (engine.camera.position.y > 0.2) {
            engine.camera.position.y -= delta * 4.0; // Fast drop
        }

        // 2. Rotation Animation based on Direction
        const rotSpeed = delta * 3.0;

        if (deathFallDirection === 0) { 
            // FALL LEFT (-90 deg Z)
            engine.camera.rotation.z = THREE.MathUtils.lerp(engine.camera.rotation.z, -Math.PI / 2, rotSpeed);
        } 
        else if (deathFallDirection === 1) { 
            // FALL RIGHT (+90 deg Z)
            engine.camera.rotation.z = THREE.MathUtils.lerp(engine.camera.rotation.z, Math.PI / 2, rotSpeed);
        } 
        else { 
            // FALL BACK (+90 deg X - Look at ceiling)
            engine.camera.rotation.x = THREE.MathUtils.lerp(engine.camera.rotation.x, Math.PI / 2, rotSpeed);
        }
        
        return; // STOP all other game logic
    }

    if (!gameActive) return;
    
    // B. NORMAL GAME LOOP
    if (player && engine.controls.isLocked) {
        player.update(delta, input);
        
        // CHECK HEALTH
        if (state.data.hp <= 0 && !isDying) {
            triggerGameOver();
        }

        if (levelManager) levelManager.checkExit(player, exitObject);
        
        if (weapon) {
            const isMoving = input.keys.forward || input.keys.backward || input.keys.left || input.keys.right;
            weapon.update(delta, isMoving, engine.clock.elapsedTime);
        }

        if (enemies.length > 0 && mapData) {
             enemies.forEach(enemy => enemy.update(delta, engine.camera.position, mapData, enemies));
        }
        
        if (debrisSystem) debrisSystem.update(delta);

        if (minimap) {
            const exitPos = exitObject ? { x: exitObject.position.x, z: exitObject.position.z } : null;
            minimap.update(engine.camera.position, exitPos);
            minimap.updateFull(engine.camera.position, exitPos);
        }

        if(hud) hud.update();
    }
});

engine.renderer.domElement.id = 'game-canvas';
audioManager.setCamera(engine.camera); 
const levelManager = new LevelManager(engine, currentLevel, audioManager);

// --- 4. ASYNC LOADING SEQUENCE ---
let mapData; 

function loadLevel() {
    state.data.runStats.startTime = Date.now(); 
    
    loadingUI.update(10, "GENERATING SECTOR...");

    setTimeout(() => {
        import('./Game/DebrisSystem.js').then(Module => {
            debrisSystem = new Module.DebrisSystem(engine.scene);
        });
        
        loadingUI.update(30, "GENERATING SECTOR...");

        const levelScale = 1 + (currentLevel * 0.1);
        const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
        const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
        
        import('./ProcGen/DungeonGenerator.js').then(Module => {
            const generator = new Module.DungeonGenerator(seed, mapWidth, mapHeight);
            mapData = generator.generate();
            
            loadingUI.update(60, "BUILDING GEOMETRY...");

            import('./ProcGen/LevelBuilder.js').then(Module => {
                const builder = new Module.LevelBuilder(engine.scene);
                builder.build(mapData);
                
                levelMeshes = [];
                engine.scene.traverse(obj => {
                    if (obj.isInstancedMesh) levelMeshes.push(obj);
                });

                loadingUI.update(80, "SPAWNING ENTITIES...");

                const entities = Spawner.spawnEntities(engine, mapData, generator, builder, audioManager);
                player = entities.player;
                weapon = entities.weapon;
                enemies = entities.enemies;
                exitObject = entities.exit;
                
                minimap = new Minimap(mapData);
                
                loadingUI.update(90, "COMPILING SHADERS...");

                engine.renderer.render(engine.scene, engine.camera);
                
                loadingUI.complete();
                isLevelReady = true;
            });
        });
        
    }, 100);
}

loadLevel();

// --- 5. DEATH LOGIC ---
function triggerGameOver() {
    isDying = true;
    deathFallDirection = Math.floor(Math.random() * 3);
    
    audioManager.playSFX('player_death');
    
    const overlay = document.getElementById('damage-overlay');
    if (overlay) overlay.style.opacity = '0.55'; 
    
    // DO NOT Unlock controls yet! 
    // If we unlock now, the Engine throttles FPS to 10, killing the animation.
        
    setTimeout(() => {
        showDeathScreen();
    }, 2000);
}

function showDeathScreen() {
    // Unlock controls NOW, so the user can click buttons.
    engine.controls.unlock();

    if (Config.MUSIC_DEATH) {
        audioManager.stop(); 
        const l = new THREE.AudioLoader();
        l.load(Config.MUSIC_DEATH, (buffer) => {
            audioManager.music.setBuffer(buffer);
            audioManager.music.setLoop(true);
            audioManager.music.setVolume(0.5);
            audioManager.music.play();
        });
    }

    document.getElementById('d-level').innerText = currentLevel;
    document.getElementById('d-kills').innerText = state.data.runStats.kills;
    document.getElementById('d-acc').innerText = state.getAccuracy();
    document.getElementById('d-time').innerText = state.getRunTime();

    document.getElementById('game-over-screen').style.display = 'flex';
    document.body.style.cursor = 'default';
}

// --- 6. INPUT HANDLERS ---
document.addEventListener('mousedown', (e) => {
    if (gameActive && !isDying && engine.controls.isLocked && weapon) {
        if (e.button === 0) { 
            const didShoot = weapon.trigger(); 
            if (didShoot) {
                state.recordShot(); 
                
                raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
                const enemyMeshes = enemies.map(e => e.mesh);
                const allTargets = [...enemyMeshes, ...levelMeshes];
                const hits = raycaster.intersectObjects(allTargets, true); 

                if (hits.length > 0) {
                    const validHit = hits.find(h => h.distance > 0.5);
                    if (validHit) {
                        let target = validHit.object;
                        while(target && !target.userData.parent) target = target.parent;
                        const enemyInstance = target ? target.userData.parent : null;

                        const hitPoint = validHit.point;
                        const shootDir = engine.camera.getWorldDirection(new THREE.Vector3());

                        if (enemyInstance) {
                            state.recordHit(); 
                            
                            const damage = WeaponConfig.PISTOL_9MM.damage;
                            const died = enemyInstance.takeDamage(damage);
                            if (died) {
                                state.recordKill(); 
                                audioManager.playSFX('death', enemyInstance.mesh.position);
                                enemies = enemies.filter(e => e !== enemyInstance);
                                
                                const gibOrigin = enemyInstance.mesh.position.clone();
                                gibOrigin.y += 1.8; 
                                if(debrisSystem) {
                                    debrisSystem.spawnGibs(gibOrigin, Config.GORE.COLOR_FLESH); 
                                    debrisSystem.spawnGibs(gibOrigin, Config.GORE.COLOR_BONE); 
                                    debrisSystem.spawnSplat(enemyInstance.mesh.position, new THREE.Vector3(0,1,0));
                                }
                            } else {
                                audioManager.playSFX('hit', enemyInstance.mesh.position);
                                if(debrisSystem) {
                                    debrisSystem.spawnBlood(hitPoint, shootDir);
                                    debrisSystem.spawnSplat(enemyInstance.mesh.position, new THREE.Vector3(0,1,0));
                                }
                            }
                        } else {
                            if(debrisSystem) debrisSystem.spawnSplat(validHit.point, validHit.face.normal);
                        }
                    }
                }
            }
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (!gameActive || isDying) return; 
    if (!engine.controls.isLocked) return;
    
    switch (e.code) {
        case 'KeyN': if(minimap) minimap.toggleRadar(); break;
        case 'KeyM': if(minimap) minimap.toggleFullMap(); break;
        case 'KeyL': if(minimap) minimap.changeZoom(-5); break; 
        case 'KeyK': if(minimap) minimap.changeZoom(5); break;
        case 'KeyR': if(weapon) weapon.reload(); break;
        case 'KeyF': engine.toggleFlashlight(); break; 
        case 'KeyT': 
            const fps = document.getElementById('fps-counter');
            if(fps) fps.style.display = fps.style.display === 'none' ? 'block' : 'none';
            break;
    }
});

// --- 7. UI EVENTS ---
const pauseMenu = document.getElementById('pause-menu');
const crosshair = document.getElementById('crosshair');

engine.controls.addEventListener('unlock', () => {
    if (isDying) return;

    if (gameActive && !levelManager.isLevelFinished) {
        pauseMenu.style.display = 'flex';
        crosshair.style.display = 'none';
        document.body.style.cursor = 'default';
    }
});

engine.controls.addEventListener('lock', () => {
    if (gameActive && !isDying) {
        pauseMenu.style.display = 'none';
        crosshair.style.display = 'block';
        document.body.style.cursor = 'none';
    }
});

document.getElementById('btn-resume').addEventListener('click', () => {
    if(!isDying) engine.controls.lock();
});
document.getElementById('btn-quit').addEventListener('click', () => window.location.href = 'index.html');

document.getElementById('btn-restart').addEventListener('click', () => {
    state.data.hp = state.data.maxHp;
    state.reset(); 
    window.location.href = window.location.href.split('?')[0] + '?seed=' + Math.floor(Math.random()*9999);
});
document.getElementById('btn-menu').addEventListener('click', () => window.location.href = 'index.html');

document.body.addEventListener('click', () => {
    if (!isLevelReady) return;
    if (isDying) return; 

    if (audioManager.listener.context.state === 'suspended') {
        audioManager.listener.context.resume();
    }
    audioManager.startAmbience();

    if (loadingUI.isVisible()) {
        loadingUI.hide();
        gameActive = true;
        engine.controls.lock();
        if (sessionStorage.getItem('bloodbath_music_active') === 'true' && !audioManager.isPlaying) {
            audioManager.play();
        }
        return;
    }

    if (gameActive && !engine.controls.isLocked && pauseMenu.style.display === 'none') {
        engine.controls.lock();
    }
});

console.log("Game Ready.");