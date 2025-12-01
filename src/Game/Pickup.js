import * as THREE from 'https://esm.sh/three@0.160.0';
import { LootConfig, LootTypes } from '../LootConfig.js';
import { state } from './GameState.js';

// === STATIC RESOURCES ===
// These exist once for the entire game session.
const GeometryCache = {};
const MaterialCache = {};

// === THE LIGHT RING BUFFER ===
// We allocate these ONCE. We never add/remove lights from the scene again.
// This guarantees the Shader never recompiles during gameplay.
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
        
        // 1. INITIALIZE POOL (Run once per game load)
        if (!PoolInitialized) {
            this.initLightPool(scene);
        }

        // 2. GEOMETRY & MATERIAL (Cached)
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

        // 3. MESH
        this.mesh = new THREE.Mesh(GeometryCache[shapeKey], MaterialCache[matKey]);
        this.mesh.position.copy(position);
        this.mesh.position.y += 0.5; 
        this.mesh.scale.setScalar(this.config.scale);
        this.scene.add(this.mesh);
        
        // 4. ASSIGN LIGHT (Ring Buffer Strategy)
        this.light = null;
        if (this.config.glow) {
            // Steal the next available light in the ring
            const light = LightPool[LightIndex];
            
            // Move it here and turn it on
            light.position.copy(this.mesh.position);
            light.position.y += 0.2;
            light.color.setHex(this.config.color);
            light.intensity = 1.0;
            
            this.light = light; // Remember which light we hold
            
            // Advance index (Loop back to 0 if we hit max)
            LightIndex = (LightIndex + 1) % MAX_LIGHTS;
        }

        this.time = Math.random() * 100;
    }

    initLightPool(scene) {
        // Create the fixed budget of lights. 
        // The GPU compiles the shader for this exact number of lights.
        for (let i = 0; i < MAX_LIGHTS; i++) {
            const light = new THREE.PointLight(0xffffff, 0, 3); // Start intensity 0
            light.castShadow = false;
            light.position.set(0, -999, 0); // Hide in void
            scene.add(light);
            LightPool.push(light);
        }
        PoolInitialized = true;
        console.log(`[Pickup] Initialized Light Pool (${MAX_LIGHTS} lights)`);
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
        
        // 1. RELEASE LIGHT
        // We just turn it off. It stays in the pool, ready for the next spawn.
        if (this.light) {
            this.light.intensity = 0; 
            this.light.position.set(0, -999, 0);
            this.light = null;
        }

        // 2. HIDE MESH (Soft remove)
        this.mesh.visible = false;
        this.scene.remove(this.mesh);
        
        // 3. LOGIC
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