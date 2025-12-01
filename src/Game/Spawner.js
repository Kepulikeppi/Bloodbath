import * as THREE from 'https://esm.sh/three@0.160.0'; // FIXED: Added this import
import { Config } from '../Config.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js'; 
import { RangedWeapon } from './Weapons/RangedWeapon.js';
import { WeaponConfig } from '../WeaponConfig.js';
import { LootManager } from './LootManager.js';
import { Pickup } from './Pickup.js';

export class Spawner {
    static findSafeSpawn(mapData, startRoom) {
        const isFloor = (x, y) => {
            if (y < 0 || y >= mapData.length || x < 0 || x >= mapData[0].length) return false;
            // Check object property
            return mapData[y][x].type === 0;
        };
        
        if (startRoom) {
            const cx = startRoom.center.x;
            const cy = startRoom.center.y;
            if (isFloor(cx, cy)) {
                return { x: cx, z: cy };
            }
        }

        for (let y = 2; y < mapData.length - 2; y++) {
            for (let x = 2; x < mapData[0].length - 2; x++) {
                if (isFloor(x, y)) return { x: x, z: y };
            }
        }
        return { x: 10, z: 10 };
    }

    static spawnEntities(engine, mapData, generator, builder, audioManager) {
        const entities = {
            player: null,
            weapon: null,
            enemies: [],
            pickups: [], 
            exit: null
        };

        // 1. Player
        const spawnPoint = this.findSafeSpawn(mapData, generator.startRoom);
        engine.camera.position.set(spawnPoint.x + 0.5, Config.EYE_HEIGHT, spawnPoint.z + 0.5);
        entities.player = new Player(engine.camera, mapData, audioManager);

        // 2. Weapon
        entities.weapon = new RangedWeapon(engine.camera, WeaponConfig.PISTOL_9MM, audioManager);

        // 3. Enemies & Loot
        if (generator.rooms) {
            generator.rooms.forEach((room) => {
                if (room === generator.startRoom) return;

                // Enemy
                const enemy = new Enemy(engine.scene, room.center.x, room.center.y, audioManager, 'WATCHER');
                entities.enemies.push(enemy);

                // Loot
                let lootType = 'COMMON';
                let count = 1;

                if (room === generator.endRoom) {
                    lootType = 'NONE'; 
                } else if (room.type === 'branch') {
                    lootType = 'RARE'; 
                    count = Math.random() > 0.5 ? 2 : 1;
                } else {
                    if (Math.random() > 0.6) lootType = 'NONE';
                }

                if (lootType !== 'NONE') {
                    const spots = generator.getLootSpots(room, count);
                    spots.forEach(spot => {
                        const itemKey = LootManager.getMapLoot(lootType);
                        if (itemKey) {
                            const p = new Pickup(engine.scene, itemKey, new THREE.Vector3(spot.x + 0.5, 0, spot.z + 0.5));
                            entities.pickups.push(p);
                        }
                    });
                }
            });
        }

        // 4. Exit
        if (generator.endRoom) {
            entities.exit = builder.createExit(generator.endRoom.center.x, generator.endRoom.center.y);
        }

        return entities;
    }
}