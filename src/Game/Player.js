import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';
import { AudioConfig } from '../AudioConfig.js';

export class Player {
    constructor(camera, mapData, audioManager) {
        this.camera = camera;
        this.mapData = mapData;
        this.audioManager = audioManager;
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        // Physics Constants
        this.speed = Config.PLAYER_SPEED;
        this.friction = Config.PLAYER_FRICTION;
        this.gravity = 30.0; 
        this.jumpForce = 8.0; 
        
        // Collision Settings
        this.radius = 0.3; // Body radius
        this.eyeHeight = Config.EYE_HEIGHT || 1.7;
        this.maxStepHeight = 0.6; // Max height we can walk up instantly (stairs)
        
        this.onGround = false;
        this.stepTimer = 0;
    }

    update(delta, input) {
        // 1. Apply Gravity
        this.velocity.y -= this.gravity * delta;

        // 2. Friction (Horizontal only)
        this.velocity.x -= this.velocity.x * this.friction * delta;
        this.velocity.z -= this.velocity.z * this.friction * delta;

        // 3. Input / Acceleration
        this.direction.z = Number(input.keys.forward) - Number(input.keys.backward);
        this.direction.x = Number(input.keys.right) - Number(input.keys.left);
        this.direction.normalize();

        if (input.keys.forward || input.keys.backward) {
            this.velocity.z -= this.direction.z * 100.0 * delta;
        }
        if (input.keys.left || input.keys.right) {
            this.velocity.x -= this.direction.x * 100.0 * delta;
        }

        // Jump (Only if on ground)
        // Note: Add 'space' to Input.js if not present, or map a key
        if (input.keys.space && this.onGround) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // 4. Footsteps
        if (this.onGround && (input.keys.forward || input.keys.backward || input.keys.left || input.keys.right)) {
            this.stepTimer += delta;
            if (this.stepTimer > AudioConfig.SFX.STEP_FREQUENCY) {
                if (this.audioManager) this.audioManager.playRandomStep();
                this.stepTimer = 0;
            }
        } else {
            this.stepTimer = AudioConfig.SFX.STEP_FREQUENCY;
        }

        // 5. PREDICTED MOVEMENT
        // We calculate movement on X and Z separately to allow "Wall Sliding"
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

        const dx = moveVec.x * this.speed * delta;
        const dz = moveVec.z * this.speed * delta;

        // Apply Movement
        this.moveAxis('x', dx);
        this.moveAxis('z', dz);
        
        // Apply Vertical Movement
        this.camera.position.y += this.velocity.y * delta;

        // 6. GROUND COLLISION & STEPPING
        this.handleGroundCollision(delta);

        // 7. DEATH PLANE (Fallen into Chasm)
        if (this.camera.position.y < -20) {
            // Trigger Death (handled by Game loop via HP check usually, but we force it here)
            // For now, we just snap HP to 0 or let the game loop handle "OutOfBounds"
            // Ideally, return a flag or dispatch event.
            // Hack: Set HP to 0 via global state if imported, or let game.js check pos.y
        }
    }

    moveAxis(axis, amount) {
        if (amount === 0) return;

        const originalPos = this.camera.position[axis];
        this.camera.position[axis] += amount;

        // Get feet position (Collision is based on feet, not eyes)
        const feetY = this.camera.position.y - this.eyeHeight;

        // Check collision at new spot
        if (this.isColliding(this.camera.position.x, this.camera.position.z, feetY)) {
            // If collision, revert movement
            this.camera.position[axis] = originalPos;
            this.velocity[axis] = 0;
        }
    }

    isColliding(x, z, feetY) {
        // Check radius around player
        // We check the 4 corners of the bounding box roughly
        const r = this.radius;
        const checks = [
            { x: x + r, z: z + r },
            { x: x - r, z: z + r },
            { x: x + r, z: z - r },
            { x: x - r, z: z - r }
        ];

        for (const p of checks) {
            const tile = this.getTileData(p.x, p.z);
            const floorHeight = this.getFloorHeight(tile);

            // STAIR LOGIC:
            // If the floor is higher than our feet...
            if (floorHeight > feetY + 0.1) { // +0.1 tolerance for uneven ground
                // Is it a Step (climbable) or a Wall (blocked)?
                const diff = floorHeight - feetY;
                if (diff > this.maxStepHeight) {
                    return true; // It's a Wall/High Step -> Collision
                }
                // It's a stair -> We handle the "Snap Up" in handleGroundCollision, 
                // but for horizontal movement, we ALLOW entering this tile.
            }
        }
        return false;
    }

    handleGroundCollision(delta) {
        const x = this.camera.position.x;
        const z = this.camera.position.z;
        const feetY = this.camera.position.y - this.eyeHeight;

        // Find the floor height directly under us
        const tile = this.getTileData(x, z);
        let floorHeight = this.getFloorHeight(tile);

        // Smooth Step-Up Logic
        // If we are slightly intersecting the floor (or it's a stair), snap up
        // We check a bit higher to catch stairs we just walked into
        if (feetY < floorHeight + this.maxStepHeight) {
            
            // Check if we are actually falling into a chasm first
            if (floorHeight < -100) {
                this.onGround = false;
                return; // Let them fall
            }

            // Determine if we should snap
            // If we are falling fast, we shouldn't snap to a high ledge instantly (optional realism)
            // But for arcade feel, we snap if we are close enough.
            
            if (feetY <= floorHeight + 0.01 && this.velocity.y <= 0) {
                // Landed
                this.camera.position.y = floorHeight + this.eyeHeight;
                this.velocity.y = 0;
                this.onGround = true;
            } else {
                this.onGround = false;
            }
        } else {
            this.onGround = false;
        }
    }

    getTileData(x, z) {
        const gridX = Math.floor(x);
        const gridZ = Math.floor(z);

        // Out of bounds
        if (gridZ < 0 || gridZ >= this.mapData.length || 
            gridX < 0 || gridX >= this.mapData[0].length) {
            return { type: 1, height: 100 }; // Infinite Wall
        }

        return this.mapData[gridZ][gridX];
    }

    getFloorHeight(tile) {
        if (tile.type === 1) return 100.0; // Wall is effectively infinite height
        if (tile.type === 2) return -999.0; // Chasm is infinite depth
        return tile.height || 0;
    }
}