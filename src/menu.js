import { AudioManager } from './Core/AudioManager.js';
import { Config } from './Config.js';
import { MusicPlayerUI } from './UI/MusicPlayerUI.js'; // New Import
import { state } from './Game/GameState.js';

console.log("[Menu] Script Loading...");

// 1. SETUP AUDIO
const audioManager = new AudioManager(); 
audioManager.setPlaylist(Config.PLAYLIST);

// Load Saved Volume
let savedVol = Config.AUDIO_DEFAULT_VOL;
try {
    const v = localStorage.getItem('bloodbath_volume');
    if (v !== null) savedVol = parseFloat(v);
} catch(e) {}
audioManager.setVolume(savedVol);

// 2. SETUP UI (One line!)
const musicUI = new MusicPlayerUI(audioManager);

// 3. SPLASH SCREEN & STARTUP LOGIC
const splash = document.getElementById('splash-screen');
const splashText = document.getElementById('splash-text');
const mobileWarning = document.getElementById('mobile-warning');
const mobileBtn = document.getElementById('mobile-continue-btn');

function startSystem() {
    console.log("[Menu] System initializing...");
    sessionStorage.setItem('bloodbath_initialized', 'true');

    if (splash) splash.classList.add('fade-out');
    audioManager.play();

    setTimeout(() => {
        if (splash) splash.style.display = 'none';
    }, 2000);
}

// Session Check
if (sessionStorage.getItem('bloodbath_gamestarted') === 'true') {
    console.log("[Menu] Returning from game, skipping splash.");
    if (splash) splash.style.display = 'none';
} else {
    // Mobile Detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
                     || window.innerWidth < 900;

    if (isMobile) {
        if (splashText) splashText.style.display = 'none';
        const sub = document.getElementById('splash-subtext');
        if(sub) sub.style.display = 'none';
        if (mobileWarning) mobileWarning.style.display = 'block';
        if (mobileBtn) mobileBtn.addEventListener('click', (e) => { e.stopPropagation(); startSystem(); });
    } else {
        if (splash) splash.addEventListener('click', startSystem);
    }
}

// 4. NAVIGATION
const startBtn = document.getElementById('start-btn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        // RESET STATE FOR NEW RUN
        state.reset();
        state.save();
        
        // Save State
        if (audioManager.isPlaying) sessionStorage.setItem('bloodbath_music_active', 'true');
        else sessionStorage.setItem('bloodbath_music_active', 'false');
        
        sessionStorage.setItem('bloodbath_gamestarted', 'true');
        
        const seed = "SEED-" + Math.floor(Math.random() * 10000);
        window.location.href = `game.html?seed=${seed}`;
    });
}

// Credits Logic
const creditsBtn = document.getElementById('credits-btn');
const creditsOverlay = document.getElementById('credits-overlay');
const creditsClose = document.getElementById('credits-close-btn');
if (creditsBtn && creditsOverlay) {
    creditsBtn.addEventListener('click', () => creditsOverlay.style.display = 'flex');
    creditsClose.addEventListener('click', () => creditsOverlay.style.display = 'none');
    creditsOverlay.addEventListener('click', (e) => { if (e.target === creditsOverlay) creditsOverlay.style.display = 'none'; });
}