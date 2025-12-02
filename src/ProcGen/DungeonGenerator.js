import { Random } from '../Utils/Random.js';
import { Config } from '../Config.js';
import { RoomTypes } from './RoomTypes.js';
import { RoomArchitect } from './RoomArchitect.js';

export class DungeonGenerator {
    constructor(seed, width, height) {
        this.width = width || Config.MAP_WIDTH;
        this.height = height || Config.MAP_HEIGHT;
        this.rng = new Random(seed);
        
        this.map = []; 
        this.rooms = [];
        this.doorways = [];
        this.startRoom = null;
        this.endRoom = null;
        
        this.params = {
            targetRooms: Config.TARGET_ROOMS || 12,
            branchChance: Config.BRANCH_CHANCE || 40,
            maxBranchDepth: Config.MAX_BRANCH_DEPTH || 3,
            roomMinSize: Config.ROOM_MIN_SIZE || 10,
            roomMaxSize: Config.ROOM_MAX_SIZE || 30,
            wiggle: Config.DIRECTION_WIGGLE || 80,
            corridorWidth: Config.CORRIDOR_WIDTH || 4,
            
            // Height Config
            wallHeight: Config.DEFAULT_WALL_HEIGHT,
            minCeil: Config.ROOM_HEIGHT_MIN,
            maxCeil: Config.ROOM_HEIGHT_MAX
        };
    }

    generate() {
        console.log(`[DungeonGen] Generating ${this.width}x${this.height} map...`);
        
        // 1. Initialize Grid (Walls are solid up to max height)
        this.map = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push({ type: 1, height: this.params.wallHeight, ceiling: this.params.wallHeight });
            }
            this.map.push(row);
        }

        this.rooms = [];
        this.doorways = [];

        // 2. Generate Logic
        this.generateMainPath();
        this.generateBranches();
        this.assignStartEnd();
        
        // 3. Carve Rooms 
        this.rooms.forEach(room => {
            RoomArchitect.carve(this.map, room, this.rng);
        });

        // 4. Center
        this.normalizeCoordinates();

        console.log(`[DungeonGen] Complete: ${this.rooms.length} rooms`);
        return this.map;
    }

    // ... [generateMainPath, generateBranches, addBranch, tryPlaceRoom logic mostly same, added ceiling prop] ...

    generateMainPath() {
        const p = this.params;
        const startX = this.rng.range(10, Math.floor(this.width * 0.15));
        const startY = this.rng.range(Math.floor(this.height * 0.3), Math.floor(this.height * 0.7));
        
        // Random Ceiling for start room
        const startCeil = this.rng.range(p.minCeil, p.maxCeil);

        const firstRoom = { 
            x: startX, y: startY, 
            w: this.rng.range(p.roomMinSize, p.roomMaxSize), 
            h: this.rng.range(p.roomMinSize, p.roomMaxSize), 
            type: 'main', depth: 0,
            baseHeight: 0,
            ceilingHeight: startCeil, // NEW
            roomShape: RoomTypes.NORMAL 
        };
        this.finalizeRoom(firstRoom);
        this.rooms.push(firstRoom);
        this.carveRoom(firstRoom); 
        
        const mainPath = [firstRoom];
        let currentAngle = this.rng.range(-30, 30);
        let failedAttempts = 0;
        
        while (mainPath.length < p.targetRooms && failedAttempts < 15) {
            const currentRoom = mainPath[mainPath.length - 1];
            currentAngle += this.rng.range(-p.wiggle, p.wiggle);
            if (currentAngle < -90) currentAngle += 40;
            if (currentAngle > 140) currentAngle -= 40;
            
            const primaryDir = this.angleToDir(currentAngle);
            const directions = [primaryDir, ...this.rng.shuffle(['N', 'S', 'E', 'W'])];
            
            let placed = false;
            for (const dir of directions) {
                const newRoom = this.tryPlaceRoom(currentRoom, dir, 'main', 0);
                if (newRoom) {
                    newRoom.depth = currentRoom.depth + 1;
                    this.rooms.push(newRoom);
                    mainPath.push(newRoom);
                    this.carveRoom(newRoom); 
                    this.connectRooms(currentRoom, newRoom, dir);
                    currentAngle = this.dirToAngle(dir);
                    placed = true;
                    failedAttempts = 0;
                    break;
                }
            }
            if (!placed) failedAttempts++;
        }
        this.mainPath = mainPath;
    }

    generateBranches() {
        const p = this.params;
        for (let i = 1; i < this.mainPath.length - 1; i++) {
            if (this.rng.next() * 100 < p.branchChance) {
                const heightShift = (this.rng.range(0, 2) - 1) * 2; 
                const startHeight = this.mainPath[i].baseHeight + heightShift;
                this.addBranch(this.mainPath[i], 0, p.maxBranchDepth, startHeight);
            }
        }
    }

    addBranch(sourceRoom, depth, maxDepth, currentHeight) {
        if (depth >= maxDepth) return 0;
        let roomsAdded = 0;
        const directions = this.rng.shuffle(['N', 'S', 'E', 'W']);
        
        for (const dir of directions) {
            const nextHeight = currentHeight; 
            const branchRoom = this.tryPlaceRoom(sourceRoom, dir, 'branch', nextHeight);
            if (branchRoom) {
                branchRoom.depth = depth;
                this.rooms.push(branchRoom);
                this.carveRoom(branchRoom);
                this.connectRooms(sourceRoom, branchRoom, dir);
                roomsAdded++;
                if (this.rng.next() < 0.4 && depth + 1 < maxDepth) {
                    roomsAdded += this.addBranch(branchRoom, depth + 1, maxDepth, nextHeight);
                }
                break;
            }
        }
        return roomsAdded;
    }

    tryPlaceRoom(sourceRoom, direction, type, height) {
        const p = this.params;
        for (let shrink = 0; shrink < 5; shrink++) {
            const sizeReduction = shrink * 3;
            const w = Math.max(p.roomMinSize, this.rng.range(p.roomMinSize, p.roomMaxSize) - sizeReduction);
            const h = Math.max(p.roomMinSize, this.rng.range(p.roomMinSize, p.roomMaxSize) - sizeReduction);
            
            for (let attempt = 0; attempt < 4; attempt++) {
                const gap = this.rng.range(1, 4);
                const offset = this.rng.range(-4, 4);
                const exit = this.getExitPoint(sourceRoom, direction);
                let x, y;
                
                switch (direction) {
                    case 'N': x = exit.x - Math.floor(w / 2) + offset; y = exit.y - h - gap; break;
                    case 'S': x = exit.x - Math.floor(w / 2) + offset; y = exit.y + gap; break;
                    case 'E': x = exit.x + gap; y = exit.y - Math.floor(h / 2) + offset; break;
                    case 'W': x = exit.x - w - gap; y = exit.y - Math.floor(h / 2) + offset; break;
                }
                
                // Random Ceiling
                const ceilH = this.rng.range(p.minCeil, p.maxCeil);
                
                const newRoom = { 
                    x: Math.floor(x), y: Math.floor(y), w, h, type, 
                    connectionDir: direction,
                    baseHeight: height,
                    ceilingHeight: ceilH, // NEW
                    roomShape: (type === 'branch') ? this.pickRandomShape() : RoomTypes.NORMAL
                };
                this.finalizeRoom(newRoom);
                
                if (this.canPlaceRoom(newRoom)) return newRoom;
            }
        }
        return null;
    }

    pickRandomShape() {
        const r = this.rng.next();
        if (r < 0.5) return RoomTypes.NORMAL;
        if (r < 0.7) return RoomTypes.PIT;
        if (r < 0.9) return RoomTypes.PODIUM;
        return RoomTypes.BRIDGE;
    }

    finalizeRoom(room) {
        room.center = { 
            x: Math.floor(room.x + room.w / 2), 
            y: Math.floor(room.y + room.h / 2) 
        };
    }

    canPlaceRoom(room, padding = 2) {
        if (room.x < 4 || room.y < 4 || room.x + room.w >= this.width - 4 || room.y + room.h >= this.height - 4) return false;
        for (const other of this.rooms) {
            if (!(other.x > room.x + room.w + padding ||
                  other.x + other.w + padding < room.x ||
                  other.y > room.y + room.h + padding ||
                  other.y + other.h + padding < room.y)) {
                return false;
            }
        }
        return true;
    }

    carveRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.safeSet(x, y, 0, 0, 4); 
            }
        }
    }

    connectRooms(room1, room2, direction) {
        const exit1 = this.getExitPoint(room1, direction);
        const exit2 = this.getExitPoint(room2, this.getOpposite(direction));
        
        const isLevel = (room1.baseHeight === room2.baseHeight);
        const isDoorway = isLevel && this.rng.next() < 0.20;
        let width;

        if (isDoorway) {
            width = this.rng.range(2, 3);
            this.doorways.push({ x: Math.floor((exit1.x + exit2.x) / 2), y: Math.floor((exit1.y + exit2.y) / 2) });
        } else {
            const roll = this.rng.next();
            if (roll < 0.33) width = this.rng.range(3, 4);
            else if (roll < 0.66) width = this.rng.range(5, 6);
            else width = this.rng.range(7, 9);
        }

        // NEW: Determine Corridor Ceiling
        // Usually corridors should be lower (3.5) or match the lowest room?
        // Let's define a standard corridor height of 3.5 to feel "tight" between large rooms.
        const corrCeil = 3.5; 

        this.carveCorridor(
            exit1.x, exit1.y, exit2.x, exit2.y, width, 
            room1.baseHeight, room2.baseHeight,
            corrCeil
        );
    }

    carveCorridor(x1, y1, x2, y2, width, h1, h2, ceilH) {
        x1 = Math.floor(x1); y1 = Math.floor(y1);
        x2 = Math.floor(x2); y2 = Math.floor(y2);
        const halfW = Math.floor(width / 2);
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const xDir = dx !== 0 ? Math.sign(dx) : 0;
        const yDir = dy !== 0 ? Math.sign(dy) : 0;
        
        const totalSteps = Math.abs(dx) + Math.abs(dy);
        let currentStep = 0;

        const setBlock = (bx, by, stepIndex) => {
            let progress = 0;
            if (totalSteps > 0) progress = stepIndex / totalSteps;
            
            let rawH = h1 + (h2 - h1) * progress;
            const maxSlopeHeight = h1 + (stepIndex * 0.5 * Math.sign(h2 - h1));
            
            if (h2 > h1 && rawH > maxSlopeHeight) rawH = maxSlopeHeight;
            const snappedH = Math.round(rawH * 2) / 2;

            // Ensure ceiling is always above floor + min headroom
            // If snappedH is 4, and ceilH is 3.5, we have a problem.
            // Corridor ceiling should probably also ramp? 
            // For now, we simply push the ceiling up if the floor rises.
            const actualCeil = Math.max(ceilH, snappedH + 3.0);

            for (let wy = -halfW; wy <= halfW; wy++) {
                for (let wx = -halfW; wx <= halfW; wx++) {
                    this.safeSet(bx + wx, by + wy, 0, snappedH, actualCeil);
                }
            }
        };

        let cx = x1;
        let cy = y1;
        
        for (let i = 0; i < Math.abs(dx); i++) {
            cx += xDir;
            currentStep++;
            setBlock(cx, cy, currentStep);
        }

        for (let i = 0; i < Math.abs(dy); i++) {
            cy += yDir;
            currentStep++;
            setBlock(cx, cy, currentStep);
        }
    }

    safeSet(x, y, type, height, ceiling) {
        x = Math.floor(x); y = Math.floor(y);
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.map[y][x].type = type;
            this.map[y][x].height = height;
            // Fallback if not provided (e.g. old code calling safeSet)
            this.map[y][x].ceiling = (ceiling !== undefined) ? ceiling : this.params.wallHeight;
        }
    }

    // --- UTILITIES ---
    // (Rest of file: normalizeCoordinates, getExitPoint, getLootSpots, etc. unchanged)
    // Just ensure normalizeCoordinates copies the .ceiling property too.

    normalizeCoordinates() {
        let minX = this.width, maxX = 0, minY = this.height, maxY = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.map[y][x].type === 0 || this.map[y][x].type === 2) { 
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }
        minX -= 2; minY -= 2; maxX += 2; maxY += 2;
        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const offsetX = Math.floor((this.width - contentW) / 2) - minX;
        const offsetY = Math.floor((this.height - contentH) / 2) - minY;

        const newMap = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push({ type: 1, height: this.params.wallHeight, ceiling: this.params.wallHeight });
            }
            newMap.push(row);
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.map[y][x].type !== 1) {
                    const newX = x + offsetX;
                    const newY = y + offsetY;
                    if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
                        // Copy object with spread including ceiling
                        newMap[newY][newX] = { ...this.map[y][x] };
                    }
                }
            }
        }
        this.map = newMap;

        this.rooms.forEach(r => {
            r.x += offsetX; r.y += offsetY;
            r.center.x += offsetX; r.center.y += offsetY;
        });
        this.doorways.forEach(d => { d.x += offsetX; d.y += offsetY; });
    }
    
    // (getExitPoint, getOpposite, dirToAngle, angleToDir, assignStartEnd, getLootSpots omitted for brevity as they are unchanged)
    // But you must keep them in the file!
    
    getExitPoint(room, direction) {
        const jitter = this.rng.range(-2, 2);
        switch (direction) {
            case 'N': return { x: room.x + Math.floor(room.w / 2) + jitter, y: room.y };
            case 'S': return { x: room.x + Math.floor(room.w / 2) + jitter, y: room.y + room.h };
            case 'E': return { x: room.x + room.w, y: room.y + Math.floor(room.h / 2) + jitter };
            case 'W': return { x: room.x, y: room.y + Math.floor(room.h / 2) + jitter };
        }
    }

    getOpposite(dir) { return { 'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E' }[dir]; }
    dirToAngle(dir) { return { 'N': -90, 'S': 90, 'E': 0, 'W': 180 }[dir]; }
    angleToDir(angle) {
        angle = ((angle % 360) + 360) % 360;
        if (angle >= 315 || angle < 45) return 'E';
        if (angle >= 45 && angle < 135) return 'S';
        if (angle >= 135 && angle < 225) return 'W';
        return 'N';
    }
    assignStartEnd() {
        if (this.mainPath && this.mainPath.length > 0) {
            this.startRoom = this.mainPath[0];
            this.endRoom = this.mainPath[this.mainPath.length - 1];
        } else if (this.rooms.length > 0) {
            this.startRoom = this.rooms[0];
            this.endRoom = this.rooms[this.rooms.length - 1];
        }
    }

    getLootSpots(room, count) {
        const spots = [];
        let attempts = 0;
        while (spots.length < count && attempts < 20) {
            attempts++;
            const rx = this.rng.range(room.x + 2, room.x + room.w - 2);
            const ry = this.rng.range(room.y + 2, room.y + room.h - 2);
            const dx = rx - room.center.x;
            const dy = ry - room.center.y;
            if (Math.sqrt(dx*dx + dy*dy) < 3) continue; 
            const tile = this.map[ry][rx];
            if (tile.type === 0) {
                spots.push({ x: rx, z: ry }); 
            }
        }
        return spots;
    }
}