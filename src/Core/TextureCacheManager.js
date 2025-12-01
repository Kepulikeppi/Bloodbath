// src/Core/TextureCache.js
import * as THREE from 'https://esm.sh/three@0.160.0';

class TextureCacheManager {
    constructor() {
        this.cache = new Map();
        this.loader = new THREE.TextureLoader();
        this.pending = 0;
    }

    load(path, onLoad) {
        // Return cached texture if available
        if (this.cache.has(path)) {
            const tex = this.cache.get(path);
            if (onLoad) onLoad(tex);
            return tex;
        }

        // Track pending
        this.pending++;

        // Load and cache
        const texture = this.loader.load(path, (tex) => {
            this.cache.set(path, tex);
            this.pending--;
            if (onLoad) onLoad(tex);
        }, undefined, (err) => {
            console.warn(`[TextureCache] Failed to load: ${path}`);
            this.pending--;
        });

        return texture;
    }

    isLoaded() {
        return this.pending === 0;
    }
}

export const TextureCache = new TextureCacheManager();