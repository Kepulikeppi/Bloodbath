import * as THREE from 'https://esm.sh/three@0.160.0';
import { RangedWeapon } from './RangedWeapon.js';

export class WeaponJoltDiplomat extends RangedWeapon {
    constructor(camera, config, audioManager) {
        super(camera, config, audioManager);
        this.buildVisuals(config);
    }

    buildVisuals(config) {
        const bodyMat = new THREE.MeshStandardMaterial({ color: config.bodyColor, roughness: 0.2, metalness: 0.8 });
        const gripMat = new THREE.MeshStandardMaterial({ color: config.gripColor || 0x111111, roughness: 0.8, metalness: 0.1 });

        // Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.12), gripMat);
        grip.rotation.x = -0.3;
        grip.position.set(0, -0.1, 0.1);
        this.mesh.add(grip);

        // Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.2), bodyMat);
        frame.position.set(0, 0.05, 0);
        this.mesh.add(frame);

        // Cylinder
        this.cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 6), bodyMat);
        this.cylinder.rotation.z = Math.PI / 2;
        this.cylinder.position.set(0, 0.05, -0.15);
        this.mesh.add(this.cylinder);

        // Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 16), bodyMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.08, -0.45);
        this.mesh.add(barrel);

        // Lug
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), bodyMat);
        lug.position.set(0, 0.02, -0.45);
        this.mesh.add(lug);

        this.muzzleOffset = new THREE.Vector3(0, 0.1, -0.7);
    }

    animateShoot() {
        // Rotate Cylinder 60 degrees
        this.cylinder.rotation.x += Math.PI / 3;
    }

    animateReload() {
        // 1. Tilt Gun Sideways
        this.mesh.rotation.z = 0.5; 
        this.mesh.rotation.x = this.baseRot.x + 0.5;

        // 2. Pop Cylinder Out
        this.cylinder.position.x = -0.2;
        
        // 3. Reset (Logic handled by base class timer, visuals reset here)
        setTimeout(() => {
            this.cylinder.position.x = 0;
            this.mesh.rotation.z = 0;
        }, this.config.reloadTime * 1000);
    }

    updateReloadAnim(delta, time) {
        // Custom steady bob while open
        this.mesh.position.y = this.basePos.y - 0.1 + Math.sin(time * 4) * 0.01;
    }
}