import { Random } from '../Utils/Random.js';
import { Config } from '../Config.js'; 

export class DungeonGenerator {
    constructor(seed, width, height) {
        // Support dynamic size scaling for later levels
        this.width = width || Config.MAP_WIDTH;
        this.height = height || Config.MAP_HEIGHT;
        this.rng = new Random(seed);
        this.map = []; 
        this.rooms = []; 
        
        // Data we will calculate
        this.startRoom = null;
        this.endRoom = null;
    }

    generate() {
        this.map = [];
        // 1. Fill World
        for (let y = 0; y < this.height; y++) {
            const row = new Array(this.width).fill(1);
            this.map.push(row);
        }

        // 2. Place Rooms
        // We use Config.ROOM_COUNT as a base, but you can increase it for larger maps
        const roomCount = Math.floor(this.width * this.height / 2000) + 10; 

        for (let i = 0; i < roomCount; i++) {
            const w = this.rng.range(Config.ROOM_MIN_SIZE, Config.ROOM_MAX_SIZE);
            const h = this.rng.range(Config.ROOM_MIN_SIZE, Config.ROOM_MAX_SIZE);
            
            const x = this.rng.range(4, this.width - w - 4);
            const y = this.rng.range(4, this.height - h - 4);

            const newRoom = { x, y, w, h, center: { x: Math.floor(x + w / 2), y: Math.floor(y + h / 2) } };

            let failed = false;
            for (const otherRoom of this.rooms) {
                if (this.intersect(newRoom, otherRoom)) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.createRoom(newRoom);
                
                if (this.rooms.length > 0) {
                    const prevCenter = this.rooms[this.rooms.length - 1].center;
                    const currCenter = newRoom.center;
                    
                    if (this.rng.next() > 0.5) {
                        this.createHCorridor(prevCenter.x, currCenter.x, prevCenter.y);
                        this.createVCorridor(prevCenter.y, currCenter.y, currCenter.x);
                    } else {
                        this.createVCorridor(prevCenter.y, currCenter.y, prevCenter.x);
                        this.createHCorridor(prevCenter.x, currCenter.x, currCenter.y);
                    }
                }
                this.rooms.push(newRoom);
            }
        }

        // 3. Identify Start and End
        this.findStartEnd();

        return this.map;
    }

    findStartEnd() {
        if (this.rooms.length === 0) return;

        // A. Find "Top Left-ish" Room (Closest to 0,0)
        let closestDist = Infinity;
        this.startRoom = this.rooms[0];

        this.rooms.forEach(r => {
            // Simple distance formula (x^2 + y^2)
            const d = (r.center.x * r.center.x) + (r.center.y * r.center.y);
            if (d < closestDist) {
                closestDist = d;
                this.startRoom = r;
            }
        });

        // B. Find "Farthest" Room from Start
        let farthestDist = 0;
        this.endRoom = this.startRoom;

        this.rooms.forEach(r => {
            const dx = r.center.x - this.startRoom.center.x;
            const dy = r.center.y - this.startRoom.center.y;
            const d = (dx * dx) + (dy * dy);
            
            if (d > farthestDist) {
                farthestDist = d;
                this.endRoom = r;
            }
        });
    }

    
    safeSet(x, y, val) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
            this.map[y][x] = val;
        }
    }

    intersect(r1, r2) {
        const p = Config.ROOM_PADDING;
        return !(r2.x > r1.x + r1.w + p || 
                 r2.x + r2.w + p < r1.x || 
                 r2.y > r1.y + r1.h + p || 
                 r2.y + r2.h + p < r1.y);
    }

    createRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.safeSet(x, y, 0); 
            }
        }
    }

    createHCorridor(x1, x2, y) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for(let k=0; k < Config.CORRIDOR_WIDTH; k++) this.safeSet(x, y + k, 0);
        }
    }

    createVCorridor(y1, y2, x) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for(let k=0; k < Config.CORRIDOR_WIDTH; k++) this.safeSet(x + k, y, 0);
        }
    }
}