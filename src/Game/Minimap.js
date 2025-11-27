import { Config } from '../Config.js';

export class Minimap {
    constructor(mapData) {
        this.map = mapData;
        
        // 1. Radar Setup
        this.canvas = document.getElementById('minimap');
        this.ctx = this.canvas.getContext('2d');
        this.range = 25; 
        this.updateTileSize();

        // 2. Full Map Setup
        this.fullCanvas = document.getElementById('full-map-canvas');
        this.fullCtx = this.fullCanvas.getContext('2d');
        this.fullContainer = document.getElementById('full-map-overlay');

        // 3. CACHING SETUP
        this.staticCanvas = document.createElement('canvas');
        this.staticCtx = this.staticCanvas.getContext('2d');
        this.isCacheGenerated = false;
        
        // 4. THROTTLING - limit update frequency
        this.lastMinimapUpdate = 0;
        this.lastFullMapUpdate = 0;
        this.minimapInterval = 50;   // 20 FPS for minimap
        this.fullMapInterval = 100;  // 10 FPS for full map
    }

    updateTileSize() {
        this.tileSize = this.canvas.width / (this.range * 2);
    }

    changeZoom(delta) {
        this.range += delta;
        if (this.range < 10) this.range = 10;
        if (this.range > 60) this.range = 60;
        this.updateTileSize();
    }

    toggleRadar() {
        const container = document.getElementById('minimap-container');
        if (container.style.display === 'none') container.style.display = 'flex';
        else container.style.display = 'none';
    }

    toggleFullMap() {
        if (this.fullContainer.style.display === 'none') this.fullContainer.style.display = 'flex';
        else this.fullContainer.style.display = 'none';
    }

    isFullMapOpen() {
        return this.fullContainer.style.display !== 'none';
    }

    // --- OPTIMIZED: GENERATE STATIC MAP ONCE ---
    generateStaticMap() {
        const width = this.fullCanvas.width;
        const height = this.fullCanvas.height;
        
        this.staticCanvas.width = width;
        this.staticCanvas.height = height;

        const mapW = this.map[0].length;
        const mapH = this.map.length;
        const scaleX = width / mapW;
        const scaleY = height / mapH;
        const cellSize = Math.min(scaleX, scaleY); 
        const offsetX = (width - (mapW * cellSize)) / 2;
        const offsetY = (height - (mapH * cellSize)) / 2;

        this.fullMapMetrics = { cellSize, offsetX, offsetY };

        const ctx = this.staticCtx;
        
        ctx.clearRect(0, 0, width, height);

        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                if (this.map[y][x] === 1) {
                    ctx.fillStyle = "#440000";
                    ctx.fillRect(offsetX + (x * cellSize), offsetY + (y * cellSize), cellSize + 0.5, cellSize + 0.5);
                } else {
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                    ctx.fillRect(offsetX + (x * cellSize), offsetY + (y * cellSize), cellSize + 0.5, cellSize + 0.5);
                }
            }
        }
        
        this.isCacheGenerated = true;
        console.log("Minimap: Static cache generated.");
    }

    // --- 1. SMALL RADAR UPDATE (THROTTLED) ---
    update(playerPos, exitPos) {
        // Throttle updates
        const now = performance.now();
        if (now - this.lastMinimapUpdate < this.minimapInterval) {
            return;
        }
        this.lastMinimapUpdate = now;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        ctx.fillStyle = "rgba(0, 20, 0, 0.9)"; 
        ctx.fillRect(0, 0, width, height);

        const px = Math.floor(playerPos.x);
        const pz = Math.floor(playerPos.z);

        // Draw Map
        for (let y = pz - this.range; y <= pz + this.range; y++) {
            for (let x = px - this.range; x <= px + this.range; x++) {
                const drawX = (x - px + this.range) * this.tileSize;
                const drawY = (y - pz + this.range) * this.tileSize;

                if (y >= 0 && y < this.map.length && x >= 0 && x < this.map[0].length) {
                    if (this.map[y][x] === 1) {
                        ctx.fillStyle = "#550000"; 
                        ctx.fillRect(drawX, drawY, this.tileSize + 0.6, this.tileSize + 0.6); 
                    } 
                }
            }
        }

        // Draw Player
        const cx = width / 2;
        const cy = height / 2;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw Exit
        if (exitPos) {
            const ex = Math.floor(exitPos.x);
            const ez = Math.floor(exitPos.z);
            if (Math.abs(ex - px) <= this.range && Math.abs(ez - pz) <= this.range) {
                const drawX = (ex - px + this.range) * this.tileSize;
                const drawY = (ez - pz + this.range) * this.tileSize;
                
                const time = Date.now() * 0.005;
                const pulse = (Math.sin(time) * 0.3) + 1; 
                
                ctx.fillStyle = "#00ff00";
                ctx.beginPath();
                ctx.arc(drawX + this.tileSize/2, drawY + this.tileSize/2, this.tileSize * pulse, 0, Math.PI*2);
                ctx.fill();
                
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(drawX + this.tileSize/2, drawY + this.tileSize/2, this.tileSize * 0.3, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }

    // --- 2. FULL MAP UPDATE (THROTTLED) ---
    updateFull(playerPos, exitPos) {
        if (!this.isFullMapOpen()) return;

        // Throttle updates
        const now = performance.now();
        if (now - this.lastFullMapUpdate < this.fullMapInterval) {
            return;
        }
        this.lastFullMapUpdate = now;

        // Generate cache on first run
        if (!this.isCacheGenerated) {
            this.generateStaticMap();
        }

        const ctx = this.fullCtx;
        const width = this.fullCanvas.width;
        const height = this.fullCanvas.height;
        
        const { cellSize, offsetX, offsetY } = this.fullMapMetrics;

        // 1. Clear
        ctx.clearRect(0, 0, width, height);

        // 2. Draw Cached Map (ONE OPERATION!)
        ctx.drawImage(this.staticCanvas, 0, 0);

        // 3. Draw Dynamic Elements (Player)
        const px = offsetX + (playerPos.x * cellSize);
        const py = offsetY + (playerPos.z * cellSize);
        
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px + cellSize/2, py + cellSize/2, Math.max(3, cellSize), 0, Math.PI * 2);
        ctx.fill();

        // 4. Draw Exit (Static - no animation)
        if (exitPos) {
            const ex = offsetX + (exitPos.x * cellSize);
            const ey = offsetY + (exitPos.z * cellSize);
            
            // Outer ring
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(ex + cellSize/2, ey + cellSize/2, Math.max(8, cellSize + 5), 0, Math.PI * 2);
            ctx.stroke();

            // Inner dot
            ctx.fillStyle = "#00ff00";
            ctx.beginPath();
            ctx.arc(ex + cellSize/2, ey + cellSize/2, Math.max(4, cellSize), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}