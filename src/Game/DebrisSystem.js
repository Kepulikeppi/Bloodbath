import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';

export class DebrisSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.decals = []; 
        
        // USE CONFIG
        this.MAX_DECALS = Config.GORE.MAX_DECALS; 

        // 1. GENERATE TEXTURE
        this.bloodTexture = this.createBloodTexture();
        
        // 2. DARKER BLOOD MATERIAL
        this.bloodMaterial = new THREE.MeshStandardMaterial({
            map: this.bloodTexture,
            transparent: true,
            depthWrite: false,      
            polygonOffset: true,    
            polygonOffsetFactor: -1, 
            
            // USE CONFIG
            color: Config.GORE.COLOR_BLOOD,        
            
            roughness: 0.1,         
            metalness: 0.0,         
            opacity: 0.9            
        });
        
        this.decalGeo = new THREE.PlaneGeometry(1, 1);
    }

    createBloodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff'; 
        
        for (let i = 0; i < 20; i++) {
            const cx = 64 + (Math.random() - 0.5) * 50;
            const cy = 64 + (Math.random() - 0.5) * 50;
            const radius = 5 + Math.random() * 20;
            
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    // 1. PERMANENT BLOOD STAIN
    spawnSplat(position) {
        const mesh = new THREE.Mesh(this.decalGeo, this.bloodMaterial); // clone() not strictly needed if just pos/rot changes
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
            if (old.material) old.material.dispose();
            if (old.geometry) old.geometry.dispose();
        }
    }

    // 2. BLOOD SPURT
    spawnBlood(position, direction) {
        // USE CONFIG
        const count = Config.GORE.BLOOD_SPRAY_COUNT;
        const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        
        // USE CONFIG
        const mat = new THREE.MeshBasicMaterial({ color: Config.GORE.COLOR_BLOOD });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            
            mesh.position.x += (Math.random() - 0.5) * 0.2;
            mesh.position.y += (Math.random() - 0.5) * 0.2;
            mesh.position.z += (Math.random() - 0.5) * 0.2;

            const velocity = direction.clone().multiplyScalar(2.0); 
            velocity.x += (Math.random() - 0.5) * 3;
            velocity.y += (Math.random() - 0.5) * 3;
            velocity.z += (Math.random() - 0.5) * 3;

            this.addParticle(mesh, velocity, 0.5); 
        }
    }

    // 3. BODY CHUNKS
    spawnGibs(position, color) {
        const count = Config.GORE.GIBS_COUNT; // Uses your new config
        const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3); 
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            
            // Randomize start pos slightly (cluster around the chest)
            mesh.position.x += (Math.random() - 0.5) * 0.5;
            mesh.position.y += (Math.random() - 0.5) * 0.5;
            mesh.position.z += (Math.random() - 0.5) * 0.5;
            
            // FIX: Reduced Upward Velocity
            // Old: Math.random() * 5 + 2 (Rocket jump)
            // New: Math.random() * 2 (Slight pop, then fall)
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3, // Spread outward
                Math.random() * 2,         // Slight pop up, then gravity takes over
                (Math.random() - 0.5) * 3
            );

            this.addParticle(mesh, velocity, 1.0); 
        }
    }

    addParticle(mesh, velocity, gravityScale) {
        this.scene.add(mesh);
        this.particles.push({
            mesh: mesh,
            velocity: velocity,
            gravityScale: gravityScale,
            life: 3.0, 
            onFloor: false,
            floorTimer: 1.0 
        });
    }

    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (!p.onFloor) {
                p.velocity.y -= 9.8 * p.gravityScale * delta;
                p.mesh.position.addScaledVector(p.velocity, delta);
                p.mesh.rotation.x += p.velocity.z * delta;
                p.mesh.rotation.z += p.velocity.x * delta;

                if (p.mesh.position.y <= 0.1) {
                    p.mesh.position.y = 0.1; 
                    p.onFloor = true;
                    
                    if (Math.random() > 0.7) {
                        this.spawnSplat(p.mesh.position);
                    }
                }
            } else {
                p.floorTimer -= delta;
                if (p.floorTimer < 0.5) p.mesh.scale.multiplyScalar(0.9);
                if (p.floorTimer <= 0) this.removeParticle(i);
            }
        }
    }

    removeParticle(index) {
        const p = this.particles[index];
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this.particles.splice(index, 1);
    }
}