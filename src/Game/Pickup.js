import * as THREE from 'https://esm.sh/three@0.160.0';
import { LootConfig, LootTypes } from '../LootConfig.js';
import { state } from './GameState.js';

export class Pickup {
    constructor(scene, type, position) {
        // ... (constructor remains the same)
        this.scene = scene;
        this.type = type;
        this.config = LootConfig[type] || LootConfig[LootTypes.SCRAP]; 
        this.isActive = true;
        this.time = Math.random() * 100;

        // ... (geometry creation remains the same)
        
        // Ensure glow config matches new structure if needed
        const geometry = this.getGeometry(this.config.shape);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.config.color,
            emissive: this.config.glow ? this.config.color : 0x000000,
            emissiveIntensity: this.config.glow ? 0.6 : 0.0,
            roughness: 0.3,
            metalness: 0.8
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y += 0.5; 
        this.mesh.scale.setScalar(this.config.scale);
        
        if (this.config.glow) {
            this.light = new THREE.PointLight(this.config.color, 1, 3);
            this.light.position.y = 0.2;
            this.mesh.add(this.light);
        }

        this.scene.add(this.mesh);
    }

    getGeometry(shape) {
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
        this.scene.remove(this.mesh);
        if (this.light) {
            this.mesh.remove(this.light);
            this.light.dispose();
        }
        
        // 1. Update Game State
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

        // 2. Dispatch Event for UI and Audio
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