import { AudioManager } from './Core/AudioManager.js';
import { Config } from './Config.js';
import { state } from './Game/GameState.js'; 

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
    }
} catch (e) {
    console.warn("Volume load error", e);
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

// 4. UI LOGIC (Audio Controls)
window.addEventListener('trackchange', (e) => {
    let fileName = e.detail.split('/').pop().split('.')[0];
    try { fileName = decodeURIComponent(fileName).toUpperCase(); } catch(e){}
    
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
    if(trackEl) trackEl.innerText = "STANDBY";
});

if (volSlider) {
    volSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        audioManager.setVolume(val);
        try { localStorage.setItem('bloodbath_volume', val); } catch(e){}
    });
}

// 5. SPLASH SCREEN LOGIC
const splash = document.getElementById('splash-screen');
const splashText = document.getElementById('splash-text');
const mobileWarning = document.getElementById('mobile-warning');
const mobileBtn = document.getElementById('mobile-continue-btn');

function startSystem() {
    console.log("[Menu] Splash Clicked! Initializing System...");
    if (splash) splash.classList.add('fade-out');
    
    // Resume Audio Context (Browser requirement)
    if (audioManager.listener.context.state === 'suspended') {
        audioManager.listener.context.resume().then(() => {
            console.log("Audio Context Resumed");
            audioManager.play();
        });
    } else {
        audioManager.play();
    }

    setTimeout(() => {
        if (splash) splash.style.display = 'none';
    }, 2000);
}

// Logic to determine if we show splash
if (sessionStorage.getItem('bloodbath_gamestarted') === 'true') {
    console.log("[Menu] Skipping splash (Game already started once)");
    if (splash) splash.style.display = 'none';
} else {
    // Check if mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || window.innerWidth < 900;

    if (isMobile) {
        if (splashText) splashText.style.display = 'none';
        const sub = document.getElementById('splash-subtext');
        if(sub) sub.style.display = 'none';
        if (mobileWarning) mobileWarning.style.display = 'block';
        if (mobileBtn) mobileBtn.addEventListener('click', (e) => { e.stopPropagation(); startSystem(); });
    } else {
        // Desktop: Attach Click Listener
        if (splash) {
            console.log("[Menu] Attaching click listener to Splash Screen");
            splash.style.zIndex = "9999"; // Force it to top just in case
            splash.addEventListener('click', startSystem);
        } else {
            console.error("Splash Screen Element NOT found!");
        }
    }
}

// 6. MAIN MENU LOGIC
document.addEventListener('DOMContentLoaded', () => {
    const sessionNameEl = document.getElementById('session-name');
    const startBtn = document.getElementById('start-btn');
    const sessionBtn = document.getElementById('session-btn'); 
    const btnLogout = document.getElementById('btn-logout'); 

    const sessionOverlay = document.getElementById('session-overlay');
    const sessionInput = document.getElementById('session-input');
    const btnConfirm = document.getElementById('btn-confirm-session');
    const btnCancel = document.getElementById('btn-cancel-session');
    
    const creditsBtn = document.getElementById('credits-btn');
    const creditsOverlay = document.getElementById('credits-overlay');
    const creditsClose = document.getElementById('credits-close-btn');

    let isNamedSession = false;

    // A. Check Session Status (UPDATED PATH)
    fetch('/api/get_status.php') // Using absolute path
        .then(res => res.json())
        .then(data => {
            console.log("[Menu] PHP Status:", data);
            if (data.active) {
                if (data.name === 'DEFAULT') {
                    // Default Session
                    isNamedSession = false;
                    sessionNameEl.innerText = "DEFAULT";
                    sessionNameEl.className = 'status-default';
                    startBtn.innerText = "NEW GAME";
                    if(sessionBtn) sessionBtn.style.display = 'block';
                    if(btnLogout) btnLogout.style.display = 'none';
                } else {
                    // Named Session
                    isNamedSession = true;
                    sessionNameEl.innerText = data.name;
                    sessionNameEl.className = 'status-active';
                    startBtn.innerText = `CONTINUE (LVL ${data.level})`;
                    if(sessionBtn) sessionBtn.style.display = 'none';
                    if(btnLogout) btnLogout.style.display = 'inline';
                }
            } else {
                // No Session
                isNamedSession = false;
                sessionNameEl.innerText = "DEFAULT";
                sessionNameEl.className = 'status-default';
                startBtn.innerText = "NEW GAME";
                if(sessionBtn) sessionBtn.style.display = 'block';
                if(btnLogout) btnLogout.style.display = 'none';
            }
        })
        .catch(err => console.warn("PHP Backend Offline or JSON Error", err));

    // B. Start Button Logic
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (isNamedSession) {
                saveMusicState();
                window.location.href = 'game.html';
            } else {
                startNewRun("DEFAULT");
            }
        });
    }

    // C. Session Button
    if (sessionBtn) {
        sessionBtn.addEventListener('click', () => {
            if (sessionOverlay) {
                sessionOverlay.style.display = 'flex';
                if (sessionInput) {
                    sessionInput.value = '';
                    sessionInput.focus();
                }
            }
        });
    }

    // D. Input Logic
    if (sessionInput) {
        sessionInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
        });
        sessionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') btnConfirm.click();
        });
    }

    // E. Confirm
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            const name = sessionInput.value.trim();
            if (name.length < 1) {
                alert("NAME REQUIRED");
                return;
            }
            startNewRun(name);
        });
    }

    // F. Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("TERMINATE SESSION?")) {
                fetch('/api/logout.php')
                    .then(res => res.json())
                    .then(() => window.location.reload());
            }
        });
    }

    function startNewRun(name) {
        fetch('/api/new_run.php', {
            method: 'POST',
            body: JSON.stringify({ name: name })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                state.reset(); 
                saveMusicState();
                window.location.href = 'game.html'; 
            }
        });
    }

    // UI Helpers
    if (btnCancel && sessionOverlay) {
        btnCancel.addEventListener('click', () => sessionOverlay.style.display = 'none');
    }

    if (creditsBtn && creditsOverlay) {
        creditsBtn.addEventListener('click', () => creditsOverlay.style.display = 'flex');
        creditsClose.addEventListener('click', () => creditsOverlay.style.display = 'none');
    }
    
    function saveMusicState() {
        if (audioManager.isPlaying) sessionStorage.setItem('bloodbath_music_active', 'true');
        else sessionStorage.setItem('bloodbath_music_active', 'false');
        sessionStorage.setItem('bloodbath_gamestarted', 'true');
    }
});