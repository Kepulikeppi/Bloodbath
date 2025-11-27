import { Config } from '../Config.js';

export class GameState {
    constructor() {
        // 1. DEFAULT STATE (New Run)
        this.data = {
            // --- VISIBLE STATS ---
            hp: 100,
            maxHp: 100,
            armor: 0.0, // 0.0 to 0.9 (Percentage damage reduction)
            xp: 0,
            
            // Inventory
            ammo: {
                '9mm': 50,
                '127mm': 0,
                'shells': 0,
                'grenades': 0,
                'battery': 0
            },
            materials: {
                metal: 0,
                electronics: 0,
                microchips: 0
            },
            consumables: {
                ragePills: 0
            },

            // Weapons (Unlocked IDs)
            unlockedWeapons: ['MELEE_KNIFE', 'PISTOL_9MM'], 
            currentWeaponSlot: 2, // Default to Pistol

            // --- HIDDEN ATTRIBUTES (Tech Tree Upgrades) ---
            attributes: {
                speedMult: 1.0,
                sprintMult: 1.0,
                staminaMax: 100,
                reloadSpeedMult: 1.0,
                meleeDamageMult: 1.0,
                hackSkill: 0
            }
        };

        // 2. LOAD FROM STORAGE (If exists)
        this.load();
    }

    save() {
        sessionStorage.setItem('bloodbath_gamestate', JSON.stringify(this.data));
    }

    load() {
        const saved = sessionStorage.getItem('bloodbath_gamestate');
        if (saved) {
            // Merge saved data with defaults (handles version updates safely)
            this.data = { ...this.data, ...JSON.parse(saved) };
        }
    }

    reset() {
        sessionStorage.removeItem('bloodbath_gamestate');
        // We rely on page reload to re-init defaults, or manual reset could go here
    }

    // --- HELPER METHODS ---
    
    addXP(amount) {
        this.data.xp += amount;
        this.save();
    }

    modifyHP(amount) {
        this.data.hp += amount;
        if (this.data.hp > this.data.maxHp) this.data.hp = this.data.maxHp;
        if (this.data.hp < 0) this.data.hp = 0;
        this.save();
        return this.data.hp <= 0; // Returns true if dead
    }

    addAmmo(type, amount) {
        if (this.data.ammo[type] !== undefined) {
            this.data.ammo[type] += amount;
            this.save();
        }
    }

    hasWeapon(slotIndex) {
        // Mapping slots 1-6 to generic types check
        // For now, we just return true if slot 2 (Pistol) or 1 (Melee)
        if (slotIndex === 1) return this.data.unlockedWeapons.includes('MELEE_KNIFE');
        if (slotIndex === 2) return this.data.unlockedWeapons.includes('PISTOL_9MM');
        return false; // Others not implemented yet
    }
}

// Export a SINGLE instance (Singleton)
export const state = new GameState();