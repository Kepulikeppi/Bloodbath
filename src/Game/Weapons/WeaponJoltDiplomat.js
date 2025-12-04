import * as THREE from 'https://esm.sh/three@0.160.0';
import { RangedWeapon } from './RangedWeapon.js';

export class WeaponJoltDiplomat extends RangedWeapon {
    constructor(camera, config, audioManager) {
        super(camera, config, audioManager);
        this.buildVisuals(config);
    }

    buildVisuals(config) {
        // Materials: Shiny Steel and Wood
        const steelMat = new THREE.MeshStandardMaterial({ 
            color: config.bodyColor, roughness: 0.3, metalness: 0.9 
        });
        const gripMat = new THREE.MeshStandardMaterial({ 
            color: config.gripColor, roughness: 0.8, metalness: 0.0 
        });

        // 1. Grip (Angled Wood)
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.07), gripMat);
        grip.rotation.x = -0.4;
        grip.position.set(0, -0.08, 0.15);
        this.mesh.add(grip);

        // 2. Frame (Main Body behind cylinder)
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.12), steelMat);
        frame.position.set(0, 0.02, 0.08);
        this.mesh.add(frame);

        // 3. Cylinder (The Big Part)
        this.cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 8), steelMat);
        this.cylinder.rotation.z = Math.PI / 2;
        this.cylinder.position.set(0, 0.02, 0.0); 
        this.mesh.add(this.cylinder);

        // 4. Barrel (Long and thinner)
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.25), steelMat);
        barrel.position.set(0, 0.03, -0.15);
        this.mesh.add(barrel);

        // 5. Top Strap / Sight
        const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.25), steelMat);
        topStrap.position.set(0, 0.065, -0.05);
        this.mesh.add(topStrap);

        // 6. Hammer
        this.hammer = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.01), steelMat);
        this.hammer.rotation.x = -0.5;
        this.hammer.position.set(0, 0.06, 0.15);
        this.mesh.add(this.hammer);

        // Muzzle Location
        this.muzzleOffset = new THREE.Vector3(0, 0.03, -0.35);
    }

    animateShoot() {
        // Spin Cylinder
        this.cylinder.rotation.x += Math.PI / 3;
        
        // Hammer Action (Snap back and forth)
        this.hammer.rotation.x = -1.0;
        setTimeout(() => { this.hammer.rotation.x = -0.5; }, 100);
    }

    animateReload() {
        // Revolver Reload Style: Flip out to side
        const startRot = this.baseRot.x;
        this.mesh.rotation.x = startRot + 0.8; // Point up
        this.mesh.rotation.z = 0.8; // Tilt side

        // Pop Cylinder Out (Visual)
        const origPos = this.cylinder.position.clone();
        this.cylinder.position.x = -0.15;
        this.cylinder.position.y += 0.05;

        setTimeout(() => {
            this.mesh.rotation.x = startRot;
            this.mesh.rotation.z = 0;
            this.cylinder.position.copy(origPos);
        }, this.config.reloadTime * 1000);
    }
}