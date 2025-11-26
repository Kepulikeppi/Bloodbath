import { Config } from '../Config.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { RangedWeapon } from './Weapons/RangedWeapon.js';
import { WeaponConfig } from '../WeaponConfig.js';

export class Spawner {
    // Helper: Find Safe Spot (Keep existing logic)
    static findSafeSpawn(mapData, startRoom) {
        const isFloor = (x, y) => {
            return y >= 0 && y < mapData.length && x >= 0 && x < mapData[0].length && mapData[y][x] === 0;
        };

        if (startRoom) {
            const cx = startRoom.center.x;
            const cy = startRoom.center.y;
            if (isFloor(cx, cy) && isFloor(cx+1, cy) && isFloor(cx-1, cy) && isFloor(cx, cy+1) && isFloor(cx, cy-1)) {
                return { x: cx, z: cy };
            }
        }

        for (let y = 2; y < mapData.length - 2; y++) {
            for (let x = 2; x < mapData[0].length - 2; x++) {
                let allFloor = true;
                for(let dy = -1; dy <= 1; dy++) {
                    for(let dx = -1; dx <= 1; dx++) {
                        if (!isFloor(x+dx, y+dy)) allFloor = false;
                    }
                }
                if (allFloor) return { x: x, z: y };
            }
        }
        return { x: 10, z: 10 };
    }

    // NEW: The Main Spawn Function
    static spawnEntities(engine, mapData, generator, builder, audioManager) {
        const entities = {
            player: null,
            weapon: null,
            enemies: [],
            exit: null
        };

        // 1. Player
        const spawnPoint = this.findSafeSpawn(mapData, generator.startRoom);
        engine.camera.position.set(spawnPoint.x + 0.5, Config.EYE_HEIGHT, spawnPoint.z + 0.5);
        entities.player = new Player(engine.camera, mapData, audioManager);

        // 2. Weapon
        entities.weapon = new RangedWeapon(engine.camera, WeaponConfig.PISTOL_9MM, audioManager);

        // 3. Enemies
        if (generator.rooms) {
            generator.rooms.forEach((room) => {
                if (room === generator.startRoom) return;
                const enemy = new Enemy(engine.scene, room.center.x, room.center.y, 'FLOATING_DIAMOND');
                entities.enemies.push(enemy);
            });
        }

        // 4. Exit
        if (generator.endRoom) {
            entities.exit = builder.createExit(generator.endRoom.center.x, generator.endRoom.center.y);
        }

        return entities;
    }
}