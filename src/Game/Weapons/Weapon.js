import * as THREE from 'https://esm.sh/three@0.160.0';
import { WeaponConfig } from '../../WeaponConfig.js';

export class Weapon {
    constructor(camera, config) {
        this.camera = camera;
        this.config = config;
        
        // Container Group
        this.mesh = new THREE.Group();
        
        // USE CONFIG VALUES
        // Use defaults if config is missing (safety)
        const x = config.position ? config.position.x : 0.35;
        const y = config.position ? config.position.y : -0.3;
        const z = config.position ? config.position.z : -0.2;

        this.mesh.position.set(x, y, z); 
        
        this.camera.add(this.mesh);

        // State
        this.isActing = false;
        this.actionTimer = 0;
        
        // Base Transforms
        this.basePos = this.mesh.position.clone();
        this.baseRot = this.mesh.rotation.clone();
    }

    // Placeholder
    trigger() { return false; }

    update(delta, isMoving, time) {
        // 1. HANDLE BOBBING
        let bobY = 0;
        let bobX = 0;

        if (isMoving) {
            bobY = Math.sin(time * WeaponConfig.BOB_SPEED) * WeaponConfig.BOB_AMOUNT;
            bobX = Math.cos(time * WeaponConfig.BOB_SPEED * 0.5) * (WeaponConfig.BOB_AMOUNT * 0.5);
        } else {
            bobY = Math.sin(time * 1.5) * (WeaponConfig.BOB_AMOUNT * 0.1);
        }

        // 2. APPLY MOVEMENT
        this.mesh.position.y = this.basePos.y + bobY;
        this.mesh.position.x = this.basePos.x + bobX;
    }
}