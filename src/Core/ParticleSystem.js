import * as THREE from 'https://esm.sh/three@0.160.0';

export class ParticleSystem {
    constructor(scene, count, color, range) {
        this.count = count;
        this.range = range;
        
        // Geometry: Store positions for every particle
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const speeds = [];

        for (let i = 0; i < count; i++) {
            // Random positions around the center
            positions.push((Math.random() - 0.5) * range); // x
            positions.push((Math.random() - 0.5) * range); // y
            positions.push((Math.random() - 0.5) * range); // z
            
            // Random upward speed
            speeds.push(Math.random() * 0.02 + 0.01);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('speed', new THREE.Float32BufferAttribute(speeds, 1));

        // Material: Simple transparent dots
        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true
        });

        this.mesh = new THREE.Points(geometry, material);
        scene.add(this.mesh);
    }

    update() {
        const positions = this.mesh.geometry.attributes.position.array;
        const speeds = this.mesh.geometry.attributes.speed.array;

        for (let i = 0; i < this.count; i++) {
            // Index of Y coordinate is (i * 3) + 1
            const yIndex = i * 3 + 1;
            
            // Move up
            positions[yIndex] += speeds[i];

            // If it goes too high, reset to bottom
            if (positions[yIndex] > this.range / 2) {
                positions[yIndex] = -this.range / 2;
            }
        }

        this.mesh.geometry.attributes.position.needsUpdate = true;
    }
    
    destroy(scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}