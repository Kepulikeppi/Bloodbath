import { LootTypes } from '../LootConfig.js';

export const EnemyTypes = {
    BIO: 'BIO',       // Flesh and blood
    MECH: 'MECH',     // Robots
    CYBORG: 'CYBORG'  // Hybrids
};

export class LootManager {
    /**
     * Decides what loot to drop based on enemy type.
     */
    static getDrop(enemyType) {
        const roll = Math.random(); // 0.0 to 1.0

        switch (enemyType) {
            case EnemyTypes.BIO:
                return LootManager.rollBio(roll);
            case EnemyTypes.MECH:
                return LootManager.rollMech(roll);
            case EnemyTypes.CYBORG:
                return LootManager.rollCyborg(roll);
            default:
                return null;
        }
    }

    /**
     * Decides what loot to spawn on the map based on room tier.
     * @param {string} tier - 'COMMON' or 'RARE'
     */
    static getMapLoot(tier) {
        const roll = Math.random();

        if (tier === 'COMMON') {
            // Standard loot: Scrap, Ammo, Health
            if (roll < 0.40) return LootTypes.SCRAP;
            if (roll < 0.80) return LootManager.getRandomAmmo();
            if (roll < 0.90) return LootTypes.HEALTH;
            return LootTypes.ELEC; // 10% Electronics
        }

        if (tier === 'RARE') {
            // Branch/End loot: XP, Chips, Batteries, Full Health
            if (roll < 0.40) return LootTypes.XP;
            if (roll < 0.60) return LootTypes.CHIP;
            if (roll < 0.80) return LootTypes.BATTERY;
            return LootTypes.RAGE; // 20% Rage Pills
        }

        return null;
    }

    // === ENEMY DROP TABLES ===

    static rollBio(roll) {
        // 30% Nothing
        if (roll < 0.30) return null;
        
        // 50% Ammo (Common)
        if (roll < 0.80) return LootManager.getRandomAmmo();
        
        // 15% Health (Uncommon)
        if (roll < 0.95) return LootTypes.HEALTH;
        
        // 5% Rage Pill (Rare)
        return LootTypes.RAGE;
    }

    static rollMech(roll) {
        // 30% Nothing
        if (roll < 0.30) return null;

        // 40% Metal Scrap (Common)
        if (roll < 0.70) return LootTypes.SCRAP;

        // 20% Electronics (Uncommon)
        if (roll < 0.90) return LootTypes.ELEC;

        // 8% Battery (Rare)
        if (roll < 0.98) return LootTypes.BATTERY;

        // 2% Microchip (Very Rare)
        return LootTypes.CHIP;
    }

    static rollCyborg(roll) {
        // 20% Nothing
        if (roll < 0.20) return null;

        // 40% Ammo
        if (roll < 0.60) return LootManager.getRandomAmmo();

        // 30% Scrap/Elec
        if (roll < 0.90) {
            return Math.random() > 0.5 ? LootTypes.SCRAP : LootTypes.ELEC;
        }

        // 10% Special
        return Math.random() > 0.5 ? LootTypes.HEALTH : LootTypes.BATTERY;
    }

    // === HELPERS ===

    static getRandomAmmo() {
        const r = Math.random();
        if (r < 0.60) return LootTypes.AMMO_9MM;   // 60% 9mm
        if (r < 0.85) return LootTypes.AMMO_SHELL; // 25% Shells
        if (r < 0.95) return LootTypes.AMMO_44;    // 10% Magnum
        return LootTypes.AMMO_762;                 // 5% Rifle
    }
}