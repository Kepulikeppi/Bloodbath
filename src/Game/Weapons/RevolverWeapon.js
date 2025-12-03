import * as THREE from 'https://esm.sh/three@0.160.0';
import { Weapon } from './Weapon.js';
import { state } from '../GameState.js';
import { WeaponConfig } from '../../WeaponConfig.js';
import { LightManager } from '../LightManager.js';

export class RevolverWeapon extends Weapon {
    constructor(camera, config, audioManager) {
        super(camera, config);
        this.audioManager = audioManager;

        this.recoilTimer = 0;
        this.isReloading = false;

        // Visuals: Shiny Gun Metal Black
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.8 });
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 }); // Rubber/Wood grip

        // 1. Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.12), gripMat);
        grip.rotation.x = -0.3;
        grip.position.set(0, -0.1, 0.1);
        this.mesh.add(grip);

        // 2. Frame/Body
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.2), bodyMat);
        frame.position.set(0, 0.05, 0);
        this.mesh.add(frame);

        // 3. Cylinder (The sturdy part)
        this.cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 8), bodyMat);
        this.cylinder.rotation.z = Math.PI / 2;
        this.cylinder.position.set(0, 0.05, -0.15); // Behind barrel
        this.mesh.add(this.cylinder);

        // 4. Barrel (Long and sturdy)
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 16), bodyMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.08, -0.45);
        this.mesh.add(barrel);

        // 5. Under-barrel lug (for that "Magnum" look)
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), bodyMat);
        lug.position.set(0, 0.02, -0.45);
        this.mesh.add(lug);
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
                    this.audioManager.playSFX(`${weaponId}_EMPTY`); // Fallback if not defined?
                }
            }
            return false;
        }

        state.consumeAmmo(weaponId);

        this.isActing = true;
        this.recoilTimer = 1.0;

        // Muzzle Flash
        const muzzlePos = new THREE.Vector3(0, 0.1, -0.7);
        this.mesh.localToWorld(muzzlePos);
        LightManager.pulse(muzzlePos, 0xffaa00, 0.1, 25, 8); // Brighter, bigger flash

        // Visual Recoil Animation (Hammer/Cylinder)
        this.cylinder.rotation.x += Math.PI / 3; // Rotate cylinder 1/6th

        if (this.audioManager) {
            // Use specific sound or fallback
            this.audioManager.playSFX(`${weaponId}_SHOOT`);
        }

        // Fire Rate delay
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

        // STAGE 1: Open Cylinder & Eject
        if (this.audioManager) this.audioManager.playSFX(`${wConfig.id}_OPEN`); // Placeholder name

        // Visual: Swing cylinder out
        const originalCylPos = this.cylinder.position.clone();
        const originalCylRot = this.cylinder.rotation.clone();

        // Animate cylinder out (simplified)
        this.cylinder.position.x = -0.2;

        // Wait for eject
        setTimeout(() => {
            if (this.audioManager) this.audioManager.playSFX(`${wConfig.id}_EJECT`);

            // STAGE 2: Insert Rounds
            // We need to load up to maxMag, but limited by reserve
            const needed = maxMag - current;
            const toLoad = Math.min(needed, reserve);

            let loadedCount = 0;

            const insertRound = () => {
                if (loadedCount < toLoad) {
                    loadedCount++;
                    if (this.audioManager) this.audioManager.playSFX(`${wConfig.id}_INSERT`);

                    // Visual bob for insertion
                    this.mesh.rotation.x += 0.1;
                    setTimeout(() => { this.mesh.rotation.x -= 0.1; }, 100);

                    // Schedule next round
                    setTimeout(insertRound, 800); // 0.8s per round
                } else {
                    // FINISH
                    if (this.audioManager) this.audioManager.playSFX(`${wConfig.id}_CLOSE`);

                    // Restore cylinder
                    this.cylinder.position.copy(originalCylPos);
                    this.cylinder.rotation.copy(originalCylRot);

                    // Update State
                    state.reloadWeapon(wConfig.id); // This does the math again, which is fine
                    this.isReloading = false;
                }
            };

            // Start inserting after a short delay
            setTimeout(insertRound, 1000);

        }, 1000); // 1s for open/eject
    }

    update(delta, isMoving, time) {
        if (!this.isReloading) {
            super.update(delta, isMoving, time);

            if (this.recoilTimer > 0) {
                this.recoilTimer -= delta * this.config.recoilSnap;
                if (this.recoilTimer < 0) this.recoilTimer = 0;
            }
            // Heavy recoil
            const kickZ = this.recoilTimer * this.config.recoilKick;
            const kickRot = this.recoilTimer * this.config.recoilRise;
            this.mesh.position.z = this.basePos.z + kickZ;
            this.mesh.rotation.x = this.baseRot.x + kickRot;
        } else {
            // Reload idle sway
            this.mesh.rotation.x = this.baseRot.x + 0.3 + Math.sin(time * 2) * 0.05;
            this.mesh.position.y = this.basePos.y - 0.1;
            this.mesh.rotation.z = 0.2; // Tilt gun to side for reload
        }
    }
}
