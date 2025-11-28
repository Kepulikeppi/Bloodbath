import * as THREE from 'https://esm.sh/three@0.160.0';
import { EnemyConfig } from '../EnemyConfig.js';
import { state } from './GameState.js';

export class Enemy {
    constructor(scene, x, z, audioManager, type) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.type = type;

        // 1. LOAD STATS
        this.stats = EnemyConfig[type];
        if (!this.stats) console.error(`Missing Config for Enemy Type: ${type}`);
        
        this.hp = this.stats.hp;
        this.speed = this.stats.speed;
        this.radius = this.stats.radius;

        // 2. STATE
        this.isDead = false;
        this.isAggro = false;
        this.attackTimer = 0;
        this.flashTimer = 0;

        // 3. CONTAINER
        this.mesh = new THREE.Group();
        this.mesh.position.set(x + 0.5, 0, z + 0.5);
        this.mesh.userData = { parent: this }; 

        this.scene.add(this.mesh);
    }

    takeDamage(amount) {
        if (this.isDead) return false;

        this.isAggro = true; 
        this.hp -= amount;

        this.flashTimer = 0.1;
        this.applyFlash(true);

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    applyFlash(isWhite) {
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                if (child.userData.ignoreFlash) return;

                if (isWhite) {
                    child.material.emissive.setHex(0xffffff);
                    child.material.emissiveIntensity = 1.0;
                } else {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }

    die() {
        this.isDead = true;
        this.dispose();
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
        });
    }

    // --- UPDATED UPDATE LOOP ---
    // We now accept 'allEnemies' to check for collisions with friends
    update(delta, playerPos, mapData, allEnemies = []) {
        if (this.isDead) return;

        // 1. Flash Reset
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;
            if (this.flashTimer <= 0) this.applyFlash(false);
        }

        // 2. Cooldowns
        if (this.attackTimer > 0) this.attackTimer -= delta;

        // 3. DISTANCE CHECK (2D ONLY)
        // We ignore Y axis so looking up/down doesn't break logic
        const dx = playerPos.x - this.mesh.position.x;
        const dz = playerPos.z - this.mesh.position.z;
        const dist2D = Math.sqrt(dx*dx + dz*dz);
        
        if (dist2D < this.stats.aggroRange || this.isAggro) {
            if (!this.isAggro) this.isAggro = true; 

            this.behavior(delta, playerPos, dist2D, mapData, allEnemies);
        }
    }

    behavior(delta, playerPos, dist2D, mapData, allEnemies) {
        // A. Look at player (We can look in 3D, that's fine for visuals)
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        // B. Move (Use 2D distance)
        if (dist2D > this.stats.stopDist) {
            const dir = new THREE.Vector3(
                playerPos.x - this.mesh.position.x,
                0, // Ignore Y diff for movement vector
                playerPos.z - this.mesh.position.z
            ).normalize();
            
            // --- SEPARATION LOGIC (Don't stack on other enemies) ---
            const separation = this.calculateSeparation(allEnemies);
            dir.add(separation).normalize(); 
            // -------------------------------------------------------

            const moveX = dir.x * this.speed * delta;
            const moveZ = dir.z * this.speed * delta;

            if (!this.checkCollision(this.mesh.position.x + moveX, this.mesh.position.z, mapData)) {
                this.mesh.position.x += moveX;
            }
            if (!this.checkCollision(this.mesh.position.x, this.mesh.position.z + moveZ, mapData)) {
                this.mesh.position.z += moveZ;
            }
        }

        // C. Attack (Use 2D distance)
        // If we are close enough horizontally, we can bite
        if (dist2D <= this.stats.attackRange && this.attackTimer <= 0) {
            this.attack();
        }
    }

    // --- NEW: Physics for Enemy-Enemy Collision ---
    calculateSeparation(allEnemies) {
        const force = new THREE.Vector3();
        const tooClose = 0.8; // Minimum distance between monsters

        allEnemies.forEach(other => {
            if (other === this || other.isDead) return;

            const dx = this.mesh.position.x - other.mesh.position.x;
            const dz = this.mesh.position.z - other.mesh.position.z;
            const distSq = dx*dx + dz*dz;

            if (distSq < tooClose * tooClose && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                // Push away! Closer = Stronger push
                force.x += (dx / dist) / dist; 
                force.z += (dz / dist) / dist;
            }
        });
        
        // Weight the separation force (1.5 is moderate push)
        return force.multiplyScalar(1.5); 
    }

    attack() {
        this.attackTimer = this.stats.attackSpeed;
        const isDead = state.modifyHP(-this.stats.damage);
        
        if (this.audioManager) {
            // Using a slightly randomized pitch for variety
            // Passing 'null' position means it plays "inside head" (2D), ideal for getting hit
            this.audioManager.playSFX('hit', null); 
        }

        console.log(`Player Hit! HP: ${state.data.hp}`);
        if(isDead) console.log("GAME OVER");
    }

    checkCollision(x, z, mapData) {
        const buffer = this.radius;
        return this.isWall(x + buffer, z + buffer, mapData) ||
               this.isWall(x - buffer, z + buffer, mapData) ||
               this.isWall(x + buffer, z - buffer, mapData) ||
               this.isWall(x - buffer, z - buffer, mapData);
    }

    isWall(x, z, mapData) {
        const gridX = Math.floor(x);
        const gridZ = Math.floor(z);
        if (gridZ < 0 || gridZ >= mapData.length || gridX < 0 || gridX >= mapData[0].length) {
            return true;
        }
        return mapData[gridZ][gridX] === 1;
    }
}