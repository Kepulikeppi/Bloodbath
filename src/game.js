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

// Entities
import { Spawner } from './Game/Spawner.js'; // Fix: Ensure Spawner is imported to spawn things

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

// --- 2. DECLARE STATE (Moved Up) ---
// Crucial: These must be defined BEFORE the Engine starts!
let player = null;
let weapon = null;
let minimap = null;
let enemies = []; 
let exitObject = null; 
let debrisSystem = null;
let levelMeshes = []; 

let gameActive = false; 
let isLevelReady = false;

// --- 3. SETUP SYSTEMS ---
const input = new Input();
const raycaster = new THREE.Raycaster();

// Audio
const audioManager = new AudioManager();
audioManager.setPlaylist(Config.PLAYLIST);
audioManager.setVolume(savedVolume);

// UI
state.load();
const hud = new HUD();
const musicUI = new MusicPlayerUI(audioManager);

// Engine (Now safe to create because gameActive exists)
const engine = new Engine((delta) => {
    if (!gameActive) return;
    
    if (player && engine.controls.isLocked) {
        player.update(delta, input);
        
        // Check Exit
        if (levelManager) levelManager.checkExit(player, exitObject);
        
        // Check Weapon
        if (weapon) {
            const isMoving = input.keys.forward || input.keys.backward || input.keys.left || input.keys.right;
            weapon.update(delta, isMoving, engine.clock.elapsedTime);
        }

        // Check Enemies
        // Note: enemies needs mapData, which comes from loadLevel. 
        // We'll assume mapData is available in the closure after loading.
        if(enemies.length > 0 && minimap) {
             enemies.forEach(enemy => enemy.update(delta, engine.camera.position, minimap.map));
        }
        
        // Check Debris
        if (debrisSystem) debrisSystem.update(delta);

        // Check Maps
        
        if (minimap) {
            const exitPos = exitObject ? { x: exitObject.position.x, z: exitObject.position.z } : null;
            minimap.update(engine.camera.position, exitPos);
            minimap.updateFull(engine.camera.position, exitPos);
        }
        
        // Update HUD
        if(hud) hud.update();
    }
});

audioManager.setCamera(engine.camera);

engine.renderer.domElement.id = 'game-canvas';
const levelManager = new LevelManager(engine, currentLevel, audioManager);

// --- 4. ASYNC LOADING SEQUENCE ---
// We declare mapData here so the engine loop can see it later
let mapData; 

function loadLevel() {
    loadingUI.update(10, "GENERATING SECTOR...");

    setTimeout(() => {
        // A. Debris
        // (We must import DebrisSystem at the top or use the Spawner if you moved it there, 
        // assuming DebrisSystem is imported from './Game/DebrisSystem.js')
        import('./Game/DebrisSystem.js').then(Module => {
            debrisSystem = new Module.DebrisSystem(engine.scene);
        });
        
        loadingUI.update(30, "GENERATING SECTOR...");

        const levelScale = 1 + (currentLevel * 0.1);
        const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
        const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
        
        // We need these classes available, assuming they are imported or handled by LevelManager/Spawner
        // Since we moved logic to LevelManager, ideally we should use LevelManager.loadLevel here,
        // but to keep your current structure working without rewriting LevelManager again:
        
        // We will use the LevelManager we created to do the heavy lifting if possible, 
        // OR stick to the manual loading here. Let's stick to manual here for safety since we are fixing game.js.
        
        import('./ProcGen/DungeonGenerator.js').then(Module => {
            const generator = new Module.DungeonGenerator(seed, mapWidth, mapHeight);
            mapData = generator.generate();
            
            loadingUI.update(60, "BUILDING GEOMETRY...");

            import('./ProcGen/LevelBuilder.js').then(Module => {
                const builder = new Module.LevelBuilder(engine.scene);
                builder.build(mapData);
                
                // Collect static meshes
                levelMeshes = [];
                engine.scene.traverse(obj => {
                    if (obj.isInstancedMesh) levelMeshes.push(obj);
                });

                loadingUI.update(80, "SPAWNING ENTITIES...");

                // Spawn
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

// Initialize Loading
loadLevel();

// --- 5. INPUT HANDLERS ---
document.addEventListener('mousedown', (e) => {
    if (gameActive && engine.controls.isLocked && weapon) {
        if (e.button === 0) { 
            const didShoot = weapon.trigger(); 
            if (didShoot) {
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
                            const damage = WeaponConfig.PISTOL_9MM.damage;
                            const died = enemyInstance.takeDamage(damage);
                            if (died) {
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
    if (!gameActive || !engine.controls.isLocked) return;
    switch (e.code) {
        case 'KeyN': if(minimap) minimap.toggleRadar(); break;
        case 'KeyM': if(minimap) minimap.toggleFullMap(); break;
        case 'KeyL': if(minimap) minimap.changeZoom(-5); break; 
        case 'KeyK': if(minimap) minimap.changeZoom(5); break;
        case 'KeyR': if(weapon) weapon.reload(); break;
        case 'KeyT': 
            const fps = document.getElementById('fps-counter');
            if(fps) fps.style.display = fps.style.display === 'none' ? 'block' : 'none';
            break;
    }
});

// --- 6. UI EVENTS ---
const pauseMenu = document.getElementById('pause-menu');
const crosshair = document.getElementById('crosshair');
const startPrompt = document.getElementById('start-prompt');

engine.controls.addEventListener('unlock', () => {
    if (gameActive && !levelManager.isLevelFinished) {
        // Capture screenshot of the game
        const screenshot = engine.renderer.domElement.toDataURL();
        console.log('Screenshot length:', screenshot.length);
        console.log('Screenshot preview:', screenshot.substring(0, 100));


        let img = document.getElementById('pause-background');
        if (!img) {
            img = document.createElement('img');
            img.id = 'pause-background';
            document.body.appendChild(img);
        }
        img.src = screenshot;
        img.style.position = 'fixed';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = '100vw';
        img.style.height = '100vh';
        img.style.zIndex = '2';  // Above canvas (1), below UI elements
        img.style.pointerEvents = 'none';
        img.style.objectFit = 'cover';
        
        // Hide WebGL canvas
        engine.renderer.domElement.style.visibility = 'hidden';
        
        pauseMenu.style.display = 'flex';
        crosshair.style.display = 'none';
        document.body.style.cursor = 'default';
    }
});

engine.controls.addEventListener('lock', () => {
    if (gameActive) {
        // Remove screenshot
        const img = document.getElementById('pause-background');
        if (img) img.remove();
        
        // Show WebGL canvas
        engine.renderer.domElement.style.visibility = 'visible';
        
        pauseMenu.style.display = 'none';
        crosshair.style.display = 'block';
        document.body.style.cursor = 'none';
        if (startPrompt) startPrompt.style.display = 'none';
    }
});
document.getElementById('btn-resume').addEventListener('click', () => engine.controls.lock());
document.getElementById('btn-quit').addEventListener('click', () => window.location.href = 'index.html');

document.body.addEventListener('click', () => {
    if (!isLevelReady) return;

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