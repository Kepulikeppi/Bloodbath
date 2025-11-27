import { AudioManager } from './Core/AudioManager.js';
import { Config } from './Config.js';
import { state } from './Game/GameState.js'; // <--- NEW IMPORT

console.log("[Menu] Script Loading...");

// 1. SETUP AUDIO
const audioManager = new AudioManager(); 
audioManager.setPlaylist(Config.PLAYLIST);

// 2. INITIALIZE VOLUME
const volSlider = document.getElementById('vol-music');
try {
    const savedVol = localStorage.getItem('bloodbath_volume');
    if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (volSlider) volSlider.value = val;
        audioManager.setVolume(val);
    } else {
        if (volSlider) volSlider.value = Config.AUDIO_DEFAULT_VOL;
        audioManager.setVolume(Config.AUDIO_DEFAULT_VOL);
    }
} catch (e) {
    if (volSlider) volSlider.value = Config.AUDIO_DEFAULT_VOL;
    audioManager.setVolume(Config.AUDIO_DEFAULT_VOL);
}

// 3. VISUALIZER LOOP
const canvas = document.getElementById('viz-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

function drawLoop() {
    requestAnimationFrame(drawLoop);
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (!audioManager.isPlaying) return;

    const data = audioManager.getFrequencyData();
    
    const barCount = Config.VIZ_BAR_COUNT; 
    const startBin = Config.VIZ_BIN_START;
    const step = Config.VIZ_BIN_STEP;

    const barWidth = width / barCount;
    ctx.fillStyle = '#ff0000';

    for (let i = 0; i < barCount; i++) {
        const index = startBin + (i * step);
        const value = data[index] || 0; 
        const percent = value / 255.0;
        const barHeight = (percent * percent) * height; 
        
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
}
drawLoop(); 

// 4. UI LOGIC
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

const btnPlay = document.getElementById('btn-play');
if(btnPlay) btnPlay.addEventListener('click', () => audioManager.play());

const btnNext = document.getElementById('btn-next');
if(btnNext) btnNext.addEventListener('click', () => audioManager.next());

const btnStop = document.getElementById('btn-stop');
if(btnStop) btnStop.addEventListener('click', () => {
    audioManager.stop();
    const trackEl = document.getElementById('track-name');
    if(trackEl) trackEl.innerText = "";
});

if (volSlider) {
    volSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        audioManager.setVolume(val);
        try { localStorage.setItem('bloodbath_volume', val); } catch(e){}
    });
}

// 5. SPLASH SCREEN
const splash = document.getElementById('splash-screen');
const splashText = document.getElementById('splash-text');
const mobileWarning = document.getElementById('mobile-warning');
const mobileBtn = document.getElementById('mobile-continue-btn');

function startSystem() {
    console.log("[Menu] System initializing...");
    if (splash) splash.classList.add('fade-out');
    audioManager.play();
    setTimeout(() => {
        if (splash) splash.style.display = 'none';
    }, 2000);
}

if (sessionStorage.getItem('bloodbath_gamestarted') === 'true') {
    console.log("[Menu] Returning from game, skipping splash.");
    if (splash) splash.style.display = 'none';
} else {
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

// 6. START GAME BUTTON
const startBtn = document.getElementById('start-btn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        // --- FIX: RESET GAME STATE ---
        // This clears the old run (health, ammo) so we start fresh
        state.reset();
        // -----------------------------

        // Pass music state
        if (audioManager.isPlaying) sessionStorage.setItem('bloodbath_music_active', 'true');
        else sessionStorage.setItem('bloodbath_music_active', 'false');
        
        // Mark session as started so we skip splash next time
        sessionStorage.setItem('bloodbath_gamestarted', 'true');
        
        const seed = "SEED-" + Math.floor(Math.random() * 10000);
        window.location.href = `game.html?seed=${seed}`;
    });
}

// 7. CREDITS SYSTEM
const creditsBtn = document.getElementById('credits-btn');
const creditsOverlay = document.getElementById('credits-overlay');
const creditsClose = document.getElementById('credits-close-btn');

if (creditsBtn && creditsOverlay) {
    creditsBtn.addEventListener('click', () => creditsOverlay.style.display = 'flex');
    creditsClose.addEventListener('click', () => creditsOverlay.style.display = 'none');
    creditsOverlay.addEventListener('click', (e) => {
        if (e.target === creditsOverlay) creditsOverlay.style.display = 'none';
    });
}