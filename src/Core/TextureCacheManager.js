// src/Core/TextureCache.js
import * as THREE from 'https://esm.sh/three@0.160.0';

class TextureCacheManager {
    constructor() {
        this.cache = new Map();
        this.loader = new THREE.TextureLoader();
    }

    load(path, onLoad) {
        // Return cached texture if available
        if (this.cache.has(path)) {
            const tex = this.cache.get(path);
            if (onLoad) onLoad(tex);
            return tex;
        }

        // Load and cache
        const texture = this.loader.load(path, (tex) => {
            this.cache.set(path, tex);
            if (onLoad) onLoad(tex);
        }, undefined, (err) => {
            console.warn(`[TextureCache] Failed to load: ${path}`);
        });

        return texture;
    }

    // Preload textures during initial load
    preload(paths) {
        return Promise.all(paths.map(path => {
            return new Promise((resolve) => {
                this.load(path, resolve);
            });
        }));
    }

    has(path) {
        return this.cache.has(path);
    }

    get(path) {
        return this.cache.get(path);
    }
}

export const TextureCache = new TextureCacheManager();