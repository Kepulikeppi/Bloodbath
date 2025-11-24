import * as THREE from 'https://esm.sh/three@0.160.0';
import { Engine } from './Core/Engine.js';
import { Input } from './Core/Input.js';
import { Player } from './Game/Player.js';
import { AudioManager } from './Core/AudioManager.js';
import { DungeonGenerator } from './ProcGen/DungeonGenerator.js';
import { LevelBuilder } from './ProcGen/LevelBuilder.js';
import { Config } from './Config.js';

// ==========================================
// 1. STATE & GLOBALS
// ==========================================
const input = new Input();
let gameState = 'SPLASH'; // 'SPLASH' -> 'MENU' -> 'GAME'
let player = null;

// Visualizer Canvas
const canvas = document.getElementById('viz-canvas');
const ctx = canvas.getContext('2d');

// ==========================================
// 2. ENGINE SETUP & MAIN LOOP
// ==========================================
const engine = new Engine((delta) => {
    
    // A. GAME STATE PHYSICS
    if (gameState === 'GAME' && player && engine.controls.isLocked) {
        player.update(delta, input);
    }
    
    // B. AUDIO VISUALIZER (Always runs)
    if (audioManager) {
        drawVisualizer();
    }
});

// ==========================================
// 3. AUDIO SYSTEM
// ==========================================
const audioManager = new AudioManager(engine.camera);

const playlist = [
	'./assets/Bloodbath - Main Theme.mp3',
    './assets/The Tale of an Ancient Hero.mp3', 
    './assets/Bloodthirsty Clown.mp3',
    './assets/Welcome to Hell.mp3'
];

// Load playlist
audioManager.setPlaylist(playlist);

// UI Update
window.addEventListener('trackchange', (e) => {
    let fileName = e.detail.split('/').pop().split('.')[0];
    fileName = decodeURIComponent(fileName);
    const trackEl = document.getElementById('track-name');
    if(trackEl) trackEl.innerText = fileName.toUpperCase();
});

function drawVisualizer() {
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    if (!audioManager.isPlaying) return;

    const data = audioManager.getFrequencyData();
    
    // Draw 16 Bars
    const barCount = 16;
    const barWidth = width / barCount;
    ctx.fillStyle = '#ff0000';

    for (let i = 0; i < barCount; i++) {
        const value = data[i]; 
        const percent = value / 255.0;
        const barHeight = (percent * height) * 0.9; 
        
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
    }
}

// ==========================================
// 4. GAME GENERATION
// ==========================================
function startGame() {
    console.log("Generating Dungeon...");
    
    const seed = "BLOODBATH-" + Math.floor(Math.random() * 9999);
    const generator = new DungeonGenerator(seed);
    const mapData = generator.generate();

    const builder = new LevelBuilder(engine.scene);
    builder.build(mapData);

    const startRoom = generator.rooms[0];
    const startX = startRoom ? startRoom.center.x : 10;
    const startZ = startRoom ? startRoom.center.y : 10;

    engine.camera.position.set(startX, Config.EYE_HEIGHT, startZ);
    player = new Player(engine.camera, mapData);
}

// ==========================================
// 5. UI & EVENT HANDLERS
// ==========================================
const splashScreen = document.getElementById('splash-screen');
const uiLayer = document.getElementById('ui-layer');
const bgImage = document.getElementById('menu-bg'); // The Background Image
const startBtn = document.getElementById('start-btn');
const crosshair = document.getElementById('crosshair');

// Audio Controls
document.getElementById('btn-play').addEventListener('click', () => audioManager.play());
document.getElementById('btn-next').addEventListener('click', () => audioManager.next());
document.getElementById('vol-music').addEventListener('input', (e) => audioManager.setVolume(parseFloat(e.target.value)));
document.getElementById('btn-stop').addEventListener('click', () => {
    audioManager.stop();
    const trackEl = document.getElementById('track-name');
    if (trackEl) trackEl.innerText = "";
});

// SPLASH -> MENU
splashScreen.addEventListener('click', () => {
    splashScreen.style.display = 'none';
    // No need to show uiLayer manually, it's already visible
    gameState = 'MENU';
    audioManager.play();
});

// MENU -> GAME
startBtn.addEventListener('click', () => {
    gameState = 'GAME';
    
    // Hide Sidebar AND Background Image
    uiLayer.style.display = 'none';
    bgImage.style.display = 'none'; 
    
    crosshair.style.display = 'block';

    startGame();
    engine.controls.lock();
});

// PAUSE / RESUME
engine.controls.addEventListener('unlock', () => {
    if (gameState === 'GAME') {
        uiLayer.style.display = 'flex';
        bgImage.style.display = 'block'; // Bring back BG on pause
        startBtn.innerText = "RESUME";
    }
});

engine.controls.addEventListener('lock', () => {
    if (gameState === 'GAME') {
        uiLayer.style.display = 'none';
        bgImage.style.display = 'none';
    }
});