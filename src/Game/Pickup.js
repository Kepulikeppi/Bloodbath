import * as THREE from 'https://esm.sh/three@0.160.0';
import { LootConfig, LootTypes } from '../LootConfig.js';
import { state } from './GameState.js';

const GeometryCache = {};
const MaterialCache = {};

export class Pickup {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        this.config = LootConfig[type] || LootConfig[LootTypes.SCRAP]; 
        this.isActive = true;
        
        // 1. Geometry
        const shapeKey = this.config.shape;
        if (!GeometryCache[shapeKey]) GeometryCache[shapeKey] = this.createGeometry(shapeKey);
        
        // 2. Material
        const matKey = `${this.config.color}-${this.config.glow}`;
        if (!MaterialCache[matKey]) {
            MaterialCache[matKey] = new THREE.MeshStandardMaterial({ 
                color: this.config.color,
                emissive: this.config.glow ? this.config.color : 0x000000,
                emissiveIntensity: this.config.glow ? 0.8 : 0.0, 
                roughness: 0.3, 
                metalness: 0.8
            });
        }

        // 3. Mesh
        this.mesh = new THREE.Mesh(GeometryCache[shapeKey], MaterialCache[matKey]);
        this.mesh.position.copy(position);
        this.mesh.position.y += 0.5; 
        this.mesh.scale.setScalar(this.config.scale);
        
        // 4. Light
        if (this.config.glow) {
            this.light = new THREE.PointLight(this.config.color, 1, 3);
            this.light.position.y = 0.2;
            this.light.castShadow = false; 
            this.mesh.add(this.light);
        }

        this.scene.add(this.mesh);
        this.time = Math.random() * 100;
    }

    createGeometry(shape) {
        switch(shape) {
            case 'SPHERE': return new THREE.SphereGeometry(1, 16, 16);
            case 'BOX': return new THREE.BoxGeometry(1, 1, 1);
            case 'CYLINDER': return new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
            case 'TETRAHEDRON': return new THREE.TetrahedronGeometry(1);
            case 'OCTAHEDRON': return new THREE.OctahedronGeometry(1);
            default: return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    update(delta, playerPos) {
        if (!this.isActive) return false;

        this.time += delta;
        this.mesh.rotation.y += delta;
        this.mesh.position.y = 0.5 + Math.sin(this.time * 2.5) * 0.15;
        this.mesh.rotation.z = Math.sin(this.time) * 0.1;

        const dist = this.mesh.position.distanceTo(playerPos);
        if (dist < 1.5) {
            this.collect();
            return true; 
        }
        return false;
    }

    collect() {
        this.isActive = false;
        
        // === THE FIX ===
        // We must NOT change the total number of lights in the scene.
        if (this.light) {
            // 1. Detach light from the mesh (so it survives mesh removal)
            this.light.removeFromParent();
            
            // 2. Add it directly to the scene so it stays active
            this.scene.add(this.light);
            
            // 3. Move it to the void so it affects nothing
            this.light.position.set(0, -50000, 0);
            
            // 4. Do NOT set visible=false or intensity=0. 
            // The renderer needs to think it's still doing work.
        }

        // Now we can remove the mesh without triggering a recompile
        this.scene.remove(this.mesh);
        
        // Logic
        const amount = this.config.value;
        const currentType = this.type;
        
        if (currentType === LootTypes.HEALTH) state.heal(amount);
        else if (currentType === LootTypes.XP) state.addXp(amount);
        else if (currentType === LootTypes.SCRAP || 
                 currentType === LootTypes.ELEC || 
                 currentType === LootTypes.CHIP || 
                 currentType === LootTypes.RAGE || 
                 currentType === LootTypes.BATTERY) {
            state.addResource(currentType, amount);
        } 
        else {
            state.addAmmo(currentType, amount);
        }

        window.dispatchEvent(new CustomEvent('loot-pickup', { 
            detail: { 
                type: this.type,
                name: this.config.name,
                value: amount,
                color: this.config.color,
                sound: this.config.sound
            } 
        }));
    }
}