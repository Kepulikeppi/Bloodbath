import * as THREE from 'https://esm.sh/three@0.160.0';
import { Weapon } from './Weapon.js';
import { state } from '/src/Game/GameState.js'; 
import { WeaponConfig } from '/src/WeaponConfig.js'; 
import { LightManager } from '../LightManager.js'; // NEW

export class RangedWeapon extends Weapon {
    constructor(camera, config, audioManager) {
        super(camera, config); 
        this.audioManager = audioManager;
        
        this.recoilTimer = 0;
        this.isReloading = false;
        
        const bodyMat = new THREE.MeshStandardMaterial({ color: config.bodyColor, roughness: 0.5, metalness: 0.6 });
        const slideMat = new THREE.MeshStandardMaterial({ color: config.slideColor, roughness: 0.2, metalness: 0.8 });
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), bodyMat);
        grip.rotation.x = -0.2; grip.position.set(0, -0.05, 0.05); this.mesh.add(grip);
        this.slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.4), slideMat);
        this.slide.position.set(0, 0.08, -0.1); this.mesh.add(this.slide);
        
        // REMOVED: Internal this.flashLight creation.
        // We now use the global LightManager pool.
    }

    trigger() {
        if (this.isActing || this.isReloading) return false;

        const weaponId = this.config.id;
        const wState = state.getWeaponState(weaponId);
        const ammoType = this.config.ammoType; 
        const reserveCount = state.data.ammo[ammoType];

        if (wState.magCurrent <= 0) {
            if (reserveCount > 0) {
                this.reload();
            } else {
                if (this.audioManager) {
                    this.audioManager.playSFX(`${weaponId}_EMPTY`);
                }
            }
            return false; 
        }

        state.consumeAmmo(weaponId);

        this.isActing = true;
        this.recoilTimer = 1.0; 

        // === NEW: PULSE LIGHT FROM POOL ===
        // Calculate World Position of the muzzle
        // Muzzle offset is roughly (0, 0.1, -0.6) relative to gun
        const muzzlePos = new THREE.Vector3(0, 0.1, -0.6);
        this.mesh.localToWorld(muzzlePos);
        
        // Spawn Flash
        LightManager.pulse(muzzlePos, this.config.flashColor, 0.05, 20, 5);
        // ==================================

        this.slide.position.z += 0.1; 
        setTimeout(() => { this.slide.position.z -= 0.1; }, 80);

        if (this.audioManager) {
            this.audioManager.playSFX(`${weaponId}_SHOOT`);
        }

        setTimeout(() => { this.isActing = false; }, this.config.fireRate * 1000);
        
        return true; 
    }

    reload() {
        if (this.isReloading || this.isActing) return;
        
        const wConfig = this.config;
        const maxMag = state.getMaxMag(wConfig.id);
        const current = state.getWeaponState(wConfig.id).magCurrent;
        const reserve = state.data.ammo[wConfig.ammoType];

        if (current >= maxMag || reserve <= 0) return;

        this.isReloading = true;
        
        if (this.audioManager) {
            this.audioManager.playSFX(`${wConfig.id}_RELOAD`);
        }

        const startRot = this.baseRot.x;
        this.mesh.rotation.x = startRot + 1.0; 

        setTimeout(() => {
            state.reloadWeapon(wConfig.id);
            this.mesh.rotation.x = startRot;
            this.isReloading = false;
        }, wConfig.reloadTime * 1000);
    }

    update(delta, isMoving, time) {
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
             this.mesh.rotation.x = this.baseRot.x + 0.5 + Math.sin(time * 10) * 0.1;
             this.mesh.position.y = this.basePos.y - 0.2; 
        }
    }
}