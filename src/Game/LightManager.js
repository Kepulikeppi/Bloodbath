import * as THREE from 'https://esm.sh/three@0.160.0';

export const LightManager = {
    pool: [],
    index: 0,
    scene: null,

    init(scene, capacity = 10) {
        this.scene = scene;
        this.pool = [];
        this.index = 0;

        for (let i = 0; i < capacity; i++) {
            // FIX: Start at 0.001, NOT 0.
            // This forces Three.js to compile the shader with these lights included from Frame 1.
            const light = new THREE.PointLight(0xffffff, 0.001, 5); 
            light.castShadow = false; 
            light.position.set(0, -99999, 0); // Hide in void
            scene.add(light);
            this.pool.push(light);
        }
        console.log(`[LightManager] Initialized ${capacity} dynamic lights.`);
    },

    pulse(position, colorHex, duration = 0.05, intensity = 20, range = 5) {
        if (!this.scene) return;

        const light = this.pool[this.index];
        this.index = (this.index + 1) % this.pool.length;

        light.color.setHex(colorHex);
        light.intensity = intensity;
        light.distance = range;
        light.position.copy(position);

        setTimeout(() => {
            // FIX: Return to 0.001, NEVER 0.
            light.intensity = 0.001;
            light.position.set(0, -99999, 0);
        }, duration * 1000);
    }
};