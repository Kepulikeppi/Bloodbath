import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';
import { state } from './GameState.js';
import { LootManager } from './LootManager.js';
import { Pickup } from './Pickup.js';

export class CombatSystem {
    constructor(scene, camera, audioManager, debrisSystem) {
        this.scene = scene;
        this.camera = camera;
        this.audioManager = audioManager;
        this.debrisSystem = debrisSystem;
        
        this.raycaster = new THREE.Raycaster();
        
        // These need to be updated when a level loads
        this.enemies = [];
        this.levelMeshes = [];
        
        // Callback provided by game.js to track new items
        this.onLootSpawned = null; 
    }

    updateContext(enemies, levelMeshes, onLootSpawned) {
        this.enemies = enemies;
        this.levelMeshes = levelMeshes;
        this.onLootSpawned = onLootSpawned;
    }

    fire(data) {
        // 1. Calculate Spread / Ray Origin
        const origin = new THREE.Vector2(0, 0);
        if (data.spread > 0) {
            origin.x += (Math.random() - 0.5) * data.spread;
            origin.y += (Math.random() - 0.5) * data.spread;
        }

        this.raycaster.setFromCamera(origin, this.camera);

        // 2. Collect Targets
        // Map enemies to their meshes for raycasting
        const enemyMeshes = this.enemies.map(e => e.mesh);
        const allTargets = [...enemyMeshes, ...this.levelMeshes];
        
        const hits = this.raycaster.intersectObjects(allTargets, true);

        if (hits.length > 0) {
            // Ignore hits too close (inside player's own collider)
            const validHit = hits.find(h => h.distance > 0.5);
            
            if (!validHit) return;

            // Melee Range Check
            if (data.isMelee && validHit.distance > (data.range || 2.0)) return;

            // 3. Identify Target
            let target = validHit.object;
            // Traverse up to find the main container that has user data
            while(target && !target.userData.parent) target = target.parent;
            
            const enemyInstance = target ? target.userData.parent : null;

            if (enemyInstance) {
                this.handleEnemyHit(enemyInstance, data.damage, validHit);
            } else {
                this.handleWallHit(validHit);
            }
        }
    }

    handleEnemyHit(enemy, damage, hitInfo) {
        state.recordHit();
        
        // Apply Damage
        const died = enemy.takeDamage(damage);
        const hitPoint = hitInfo.point;
        const shootDir = this.camera.getWorldDirection(new THREE.Vector3());

        if (died) {
            this.handleEnemyDeath(enemy);
        } else {
            // Hit Effects
            if (this.audioManager) this.audioManager.playSFX('hit', enemy.mesh.position);
            
            if (this.debrisSystem) {
                this.debrisSystem.spawnBlood(hitPoint, shootDir);
                this.debrisSystem.spawnSplat(enemy.mesh.position, new THREE.Vector3(0, 1, 0));
            }
        }
    }

    handleEnemyDeath(enemy) {
        state.recordKill();
        if (this.audioManager) this.audioManager.playSFX('death', enemy.mesh.position);
        
        // Remove from the local list reference so we don't hit it again
        // (Note: game.js needs to filter its own list too, or we share the reference)
        // Since we passed the array by reference, splicing it here affects game.js!
        const idx = this.enemies.indexOf(enemy);
        if (idx > -1) this.enemies.splice(idx, 1);

        // Loot Drop
        const type = enemy.stats.enemyType;
        if (type) {
            const drop = LootManager.getDrop(type);
            if (drop) {
                const p = new Pickup(this.scene, drop, enemy.mesh.position);
                // Notify game.js to track this pickup
                if (this.onLootSpawned) this.onLootSpawned(p);
            }
        }

        // Gore Explosion
        const gibOrigin = enemy.mesh.position.clone();
        gibOrigin.y += 1.0; 
        if (this.debrisSystem) {
            this.debrisSystem.spawnGibs(gibOrigin, Config.GORE.COLOR_FLESH);
            this.debrisSystem.spawnGibs(gibOrigin, Config.GORE.COLOR_BONE);
            this.debrisSystem.spawnSplat(enemy.mesh.position, new THREE.Vector3(0, 1, 0));
        }
    }

    handleWallHit(hitInfo) {
        // Sparks / Wall Debris
        if (this.debrisSystem) {
            this.debrisSystem.spawnSplat(hitInfo.point, hitInfo.face.normal);
        }
    }
}