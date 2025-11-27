import * as THREE from 'https://esm.sh/three@0.160.0';
import { Weapon } from './Weapon.js';
import { state } from '../GameState.js'; 

export class RangedWeapon extends Weapon {
    constructor(camera, config, audioManager) {
        super(camera, config); 
        this.audioManager = audioManager;
        
        this.recoilTimer = 0;
        this.isReloading = false;
        
        // Visuals (Keep existing code)
        const bodyMat = new THREE.MeshStandardMaterial({ color: config.bodyColor, roughness: 0.5, metalness: 0.6 });
        const slideMat = new THREE.MeshStandardMaterial({ color: config.slideColor, roughness: 0.2, metalness: 0.8 });
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), bodyMat);
        grip.rotation.x = -0.2; grip.position.set(0, -0.05, 0.05); this.mesh.add(grip);
        this.slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.4), slideMat);
        this.slide.position.set(0, 0.08, -0.1); this.mesh.add(this.slide);
        this.flashLight = new THREE.PointLight(config.flashColor, 0, 5);
        this.flashLight.position.set(0, 0.1, -0.6); this.mesh.add(this.flashLight);
    }

    trigger() {
        if (this.isActing || this.isReloading) return false;

        const weaponId = this.config.id;
        const wState = state.getWeaponState(weaponId);

        // --- AMMO CHECK ---
        if (wState.magCurrent <= 0) {
            console.log("Click! Dry fire.");
            this.reload(); // Auto-reload on dry fire
            return false; 
        }

        // Deduct from Mag (Not reserve)
        state.consumeAmmo(weaponId);
        // ------------------

        this.isActing = true;
        this.recoilTimer = 1.0; 

        this.flashLight.intensity = 20;
        setTimeout(() => { this.flashLight.intensity = 0; }, 50);

        this.slide.position.z += 0.1; 
        setTimeout(() => { this.slide.position.z -= 0.1; }, 80);

        if (this.audioManager) this.audioManager.playSFX('pistol');

        setTimeout(() => { this.isActing = false; }, this.config.fireRate * 1000);
        
        return true; 
    }

    reload() {
        if (this.isReloading || this.isActing) return;
        
        // Check if reload is possible (logic in GameState)
        // We check reserves manually here to decide if we play animation
        const wConfig = this.config;
        const maxMag = state.getMaxMag(wConfig.id);
        const current = state.getWeaponState(wConfig.id).magCurrent;
        const reserve = state.data.ammo[wConfig.ammoType];

        if (current >= maxMag || reserve <= 0) return;

        // START RELOAD
        this.isReloading = true;
        console.log("Reloading...");
        if (this.audioManager) this.audioManager.playSFX('reload'); // Ensure 'reload.mp3' exists

        // Animation: Lower Gun
        // We tween rotation X to look down
        const startRot = this.baseRot.x;
        this.mesh.rotation.x = startRot + 1.0; // Tilt up/back like checking mag

        setTimeout(() => {
            // ACTUAL RELOAD (Data change)
            state.reloadWeapon(wConfig.id);
            
            // Animation: Return
            this.mesh.rotation.x = startRot;
            this.isReloading = false;
            
        }, wConfig.reloadTime * 1000);
    }

    update(delta, isMoving, time) {
        // If reloading, don't do normal recoil updates, 
        // or implement a separate animation lerp here.
        // For now, we snap via setTimeout, but we must ensure update doesn't override it.
        if (!this.isReloading) {
            super.update(delta, isMoving, time);
            
            if (this.recoilTimer > 0) {
                this.recoilTimer -= delta * this.config.recoilSnap;
                if (this.recoilTimer < 0) this.recoilTimer = 0;
            }
            const kickZ = this.recoilTimer * this.config.recoilKick;
            const kickRot = this.recoilTimer * this.config.recoilRise;
            this.mesh.position.z = this.basePos.z + kickZ;
            this.mesh.rotation.x = this.baseRot.x + kickRot;
        } else {
             // Simple Reload Animation (Bobbing while reloading)
             this.mesh.rotation.x = this.baseRot.x + 0.5 + Math.sin(time * 10) * 0.1;
             this.mesh.position.y = this.basePos.y - 0.2; // Lowered
        }
    }
}