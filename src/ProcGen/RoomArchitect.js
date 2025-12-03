import { RoomTypes } from './RoomTypes.js';

export class RoomArchitect {
    static carve(map, room, rng) {
        // We ignore specific shapes (Pit/Podium) and just carve flat rooms.
        // We keep the ceiling variation logic.
        const ceilH = room.ceilingHeight || 4;
        
        // Always carve at Height 0
        this.carveFlat(map, room, 0, ceilH);
    }

    static carveFlat(map, room, floorH, ceilH) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                // Type 0 = Floor
                this.setTile(map, x, y, 0, floorH, ceilH);
            }
        }
    }

    static setTile(map, x, y, type, height, ceiling) {
        if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
            map[y][x].type = type;
            map[y][x].height = height;
            map[y][x].ceiling = ceiling;
        }
    }
}