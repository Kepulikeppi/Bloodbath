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
        
        // Physics State
        this.velocityY = 0;
        this.onGround = false;

        // 3. CONTAINER
        this.mesh = new THREE.Group();
        // Initialize at correct floor height (assuming 0 for start)
        this.mesh.position.set(x + 0.5, 0, z + 0.5);
        this.mesh.userData = { parent: this }; 

        // 4. BUILD VISUALS
        this.buildVisuals();

        this.scene.add(this.mesh);
    }

    buildVisuals() {
        // (Visual construction logic remains the same as before)
        if (this.type === 'WATCHER' || this.type === 'FLOATING_DIAMOND') {
            const size = this.stats.scale || 0.5;
            
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({ 
                color: this.stats.color, 
                roughness: 0.4,
                emissive: this.stats.emissive || 0x000000,
                emissiveIntensity: 0.5
            });
            
            const body = new THREE.Mesh(geometry, material);
            body.position.y = 1.6;
            
            const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(0.15, 0.05, size/2 + 0.02);
            
            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            rightEye.position.set(-0.15, 0.05, size/2 + 0.02);
            
            leftEye.userData = { ignoreFlash: true };
            rightEye.userData = { ignoreFlash: true };

            body.add(leftEye);
            body.add(rightEye);
            
            this.mesh.add(body);
        }
    }

    takeDamage(amount) {
        if (this.isDead) return false;

        this.isAggro = true; 
        this.hp -= amount;

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
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

    update(delta, playerPos, mapData, allEnemies = []) {
        if (this.isDead) return;

        if (this.attackTimer > 0) this.attackTimer -= delta;

        // --- 1. GRAVITY & FLOOR SNAP ---
        this.applyPhysics(delta, mapData);

        // --- 2. AI LOGIC ---
        // We check distance in 3D now, but mainly care about X/Z
        const dx = playerPos.x - this.mesh.position.x;
        const dz = playerPos.z - this.mesh.position.z;
        const distXZ = Math.sqrt(dx*dx + dz*dz);
        
        if (distXZ < this.stats.aggroRange || this.isAggro) {
            if (!this.isAggro) this.isAggro = true; 
            this.behavior(delta, playerPos, distXZ, mapData, allEnemies);
        }
    }

    applyPhysics(delta, mapData) {
        // Apply Gravity
        this.velocityY -= 30.0 * delta;
        this.mesh.position.y += this.velocityY * delta;

        // Check Floor Height
        const x = Math.floor(this.mesh.position.x);
        const z = Math.floor(this.mesh.position.z);

        let floorHeight = -100; // Default to pit

        if (z >= 0 && z < mapData.length && x >= 0 && x < mapData[0].length) {
            const tile = mapData[z][x];
            if (tile.type === 0) { // Floor
                floorHeight = tile.height;
            } else if (tile.type === 1) { // Wall
                // If we are somehow inside a wall, push up?
                floorHeight = tile.height; // Usually high
            }
        }

        // Snap to floor if close enough
        if (this.mesh.position.y < floorHeight) {
            this.mesh.position.y = floorHeight;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Death plane
        if (this.mesh.position.y < -50) {
            this.die();
        }
    }

    behavior(delta, playerPos, distXZ, mapData, allEnemies) {
        // Look at player horizontally
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        if (distXZ > this.stats.stopDist) {
            const dir = new THREE.Vector3(
                playerPos.x - this.mesh.position.x,
                0,
                playerPos.z - this.mesh.position.z
            ).normalize();
            
            const separation = this.calculateSeparation(allEnemies);
            dir.add(separation).normalize(); 

            const moveX = dir.x * this.speed * delta;
            const moveZ = dir.z * this.speed * delta;

            // Check X Move
            if (!this.checkCollision(this.mesh.position.x + moveX, this.mesh.position.z, mapData)) {
                this.mesh.position.x += moveX;
            }
            // Check Z Move
            if (!this.checkCollision(this.mesh.position.x, this.mesh.position.z + moveZ, mapData)) {
                this.mesh.position.z += moveZ;
            }
        }

        if (distXZ <= this.stats.attackRange && this.attackTimer <= 0) {
            // Attack only if vertically aligned (don't bite feet from below floor)
            if (Math.abs(this.mesh.position.y - playerPos.y) < 2.0) {
                this.attack();
            }
        }
    }

    calculateSeparation(allEnemies) {
        const force = new THREE.Vector3();
        const tooClose = 0.8; 

        allEnemies.forEach(other => {
            if (other === this || other.isDead) return;

            const dx = this.mesh.position.x - other.mesh.position.x;
            const dz = this.mesh.position.z - other.mesh.position.z;
            const distSq = dx*dx + dz*dz;

            if (distSq < tooClose * tooClose && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                force.x += (dx / dist) / dist; 
                force.z += (dz / dist) / dist;
            }
        });
        
        return force.multiplyScalar(1.5); 
    }

    attack() {
        this.attackTimer = this.stats.attackSpeed;
        const isDead = state.modifyHP(-this.stats.damage);
        
        if (this.audioManager) {
            this.audioManager.playSFX('hit', null); 
        }
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

        const tile = mapData[gridZ][gridX];
        const myHeight = this.mesh.position.y;
        const maxStep = 1.0; // Enemies can step up 1 meter

        // 1. It's a Wall type?
        if (tile.type === 1) return true;

        // 2. It's a Chasm?
        if (tile.type === 2) return true; // Don't walk into pits

        // 3. Height Check
        // If floor is too high compared to my feet, it's a wall
        if (tile.height > myHeight + maxStep) {
            return true;
        }

        return false;
    }
}