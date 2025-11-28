import { Config } from '../Config.js';

export class MusicPlayerUI {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.canvas = document.getElementById('viz-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        
        this.initListeners();
        this.startVisualizer();
    }

    initListeners() {
        // Track Name Update
        window.addEventListener('trackchange', (e) => {
            let fileName = e.detail.split('/').pop().split('.')[0];
            try { fileName = decodeURIComponent(fileName).toUpperCase(); } catch(err){}
            
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

        // Buttons
        const btnPlay = document.getElementById('btn-play');
        if(btnPlay) btnPlay.addEventListener('click', () => this.audioManager.play());

        const btnNext = document.getElementById('btn-next');
        if(btnNext) btnNext.addEventListener('click', () => this.audioManager.next());

        const btnStop = document.getElementById('btn-stop');
        if(btnStop) btnStop.addEventListener('click', () => {
            this.audioManager.stop();
            const trackEl = document.getElementById('track-name');
            if(trackEl) trackEl.innerText = "STANDBY";
        });

        // Volume Slider
        const volSlider = document.getElementById('vol-music');
        if(volSlider) {
            // Set initial visual state from manager
            volSlider.value = this.audioManager.musicVolume;
            
            volSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.audioManager.setVolume(val);
                try { localStorage.setItem('bloodbath_volume', val); } catch(e){}
            });
        }
    }

startVisualizer() {
        let lastTime = 0;
        // Optimization: Limit visualizer to 60 FPS.
        const FPS = 60; 
        const interval = 1000 / FPS;

        const draw = (timestamp) => {
            requestAnimationFrame(draw);
            
            // 1. Throttle: Skip frame if too fast
            const elapsed = timestamp - lastTime;
            if (elapsed < interval) return;
            lastTime = timestamp - (elapsed % interval);

            // 2. Safety check for Pause Menu in game
            const pauseMenu = document.getElementById('pause-menu');
            const isMenuHidden = pauseMenu && pauseMenu.style.display === 'none';
            // In game: if menu is closed (hidden), don't draw.
            // In main menu: pauseMenu is null, so we keep drawing.
            if (pauseMenu && isMenuHidden) return; 

            if (!this.ctx) return;

            const width = this.canvas.width; 
            const height = this.canvas.height;

            // 3. Optimization: If music is stopped, just clear once and wait
            // We check if it's already cleared to avoid redundant GPU calls, 
            // but a 20fps clear is negligible.
            this.ctx.fillStyle = '#000000'; 
            this.ctx.fillRect(0, 0, width, height);

            if (!this.audioManager.isPlaying) return;

            const data = this.audioManager.getFrequencyData();
            const barCount = Config.VIZ_BAR_COUNT; 
            const barWidth = width / barCount;
            this.ctx.fillStyle = '#ff0000';

            for (let i = 0; i < barCount; i++) {
                const index = Config.VIZ_BIN_START + (i * Config.VIZ_BIN_STEP);
                const value = data[index] || 0; 
                const percent = value / 255.0;
                
                // Add a small threshold so we don't draw 1px bars for silence
                if (percent < 0.02) continue;

                const barHeight = (percent * percent) * height; 
                this.ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
            }
        };
        // Start the loop passing the initial timestamp
        requestAnimationFrame(draw);
    }
}