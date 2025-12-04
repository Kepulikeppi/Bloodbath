import * as THREE from 'https://esm.sh/three@0.160.0';
import { Engine } from './Core/Engine.js';
import { Input } from './Core/Input.js';
import { Config } from './Config.js';
import { AudioConfig } from './AudioConfig.js';
import { MusicConfig } from './MusicConfig.js';
import { UIConfig } from './UIConfig.js'; 
import { AudioManager } from './Core/AudioManager.js';
import { Minimap } from './Game/Minimap.js';
import { WeaponConfig } from './WeaponConfig.js';
import { GameState, state } from './Game/GameState.js';

import { LoadingScreen } from './UI/LoadingScreen.js';
import { LevelManager } from './Game/LevelManager.js';
import { HUD } from './UI/HUD.js';
import { MusicPlayerUI } from './UI/MusicPlayerUI.js';
import { Spawner } from './Game/Spawner.js';
import { UIInitializer } from './UI/UIInitializer.js'; 

import { LootManager } from './Game/LootManager.js';
import { Pickup } from './Game/Pickup.js';
import { MessageLog } from './UI/MessageLog.js';
import { LightManager } from './Game/LightManager.js';
// FIX: Correct Path to WeaponFactory
import { WeaponFactory } from './Game/Weapons/WeaponFactory.js'; 
import { CombatSystem } from './Game/CombatSystem.js';

console.log("1. Game Script Loaded");

UIInitializer.init();

// --- 1. SETUP ---
const input = new Input();

let savedVolume = AudioConfig.DEFAULT_VOL;
try {
    const v = localStorage.getItem('bloodbath_volume');
    if(v !== null) savedVolume = parseFloat(v);
} catch(e) {}

const audioManager = new AudioManager();
audioManager.setPlaylist(MusicConfig.PLAYLIST);
audioManager.setVolume(savedVolume);

if(AudioConfig.SFX.PLAYER_DEATH) {
    const l = new THREE.AudioLoader();
    l.load(AudioConfig.SFX.PLAYER_DEATH, (b) => audioManager.sfxBuffers['player_death'] = b);
}

state.load();
const hud = new HUD();
const musicUI = new MusicPlayerUI(audioManager);
const messageLog = new MessageLog();

const pauseMenu = document.getElementById('pause-menu');
const crosshair = document.getElementById('crosshair');

// --- 2. STATE CONTAINERS ---
let player = null;
let weapon = null;
let minimap = null;
let enemies = []; 
let pickups = []; 
let exitObject = null; 
let debrisSystem = null;
let combatSystem = null; 
let mapData = null; // Global reference for collision

let gameActive = false; 
let isLevelReady = false;
let isDying = false; 
let deathFallDirection = 0; 

// --- 3. ENGINE LOOP ---
const engine = new Engine((delta) => {
    if (isDying) {
        if (engine.camera.position.y > 0.2) engine.camera.position.y -= delta * 4.0; 
        const rotSpeed = delta * 3.0;
        if (deathFallDirection === 0) engine.camera.rotation.z = THREE.MathUtils.lerp(engine.camera.rotation.z, -Math.PI / 2, rotSpeed);
        else if (deathFallDirection === 1) engine.camera.rotation.z = THREE.MathUtils.lerp(engine.camera.rotation.z, Math.PI / 2, rotSpeed);
        else engine.camera.rotation.x = THREE.MathUtils.lerp(engine.camera.rotation.x, Math.PI / 2, rotSpeed);
        return; 
    }

    if (!gameActive) return;
    
    if (player && engine.controls.isLocked) {
        player.update(delta, input);
        
        if (state.data.hp <= 0 && !isDying) triggerGameOver();
        if (levelManager) levelManager.checkExit(player, exitObject);
        
        if (weapon) {
            const isMoving = input.keys.forward || input.keys.backward || input.keys.left || input.keys.right;
            weapon.update(delta, isMoving, engine.clock.elapsedTime);
        }

        // Update Enemies (Need mapData for collision)
        if (enemies.length > 0 && mapData) {
             enemies.forEach(enemy => enemy.update(delta, engine.camera.position, mapData, enemies));
        }
        
        // Update Pickups
        if (pickups.length > 0) {
            // Pickup.update returns true if collected
            pickups = pickups.filter(p => !p.update(delta, engine.camera.position));
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

// --- 4. LEVEL LOADING ---

let currentLevel = 1;
try {
    const cached = sessionStorage.getItem('bloodbath_level_cache');
    if (cached) currentLevel = parseInt(cached);
} catch(e) {}

const concreteLoadingUI = new LoadingScreen();
concreteLoadingUI.setTitle(currentLevel);

const levelManager = new LevelManager(engine, concreteLoadingUI, audioManager);

levelManager.loadCurrentLevel((data) => {
    console.log("[Game] Level Loaded.");
    
    // Assign Data
    player = data.player;
    weapon = data.weapon;
    enemies = data.enemies;
    pickups = data.pickups; // Receive pickups from Spawner
    exitObject = data.exitObject;
    minimap = data.minimap;
    debrisSystem = data.debrisSystem;
    
    // CRITICAL: Set global mapData so the loop can use it for collision
    mapData = data.minimapData;
    
    // Init Combat
    combatSystem = new CombatSystem(engine.scene, engine.camera, audioManager, debrisSystem);
    // Pass the live arrays to CombatSystem
    combatSystem.updateContext(enemies, data.levelMeshes, (p) => {
        // Callback when enemies drop loot: Add to global array
        pickups.push(p);
    });

    isLevelReady = true;
});


// --- 5. GAME EVENTS ---

function triggerGameOver() {
    isDying = true;
    deathFallDirection = Math.floor(Math.random() * 3);
    audioManager.playSFX('player_death');
    const overlay = document.getElementById('damage-overlay');
    if (overlay) overlay.style.opacity = '0.55'; 
    setTimeout(() => showDeathScreen(), 2000);
}

function showDeathScreen() {
    engine.controls.unlock();
    if (MusicConfig.DEATH_THEME) {
        audioManager.stop(); 
        const l = new THREE.AudioLoader();
        l.load(MusicConfig.DEATH_THEME, (buffer) => {
            audioManager.music.setBuffer(buffer);
            audioManager.music.setLoop(true);
            audioManager.music.setVolume(0.5);
            audioManager.music.play();
        });
    }
    document.getElementById('d-level').innerText = levelManager.currentLevel;
    document.getElementById('d-kills').innerText = state.data.runStats.kills;
    document.getElementById('d-acc').innerText = state.getAccuracy();
    document.getElementById('d-time').innerText = state.getRunTime();
    document.getElementById('game-over-screen').style.display = 'flex';
    document.body.style.cursor = 'default';
}

// --- INPUT HANDLERS ---

document.body.addEventListener('click', () => {
    if (levelManager.isLevelFinished) return;
    if (!isLevelReady) return;
    if (isDying) return; 

    if (audioManager.listener.context.state === 'suspended') audioManager.listener.context.resume();
    audioManager.startAmbience();

    if (concreteLoadingUI.isVisible()) {
        concreteLoadingUI.hide();
        gameActive = true;
        engine.controls.lock();
        levelManager.startTimer();
        if (sessionStorage.getItem('bloodbath_music_active') === 'true' && !audioManager.isPlaying) {
            audioManager.play();
        }
        return;
    }
    if (gameActive && !engine.controls.isLocked && pauseMenu.style.display === 'none') {
        engine.controls.lock();
    }
});

document.addEventListener('mousedown', (e) => {
    if (gameActive && !isDying && engine.controls.isLocked && weapon && e.button === 0) { 
        weapon.pressTrigger();
    }
});

document.addEventListener('mouseup', (e) => {
    if (weapon) weapon.releaseTrigger();
});

document.addEventListener('keydown', (e) => {
    if (!gameActive || isDying || !engine.controls.isLocked) return;

    const keyNum = parseInt(e.key);
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 7) {
        const newWeaponId = state.trySwitchWeaponSlot(keyNum);
        if (newWeaponId) {
            if (weapon) engine.camera.remove(weapon.mesh);
            weapon = WeaponFactory.create(newWeaponId, engine.camera, audioManager);
        }
    }

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

window.addEventListener('weapon-fire', (e) => {
    if (combatSystem) combatSystem.fire(e.detail);
});

window.addEventListener('loot-pickup', (e) => {
    const data = e.detail;
    messageLog.add(`${data.name} (+${data.value})`, data.color);
    if (data.sound) audioManager.playSFX(data.sound);
});

// UI Events
engine.controls.addEventListener('unlock', () => {
    if (isDying) return;
    if (gameActive && !levelManager.isLevelFinished) {
        pauseMenu.style.display = 'flex';
        crosshair.style.display = 'none';
        document.body.style.cursor = 'default';
        engine.clock.stop();
    }
});

engine.controls.addEventListener('lock', () => {
    if (gameActive && !isDying) {
        pauseMenu.style.display = 'none';
        crosshair.style.display = 'block';
        document.body.style.cursor = 'none';
        engine.clock.start();
    }
});

document.getElementById('btn-resume').addEventListener('click', () => {
    if(!isDying) engine.controls.lock();
});
document.getElementById('btn-quit').addEventListener('click', () => window.location.href = 'index.html');

document.getElementById('btn-restart').addEventListener('click', () => {
    state.data.hp = state.data.maxHp;
    state.reset(); 
    sessionStorage.setItem('bloodbath_level_cache', '1');
    fetch('api/new_run.php', { method: 'POST', body: JSON.stringify({}) })
    .then(res => res.json()).then(() => window.location.reload())
    .catch(() => window.location.reload());
});

document.getElementById('btn-menu').addEventListener('click', () => window.location.href = 'index.html');

console.log("Game Ready.");