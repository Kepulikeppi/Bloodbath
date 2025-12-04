import * as THREE from 'https://esm.sh/three@0.160.0';
import { Weapon } from './Weapon.js';

export class MeleeWeapon extends Weapon {
    constructor(camera, config, audioManager) {
        super(camera, config);
        this.audioManager = audioManager;
        
        this.swingTimer = 0;
        this.buildVisuals(config);
    }

    buildVisuals(config) {
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        const bladeMat = new THREE.MeshStandardMaterial({ color: config.accentColor || 0x888888, roughness: 0.3, metalness: 0.9 });

        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.15, 8), handleMat);
        handle.rotation.x = Math.PI / 2;
        handle.position.set(0, -0.05, 0.1);
        this.mesh.add(handle);

        // Guard
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), handleMat);
        guard.position.set(0, -0.05, -0.0);
        this.mesh.add(guard);

        // Blade
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.005), bladeMat);
        blade.rotation.x = Math.PI / 2;
        blade.position.set(0, -0.05, -0.2);
        this.mesh.add(blade);
    }

    pressTrigger() {
        if (this.isActing) return;
        this.swing();
    }

    releaseTrigger() {
        // No auto-fire for melee usually, or held state isn't needed
    }

    swing() {
        this.isActing = true;
        this.swingTimer = 0;

        // Audio
        // You'll need to add 'swing_miss' or similar to AudioConfig if you want sound here
        // if (this.audioManager) this.audioManager.playSFX('swing');

        // Dispatch Hit Check
        // Logic is handled in CombatSystem.js via this event
        window.dispatchEvent(new CustomEvent('weapon-fire', {
            detail: {
                damage: this.config.damage,
                range: this.config.range,
                isMelee: true
            }
        }));

        // Cooldown reset matches attackSpeed
        setTimeout(() => {
            this.isActing = false;
        }, this.config.attackSpeed * 1000);
    }

    update(delta, isMoving, time) {
        // Base bobbing
        super.update(delta, isMoving, time);

        // Swing Animation override
        if (this.isActing) {
            this.swingTimer += delta * (1.0 / this.config.attackSpeed);
            
            // Slash Motion: Wind up -> Slash -> Return
            // 0.0 to 0.2: Wind up (Back and side)
            // 0.2 to 0.4: Slash (Across screen)
            // 0.4 to 1.0: Recover
            
            const t = this.swingTimer;
            
            if (t < 0.2) {
                // Wind up
                const prog = t / 0.2;
                this.mesh.rotation.x = this.baseRot.x - 0.5 * prog;
                this.mesh.rotation.y = this.baseRot.y + 0.5 * prog;
                this.mesh.position.x = this.basePos.x + 0.2 * prog;
            } else if (t < 0.4) {
                // SLASH
                const prog = (t - 0.2) / 0.2;
                this.mesh.rotation.x = (this.baseRot.x - 0.5) + (2.0 * prog); // Chop down
                this.mesh.rotation.y = (this.baseRot.y + 0.5) - (1.5 * prog); // Swing across
                this.mesh.position.x = (this.basePos.x + 0.2) - (0.4 * prog);
                this.mesh.position.z = this.basePos.z - 0.3 * Math.sin(prog * Math.PI); // Forward thrust
            } else {
                // Return
                const prog = (t - 0.4) / 0.6;
                // Lerp back to base
                this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, this.baseRot.x, prog * 0.2);
                this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.baseRot.y, prog * 0.2);
                this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, this.basePos.x, prog * 0.2);
                this.mesh.position.z = THREE.MathUtils.lerp(this.mesh.position.z, this.basePos.z, prog * 0.2);
            }
        }
    }
}