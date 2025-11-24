import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';

export class Player {
    constructor(camera, mapData, audioManager) {
        this.camera = camera;
        this.mapData = mapData;
        this.audioManager = audioManager;
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        this.speed = Config.PLAYER_SPEED;
        this.friction = Config.PLAYER_FRICTION;
        this.radius = Config.PLAYER_RADIUS; 

        // Footstep timer
        this.stepTimer = 0;
    }

    update(delta, input) {
        // 1. Friction
        this.velocity.x -= this.velocity.x * this.friction * delta;
        this.velocity.z -= this.velocity.z * this.friction * delta;

        // 2. Direction
        this.direction.z = Number(input.keys.forward) - Number(input.keys.backward);
        this.direction.x = Number(input.keys.right) - Number(input.keys.left);
        this.direction.normalize();

        // 3. Acceleration
        if (input.keys.forward || input.keys.backward) {
            this.velocity.z -= this.direction.z * 100.0 * delta;
        }
        if (input.keys.left || input.keys.right) {
            this.velocity.x -= this.direction.x * 100.0 * delta;
        }

        // 4. FOOTSTEP LOGIC (The Fixed Part)
        // We check if ANY key is pressed to know if we are moving
        if (input.keys.forward || input.keys.backward || input.keys.left || input.keys.right) {
            
            this.stepTimer += delta;
            
            // Trigger step sound based on frequency
            if (this.stepTimer > Config.STEP_FREQUENCY) {
                if (this.audioManager) {
                    this.audioManager.playRandomStep();
                }
                this.stepTimer = 0;
            }
        } else {
            // Reset timer if standing still so next step is instant
            this.stepTimer = Config.STEP_FREQUENCY; 
        }

        // 5. COLLISION & MOVEMENT
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0; forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0; right.normalize();

        const moveVec = new THREE.Vector3();
        if(input.keys.forward) moveVec.add(forward);
        if(input.keys.backward) moveVec.sub(forward);
        if(input.keys.right) moveVec.add(right);
        if(input.keys.left) moveVec.sub(right);
        moveVec.normalize();

        const intendedMoveX = moveVec.x * this.speed * delta;
        const intendedMoveZ = moveVec.z * this.speed * delta;

        if (!this.checkCollision(this.camera.position.x + intendedMoveX, this.camera.position.z)) {
            this.camera.position.x += intendedMoveX;
        }
        
        if (!this.checkCollision(this.camera.position.x, this.camera.position.z + intendedMoveZ)) {
            this.camera.position.z += intendedMoveZ;
        }
    }

    checkCollision(x, z) {
        const buffer = this.radius; 
        if (this.isWall(x + buffer, z + buffer)) return true;
        if (this.isWall(x - buffer, z + buffer)) return true;
        if (this.isWall(x + buffer, z - buffer)) return true;
        if (this.isWall(x - buffer, z - buffer)) return true;
        return false;
    }

    isWall(x, z) {
        const gridX = Math.floor(x);
        const gridZ = Math.floor(z);
        if (gridZ < 0 || gridZ >= this.mapData.length || 
            gridX < 0 || gridX >= this.mapData[0].length) {
            return true; 
        }
        return this.mapData[gridZ][gridX] === 1;
    }
}