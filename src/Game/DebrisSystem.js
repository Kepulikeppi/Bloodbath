import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';

export class DebrisSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Settings
        this.MAX_PARTICLES = 200; 
        this.MAX_DECALS = Config.GORE.MAX_DECALS || 100; 

        // --- 1. SHARED MATERIALS & GEOMETRY ---
        
        // Blood Texture
        const loader = new THREE.TextureLoader();
        const bloodTex = loader.load(Config.TEX_BLOOD || './assets/textures/blood_decal.png');
        bloodTex.colorSpace = THREE.SRGBColorSpace;
        
        // Material for Floor Stains
        this.bloodMaterial = new THREE.MeshStandardMaterial({
            map: bloodTex,
            transparent: true,
            depthWrite: false,      
            polygonOffset: true,    
            polygonOffsetFactor: -2, 
            color: Config.GORE.COLOR_BLOOD,        
            roughness: 0.1,         
            metalness: 0.0,         
            opacity: 0.9,
            side: THREE.DoubleSide // Ensure it's visible from any angle
        });

        // Materials for Particles
        this.fleshMat = new THREE.MeshStandardMaterial({ color: Config.GORE.COLOR_FLESH, roughness: 0.5 });
        this.boneMat = new THREE.MeshStandardMaterial({ color: Config.GORE.COLOR_BONE, roughness: 0.5 });
        this.sprayMat = new THREE.MeshBasicMaterial({ color: Config.GORE.COLOR_BLOOD });

        // Geometries
        this.decalGeo = new THREE.PlaneGeometry(1, 1);
        this.chunkGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        this.sprayGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);

        // --- 2. PARTICLE POOL (Flying stuff) ---
        this.particlePool = [];
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            const mesh = new THREE.Mesh(this.chunkGeo, this.fleshMat);
            mesh.visible = false; 
            mesh.frustumCulled = false; 
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

        // --- 3. DECAL POOL (Floor Stains) ---
        // We pre-allocate ALL blood stains. No creating/destroying during gameplay.
        this.decalPool = [];
        this.decalIndex = 0; // Circular buffer index

        for (let i = 0; i < this.MAX_DECALS; i++) {
            const mesh = new THREE.Mesh(this.decalGeo, this.bloodMaterial);
            mesh.visible = false; // Start hidden
            mesh.frustumCulled = false; // Always render if active (prevents flickering at edge of screen)
            
            // Optimization: Disable matrix auto update since they don't move once placed
            mesh.matrixAutoUpdate = false; 
            
            this.scene.add(mesh);
            this.decalPool.push(mesh);
        }
    }

    getFreeParticle() {
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            if (!this.particlePool[i].active) return this.particlePool[i];
        }
        return this.particlePool[0]; // Overwrite oldest if full
    }

    // --- SPAWN LOGIC ---

    spawnSplat(position, normal) {
        // 1. Get the next decal in the pool (Circular)
        const mesh = this.decalPool[this.decalIndex];
        this.decalIndex = (this.decalIndex + 1) % this.MAX_DECALS;

        // 2. Reset & Activate
        mesh.visible = true;
        
        // 3. Position
        mesh.position.copy(position);
        
        // Slight offset based on surface normal to avoid Z-fighting
        const up = normal || new THREE.Vector3(0, 1, 0);
        const offset = up.clone().multiplyScalar(0.03);
        mesh.position.add(offset);

        // 4. Orientation
        // Look at a point "outwards" from the surface
        const target = mesh.position.clone().add(up);
        mesh.lookAt(target);
        
        // Random rotation around Z (local axis)
        mesh.rotateZ(Math.random() * Math.PI * 2);

        // 5. Scale
        const scale = 0.8 + Math.random() * 0.8;
        mesh.scale.set(scale, scale, 1);

        // 6. FORCE UPDATE
        // Since we disabled autoUpdate for performance, we must update manually once
        mesh.updateMatrix();
    }

    spawnBlood(position, direction) {
        const count = Config.GORE.BLOOD_SPRAY_COUNT;
        for (let i = 0; i < count; i++) {
            const p = this.getFreeParticle();
            this.activateParticle(p, position, this.sprayGeo, this.sprayMat, 0.5);

            p.mesh.position.x += (Math.random() - 0.5) * 0.2;
            p.mesh.position.y += (Math.random() - 0.5) * 0.2;
            p.mesh.position.z += (Math.random() - 0.5) * 0.2;

            p.velocity.copy(direction).multiplyScalar(2.0);
            p.velocity.x += (Math.random() - 0.5) * 3;
            p.velocity.y += (Math.random() - 0.5) * 3;
            p.velocity.z += (Math.random() - 0.5) * 3;
        }
    }

    spawnGibs(position, color) {
        const count = Config.GORE.GIBS_COUNT;
        const mat = (color === Config.GORE.COLOR_BONE) ? this.boneMat : this.fleshMat;

        for (let i = 0; i < count; i++) {
            const p = this.getFreeParticle();
            this.activateParticle(p, position, this.chunkGeo, mat, 1.0);

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

    activateParticle(p, pos, geo, mat, gravity) {
        p.active = true;
        p.mesh.visible = true;
        p.mesh.geometry = geo; 
        p.mesh.material = mat; 
        p.mesh.scale.set(1, 1, 1);
        p.mesh.position.copy(pos);
        p.mesh.rotation.set(0, 0, 0);
        p.mesh.matrixAutoUpdate = true; // Particles need to move
        
        p.gravityScale = gravity;
        p.floorTimer = 10.0; 
        p.onFloor = false;
    }

    update(delta) {
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
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
                        // Pass Up vector (0,1,0) for floor stains
                        this.spawnSplat(p.mesh.position, new THREE.Vector3(0,1,0));
                    }
                }
            } else {
                p.floorTimer -= delta;
                if (p.floorTimer < 0.5) p.mesh.scale.multiplyScalar(0.9);
                
                if (p.floorTimer <= 0) {
                    p.active = false;
                    p.mesh.visible = false;
                }
            }
        }
    }
}