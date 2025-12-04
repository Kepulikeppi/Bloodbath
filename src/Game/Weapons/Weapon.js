import * as THREE from 'https://esm.sh/three@0.160.0';
import { WeaponConfig } from '../../WeaponConfig.js';

export class Weapon {
    constructor(camera, config) {
        this.camera = camera;
        this.config = config;
        
        // Container for the weapon model
        this.mesh = new THREE.Group();
        
        // Load default position/rotation from config
        const pos = config.position || { x: 0.35, y: -0.3, z: -0.5 };
        this.mesh.position.set(pos.x, pos.y, pos.z);
        
        // Save base transforms for sway/bob calculations
        this.basePos = this.mesh.position.clone();
        this.baseRot = this.mesh.rotation.clone();
        
        // State flags
        this.isActing = false; // Shooting/Swinging
        
        // Attach to camera so it moves with player head
        this.camera.add(this.mesh);
    }

    // Default update loop (Sway & Bob)
    update(delta, isMoving, time) {
        // 1. Weapon Sway (Lag behind camera movement)
        // We don't have direct mouse delta here easily, so we skip sway for now 
        // or rely on a simplified version if passed. 
        // For now, we just reset to base.
        
        // 2. Weapon Bob (Breathing/Walking)
        if (isMoving) {
            const bobSpeed = WeaponConfig.BOB_SPEED || 10;
            const bobAmount = WeaponConfig.BOB_AMOUNT || 0.05;
            this.mesh.position.y = this.basePos.y + Math.sin(time * bobSpeed) * bobAmount;
            this.mesh.position.x = this.basePos.x + Math.cos(time * bobSpeed * 0.5) * bobAmount;
        } else {
            // Idle breathing
            this.mesh.position.y = this.basePos.y + Math.sin(time * 2) * 0.01;
            this.mesh.position.x = this.basePos.x;
        }
    }

    // Cleanup
    dispose() {
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
        });
    }
}