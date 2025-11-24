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

        // 3. CACHING SETUP (The Fix)
        this.staticCanvas = document.createElement('canvas');
        this.staticCtx = this.staticCanvas.getContext('2d');
        this.isCacheGenerated = false;
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
        
        // Match buffer size to display size
        this.staticCanvas.width = width;
        this.staticCanvas.height = height;

        const mapW = this.map[0].length;
        const mapH = this.map.length;
        const scaleX = width / mapW;
        const scaleY = height / mapH;
        const cellSize = Math.min(scaleX, scaleY); 
        const offsetX = (width - (mapW * cellSize)) / 2;
        const offsetY = (height - (mapH * cellSize)) / 2;

        // Store these for the dynamic update to use later
        this.fullMapMetrics = { cellSize, offsetX, offsetY };

        const ctx = this.staticCtx;
        
        // Clear
        ctx.clearRect(0, 0, width, height);

        // Heavy Loop: Run ONLY ONCE
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                if (this.map[y][x] === 1) {
                    ctx.fillStyle = "#440000"; // Walls
                    ctx.fillRect(offsetX + (x * cellSize), offsetY + (y * cellSize), cellSize + 0.5, cellSize + 0.5);
                } else {
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Floors
                    ctx.fillRect(offsetX + (x * cellSize), offsetY + (y * cellSize), cellSize + 0.5, cellSize + 0.5);
                }
            }
        }
        
        this.isCacheGenerated = true;
        console.log("Minimap: Static cache generated.");
    }

    // --- 1. SMALL RADAR UPDATE ---
    update(playerPos, exitPos) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        ctx.fillStyle = "rgba(0, 20, 0, 0.9)"; 
        ctx.fillRect(0, 0, width, height);

        const px = Math.floor(playerPos.x);
        const pz = Math.floor(playerPos.z);

        // Draw Map (Small loop, only draws nearby tiles, so it's fast enough)
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

    // --- 2. FULL MAP UPDATE (OPTIMIZED) ---
    updateFull(playerPos, exitPos) {
        if (!this.isFullMapOpen()) return;

        // Generate cache on first run
        if (!this.isCacheGenerated) {
            this.generateStaticMap();
        }

        const ctx = this.fullCtx;
        const width = this.fullCanvas.width;
        const height = this.fullCanvas.height;
        
        // Retrieve pre-calculated metrics
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

        // 4. Draw Exit
        if (exitPos) {
            const ex = offsetX + (exitPos.x * cellSize);
            const ey = offsetY + (exitPos.z * cellSize);
            
            const time = Date.now() * 0.005;
            const pulse = (Math.sin(time) * 5) + 5; 
            
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(ex + cellSize/2, ey + cellSize/2, Math.max(6, cellSize) + pulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = "#00ff00";
            ctx.beginPath();
            ctx.arc(ex + cellSize/2, ey + cellSize/2, Math.max(3, cellSize), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}