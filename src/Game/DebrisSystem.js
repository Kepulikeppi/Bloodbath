import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';

export class DebrisSystem {
    constructor(scene) {
        this.scene = scene;
        this.decals = []; 
        this.MAX_DECALS = Config.GORE.MAX_DECALS; // Limit floor stains

        // --- 1. SHARED RESOURCES (Create Once, Use Forever) ---
        
        // Decal Geometry & Material
        this.decalGeo = new THREE.PlaneGeometry(1, 1);
        const loader = new THREE.TextureLoader();
        const bloodTex = loader.load(Config.TEX_BLOOD || './assets/textures/blood_decal.png');
        bloodTex.colorSpace = THREE.SRGBColorSpace;
        
        this.bloodMaterial = new THREE.MeshStandardMaterial({
            map: bloodTex,
            transparent: true,
            depthWrite: false,      
            polygonOffset: true,    
            polygonOffsetFactor: -1, 
            color: Config.GORE.COLOR_BLOOD,        
            roughness: 0.1,         
            metalness: 0.0,         
            opacity: 0.9            
        });

        // Gibs (Chunks) Resources
        this.chunkGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        this.fleshMat = new THREE.MeshStandardMaterial({ color: Config.GORE.COLOR_FLESH, roughness: 0.5 });
        this.boneMat = new THREE.MeshStandardMaterial({ color: Config.GORE.COLOR_BONE, roughness: 0.5 });

        // Spray (Drops) Resources
        this.sprayGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        this.sprayMat = new THREE.MeshBasicMaterial({ color: Config.GORE.COLOR_BLOOD });

        // --- 2. OBJECT POOLING ---
        // We create 200 invisible objects at start. 
        // When we need one, we grab it, move it, and show it.
        this.poolSize = 200;
        this.particlePool = [];

        for (let i = 0; i < this.poolSize; i++) {
            const mesh = new THREE.Mesh(this.chunkGeo, this.fleshMat);
            mesh.visible = false; // Start hidden
            mesh.frustumCulled = false; // Optimization: Always update them even if off-screen slightly
            this.scene.add(mesh);

            this.particlePool.push({
                mesh: mesh,
                active: false,
                velocity: new THREE.Vector3(),
                gravityScale: 1.0,
                floorTimer: 0,
                onFloor: false
            });
        }
    }

    // Helper: Find an unused particle
    getFreeParticle() {
        // Find first inactive particle
        for (let i = 0; i < this.poolSize; i++) {
            if (!this.particlePool[i].active) return this.particlePool[i];
        }
        // If all 200 are busy, overwrite the oldest one (index 0) 
        // This prevents the game from crashing if too much stuff happens
        return this.particlePool[0];
    }

    // --- SPAWNING ---

    spawnSplat(position) {
        // Decals are static, so we can just create Meshes (they are cheap compared to physics objects)
        // CRITICAL OPTIMIZATION: DO NOT CLONE MATERIAL. Use the shared one.
        const mesh = new THREE.Mesh(this.decalGeo, this.bloodMaterial);
        
        mesh.position.set(position.x, 0.02, position.z);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = Math.random() * Math.PI * 2;
        
        const scale = 0.8 + Math.random() * 0.8;
        mesh.scale.set(scale, scale, 1);

        this.scene.add(mesh);
        this.decals.push(mesh);

        if (this.decals.length > this.MAX_DECALS) {
            const old = this.decals.shift(); 
            this.scene.remove(old);
            // Reuse geometry/material, so only dispose the Mesh container logic
        }
    }

    spawnBlood(position, direction) {
        const count = Config.GORE.BLOOD_SPRAY_COUNT;

        for (let i = 0; i < count; i++) {
            const p = this.getFreeParticle();
            
            // Reset State
            p.active = true;
            p.mesh.visible = true;
            p.mesh.geometry = this.sprayGeo; // Swap geometry to Spray
            p.mesh.material = this.sprayMat; // Swap material to Spray
            
            p.mesh.position.copy(position);
            p.mesh.scale.set(1, 1, 1);
            p.onFloor = false;
            p.floorTimer = 1.0;
            p.gravityScale = 0.5;

            // Randomize Position
            p.mesh.position.x += (Math.random() - 0.5) * 0.2;
            p.mesh.position.y += (Math.random() - 0.5) * 0.2;
            p.mesh.position.z += (Math.random() - 0.5) * 0.2;

            // Velocity
            p.velocity.copy(direction).multiplyScalar(2.0);
            p.velocity.x += (Math.random() - 0.5) * 3;
            p.velocity.y += (Math.random() - 0.5) * 3;
            p.velocity.z += (Math.random() - 0.5) * 3;
        }
    }

    spawnGibs(position, color) {
        const count = Config.GORE.GIBS_COUNT;
        // Choose correct shared material
        const mat = (color === Config.GORE.COLOR_BONE) ? this.boneMat : this.fleshMat;

        for (let i = 0; i < count; i++) {
            const p = this.getFreeParticle();

            // Reset State
            p.active = true;
            p.mesh.visible = true;
            p.mesh.geometry = this.chunkGeo; // Swap geometry to Chunk
            p.mesh.material = mat;           // Swap material
            
            p.mesh.position.copy(position);
            p.mesh.scale.set(1, 1, 1);
            p.onFloor = false;
            p.floorTimer = 5.0; // Chunks stay longer
            p.gravityScale = 1.0;

            // Randomize
            p.mesh.position.x += (Math.random() - 0.5) * 0.5;
            p.mesh.position.y += (Math.random() - 0.5) * 0.5;
            p.mesh.position.z += (Math.random() - 0.5) * 0.5;
            
            p.velocity.set(
                (Math.random() - 0.5) * 3,
                Math.random() * 2,
                (Math.random() - 0.5) * 3
            );
        }
    }

    update(delta) {
        // Only update active particles
        for (let i = 0; i < this.poolSize; i++) {
            const p = this.particlePool[i];
            if (!p.active) continue;

            if (!p.onFloor) {
                p.velocity.y -= 9.8 * p.gravityScale * delta;
                p.mesh.position.addScaledVector(p.velocity, delta);
                p.mesh.rotation.x += p.velocity.z * delta;
                p.mesh.rotation.z += p.velocity.x * delta;

                if (p.mesh.position.y <= 0.1) {
                    p.mesh.position.y = 0.1; 
                    p.onFloor = true;
                    
                    if (Math.random() > 0.6) {
                        this.spawnSplat(p.mesh.position);
                    }
                }
            } else {
                p.floorTimer -= delta;
                
                // Shrink effect before disappearing
                if (p.floorTimer < 0.5) p.mesh.scale.multiplyScalar(0.9);
                
                if (p.floorTimer <= 0) {
                    // Disable particle (return to pool)
                    p.active = false;
                    p.mesh.visible = false;
                }
            }
        }
    }
}