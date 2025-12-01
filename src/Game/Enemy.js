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
        
        // 3. CONTAINER
        this.mesh = new THREE.Group();
        this.mesh.position.set(x + 0.5, 0, z + 0.5);
        this.mesh.userData = { parent: this }; 

        // 4. BUILD VISUALS
        this.buildVisuals();

        this.scene.add(this.mesh);
    }

    buildVisuals() {
        if (this.type === 'WATCHER' || this.type === 'FLOATING_DIAMOND') {
            const size = this.stats.scale || 0.5;
            
            // A. Main Body (Red Box)
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({ 
                color: this.stats.color, 
                roughness: 0.4,
                emissive: this.stats.emissive || 0x000000,
                emissiveIntensity: 0.5
            });
            
            const body = new THREE.Mesh(geometry, material);
            body.position.y = 1.6;
            
            // B. Glowing Eyes
            const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(0.15, 0.05, size/2 + 0.02);
            
            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            rightEye.position.set(-0.15, 0.05, size/2 + 0.02);
            
            body.add(leftEye);
            body.add(rightEye);
            
            this.mesh.add(body);
        }
    }

    takeDamage(amount) {
        if (this.isDead) return false;

        this.isAggro = true; 
        this.hp -= amount;

        // Flash logic removed.

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

        // DISTANCE CHECK
        const dx = playerPos.x - this.mesh.position.x;
        const dz = playerPos.z - this.mesh.position.z;
        const dist2D = Math.sqrt(dx*dx + dz*dz);
        
        if (dist2D < this.stats.aggroRange || this.isAggro) {
            if (!this.isAggro) this.isAggro = true; 
            this.behavior(delta, playerPos, dist2D, mapData, allEnemies);
        }
    }

    behavior(delta, playerPos, dist2D, mapData, allEnemies) {
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        if (dist2D > this.stats.stopDist) {
            const dir = new THREE.Vector3(
                playerPos.x - this.mesh.position.x,
                0,
                playerPos.z - this.mesh.position.z
            ).normalize();
            
            const separation = this.calculateSeparation(allEnemies);
            dir.add(separation).normalize(); 

            const moveX = dir.x * this.speed * delta;
            const moveZ = dir.z * this.speed * delta;

            if (!this.checkCollision(this.mesh.position.x + moveX, this.mesh.position.z, mapData)) {
                this.mesh.position.x += moveX;
            }
            if (!this.checkCollision(this.mesh.position.x, this.mesh.position.z + moveZ, mapData)) {
                this.mesh.position.z += moveZ;
            }
        }

        if (dist2D <= this.stats.attackRange && this.attackTimer <= 0) {
            this.attack();
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
        return mapData[gridZ][gridX].type !== 0;
    }
}