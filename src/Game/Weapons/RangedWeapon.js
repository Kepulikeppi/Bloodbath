import * as THREE from 'https://esm.sh/three@0.160.0';
import { Weapon } from './Weapon.js';
import { state } from '../GameState.js'; 

export class RangedWeapon extends Weapon {
    constructor(camera, config, audioManager) {
        super(camera, config); 
        
        // Store the audio manager so we can use it later
        this.audioManager = audioManager;
        this.recoilTimer = 0;
        
        // --- BUILD PROCEDURAL GUN ---
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: config.bodyColor, roughness: 0.5, metalness: 0.6 
        });
        const slideMat = new THREE.MeshStandardMaterial({ 
            color: config.slideColor, roughness: 0.2, metalness: 0.8 
        });

        // Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), bodyMat);
        grip.rotation.x = -0.2;
        grip.position.set(0, -0.05, 0.05);
        this.mesh.add(grip);

        // Slide
        this.slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.4), slideMat);
        this.slide.position.set(0, 0.08, -0.1);
        this.mesh.add(this.slide);

        // Flash
        this.flashLight = new THREE.PointLight(config.flashColor, 0, 5);
        this.flashLight.position.set(0, 0.1, -0.6);
        this.mesh.add(this.flashLight);
    }

    trigger() {
        if (this.isActing) return false;
        
        if (state.data.ammo['9mm'] <= 0) {
            // Click sound for empty gun
            // if (this.audioManager) this.audioManager.playSFX('click'); 
            console.log("Click! No ammo.");
            return false; 
        }

        // 2. Deduct Ammo
        state.data.ammo['9mm']--;
        this.isActing = true;
        this.recoilTimer = 1.0; 

        // Visuals
        this.flashLight.intensity = 20;
        setTimeout(() => { this.flashLight.intensity = 0; }, 50);

        this.slide.position.z += 0.1; 
        setTimeout(() => { this.slide.position.z -= 0.1; }, 80);

        // --- SOUND TRIGGER ---
        if (this.audioManager) {
            // Debug Log: Check if this prints in your console when you click
            // console.log("Weapon: Bang!"); 
            this.audioManager.playSFX('pistol');
        } else {
            console.warn("Weapon: No Audio Manager connected!");
        }

        // Cooldown
        setTimeout(() => { this.isActing = false; }, this.config.fireRate * 1000);
        
        return true; 
    }

    update(delta, isMoving, time) {
        super.update(delta, isMoving, time);

        // Recoil Physics
        if (this.recoilTimer > 0) {
            this.recoilTimer -= delta * this.config.recoilSnap;
            if (this.recoilTimer < 0) this.recoilTimer = 0;
        }

        const kickZ = this.recoilTimer * this.config.recoilKick;
        const kickRot = this.recoilTimer * this.config.recoilRise;

        this.mesh.position.z = this.basePos.z + kickZ;
        this.mesh.rotation.x = this.baseRot.x + kickRot;
    }
}