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

const levelScale = 1 + (currentLevel * 0.1);
const mapWidth = Math.floor(Config.MAP_WIDTH * levelScale);
const mapHeight = Math.floor(Config.MAP_HEIGHT * levelScale);

console.log(`INIT: Level ${currentLevel} | Seed: ${seed} | Size: ${mapWidth}x${mapHeight}`);

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
let gameActive = true; 

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

        enemies.forEach(enemy => {
            enemy.update(delta, engine.camera.position, mapData);
        });

        if (debrisSystem) debrisSystem.update(delta);

        if (minimap) {
            const exitPos = generator.endRoom ? { x: generator.endRoom.center.x, z: generator.endRoom.center.y } : null;
            minimap.update(engine.camera.position, exitPos);
            minimap.updateFull(engine.camera.position, exitPos);
        }
    }
});

engine.renderer.domElement.id = 'game-canvas';

// --- 3. INITIALIZE SYSTEMS ---
const debrisSystem = new DebrisSystem(engine.scene); 

// --- 4. GENERATE WORLD ---
const generator = new DungeonGenerator(seed, mapWidth, mapHeight);
const mapData = generator.generate();
const builder = new LevelBuilder(engine.scene);
builder.build(mapData);

// --- 5. SPAWN PLAYER & ENEMIES ---

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
    console.log(`Spawned ${enemies.length} enemies.`);
}

// --- 6. EXIT LOGIC ---
if (generator.endRoom) {
    exitObject = builder.createExit(generator.endRoom.center.x, generator.endRoom.center.y);
}

function checkExitCondition() {
    if (!exitObject) return;
    const dx = engine.camera.position.x - exitObject.position.x;
    const dz = engine.camera.position.z - exitObject.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    if (dist < 1.5) {
        finishLevel();
    }
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

// --- 7. INPUT & SHOOTING ---

document.addEventListener('mousedown', (e) => {
    if (gameActive && engine.controls.isLocked && weapon) {
        if (e.button === 0) { 
            const didShoot = weapon.trigger(); 
            
            if (didShoot) {
                raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
                
                const enemyMeshes = enemies.map(e => e.mesh);
                const hits = raycaster.intersectObjects(enemyMeshes, true); 

                if (hits.length > 0) {
                    const hitObject = hits[0].object;
                    let target = hitObject;
                    while(target && !target.userData.parent) {
                        target = target.parent;
                    }
                    
                    const enemyInstance = target ? target.userData.parent : null;
                    
                    const hitPoint = hits[0].point;
                    const shootDir = engine.camera.getWorldDirection(new THREE.Vector3());

                    if (enemyInstance) {
                        const damage = WeaponConfig.PISTOL_9MM.damage;
                        const died = enemyInstance.takeDamage(damage);
                        
                        if (died) {
                            audioManager.playSFX('death');
                            enemies = enemies.filter(e => e !== enemyInstance);
                            
                            // --- FIX: SPAWN HEIGHT ---
                            // 1. Clone the position so we don't modify the original
                            const gibOrigin = enemyInstance.mesh.position.clone();
                            
                            // 2. Move it UP to chest/head height (1.8 meters)
                            gibOrigin.y += 1.8; 
                            
                            // 3. Spawn Gibs at this new height
                            debrisSystem.spawnGibs(gibOrigin, Config.GORE.COLOR_FLESH); 
                            debrisSystem.spawnGibs(gibOrigin, Config.GORE.COLOR_BONE); 
                            
                            // 4. Spawn Blood Pool at the ORIGINAL position (Feet/Floor)
                            debrisSystem.spawnSplat(enemyInstance.mesh.position);
                            
                        } else {
                            audioManager.playSFX('hit');
                            debrisSystem.spawnBlood(hitPoint, shootDir);
                            
                            // Small blood drip on floor
                            debrisSystem.spawnSplat(enemyInstance.mesh.position);
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

// --- 8. UI EVENT HANDLERS ---

const pauseMenu = document.getElementById('pause-menu');
const crosshair = document.getElementById('crosshair');

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

document.body.addEventListener('click', () => {
    if (audioManager.listener.context.state === 'suspended') {
        audioManager.listener.context.resume();
    }

    if (gameActive && !engine.controls.isLocked && pauseMenu.style.display === 'none') {
        engine.controls.lock();
        if (sessionStorage.getItem('bloodbath_music_active') === 'true' && !audioManager.isPlaying) {
            audioManager.play();
        }
    }
});

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

function printConsoleMap(map, start, end) {
    // (Helper preserved just in case)
}

pauseMenu.style.display = 'none';
console.log("Game Ready.");