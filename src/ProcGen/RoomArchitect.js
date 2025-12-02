import { RoomTypes } from './RoomTypes.js';

export class RoomArchitect {
    /**
     * Carves a room into the map based on its type and settings.
     * @param {Array} map - The 2D map array
     * @param {Object} room - The room object (x, y, w, h, type, baseHeight)
     * @param {Random} rng - RNG instance
     */
    static carve(map, room, rng) {
        const type = room.roomShape || RoomTypes.NORMAL;
        const baseH = room.baseHeight || 0;

        switch (type) {
            case RoomTypes.PIT:
                this.carvePit(map, room, baseH);
                break;
            case RoomTypes.PODIUM:
                this.carvePodium(map, room, baseH);
                break;
            case RoomTypes.BRIDGE:
                this.carveBridge(map, room, baseH, rng);
                break;
            default:
                this.carveFlat(map, room, baseH);
                break;
        }
    }

    // Standard rectangular floor
    static carveFlat(map, room, h) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.setTile(map, x, y, 0, h);
            }
        }
    }

    // Center is lower (-2)
    static carvePit(map, room, h) {
        // 1. Carve floor at base height
        this.carveFlat(map, room, h);

        // 2. Dig hole in center (leaving 2-tile border)
        if (room.w > 6 && room.h > 6) {
            for (let y = room.y + 2; y < room.y + room.h - 2; y++) {
                for (let x = room.x + 2; x < room.x + room.w - 2; x++) {
                    // Type 0 (Floor) but lower
                    this.setTile(map, x, y, 0, h - 2);
                }
            }
        }
    }

    // Center is higher (+1)
    static carvePodium(map, room, h) {
        this.carveFlat(map, room, h);

        if (room.w > 6 && room.h > 6) {
            for (let y = room.y + 2; y < room.y + room.h - 2; y++) {
                for (let x = room.x + 2; x < room.x + room.w - 2; x++) {
                    this.setTile(map, x, y, 0, h + 1);
                }
            }
        }
    }

    // Chasm with a strip of floor
    static carveBridge(map, room, h, rng) {
        // 1. Fill with Chasm (Type 2)
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.setTile(map, x, y, 2, h); // Type 2 = Chasm
            }
        }

        // 2. Build Bridge (Floor)
        // Determine direction based on room dimensions or random
        // For simplicity, if room is wider than tall, horizontal bridge.
        const horizontal = room.w > room.h;
        
        const cx = Math.floor(room.x + room.w / 2);
        const cy = Math.floor(room.y + room.h / 2);
        const bridgeWidth = 3;

        if (horizontal) {
            for (let x = room.x; x < room.x + room.w; x++) {
                for (let w = -1; w <= 1; w++) {
                    this.setTile(map, x, cy + w, 0, h);
                }
            }
        } else {
            for (let y = room.y; y < room.y + room.h; y++) {
                for (let w = -1; w <= 1; w++) {
                    this.setTile(map, cx + w, y, 0, h);
                }
            }
        }
    }

    static setTile(map, x, y, type, height) {
        if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
            map[y][x].type = type;
            map[y][x].height = height;
        }
    }
}