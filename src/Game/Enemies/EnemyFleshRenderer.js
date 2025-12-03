import * as THREE from 'https://esm.sh/three@0.160.0';
import { Enemy } from '../Enemy.js';

export class EnemyFleshRenderer extends Enemy {
    constructor(scene, x, z, audioManager) {
        super(scene, x, z, audioManager, 'FLESH_RENDERER');

        // Animation State
        this.animTime = 0;
        this.limbs = {}; // Store references to limbs for animation

        this.buildMesh();
    }

    buildMesh() {
        // Materials
        const fleshMat = new THREE.MeshStandardMaterial({
            color: 0xcc6666,
            roughness: 0.6,
            metalness: 0.2,
            emissive: 0x330000,
            emissiveIntensity: 0.2
        });
        const jointMat = new THREE.MeshStandardMaterial({
            color: 0x550000, roughness: 0.9
        });

        // 1. Torso (Root of body)
        const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
        const torso = new THREE.Mesh(torsoGeo, fleshMat);
        torso.position.y = 1.1; // Center of torso
        torso.castShadow = true;
        torso.userData = { parent: this };
        this.mesh.add(torso);
        this.limbs.torso = torso;

        // 2. Head
        const headGeo = new THREE.BoxGeometry(0.35, 0.4, 0.35);
        const head = new THREE.Mesh(headGeo, fleshMat);
        head.position.set(0, 0.55, 0); // Relative to torso
        head.castShadow = true;
        head.userData = { parent: this };
        torso.add(head);
        this.limbs.head = head;

        // Eyes (Glowing)
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.05, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(0.1, 0.05, 0.18);
        leftEye.userData = { ignoreFlash: true };
        head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(-0.1, 0.05, 0.18);
        rightEye.userData = { ignoreFlash: true };
        head.add(rightEye);

        // 3. Arms
        const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);

        // Left Arm Group (Shoulder pivot)
        const leftArm = new THREE.Group();
        leftArm.position.set(0.35, 0.25, 0);
        torso.add(leftArm);
        this.limbs.leftArm = leftArm;

        const leftArmMesh = new THREE.Mesh(armGeo, fleshMat);
        leftArmMesh.position.y = -0.25; // Hang down
        leftArmMesh.castShadow = true;
        leftArmMesh.userData = { parent: this };
        leftArm.add(leftArmMesh);

        // Right Arm Group
        const rightArm = new THREE.Group();
        rightArm.position.set(-0.35, 0.25, 0);
        torso.add(rightArm);
        this.limbs.rightArm = rightArm;

        const rightArmMesh = new THREE.Mesh(armGeo, fleshMat);
        rightArmMesh.position.y = -0.25;
        rightArmMesh.castShadow = true;
        rightArmMesh.userData = { parent: this };
        rightArm.add(rightArmMesh);

        // Fist (for attacking visual)
        const fistGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const rightFist = new THREE.Mesh(fistGeo, jointMat);
        rightFist.position.y = -0.35;
        rightArmMesh.add(rightFist);

        // 4. Legs
        const legGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);

        // Left Leg Group (Hip pivot)
        const leftLeg = new THREE.Group();
        leftLeg.position.set(0.15, -0.35, 0);
        torso.add(leftLeg);
        this.limbs.leftLeg = leftLeg;

        const leftLegMesh = new THREE.Mesh(legGeo, fleshMat);
        leftLegMesh.position.y = -0.35;
        leftLegMesh.castShadow = true;
        leftLegMesh.userData = { parent: this };
        leftLeg.add(leftLegMesh);

        // Right Leg Group
        const rightLeg = new THREE.Group();
        rightLeg.position.set(-0.15, -0.35, 0);
        torso.add(rightLeg);
        this.limbs.rightLeg = rightLeg;

        const rightLegMesh = new THREE.Mesh(legGeo, fleshMat);
        rightLegMesh.position.y = -0.35;
        rightLegMesh.castShadow = true;
        rightLegMesh.userData = { parent: this };
        rightLeg.add(rightLegMesh);
    }

    update(delta, playerPos, mapData, allEnemies = []) {
        super.update(delta, playerPos, mapData, allEnemies);

        if (!this.isDead) {
            this.updateAnimations(delta);
        } else {
            // Simple death pose
            this.mesh.rotation.x = -Math.PI / 2;
            this.mesh.position.y = 0.2;
        }
    }

    updateAnimations(delta) {
        this.animTime += delta * this.speed * 2.0;

        // Idle / Run blending based on movement
        // Since we don't track velocity vector explicitly in Enemy.js, we assume if not at stopDist, we are moving
        // But we can check if we moved? For now, just assume moving if aggro and not attacking

        const isMoving = this.isAggro && this.attackTimer <= 0;

        if (isMoving) {
            // Run Animation
            const legAmp = 0.8;
            const armAmp = 0.6;

            this.limbs.leftLeg.rotation.x = Math.sin(this.animTime) * legAmp;
            this.limbs.rightLeg.rotation.x = Math.sin(this.animTime + Math.PI) * legAmp;

            this.limbs.leftArm.rotation.x = Math.sin(this.animTime + Math.PI) * armAmp;
            this.limbs.rightArm.rotation.x = Math.sin(this.animTime) * armAmp;

            // Bobbing
            this.limbs.torso.position.y = 1.1 + Math.sin(this.animTime * 2) * 0.05;
        } else {
            // Idle Animation
            const idleTime = Date.now() * 0.002;
            this.limbs.leftArm.rotation.x = Math.sin(idleTime) * 0.1;
            this.limbs.rightArm.rotation.x = Math.sin(idleTime + 1) * 0.1;

            this.limbs.leftLeg.rotation.x = 0;
            this.limbs.rightLeg.rotation.x = 0;

            this.limbs.torso.position.y = 1.1 + Math.sin(idleTime * 2) * 0.02;
        }

        // Attack Animation Override
        if (this.attackTimer > 0) {
            // Punch with right arm
            // Attack timer goes from attackSpeed -> 0
            const progress = 1.0 - (this.attackTimer / this.stats.attackSpeed);

            // Simple punch: pull back, thrust forward, return
            let punchAngle = 0;
            if (progress < 0.2) {
                // Wind up
                punchAngle = -0.5 * (progress / 0.2);
            } else if (progress < 0.4) {
                // Thrust
                punchAngle = -0.5 + 2.0 * ((progress - 0.2) / 0.2);
            } else {
                // Return
                punchAngle = 1.5 * (1 - (progress - 0.4) / 0.6);
            }

            this.limbs.rightArm.rotation.x = -punchAngle; // Negative X is forward/up in this setup? 
            // Actually, rotation.x positive is usually forward if looking -Z? 
            // Let's test: Arm hangs down (0). Rotate X moves it forward/back.
            // If facing +Z (default?), X rotation...
            // Enemy looks at player.
            // Let's assume standard rig: X rotation swings arm forward/back.
            // We want to swing UP/FORWARD.
            this.limbs.rightArm.rotation.x = -Math.PI / 2 + punchAngle;
        }
    }
}
