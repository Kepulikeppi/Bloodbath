import * as THREE from 'https://esm.sh/three@0.160.0';
import { Engine } from './Core/Engine.js';
import { Input } from './Core/Input.js';
import { Player } from './Game/Player.js';
import { DungeonGenerator } from './ProcGen/DungeonGenerator.js';
import { LevelBuilder } from './ProcGen/LevelBuilder.js';
import { Config } from './Config.js';
import { AudioManager } from './Core/AudioManager.js';
import { Minimap } from './Game/Minimap.js';
import { WeaponConfig } from './WeaponConfig.js';
import { RangedWeapon } from './Game/Weapons/RangedWeapon.js';
import { Enemy } from './Game/Enemy.js';
import { DebrisSystem } from './Game/DebrisSystem.js';

console.log("1. Game Script Loaded");

// --- 1. GET SETTINGS ---
const urlParams = new URLSearchParams(window.location.search);
const seed = urlParams.get('seed') || "DEFAULT";
let currentLevel = parseInt(urlParams.get('level')) || 1;

// UI References
const loadingScreen = document.getElementById('loading-screen');
const loadingTitle = document.getElementById('loading-title');
const loadingText = document.getElementById('loading-text');
const loadingBar = document.getElementById('loading-bar');

if(loadingTitle) loadingTitle.innerText = "LEVEL " + currentLevel;

let savedVolume = Config.AUDIO_DEFAULT_VOL;
try {
    const v = localStorage.getItem('bloodbath_volume');
    if(v !== null) savedVolume = parseFloat(v);
} catch(e) {}

// --- 2. SETUP SYSTEMS ---
const input = new Input();
const audioManager = new AudioManager();
audioManager.setPlaylist(Config.PLAYLIST);
audioManager.setVolume(savedVolume);

let player = null;
let weapon = null;
let minimap = null;
let enemies = []; 
let exitObject = null; 
let gameActive = false; // Start paused
let isLevelReady = false;
let levelMeshes = []; // For wall splats

const raycaster = new THREE.Raycaster();

const engine = new Engine((delta) => {
    if (!gameActive) return;
    
    if (player && engine.controls.isLocked) {
        player.update(delta, input);
        checkExitCondition();
        
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
    }
});

engine.renderer.domElement.id = 'game-canvas';

// --- 3. ASYNC LOADING SEQUENCE ---
let generator, mapData, debrisSystem, builder;

function loadLevel() {
    if(loadingBar) loadingBar.style.width = "10%";
    if(loadingText) loadingText.innerText = "GENERATING SECTOR...";

    setTimeout(() => {
        // A. Initialize Systems
        debrisSystem = new DebrisSystem(engine.scene); 
        if(loadingBar) loadingBar.style.width = "30%";

        // B. Generate World
        const levelScale = 1 + (currentLevel * 0.1);
        const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
        const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);
        
        console.log(`Generating Map: ${mapWidth}x${mapHeight}`);
        generator = new DungeonGenerator(seed, mapWidth, mapHeight);
        mapData = generator.generate();
        
        if(loadingBar) loadingBar.style.width = "60%";

        // C. Build Mesh
        builder = new LevelBuilder(engine.scene);
        builder.build(mapData);
        
        // Collect level meshes for raycasting (walls/floors)
        levelMeshes = [];
        engine.scene.traverse(obj => {
            if (obj.isInstancedMesh) levelMeshes.push(obj);
        });

        if(loadingBar) loadingBar.style.width = "80%";

        // D. Spawn Objects
        spawnGameObjects();
        if(loadingBar) loadingBar.style.width = "90%";

        // E. WARM UP RENDER
        engine.renderer.render(engine.scene, engine.camera);
        
        // F. Finish
        if(loadingBar) loadingBar.style.width = "100%";
        if(loadingText) loadingText.innerText = "CLICK TO START";
        isLevelReady = true;
        
    }, 100);
}

function spawnGameObjects() {
    const spawnPoint = findSafeSpawn();
    engine.camera.position.set(spawnPoint.x + 0.5, Config.EYE_HEIGHT, spawnPoint.z + 0.5);
    
    player = new Player(engine.camera, mapData, audioManager);
    weapon = new RangedWeapon(engine.camera, WeaponConfig.PISTOL_9MM, audioManager);
    minimap = new Minimap(mapData);
    
    enemies = []; 
    if (generator.rooms) {
        generator.rooms.forEach((room) => {
            if (room === generator.startRoom) return;
            const enemy = new Enemy(engine.scene, room.center.x, room.center.y, 'FLOATING_DIAMOND');
            enemies.push(enemy);
        });
    }

    if (generator.endRoom) {
        exitObject = builder.createExit(generator.endRoom.center.x, generator.endRoom.center.y);
    }
}

loadLevel();

// --- 4. HELPERS ---

function isFloor(x, y) {
    return y >= 0 && y < mapData.length && x >= 0 && x < mapData[0].length && mapData[y][x] === 0;
}

function findSafeSpawn() {
    if (generator.startRoom) {
        const cx = generator.startRoom.center.x;
        const cy = generator.startRoom.center.y;
        if (isFloor(cx, cy) && isFloor(cx+1, cy) && isFloor(cx-1, cy) && isFloor(cx, cy+1) && isFloor(cx, cy-1)) {
            return { x: cx, z: cy };
        }
    }
    for (let y = 2; y < mapData.length - 2; y++) {
        for (let x = 2; x < mapData[0].length - 2; x++) {
            let allFloor = true;
            for(let dy = -1; dy <= 1; dy++) {
                for(let dx = -1; dx <= 1; dx++) {
                    if (!isFloor(x+dx, y+dy)) allFloor = false;
                }
            }
            if (allFloor) return { x: x, z: y };
        }
    }
    return { x: 10, z: 10 };
}

function checkExitCondition() {
    if (!exitObject) return;
    const dx = engine.camera.position.x - exitObject.position.x;
    const dz = engine.camera.position.z - exitObject.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < 1.5) finishLevel();
}

function finishLevel() {
    gameActive = false;
    engine.controls.unlock(); 
    document.body.style.cursor = 'default';
    const levelScreen = document.getElementById('level-screen');
    if (levelScreen) {
        levelScreen.style.display = 'flex';
        document.getElementById('score-level').innerText = currentLevel;
    }
}

// --- 5. INPUT & SHOOTING ---

document.addEventListener('mousedown', (e) => {
    // Only shoot if game is active AND mouse is locked
    if (gameActive && engine.controls.isLocked && weapon) {
        if (e.button === 0) { 
            const didShoot = weapon.trigger(); 
            
            if (didShoot) {
                raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
                
                const enemyMeshes = enemies.map(e => e.mesh);
                // Combine Enemies and Level Geometry for hit detection
                const allTargets = [...enemyMeshes, ...levelMeshes];
                
                const hits = raycaster.intersectObjects(allTargets, true); 

                if (hits.length > 0) {
                    // Filter close hits (barrel clipping)
                    const validHit = hits.find(h => h.distance > 0.5);
                    
                    if (validHit) {
                        const hitObject = validHit.object;
                        
                        // Check if Enemy
                        let target = hitObject;
                        while(target && !target.userData.parent) target = target.parent;
                        const enemyInstance = target ? target.userData.parent : null;
                        
                        const hitPoint = validHit.point;
                        const normal = validHit.face.normal;
                        const shootDir = engine.camera.getWorldDirection(new THREE.Vector3());

                        if (enemyInstance) {
                            // HIT ENEMY
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
                                debrisSystem.spawnBlood(hitPoint, shootDir);
                                debrisSystem.spawnSplat(enemyInstance.mesh.position, new THREE.Vector3(0,1,0));
                            }
                        } else {
                            // HIT WALL/FLOOR (Spawn Decal)
                            debrisSystem.spawnSplat(hitPoint, normal);
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

// --- 6. UI HANDLERS ---
const pauseMenu = document.getElementById('pause-menu');
const crosshair = document.getElementById('crosshair');
const startPrompt = document.getElementById('start-prompt');

// Start Click (Loading Screen -> Game)
document.body.addEventListener('click', () => {
    if (!isLevelReady) return;

    if (audioManager.listener.context.state === 'suspended') {
        audioManager.listener.context.resume();
    }

    // Hide Loading Screen
    if (loadingScreen && loadingScreen.style.display !== 'none') {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
        
        gameActive = true;
        engine.controls.lock();
        
        if (sessionStorage.getItem('bloodbath_music_active') === 'true' && !audioManager.isPlaying) {
            audioManager.play();
        }
        return;
    }

    // Normal Resume
    if (gameActive && !engine.controls.isLocked && pauseMenu.style.display === 'none') {
        engine.controls.lock();
    }
});

engine.controls.addEventListener('unlock', () => {
    if (gameActive) {
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

document.getElementById('btn-resume').addEventListener('click', () => engine.controls.lock());
document.getElementById('btn-quit').addEventListener('click', () => window.location.href = 'index.html');
document.getElementById('btn-next-level').addEventListener('click', () => {
    if (audioManager.isPlaying) sessionStorage.setItem('bloodbath_music_active', 'true');
    else sessionStorage.setItem('bloodbath_music_active', 'false');

    const nextLevel = currentLevel + 1;
    const nextSeed = "SEED-" + Math.floor(Math.random() * 999999);
    window.location.href = `game.html?seed=${nextSeed}&level=${nextLevel}`;
});

// Audio UI
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

// --- DEBUG ---
function printConsoleMap(map, start, end) { /*...*/ }
console.log("Game Ready.");