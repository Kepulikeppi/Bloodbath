import * as THREE from 'https://esm.sh/three@0.160.0';
import { EnemyConfig } from '../EnemyConfig.js';

export class Enemy {
    constructor(scene, x, z, type = 'FLOATING_DIAMOND') {
        this.scene = scene;
        this.isDead = false;
        
        // Load stats
        this.stats = EnemyConfig[type];
        this.hp = this.stats.hp;
        this.speed = this.stats.speed;
        this.radius = this.stats.radius;

        // 1. CREATE A CONTAINER GROUP
        // Instead of one mesh, we move this invisible box, and all body parts follow.
        this.mesh = new THREE.Group();
        this.mesh.position.set(x + 0.5, 0, z + 0.5); 
        
        // --- BUILD THE BODY ---
        
        // Materials
        const fleshMat = new THREE.MeshStandardMaterial({
            color: 0x880000, // Dark Red Flesh
            roughness: 0.7,
            metalness: 0.1,
        });
        
        const boneMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd, // Dirty White
            roughness: 0.9,
        });

        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 }); // Glowing Yellow

        // A. Torso (Tall Block)
        // Size: 0.6 wide, 1.0 tall, 0.3 thick
        const torsoGeo = new THREE.BoxGeometry(0.6, 1.0, 0.3);
        this.torso = new THREE.Mesh(torsoGeo, fleshMat);
        this.torso.position.y = 1.0; // Center of torso is at 1.0m height
        this.torso.castShadow = true;
        this.mesh.add(this.torso);

        // B. Head (Small Cube)
        const headGeo = new THREE.BoxGeometry(0.3, 0.35, 0.35);
        this.head = new THREE.Mesh(headGeo, boneMat);
        this.head.position.y = 1.7; // Sit on top of torso
        this.head.castShadow = true;
        this.mesh.add(this.head);

        // C. The "Eye" (Glowing Slit)
        const eyeGeo = new THREE.PlaneGeometry(0.2, 0.05);
        this.eye = new THREE.Mesh(eyeGeo, eyeMat);
        this.eye.position.set(0, 1.7, 0.18); // Slightly in front of face
        this.mesh.add(this.eye);

        // CRITICAL: Link EVERY part back to this class
        // If we shoot the head OR the body, it should register as a hit.
        this.mesh.userData = { parent: this }; // Link the group
        this.torso.userData = { parent: this };
        this.head.userData = { parent: this };
        this.eye.userData = { parent: this };

        this.scene.add(this.mesh);
        
        // Animation Data
        this.floatOffset = Math.random() * 100;
        this.flashTimer = 0;
    }

    takeDamage(amount) {
        if (this.isDead) return false;

        this.hp -= amount;
        
        // Flash White (Apply to all children)
        this.mesh.children.forEach(part => {
            if(part.material && part.material.emissive) {
                part.material.emissive.setHex(0xffffff);
                part.material.emissiveIntensity = 1.0;
            }
        });
        this.flashTimer = 0.1;

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

    update(delta, playerPos, mapData) {
        if (this.isDead) return;

        // 1. Flash Effect Logic
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;
            if (this.flashTimer <= 0) {
                // Reset colors
                this.mesh.children.forEach(part => {
                    if(part.material && part.material.emissive) {
                        part.material.emissive.setHex(0x000000);
                        part.material.emissiveIntensity = 0;
                    }
                });
            }
        }

        // 2. AI LOGIC
        const dist = this.mesh.position.distanceTo(playerPos);

        if (dist < this.stats.aggroRange) {
            // Look at player (Rotate the whole group)
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

            if (dist > this.stats.stopDist) {
                const dir = new THREE.Vector3()
                    .subVectors(playerPos, this.mesh.position)
                    .normalize();

                const moveX = dir.x * this.speed * delta;
                const moveZ = dir.z * this.speed * delta;

                // Collision Check
                if (!this.checkCollision(this.mesh.position.x + moveX, this.mesh.position.z, mapData)) {
                    this.mesh.position.x += moveX;
                }
                if (!this.checkCollision(this.mesh.position.x, this.mesh.position.z + moveZ, mapData)) {
                    this.mesh.position.z += moveZ;
                }
            }
        }

        // 3. Walking Animation (Bobbing)
        // We animate the Y position of the Group
        const time = Date.now() * 0.005 + this.floatOffset;
        // A heavier, lurching bob
        this.mesh.position.y = Math.sin(time) * 0.05; 
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
    
    dispose() {
        this.scene.remove(this.mesh);
        // Loop through children to clean up memory
        this.mesh.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}