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
            wallHeight: Config.WALL_HEIGHT || 4
        };
    }

    generate() {
        console.log(`[DungeonGen] Generating ${this.width}x${this.height} map...`);
        
        // 1. Initialize Grid
        this.map = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push({ type: 1, height: this.params.wallHeight });
            }
            this.map.push(row);
        }

        this.rooms = [];
        this.doorways = [];

        // 2. Generate Logic
        this.generateMainPath();
        this.generateBranches();
        this.assignStartEnd();
        
        // 3. Carve Rooms (Now using Architect)
        this.rooms.forEach(room => {
            RoomArchitect.carve(this.map, room, this.rng);
        });

        // 4. Connect Rooms (Now handles height interpolation)
        // Note: We stored connection info during generation logic, now we apply it.
        // Actually, the previous logic applied corridors immediately. 
        // We need to ensure carveCorridor handles height.

        // 5. Center
        this.normalizeCoordinates();

        console.log(`[DungeonGen] Complete: ${this.rooms.length} rooms`);
        return this.map;
    }

    // --- GENERATION LOGIC ---

    generateMainPath() {
        const p = this.params;
        const startX = this.rng.range(10, Math.floor(this.width * 0.15));
        const startY = this.rng.range(Math.floor(this.height * 0.3), Math.floor(this.height * 0.7));
        
        // Main path stays at Height 0 for stability
        const firstRoom = { 
            x: startX, y: startY, 
            w: this.rng.range(p.roomMinSize, p.roomMaxSize), 
            h: this.rng.range(p.roomMinSize, p.roomMaxSize), 
            type: 'main', depth: 0,
            baseHeight: 0,
            roomShape: RoomTypes.NORMAL 
        };
        this.finalizeRoom(firstRoom);
        this.rooms.push(firstRoom);
        // We carve later now? No, existing logic relies on detecting collisions.
        // We must carve basic flat shape here for collision, apply detail later.
        // For now, let's just register it and carve fully at the end? 
        // No, canPlaceRoom needs to check bounds. It doesn't check map data, it checks bounds.
        // So we are safe to defer carving.
        
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
                // Branches can change height!
                // Random height shift: -2, 0, or +2
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
            // Small chance to shift height again on sub-branches
            const nextHeight = currentHeight; // Keep flat for simplicity in sub-branches for now

            const branchRoom = this.tryPlaceRoom(sourceRoom, dir, 'branch', nextHeight);
            if (branchRoom) {
                branchRoom.depth = depth;
                this.rooms.push(branchRoom);
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

    // --- PLACEMENT ---

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
                
                const newRoom = { 
                    x: Math.floor(x), y: Math.floor(y), w, h, type, 
                    connectionDir: direction,
                    baseHeight: height,
                    // Randomize shape for branches
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

    // --- CONNECTIONS WITH HEIGHT ---

    connectRooms(room1, room2, direction) {
        const exit1 = this.getExitPoint(room1, direction);
        const exit2 = this.getExitPoint(room2, this.getOpposite(direction));
        
        // Always corridor if height difference exists (No doorways on slopes)
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

        // Pass start/end heights to carver
        this.carveCorridor(exit1.x, exit1.y, exit2.x, exit2.y, width, room1.baseHeight, room2.baseHeight);
    }

    carveCorridor(x1, y1, x2, y2, width, h1, h2) {
        x1 = Math.floor(x1); y1 = Math.floor(y1);
        x2 = Math.floor(x2); y2 = Math.floor(y2);
        const halfW = Math.floor(width / 2);
        
        const startX = Math.min(x1, x2), endX = Math.max(x1, x2);
        const startY = Math.min(y1, y2), endY = Math.max(y1, y2);

        // Calculate total distance for interpolation
        const totalDist = (endX - startX) + (endY - startY);
        let currentDist = 0;

        // Note: This is a simplified linear interpolation. 
        // It works for L-shapes, but steps might be uneven if segments vary wildly.
        
        const setStep = (x, y, dist) => {
            // Lerp height
            let t = 0;
            if (totalDist > 0) t = dist / totalDist;
            // Snap to nearest 0.5 step
            const h = h1 + (h2 - h1) * t;
            const snappedH = Math.round(h * 2) / 2;
            
            for (let w = -halfW; w <= halfW; w++) {
                this.safeSet(x, y + w, 0, snappedH); // Horizontal
                this.safeSet(x + w, y, 0, snappedH); // Vertical fix attempt? No, context depends.
            }
        };

        // Horizontal Leg
        for (let x = startX; x <= endX; x++) {
            const t = (x - startX) / (totalDist || 1);
            const h = h1 + (h2 - h1) * t;
            const snappedH = Math.round(h * 2) / 2;
            
            for (let w = -halfW; w <= halfW; w++) {
                this.safeSet(x, y1 + w, 0, snappedH);
            }
            currentDist++;
        }

        // Vertical Leg
        // Note: Start height for vertical leg should continue from where horizontal left off
        const vertStartDist = (endX - startX);
        
        for (let y = startY; y <= endY; y++) {
            const t = (vertStartDist + (y - startY)) / (totalDist || 1);
            const h = h1 + (h2 - h1) * t;
            const snappedH = Math.round(h * 2) / 2;

            for (let w = -halfW; w <= halfW; w++) {
                this.safeSet(x2 + w, y, 0, snappedH);
            }
        }
    }

    safeSet(x, y, type, height) {
        x = Math.floor(x); y = Math.floor(y);
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.map[y][x].type = type;
            this.map[y][x].height = height;
        }
    }

    // --- UTILITIES (Keep existing) ---
    normalizeCoordinates() {
        let minX = this.width, maxX = 0, minY = this.height, maxY = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.map[y][x].type === 0 || this.map[y][x].type === 2) { // Include chasms in bounds
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
                row.push({ type: 1, height: this.params.wallHeight });
            }
            newMap.push(row);
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.map[y][x].type !== 1) {
                    const newX = x + offsetX;
                    const newY = y + offsetY;
                    if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
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

            // Ensure valid floor (Type 0) AND safe from chasm edges?
            // For now, just check it's a floor
            const tile = this.map[ry][rx];
            if (tile.type === 0) {
                // Ensure loot sits ON the floor (using tile height)
                // Spawner needs to read this height? 
                // Yes, we return the coords, spawner should look up height.
                spots.push({ x: rx, z: ry }); 
            }
        }
        return spots;
    }
}