export class Random {
    constructor(seedStr) {
        // Convert string seed to a number hash
        let h = 0x811c9dc5;
        for (let i = 0; i < seedStr.length; i++) {
            h ^= seedStr.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        // FIX: Force to unsigned 32-bit integer (always positive)
        this.seed = h >>> 0;
    }

    // Returns a float between 0 and 1
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        // FIX: Ensure result is positive (just in case)
        return Math.abs(this.seed / 233280);
    }

    // Helper: Integer between min and max
    range(min, max) {
        return Math.floor(this.next() * (max - min + 1) + min);
    }
}