import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js'; 
import { RangedWeapon } from './Weapons/RangedWeapon.js';
import { WeaponConfig } from '../WeaponConfig.js';
import { LootManager } from './LootManager.js';
import { Pickup } from './Pickup.js';
import { RoomTypes } from '../ProcGen/RoomTypes.js'; // Optional, for checking room type if needed

export class Spawner {
    static findSafeSpawn(mapData, startRoom) {
        const isFloor = (x, y) => {
            if (y < 0 || y >= mapData.length || x < 0 || x >= mapData[0].length) return false;
            return mapData[y][x].type === 0;
        };
        
        // Try center
        if (startRoom) {
            const cx = startRoom.center.x;
            const cy = startRoom.center.y;
            if (isFloor(cx, cy)) {
                return { x: cx, z: cy };
            }
        }

        // Fallback scan
        for (let y = 2; y < mapData.length - 2; y++) {
            for (let x = 2; x < mapData[0].length - 2; x++) {
                if (isFloor(x, y)) return { x: x, z: y };
            }
        }
        return { x: 10, z: 10 };
    }

    // Helper to get the floor height at a specific grid coordinate
    static getFloorY(mapData, x, z) {
        if (z >= 0 && z < mapData.length && x >= 0 && x < mapData[0].length) {
            const tile = mapData[z][x];
            if (tile.type === 0) return tile.height;
        }
        return 0; // Default fallback
    }

    static spawnEntities(engine, mapData, generator, builder, audioManager) {
        // Initialize Light Pool (e.g. 64 lights max)
        // Note: Pickup class handles this internally now, but we keep LightManager for weapons
        // (Assuming LightManager logic is handled in game.js or initialized here if needed)

        const entities = {
            player: null,
            weapon: null,
            enemies: [],
            pickups: [], 
            exit: null
        };

        // 1. Player
        const spawnPoint = this.findSafeSpawn(mapData, generator.startRoom);
        const playerY = this.getFloorY(mapData, spawnPoint.x, spawnPoint.z) + Config.EYE_HEIGHT;
        
        engine.camera.position.set(spawnPoint.x + 0.5, playerY, spawnPoint.z + 0.5);
        
        // Rotate player to face the first corridor (simple logic: look at center of room)
        // or look towards map center.
        // For now, just reset rotation.
        engine.camera.rotation.set(0, 0, 0);

        entities.player = new Player(engine.camera, mapData, audioManager);

        // 2. Weapon
        entities.weapon = new RangedWeapon(engine.camera, WeaponConfig.PISTOL_9MM, audioManager);

        // 3. Enemies & Loot
        if (generator.rooms) {
            generator.rooms.forEach((room) => {
                if (room === generator.startRoom) return;

                // --- SPAWN ENEMY ---
                // Get center coordinates
                const ex = room.center.x;
                const ez = room.center.y;
                // Look up height at enemy position
                const ey = this.getFloorY(mapData, ex, ez);

                // Spawn Enemy (Pass Y implicitly via X/Z, or update Enemy class to accept Y?)
                // Current Enemy.js takes (scene, x, z). It sets Y to 0 internally.
                // We need to fix the Enemy constructor call or the Enemy class.
                // Actually, updated Enemy.js applies physics, so it should snap to floor?
                // YES: Enemy.js update() calls applyPhysics() which snaps to floor.
                // However, setting initial position correctly prevents 1 frame of falling.
                
                const enemy = new Enemy(engine.scene, ex, ez, audioManager, 'WATCHER');
                // Manually correct height immediately to prevent falling visual glitch
                enemy.mesh.position.y = ey; 
                
                entities.enemies.push(enemy);

                // --- SPAWN LOOT ---
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
                            // Look up height for this specific spot
                            const lootY = this.getFloorY(mapData, spot.x, spot.z);
                            
                            const p = new Pickup(engine.scene, itemKey, new THREE.Vector3(spot.x + 0.5, lootY, spot.z + 0.5));
                            entities.pickups.push(p);
                        }
                    });
                }
            });
        }

        // 4. Exit
        if (generator.endRoom) {
            const ex = generator.endRoom.center.x;
            const ez = generator.endRoom.center.y;
            const ey = this.getFloorY(mapData, ex, ez);
            
            entities.exit = builder.createExit(ex, ez);
            // Adjust exit beacon height
            entities.exit.position.y = ey + 0.45; 
        }

        return entities;
    }
}