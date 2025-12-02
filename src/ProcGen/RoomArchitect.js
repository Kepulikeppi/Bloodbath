import { RoomTypes } from './RoomTypes.js';

export class RoomArchitect {
    // Added 'ceiling' param
    static carve(map, room, rng) {
        const type = room.roomShape || RoomTypes.NORMAL;
        const baseH = room.baseHeight || 0;
        const ceilH = room.ceilingHeight || 4;

        switch (type) {
            case RoomTypes.PIT:
                this.carvePit(map, room, baseH, ceilH);
                break;
            case RoomTypes.PODIUM:
                this.carvePodium(map, room, baseH, ceilH);
                break;
            case RoomTypes.BRIDGE:
                this.carveBridge(map, room, baseH, ceilH, rng);
                break;
            default:
                this.carveFlat(map, room, baseH, ceilH);
                break;
        }
    }

    static carveFlat(map, room, h, c) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.setTile(map, x, y, 0, h, c);
            }
        }
    }

    static carvePit(map, room, h, c) {
        this.carveFlat(map, room, h, c);

        if (room.w > 6 && room.h > 6) {
            for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
                for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
                    this.setTile(map, x, y, 0, h - 0.5, c);
                }
            }
            for (let y = room.y + 2; y < room.y + room.h - 2; y++) {
                for (let x = room.x + 2; x < room.x + room.w - 2; x++) {
                    this.setTile(map, x, y, 0, h - 1.0, c);
                }
            }
            for (let y = room.y + 3; y < room.y + room.h - 3; y++) {
                for (let x = room.x + 3; x < room.x + room.w - 3; x++) {
                    this.setTile(map, x, y, 0, h - 1.5, c);
                }
            }
        }
    }

    static carvePodium(map, room, h, c) {
        this.carveFlat(map, room, h, c);

        if (room.w > 6 && room.h > 6) {
            for (let y = room.y + 2; y < room.y + room.h - 2; y++) {
                for (let x = room.x + 2; x < room.x + room.w - 2; x++) {
                    this.setTile(map, x, y, 0, h + 0.5, c);
                }
            }
        }
    }

    static carveBridge(map, room, h, c, rng) {
        // 1. Fill with Chasm
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.setTile(map, x, y, 2, h, c); // Type 2 = Chasm
            }
        }

        // 2. Build Bridge
        const horizontal = room.w > room.h;
        const cx = Math.floor(room.x + room.w / 2);
        const cy = Math.floor(room.y + room.h / 2);

        if (horizontal) {
            for (let x = room.x; x < room.x + room.w; x++) {
                for (let w = -1; w <= 1; w++) {
                    this.setTile(map, x, cy + w, 0, h, c);
                }
            }
        } else {
            for (let y = room.y; y < room.y + room.h; y++) {
                for (let w = -1; w <= 1; w++) {
                    this.setTile(map, cx + w, y, 0, h, c);
                }
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