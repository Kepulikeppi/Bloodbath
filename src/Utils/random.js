export class Random {
    constructor(seed) {
        // FIX: Ensure seed is a string so .length works
        // If 'seed' is a number (from PHP), .length is undefined without this.
        const seedStr = String(seed);

        // Convert string seed to a number hash
        let h = 0x811c9dc5;
        for (let i = 0; i < seedStr.length; i++) {
            h ^= seedStr.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        // Force to unsigned 32-bit integer (always positive)
        this.seed = h >>> 0;
    }

    // Returns a float between 0 and 1
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return Math.abs(this.seed / 233280);
    }

    // Integer between min and max (inclusive)
    range(min, max) {
        return Math.floor(this.next() * (max - min + 1) + min);
    }

    // Shuffle an array (Fisher-Yates)
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}