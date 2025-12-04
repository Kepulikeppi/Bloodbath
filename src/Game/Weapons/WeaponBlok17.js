import * as THREE from 'https://esm.sh/three@0.160.0';
import { RangedWeapon } from './RangedWeapon.js';

export class WeaponBlok17 extends RangedWeapon {
    constructor(camera, config, audioManager) {
        super(camera, config, audioManager);
        this.buildVisuals(config);
    }

    buildVisuals(config) {
        const bodyMat = new THREE.MeshStandardMaterial({ color: config.bodyColor, roughness: 0.5, metalness: 0.6 });
        const slideMat = new THREE.MeshStandardMaterial({ color: config.slideColor, roughness: 0.2, metalness: 0.8 });
        
        // Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), bodyMat);
        grip.rotation.x = -0.2; 
        grip.position.set(0, -0.05, 0.05); 
        this.mesh.add(grip);
        
        // Slide
        this.slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.4), slideMat);
        this.slide.position.set(0, 0.08, -0.1); 
        this.mesh.add(this.slide);

        // Muzzle location
        this.muzzleOffset = new THREE.Vector3(0, 0.1, -0.6);
    }

    animateShoot() {
        // Slide moves back
        this.slide.position.z += 0.08; 
        setTimeout(() => { 
            this.slide.position.z -= 0.08; 
        }, 50);
    }

    animateReload() {
        // Standard pistol tilt
        this.mesh.rotation.x = this.baseRot.x + 0.8; 
    }
    
    // Uses default updateReloadAnim from base class
}