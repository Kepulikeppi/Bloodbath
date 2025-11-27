import * as THREE from 'https://esm.sh/three@0.160.0';
import { Engine } from './Core/Engine.js';
import { Input } from './Core/Input.js';
import { DungeonGenerator } from './ProcGen/DungeonGenerator.js';
import { LevelBuilder } from './ProcGen/LevelBuilder.js';
import { Config } from './Config.js';
import { AudioManager } from './Core/AudioManager.js';
import { Minimap } from './Game/Minimap.js';
import { WeaponConfig } from './WeaponConfig.js';
import { DebrisSystem } from './Game/DebrisSystem.js';
import { LoadingScreen } from './UI/LoadingScreen.js';
import { LevelManager } from './Game/LevelManager.js';
import { Spawner } from './Game/Spawner.js';
import { GameState, state } from './Game/GameState.js';
import { HUD } from './UI/HUD.js';

console.log("1. Game Script Loaded");

// --- 1. GET SETTINGS ---
const urlParams = new URLSearchParams(window.location.search);
const seed = urlParams.get('seed') || "DEFAULT";
let currentLevel = parseInt(urlParams.get('level')) || 1;
console.log(`INIT: Level ${currentLevel} | Seed: ${seed}`);

let savedVolume = Config.AUDIO_DEFAULT_VOL;
try {
    const v = localStorage.getItem('bloodbath_volume');
    if(v !== null) savedVolume = parseFloat(v);
} catch(e) {}

// --- 2. SETUP SYSTEMS ---
const input = new Input();
const loadingUI = new LoadingScreen();
loadingUI.setTitle(currentLevel);

const audioManager = new AudioManager();
audioManager.setPlaylist(Config.PLAYLIST);
audioManager.setVolume(savedVolume);

state.load();
const hud = new HUD();

let player = null;
let weapon = null;
let minimap = null;
let enemies = []; 
let exitObject = null; 
let gameActive = false; 
let isLevelReady = false;
let levelMeshes = []; 

const raycaster = new THREE.Raycaster();

const engine = new Engine((delta) => {
    if (!gameActive) return;
    
    if (player && engine.controls.isLocked) {
        player.update(delta, input);
        
        // Check Exit via LevelManager
        if (levelManager) levelManager.checkExit(player, exitObject);
        
        if (weapon) {
            const isMoving = input.keys.forward || input.keys.backward || input.keys.left || input.keys.right;
            weapon.update(delta, isMoving, engine.clock.elapsedTime);
        }

        enemies.forEach(enemy => enemy.update(delta, engine.camera.position, mapData));
        if (debrisSystem) debrisSystem.update(delta);

        if (minimap) {
            const exitPos = generator.endRoom ? { x: generator.endRoom.center.x, z: generator.endRoom.center.y } : null;
            minimap.update(engine.camera.position, exitPos);
            minimap.updateFull(engine.camera.position, exitPos);
        }

        if (weapon) {
            // weapon update
        }

        // Refresh HUD (Can be optimized to only run on changes)
        if(hud) hud.update();
    }
});

engine.renderer.domElement.id = 'game-canvas';
const levelManager = new LevelManager(engine, currentLevel, audioManager);

// --- 3. ASYNC LOADING SEQUENCE ---
let generator, mapData, debrisSystem, builder;

function loadLevel() {
    loadingUI.update(10, "GENERATING SECTOR...");

    setTimeout(() => {
        debrisSystem = new DebrisSystem(engine.scene); 
        loadingUI.update(30, "GENERATING SECTOR...");

        const levelScale = 1 + (currentLevel * 0.1);
        const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
        const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
        
        generator = new DungeonGenerator(seed, mapWidth, mapHeight);
        mapData = generator.generate();
        
        loadingUI.update(60, "BUILDING GEOMETRY...");

        builder = new LevelBuilder(engine.scene);
        builder.build(mapData);
        
        levelMeshes = [];
        engine.scene.traverse(obj => {
            if (obj.isInstancedMesh) levelMeshes.push(obj);
        });

        loadingUI.update(80, "SPAWNING ENTITIES...");

        // --- SPAWN VIA HELPER ---
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
        
    }, 100);
}

loadLevel();

// --- 4. INPUT HANDLERS ---
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
                        
                        if (enemyInstance) {
                            const damage = WeaponConfig.PISTOL_9MM.damage;
                            const died = enemyInstance.takeDamage(damage);
                            if (died) {
                                audioManager.playSFX('death');
                                enemies = enemies.filter(e => e !== enemyInstance);
                                const gibOrigin = enemyInstance.mesh.position.clone();
                                gibOrigin.y += 1.8; 
                                debrisSystem.spawnGibs(gibOrigin, Config.GORE.COLOR_FLESH); 
                                debrisSystem.spawnGibs(gibOrigin, Config.GORE.COLOR_BONE); 
                                debrisSystem.spawnSplat(enemyInstance.mesh.position, new THREE.Vector3(0,1,0));
                            } else {
                                audioManager.playSFX('hit');
                                debrisSystem.spawnBlood(validHit.point, engine.camera.getWorldDirection(new THREE.Vector3()));
                                debrisSystem.spawnSplat(enemyInstance.mesh.position, new THREE.Vector3(0,1,0));
                            }
                        } else {
                            debrisSystem.spawnSplat(validHit.point, validHit.face.normal);
                        }
                    }
                }
            }
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (!gameActive || !engine.controls.isLocked || !minimap) return;
    switch (e.code) {
        case 'KeyN': minimap.toggleRadar(); break;
        case 'KeyM': minimap.toggleFullMap(); break;
        case 'KeyL': minimap.changeZoom(-5); break; 
        case 'KeyK': minimap.changeZoom(5); break;
        case 'KeyT': 
            const fps = document.getElementById('fps-counter');
            if(fps) fps.style.display = fps.style.display === 'none' ? 'block' : 'none';
            break;
    }
});

// --- 5. UI EVENTS ---
const pauseMenu = document.getElementById('pause-menu');
const crosshair = document.getElementById('crosshair');
const startPrompt = document.getElementById('start-prompt');

// Engine Locks
engine.controls.addEventListener('unlock', () => {
    // Only show pause menu if level is NOT finished
    if (gameActive && !levelManager.isLevelFinished) {
        pauseMenu.style.display = 'flex';
        crosshair.style.display = 'none';
        document.body.style.cursor = 'default';
    }
});

engine.controls.addEventListener('lock', () => {
    if (gameActive) {
        pauseMenu.style.display = 'none';
        crosshair.style.display = 'block';
        document.body.style.cursor = 'none';
        if (startPrompt) startPrompt.style.display = 'none';
    }
});

// Pause Buttons
document.getElementById('btn-resume').addEventListener('click', () => engine.controls.lock());
document.getElementById('btn-quit').addEventListener('click', () => window.location.href = 'index.html');

// Start Click
document.body.addEventListener('click', () => {
    if (!isLevelReady) return;

    if (audioManager.listener.context.state === 'suspended') {
        audioManager.listener.context.resume();
    }

    // Use Loading Screen Class
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

// Audio UI (Keeping this simple inside game.js for now as it binds to audioManager directly)
window.addEventListener('trackchange', (e) => {
    let fileName = e.detail.split('/').pop().split('.')[0];
    fileName = decodeURIComponent(fileName).toUpperCase();
    const trackContainer = document.getElementById('track-name');
    if (trackContainer) {
        trackContainer.innerHTML = '';
        const sep = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"; 
        const baseString = `${fileName}${sep}${sep}${fileName}${sep}${sep}${fileName}${sep}${sep}`;
        const span1 = document.createElement('span'); span1.innerText = baseString;
        const span2 = document.createElement('span'); span2.innerText = baseString;
        trackContainer.appendChild(span1); trackContainer.appendChild(span2);
    }
});
document.getElementById('btn-play').addEventListener('click', () => audioManager.play());
document.getElementById('btn-next').addEventListener('click', () => audioManager.next());
document.getElementById('btn-stop').addEventListener('click', () => {
    audioManager.stop();
    document.getElementById('track-name').innerText = "";
});
const volSlider = document.getElementById('vol-music');
if(volSlider) {
    volSlider.value = savedVolume;
    volSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        audioManager.setVolume(val);
        try { localStorage.setItem('bloodbath_volume', val); } catch(e){}
    });
}
const canvas = document.getElementById('viz-canvas');
const ctx = canvas.getContext('2d');
function drawLoop() {
    requestAnimationFrame(drawLoop);
    if (!ctx) return;
    const width = canvas.width; const height = canvas.height;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, width, height);
    if (!audioManager.isPlaying) return;
    const data = audioManager.getFrequencyData();
    const barCount = Config.VIZ_BAR_COUNT; 
    const barWidth = width / barCount;
    ctx.fillStyle = '#ff0000';
    for (let i = 0; i < barCount; i++) {
        const index = Config.VIZ_BIN_START + (i * Config.VIZ_BIN_STEP);
        const value = data[index] || 0; 
        const percent = value / 255.0;
        const barHeight = (percent * percent) * height; 
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
}
drawLoop();

console.log("Game Ready.");