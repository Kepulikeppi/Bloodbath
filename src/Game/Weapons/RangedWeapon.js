import * as THREE from 'https://esm.sh/three@0.160.0';
import { Weapon } from './Weapon.js';
import { state } from '../GameState.js'; 
import { LightManager } from '../LightManager.js';

export class RangedWeapon extends Weapon {
    constructor(camera, config, audioManager) {
        super(camera, config); 
        this.audioManager = audioManager;
        
        this.recoilTimer = 0;
        this.isReloading = false;
        this.triggerHeld = false; 
        this.fireTimer = 0;       
        
        // Muzzle position placeholder
        this.muzzleOffset = new THREE.Vector3(0, 0.1, -0.5);
    }

    pressTrigger() {
        this.triggerHeld = true;
        if (this.fireTimer <= 0 && !this.isReloading) {
            this.tryFire();
        }
    }

    releaseTrigger() {
        this.triggerHeld = false;
    }

    tryFire() {
        const weaponId = this.config.id;
        const wState = state.getWeaponState(weaponId);
        const reserveCount = state.data.ammo[this.config.ammoType];

        // 1. Ammo Check
        if (wState.magCurrent <= 0) {
            if (reserveCount > 0) {
                this.reload();
            } else {
                if (!this.clickedEmpty) {
                    if (this.audioManager) this.audioManager.playSFX(`${weaponId}_EMPTY`);
                    this.clickedEmpty = true;
                    setTimeout(() => { this.clickedEmpty = false; }, 200);
                }
            }
            return false; 
        }

        // 2. Consume Ammo
        state.consumeAmmo(weaponId);
        this.fireTimer = this.config.fireRate;
        this.recoilTimer = 1.0; 

        // 3. FIRE RAYCAST (Hit Detection First)
        const shots = this.config.shotCount || 1;
        const spread = this.config.spread || 0;

        for(let i=0; i<shots; i++) {
            window.dispatchEvent(new CustomEvent('weapon-fire', {
                detail: {
                    damage: this.config.damage,
                    spread: spread,
                    isMelee: false
                }
            }));
        }

        // 4. APPLY CAMERA RECOIL (No Recovery)
        // We simply apply the rotation once. The player must correct it manually.
        if (this.config.cameraRecoil) {
            this.camera.rotateX(this.config.cameraRecoil);
        }

        // 5. Visual Effects & Audio
        const muzzlePos = this.muzzleOffset.clone();
        this.mesh.localToWorld(muzzlePos);
        LightManager.pulse(muzzlePos, this.config.flashColor, 0.05, 20, 5);

        if (this.audioManager) this.audioManager.playSFX(`${weaponId}_SHOOT`);

        this.animateShoot();
        
        return true; 
    }

    reload() {
        if (this.isReloading) return;
        
        const wConfig = this.config;
        const maxMag = state.getMaxMag(wConfig.id);
        const current = state.getWeaponState(wConfig.id).magCurrent;
        const reserve = state.data.ammo[wConfig.ammoType];

        if (current >= maxMag || reserve <= 0) return;

        this.isReloading = true;
        if (this.audioManager) this.audioManager.playSFX(`${wConfig.id}_RELOAD`);

        this.animateReload();

        setTimeout(() => {
            state.reloadWeapon(wConfig.id);
            this.isReloading = false;
            this.fireTimer = 0; 
        }, wConfig.reloadTime * 1000);
    }

    update(delta, isMoving, time) {
        // Fire Rate Cooldown
        if (this.fireTimer > 0) this.fireTimer -= delta;

        // Auto-Fire Logic
        if (this.config.isAuto && this.triggerHeld && this.fireTimer <= 0) {
            this.tryFire();
        }

        if (!this.isReloading) {
            super.update(delta, isMoving, time);
            
            // Note: Camera Recoil recovery logic removed.

            // Model Recoil Animation (Visual only)
            if (this.recoilTimer > 0) {
                this.recoilTimer -= delta * this.config.recoilSnap;
                if (this.recoilTimer < 0) this.recoilTimer = 0;
            }
            const kickZ = this.recoilTimer * this.config.recoilKick;
            const kickRot = this.recoilTimer * this.config.recoilRise;
            this.mesh.position.z = this.basePos.z + kickZ;
            this.mesh.rotation.x = this.baseRot.x + kickRot;
        } else {
             this.updateReloadAnim(delta, time);
        }
    }

    animateShoot() {}
    animateReload() {}
    
    updateReloadAnim(delta, time) {
        this.mesh.rotation.x = this.baseRot.x + 0.5 + Math.sin(time * 8) * 0.1;
        this.mesh.position.y = this.basePos.y - 0.2; 
    }
}