import * as THREE from 'https://esm.sh/three@0.160.0';
import { LootConfig, LootTypes } from '../LootConfig.js';
import { state } from './GameState.js';

const GeometryCache = {};
const MaterialCache = {};

const MAX_LIGHTS = 32;
const LightPool = [];
let LightIndex = 0;
let PoolInitialized = false;

export class Pickup {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        this.config = LootConfig[type] || LootConfig[LootTypes.SCRAP]; 
        this.isActive = true;
        
        // Settings
        this.MAGNET_RADIUS = 4.0; 
        // FIX: Increased radius to cover vertical distance (Eye Height 1.7m)
        this.COLLECT_RADIUS = 2.0; 
        this.MAGNET_SPEED = 8.0; 

        if (!PoolInitialized) this.initLightPool(scene);

        const shapeKey = this.config.shape;
        if (!GeometryCache[shapeKey]) GeometryCache[shapeKey] = this.createGeometry(shapeKey);
        
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

        this.mesh = new THREE.Mesh(GeometryCache[shapeKey], MaterialCache[matKey]);
        this.mesh.position.copy(position);
        this.mesh.position.y += 0.5; 
        this.mesh.scale.setScalar(this.config.scale);
        this.scene.add(this.mesh);
        
        this.light = null;
        if (this.config.glow) {
            const light = LightPool[LightIndex];
            light.position.copy(this.mesh.position);
            light.position.y += 0.2;
            light.color.setHex(this.config.color);
            light.intensity = 1.0;
            this.light = light; 
            LightIndex = (LightIndex + 1) % MAX_LIGHTS;
        }

        this.time = Math.random() * 100;
    }

    initLightPool(scene) {
        for (let i = 0; i < MAX_LIGHTS; i++) {
            const light = new THREE.PointLight(0xffffff, 0, 3); 
            light.castShadow = false;
            light.position.set(0, -999, 0); 
            scene.add(light);
            LightPool.push(light);
        }
        PoolInitialized = true;
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
        
        const dist = this.mesh.position.distanceTo(playerPos);

        // Magnet Logic
        if (dist < this.MAGNET_RADIUS) {
            const direction = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            direction.y -= 0.2; 
            
            const speed = this.MAGNET_SPEED + (this.MAGNET_RADIUS - dist); 
            this.mesh.position.addScaledVector(direction, speed * delta);
            
            if (this.light) {
                this.light.position.copy(this.mesh.position);
            }
        } else {
            this.mesh.position.y = 0.5 + Math.sin(this.time * 2.5) * 0.15;
             if (this.light) {
                this.light.position.y = this.mesh.position.y + 0.2;
            }
        }

        // Collection Check
        if (dist < this.COLLECT_RADIUS) {
            this.collect();
            return true; 
        }
        return false;
    }

    collect() {
        this.isActive = false;
        
        if (this.light) {
            this.light.intensity = 0; 
            this.light.position.set(0, -999, 0);
            this.light = null;
        }

        this.mesh.visible = false;
        this.scene.remove(this.mesh);
        
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