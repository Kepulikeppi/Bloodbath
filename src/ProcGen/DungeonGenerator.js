import { Random } from '../Utils/Random.js';
import { Config } from '../Config.js';

/**
 * Diablo-style dungeon generator
 * 
 * Creates a main path of connected rooms with branching side areas.
 * Rooms connect directly with minimal corridors for a dense, explorable feel.
 */
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
        
        // Generation parameters (tuned values)
        this.params = {
            targetRooms: Config.TARGET_ROOMS || 12,
            branchChance: Config.BRANCH_CHANCE || 40,
            maxBranchDepth: Config.MAX_BRANCH_DEPTH || 3,
            roomMinSize: Config.ROOM_MIN_SIZE || 10,
            roomMaxSize: Config.ROOM_MAX_SIZE || 30,
            wiggle: Config.DIRECTION_WIGGLE || 80,
            corridorWidth: Config.CORRIDOR_WIDTH || 4
        };
    }

    generate() {
        console.log(`[DungeonGen] Generating ${this.width}x${this.height} map...`);
        
        // 1. Initialize grid with walls
        this.map = [];
        for (let y = 0; y < this.height; y++) {
            this.map.push(new Array(this.width).fill(1));
        }
        this.rooms = [];
        this.doorways = [];

        // 2. Generate main path
        this.generateMainPath();

        // 3. Add branches
        this.generateBranches();

        // 4. Set start and end rooms
        this.assignStartEnd();

        console.log(`[DungeonGen] Complete: ${this.rooms.length} rooms`);
        return this.map;
    }

    // ========================================
    // MAIN PATH GENERATION
    // ========================================

    generateMainPath() {
        const p = this.params;
        
        // Start position - left side, vertically centered-ish
        const startX = this.rng.range(10, Math.floor(this.width * 0.15));
        const startY = this.rng.range(
            Math.floor(this.height * 0.3), 
            Math.floor(this.height * 0.7)
        );
        
        // First room
        const firstRoom = {
            x: startX,
            y: startY,
            w: this.rng.range(p.roomMinSize, p.roomMaxSize),
            h: this.rng.range(p.roomMinSize, p.roomMaxSize),
            type: 'main',
            depth: 0
        };
        // Add center property for compatibility with game.js
        firstRoom.center = {
            x: Math.floor(firstRoom.x + firstRoom.w / 2),
            y: Math.floor(firstRoom.y + firstRoom.h / 2)
        };
        
        this.rooms.push(firstRoom);
        this.carveRoom(firstRoom);
        
        // Build main path
        const mainPath = [firstRoom];
        let currentAngle = this.rng.range(-30, 30); // Start heading roughly east
        let failedAttempts = 0;
        const maxFails = 15;
        
        while (mainPath.length < p.targetRooms && failedAttempts < maxFails) {
            const currentRoom = mainPath[mainPath.length - 1];
            
            // Wiggle the direction
            currentAngle += this.rng.range(-p.wiggle, p.wiggle);
            // Soft bias to keep moving generally forward
            if (currentAngle < -90) currentAngle += 40;
            if (currentAngle > 140) currentAngle -= 40;
            
            const primaryDir = this.angleToDir(currentAngle);
            
            // Try directions: primary first, then shuffled alternatives
            const directions = [primaryDir];
            const allDirs = this.rng.shuffle(['N', 'S', 'E', 'W']);
            for (const d of allDirs) {
                if (!directions.includes(d)) directions.push(d);
            }
            
            let placed = false;
            for (const dir of directions) {
                const newRoom = this.tryPlaceRoom(currentRoom, dir, 'main');
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
            
            if (!placed) {
                failedAttempts++;
                // Backtrack to an earlier room
                if (mainPath.length > 2) {
                    const backIdx = this.rng.range(
                        Math.max(0, mainPath.length - 4), 
                        mainPath.length - 2
                    );
                    const backRoom = mainPath[backIdx];
                    
                    for (const dir of this.rng.shuffle(['N', 'S', 'E', 'W'])) {
                        const newRoom = this.tryPlaceRoom(backRoom, dir, 'main');
                        if (newRoom) {
                            newRoom.depth = backRoom.depth + 1;
                            this.rooms.push(newRoom);
                            mainPath.push(newRoom);
                            this.carveRoom(newRoom);
                            this.connectRooms(backRoom, newRoom, dir);
                            currentAngle = this.dirToAngle(dir);
                            failedAttempts = Math.max(0, failedAttempts - 2);
                            break;
                        }
                    }
                }
            }
        }
        
        this.mainPath = mainPath;
        console.log(`[DungeonGen] Main path: ${mainPath.length} rooms`);
    }

    // ========================================
    // BRANCH GENERATION
    // ========================================

    generateBranches() {
        const p = this.params;
        let branchCount = 0;
        
        // Skip first and last rooms on main path
        for (let i = 1; i < this.mainPath.length - 1; i++) {
            if (this.rng.next() * 100 < p.branchChance) {
                branchCount += this.addBranch(this.mainPath[i], 0, p.maxBranchDepth);
            }
        }
        
        console.log(`[DungeonGen] Branches: ${branchCount} rooms`);
    }

    addBranch(sourceRoom, depth, maxDepth) {
        if (depth >= maxDepth) return 0;
        
        let roomsAdded = 0;
        const directions = this.rng.shuffle(['N', 'S', 'E', 'W']);
        
        for (const dir of directions) {
            const branchRoom = this.tryPlaceRoom(sourceRoom, dir, 'branch');
            if (branchRoom) {
                branchRoom.depth = depth;
                this.rooms.push(branchRoom);
                this.carveRoom(branchRoom);
                this.connectRooms(sourceRoom, branchRoom, dir);
                roomsAdded++;
                
                // Maybe continue the branch
                if (this.rng.next() < 0.4 && depth + 1 < maxDepth) {
                    roomsAdded += this.addBranch(branchRoom, depth + 1, maxDepth);
                }
                break; // Only one branch per source
            }
        }
        
        return roomsAdded;
    }

    // ========================================
    // ROOM PLACEMENT
    // ========================================

    tryPlaceRoom(sourceRoom, direction, type) {
        const p = this.params;
        
        // Try multiple sizes (shrink if needed)
        for (let shrink = 0; shrink < 5; shrink++) {
            const sizeReduction = shrink * 3;
            const w = Math.max(p.roomMinSize, 
                this.rng.range(p.roomMinSize, p.roomMaxSize) - sizeReduction);
            const h = Math.max(p.roomMinSize, 
                this.rng.range(p.roomMinSize, p.roomMaxSize) - sizeReduction);
            
            // Try multiple positions
            for (let attempt = 0; attempt < 4; attempt++) {
                const gap = this.rng.range(1, 4);
                const offset = this.rng.range(-4, 4);
                
                const exit = this.getExitPoint(sourceRoom, direction);
                let x, y;
                
                switch (direction) {
                    case 'N':
                        x = exit.x - Math.floor(w / 2) + offset;
                        y = exit.y - h - gap;
                        break;
                    case 'S':
                        x = exit.x - Math.floor(w / 2) + offset;
                        y = exit.y + gap;
                        break;
                    case 'E':
                        x = exit.x + gap;
                        y = exit.y - Math.floor(h / 2) + offset;
                        break;
                    case 'W':
                        x = exit.x - w - gap;
                        y = exit.y - Math.floor(h / 2) + offset;
                        break;
                }
                
                const newRoom = {
                    x: Math.floor(x),
                    y: Math.floor(y),
                    w, h,
                    type,
                    connectionDir: direction
                };
                // Add center property for compatibility with game.js
                newRoom.center = {
                    x: Math.floor(newRoom.x + newRoom.w / 2),
                    y: Math.floor(newRoom.y + newRoom.h / 2)
                };
                
                if (this.canPlaceRoom(newRoom)) {
                    return newRoom;
                }
            }
        }
        
        return null;
    }

    canPlaceRoom(room, padding = 2) {
        // Check grid bounds
        if (room.x < 4 || room.y < 4 ||
            room.x + room.w >= this.width - 4 ||
            room.y + room.h >= this.height - 4) {
            return false;
        }
        
        // Check overlap with existing rooms
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

    // ========================================
    // CARVING & CONNECTIONS
    // ========================================

    carveRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.safeSet(x, y, 0);
            }
        }
    }

    connectRooms(room1, room2, direction) {
        const exit1 = this.getExitPoint(room1, direction);
        const exit2 = this.getExitPoint(room2, this.getOpposite(direction));
        
        // 20% doorway, 80% corridor
        const isDoorway = this.rng.next() < 0.20;
        
        if (isDoorway) {
            // Tight doorway - narrow width, minimal length
            const width = this.rng.range(2, 3);
            this.carveCorridor(exit1.x, exit1.y, exit2.x, exit2.y, width);
            
            this.doorways.push({
                x: Math.floor((exit1.x + exit2.x) / 2),
                y: Math.floor((exit1.y + exit2.y) / 2)
            });
        } else {
            // Corridor with varying width and length
            // Width: narrow (3-4), medium (5-6), wide (7-9)
            const widthRoll = this.rng.next();
            let width;
            if (widthRoll < 0.33) {
                width = this.rng.range(3, 4);  // Narrow
            } else if (widthRoll < 0.66) {
                width = this.rng.range(5, 6);  // Medium
            } else {
                width = this.rng.range(7, 9);  // Wide
            }
            
            // Length extension: short (0), medium (3-8), long (10-18), very long (20-35)
            const lengthRoll = this.rng.next();
            let extraLength;
            if (lengthRoll < 0.35) {
                extraLength = 0;  // Short - direct connection
            } else if (lengthRoll < 0.65) {
                extraLength = this.rng.range(3, 8);  // Medium
            } else if (lengthRoll < 0.90) {
                extraLength = this.rng.range(10, 18);  // Long
            } else {
                extraLength = this.rng.range(20, 35);  // Very long
            }
            
            // Extend the corridor by pushing exit points apart
            if (extraLength > 0) {
                const halfExtra = Math.floor(extraLength / 2);
                switch (direction) {
                    case 'N':
                        exit1.y += halfExtra;
                        exit2.y -= halfExtra;
                        break;
                    case 'S':
                        exit1.y -= halfExtra;
                        exit2.y += halfExtra;
                        break;
                    case 'E':
                        exit1.x -= halfExtra;
                        exit2.x += halfExtra;
                        break;
                    case 'W':
                        exit1.x += halfExtra;
                        exit2.x -= halfExtra;
                        break;
                }
            }
            
            this.carveCorridor(exit1.x, exit1.y, exit2.x, exit2.y, width);
        }
    }

    carveCorridor(x1, y1, x2, y2, width) {
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);
        x2 = Math.floor(x2);
        y2 = Math.floor(y2);
        
        const halfW = Math.floor(width / 2);
        
        // Horizontal segment
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        for (let x = startX; x <= endX; x++) {
            for (let w = -halfW; w <= halfW; w++) {
                this.safeSet(x, y1 + w, 0);
            }
        }
        
        // Vertical segment
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);
        for (let y = startY; y <= endY; y++) {
            for (let w = -halfW; w <= halfW; w++) {
                this.safeSet(x2 + w, y, 0);
            }
        }
    }

    safeSet(x, y, val) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.map[y][x] = val;
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    getExitPoint(room, direction) {
        const jitter = this.rng.range(-2, 2);
        switch (direction) {
            case 'N': return { x: room.x + Math.floor(room.w / 2) + jitter, y: room.y };
            case 'S': return { x: room.x + Math.floor(room.w / 2) + jitter, y: room.y + room.h };
            case 'E': return { x: room.x + room.w, y: room.y + Math.floor(room.h / 2) + jitter };
            case 'W': return { x: room.x, y: room.y + Math.floor(room.h / 2) + jitter };
        }
    }

    getOpposite(dir) {
        return { 'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E' }[dir];
    }

    dirToAngle(dir) {
        return { 'N': -90, 'S': 90, 'E': 0, 'W': 180 }[dir];
    }

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
}