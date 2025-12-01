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
            side: THREE.DoubleSide
        });

        // Materials for Particles
        this.fleshMat = new THREE.MeshStandardMaterial({ color: Config.GORE.COLOR_FLESH, roughness: 0.5 });
        this.boneMat = new THREE.MeshStandardMaterial({ color: Config.GORE.COLOR_BONE, roughness: 0.5 });
        this.sprayMat = new THREE.MeshBasicMaterial({ color: Config.GORE.COLOR_BLOOD });

        // Geometries
        this.decalGeo = new THREE.PlaneGeometry(1, 1);
        this.chunkGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        this.sprayGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);

        // --- 2. PARTICLE POOL ---
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

        // --- 3. DECAL POOL ---
        this.decalPool = [];
        this.decalIndex = 0;

        for (let i = 0; i < this.MAX_DECALS; i++) {
            const mesh = new THREE.Mesh(this.decalGeo, this.bloodMaterial);
            mesh.visible = false; 
            mesh.frustumCulled = false; 
            mesh.matrixAutoUpdate = false; 
            this.scene.add(mesh);
            this.decalPool.push(mesh);
        }
        
        // Execute Shader Warmup immediately
        this.warmup();
    }

    // === NEW: SHADER WARMUP ===
    // Forces the GPU to compile shaders for blood/flesh/bone before gameplay starts.
    warmup() {
        // 1. Warmup Particle (Flesh)
        const p1 = this.particlePool[0];
        p1.mesh.material = this.fleshMat;
        p1.mesh.visible = true;
        p1.mesh.position.set(0, -500, 0); // Hide in void
        
        // 2. Warmup Particle (Bone)
        const p2 = this.particlePool[1];
        p2.mesh.material = this.boneMat;
        p2.mesh.visible = true;
        p2.mesh.position.set(0, -500, 0);

        // 3. Warmup Particle (Blood Spray)
        const p3 = this.particlePool[2];
        p3.mesh.geometry = this.sprayGeo;
        p3.mesh.material = this.sprayMat;
        p3.mesh.visible = true;
        p3.mesh.position.set(0, -500, 0);

        // 3. Warmup Decal
        const d1 = this.decalPool[0];
        d1.visible = true;
        d1.position.set(0, -500, 0);
        d1.updateMatrix();

        // 4. Reset after a tiny delay (next frame)
        // We use setTimeout 0 to let the renderer loop catch it once
        setTimeout(() => {
            p1.mesh.visible = false;
            p2.mesh.visible = false;
            p3.mesh.visible = false;
            d1.visible = false;
        }, 100);
    }

    getFreeParticle() {
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            if (!this.particlePool[i].active) return this.particlePool[i];
        }
        return this.particlePool[0]; 
    }

    // --- SPAWN LOGIC ---

    spawnSplat(position, normal) {
        const mesh = this.decalPool[this.decalIndex];
        this.decalIndex = (this.decalIndex + 1) % this.MAX_DECALS;

        mesh.visible = true;
        mesh.position.copy(position);
        
        const up = normal || new THREE.Vector3(0, 1, 0);
        const offset = up.clone().multiplyScalar(0.03);
        mesh.position.add(offset);

        const target = mesh.position.clone().add(up);
        mesh.lookAt(target);
        
        mesh.rotateZ(Math.random() * Math.PI * 2);

        const scale = 0.8 + Math.random() * 0.8;
        mesh.scale.set(scale, scale, 1);

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
        p.mesh.matrixAutoUpdate = true; 
        
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