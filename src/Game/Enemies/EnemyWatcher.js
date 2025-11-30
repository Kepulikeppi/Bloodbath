import * as THREE from 'https://esm.sh/three@0.160.0';
import { Enemy } from '../Enemy.js';

export class EnemyWatcher extends Enemy {
    constructor(scene, x, z, audioManager) {
        // 1. Initialize Base Class with specific config ID
        super(scene, x, z, audioManager, 'WATCHER');

        // 2. Build the Model
        this.buildMesh();
        
        // 3. Animation State
        this.floatOffset = Math.random() * 100;
    }

    buildMesh() {
        // Materials
        const fleshMat = new THREE.MeshStandardMaterial({ 
            color: 0x880000, roughness: 0.7, metalness: 0.1 
        });
        const boneMat = new THREE.MeshStandardMaterial({ 
            color: 0xdddddd, roughness: 0.9 
        });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // A. Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.3), fleshMat);
        torso.position.y = 1.0;
        torso.castShadow = true;
        torso.userData = { parent: this };
        this.mesh.add(torso);

        // B. Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.35), boneMat);
        head.position.y = 1.7;
        head.castShadow = true;
        head.userData = { parent: this };
        this.mesh.add(head);

        // C. Eyes
        const eyeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
        eyeGeo.rotateX(Math.PI / 2);
        
        const pupilGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8);
        pupilGeo.rotateX(Math.PI / 2);

        const addEye = (offsetX) => {
            const sclera = new THREE.Mesh(eyeGeo, eyeMat);
            sclera.position.set(offsetX, 1.7, 0.18);
            sclera.userData = { parent: this, ignoreFlash: true }; // Eyes don't flash
            this.mesh.add(sclera);

            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.set(offsetX, 1.7, 0.19);
            pupil.userData = { parent: this, ignoreFlash: true };
            this.mesh.add(pupil);
        };

        addEye(-0.08);
        addEye(0.08);
    }

    update(delta, playerPos, mapData, allEnemies = []) {
        // 1. Run Standard Logic (Aggro, Cooldowns, Movement)
        super.update(delta, playerPos, mapData, allEnemies);

        // 2. Run Unique Animation (Bobbing)
        if (!this.isDead) {
            const time = Date.now() * 0.005 + this.floatOffset;
            this.mesh.position.y = Math.sin(time) * 0.05; 
        }
    }
}