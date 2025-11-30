import { AudioManager } from './Core/AudioManager.js';
import { Config } from './Config.js';
import { state } from './Game/GameState.js'; 

console.log("[Menu] Script Loading...");

// =================================================================
// 1. SETUP AUDIO & VOLUME
// =================================================================
const audioManager = new AudioManager(); 
audioManager.setPlaylist(Config.PLAYLIST);

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

if (volSlider) {
    volSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        audioManager.setVolume(val);
        try { localStorage.setItem('bloodbath_volume', val); } catch(e){}
    });
}

// =================================================================
// 2. VISUALIZER LOOP
// =================================================================
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

// =================================================================
// 3. UI LOGIC (Audio Controls)
// =================================================================
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

// =================================================================
// 4. SPLASH SCREEN LOGIC
// =================================================================
const splash = document.getElementById('splash-screen');
const splashText = document.getElementById('splash-text');
const mobileWarning = document.getElementById('mobile-warning');
const mobileBtn = document.getElementById('mobile-continue-btn');

function startSystem() {
    console.log("[Menu] System initializing...");
    if (splash) splash.classList.add('fade-out');
    
    if (audioManager.listener.context.state === 'suspended') {
        audioManager.listener.context.resume().then(() => {
            audioManager.play();
        });
    } else {
        audioManager.play();
    }

    setTimeout(() => {
        if (splash) splash.style.display = 'none';
    }, 2000);
}

if (sessionStorage.getItem('bloodbath_gamestarted') === 'true') {
    if (splash) splash.style.display = 'none';
} else {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
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

// =================================================================
// 5. MAIN MENU & SESSION LOGIC (REWRITTEN)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const sessionNameEl = document.getElementById('session-name');
    const startBtn = document.getElementById('start-btn');       // "NEW GAME"
    const continueBtn = document.getElementById('continue-btn'); // "CONTINUE"
    const sessionBtn = document.getElementById('session-btn');   // "SESSION"
    const btnLogout = document.getElementById('btn-logout');     // "[ RESET ]"

    // Session Modal Elements
    const sessionOverlay = document.getElementById('session-overlay');
    const sessionInput = document.getElementById('session-input');
    const btnConfirm = document.getElementById('btn-confirm-session');
    const btnCancel = document.getElementById('btn-cancel-session');

    // Confirmation Modal Elements
    const confirmOverlay = document.getElementById('confirmation-overlay');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMsg = document.getElementById('confirm-message');
    const btnConfirmYes = document.getElementById('btn-confirm-yes');
    const btnConfirmNo = document.getElementById('btn-confirm-no');
    
    // Credits Elements
    const creditsBtn = document.getElementById('credits-btn');
    const creditsOverlay = document.getElementById('credits-overlay');
    const creditsClose = document.getElementById('credits-close-btn');

    let isNamedSession = false;
    let currentSessionName = "DEFAULT";
    let currentSessionLevel = 1; 
    let pendingConfirmationAction = null; 

    // --- A. INITIAL CHECK ---
    refreshSessionStatus();

    function refreshSessionStatus() {
        fetch('api/get_status.php')
            .then(res => res.json())
            .then(data => {
                // Update tracked variables
                currentSessionLevel = parseInt(data.level) || 1;

                if (data.active && data.name !== 'DEFAULT') {
                    // === NAMED SESSION ===
                    isNamedSession = true;
                    // FIX: Ensure name is always uppercase
                    currentSessionName = data.name.toUpperCase();

                    // Update Top Bar
                    sessionNameEl.innerText = currentSessionName;
                    sessionNameEl.className = 'status-active';
                    if(btnLogout) btnLogout.style.display = 'inline';

                    // Update Menu Buttons
                    if (continueBtn) {
                        if (data.level > 1) {
                            continueBtn.style.display = 'block';
                            continueBtn.innerText = `CONTINUE (LVL ${data.level})`;
                        } else {
                            continueBtn.style.display = 'none';
                        }
                    }
                    if (sessionBtn) sessionBtn.style.display = 'none'; 
                    
                } else {
                    // === DEFAULT / NO SESSION ===
                    isNamedSession = false;
                    currentSessionName = "DEFAULT";

                    // Update Top Bar
                    sessionNameEl.innerText = "DEFAULT";
                    sessionNameEl.className = 'status-default';
                    if(btnLogout) btnLogout.style.display = 'none';

                    // Update Menu Buttons
                    if(continueBtn) continueBtn.style.display = 'none';
                    if(sessionBtn) sessionBtn.style.display = 'block';
                }
            })
            .catch(err => console.warn("Backend Error:", err));
    }

    // --- B. CUSTOM MODAL HELPER ---
    function showConfirmation(title, message, onYes) {
        if (!confirmOverlay) return;
        confirmTitle.innerText = title;
        confirmMsg.innerHTML = message.replace(/\n/g, '<br>');
        
        pendingConfirmationAction = onYes;
        confirmOverlay.style.display = 'flex';
    }

    function closeConfirmation() {
        if (confirmOverlay) confirmOverlay.style.display = 'none';
        pendingConfirmationAction = null;
    }

    if (btnConfirmYes) {
        btnConfirmYes.addEventListener('click', () => {
            if (pendingConfirmationAction) pendingConfirmationAction();
            closeConfirmation();
        });
    }

    if (btnConfirmNo) {
        btnConfirmNo.addEventListener('click', closeConfirmation);
    }


    // --- C. BUTTON HANDLERS ---

    // 1. CONTINUE BUTTON
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            saveMusicState();
            window.location.href = 'game.html';
        });
    }

    // 2. NEW GAME BUTTON
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // Only warn if named session AND level > 1
            if (isNamedSession && currentSessionLevel > 1) {
                // FIX: currentSessionName is now guaranteed uppercase, but let's be double sure
                const safeName = currentSessionName.toUpperCase();
                showConfirmation(
                    "WARNING", 
                    `RESET CURRENT RUN AND START FROM LEVEL 1?\n(SESSION '${safeName}' WILL BE KEPT)`,
                    () => {
                        startNewRun(null, true); 
                    }
                );
            } else {
                startNewRun(isNamedSession ? null : "DEFAULT", true);
            }
        });
    }

    // 3. SESSION BUTTON (Open Modal)
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

    // 4. MODAL CONFIRM (Save Name)
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            const name = sessionInput.value.trim().toUpperCase(); // Ensure input is uppercase
            if (name.length < 1) {
                alert("NAME REQUIRED");
                return;
            }
            startNewRun(name, false); 
        });
    }

    // 5. LOGOUT / RESET LINK
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            fetch('api/logout.php')
                .then(res => res.json())
                .then(() => {
                    sessionStorage.removeItem('bloodbath_gamestarted');
                    sessionStorage.removeItem('bloodbath_level_cache');
                    refreshSessionStatus();
                })
                .catch(err => {
                    console.error("Logout Error", err);
                    window.location.reload();
                });
        });
    }

    // --- D. HELPER FUNCTIONS ---

    function startNewRun(name, shouldLaunch) {
        const payload = name ? { name: name } : {};

        fetch('api/new_run.php', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                state.reset(); 
                sessionStorage.setItem('bloodbath_level_cache', '1');

                if (shouldLaunch) {
                    saveMusicState();
                    window.location.href = 'game.html';
                } else {
                    if (sessionOverlay) sessionOverlay.style.display = 'none';
                    refreshSessionStatus();
                }
            }
        })
        .catch(err => console.error("New Run API Error:", err));
    }

    function saveMusicState() {
        if (audioManager.isPlaying) sessionStorage.setItem('bloodbath_music_active', 'true');
        else sessionStorage.setItem('bloodbath_music_active', 'false');
        sessionStorage.setItem('bloodbath_gamestarted', 'true');
    }

    // --- E. STANDARD UI EVENTS ---

    // Modal Cancel
    if (btnCancel && sessionOverlay) {
        btnCancel.addEventListener('click', () => sessionOverlay.style.display = 'none');
    }

    // Input Validation (A-Z, 0-9 only)
    if (sessionInput) {
        sessionInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        });
        sessionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') btnConfirm.click();
        });
    }

    // Credits
    if (creditsBtn && creditsOverlay) {
        creditsBtn.addEventListener('click', () => creditsOverlay.style.display = 'flex');
        creditsClose.addEventListener('click', () => creditsOverlay.style.display = 'none');
        creditsOverlay.addEventListener('click', (e) => {
            if (e.target === creditsOverlay) creditsOverlay.style.display = 'none';
        });
    }
});