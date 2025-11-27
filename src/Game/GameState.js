import { Config } from '../Config.js';
import { WeaponConfig } from '../WeaponConfig.js';

export class GameState {
    constructor() {
        // DEFAULT DATA
        this.data = {
            hp: 100,
            maxHp: 100,
            armor: 0.0,
            xp: 0,
            
            // Reserves (Bullets in your pocket)
            ammo: {
                '9mm': 50,
                '44mag': 0,
                'shells': 0,
                'grenades': 0,
                'battery': 0
            },
            materials: { metal: 0, electronics: 0, microchips: 0 },
            consumables: { ragePills: 0 },

            // Weapons Inventory
            // We store IDs of weapons the player has unlocked
            unlockedWeapons: ['PISTOL_9MM'], 
            
            // Currently selected slot (1=Melee, 2=Pistol, etc.)
            currentSlot: 2, 

            // Detailed Weapon State (Upgrades & Current Mag)
            weaponData: {
                'PISTOL_9MM': {
                    magCurrent: 17,
                    magSizeMod: 0, // 0 = normal, 1 = stick, 2 = drum
                    isAuto: false
                }
            },
            
            attributes: { speedMult: 1.0, sprintMult: 1.0, staminaMax: 100 }
        };

        this.load();
    }
    
    save() { sessionStorage.setItem('bloodbath_gamestate', JSON.stringify(this.data)); }
    
    load() {
        const saved = sessionStorage.getItem('bloodbath_gamestate');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.data = { ...this.data, ...parsed };
            
            // Safety checks for backward compatibility
            if(!this.data.weaponData) this.data.weaponData = {
                'PISTOL_9MM': { magCurrent: 17, magSizeMod: 0, isAuto: false }
            };
            if(!this.data.unlockedWeapons) this.data.unlockedWeapons = ['PISTOL_9MM'];
        }
    }

    reset() { sessionStorage.removeItem('bloodbath_gamestate'); }
    
    addXP(amount) { this.data.xp += amount; this.save(); }
    
    modifyHP(amount) {
        this.data.hp += amount;
        if (this.data.hp > this.data.maxHp) this.data.hp = this.data.maxHp;
        if (this.data.hp < 0) this.data.hp = 0;
        this.save();
        return this.data.hp <= 0;
    }

    // --- WEAPON HELPERS ---

    // FIX: Added the missing function called by HUD.js
    hasWeapon(slotIndex) {
        // Mapping: 1=Melee, 2=Pistol, etc.
        // In the future, you can make this dynamic based on a 'Loadout' array.
        
        if (slotIndex === 1) return this.data.unlockedWeapons.includes('MELEE_KNIFE');
        if (slotIndex === 2) return this.data.unlockedWeapons.includes('PISTOL_9MM');
        
        return false; 
    }

    getWeaponState(weaponId) {
        if (!this.data.weaponData[weaponId]) {
            // Initialize if missing
            this.data.weaponData[weaponId] = { magCurrent: 0, magSizeMod: 0 };
        }
        return this.data.weaponData[weaponId];
    }

    // Calculate max mag size based on upgrades
    getMaxMag(weaponId) {
        const state = this.getWeaponState(weaponId);
        // Safety check if config exists
        const base = WeaponConfig[weaponId] ? WeaponConfig[weaponId].baseMagSize : 0;
        
        if (weaponId === 'PISTOL_9MM') {
            if (state.magSizeMod === 1) return 33; // Stick
            if (state.magSizeMod === 2) return 100; // Drum
        }
        return base;
    }

    consumeAmmo(weaponId) {
        const wState = this.getWeaponState(weaponId);
        if (wState.magCurrent > 0) {
            wState.magCurrent--;
            this.save();
            return true;
        }
        return false;
    }

    reloadWeapon(weaponId) {
        const wConfig = WeaponConfig[weaponId];
        if (!wConfig) return false;

        const wState = this.getWeaponState(weaponId);
        const maxMag = this.getMaxMag(weaponId);
        
        const needed = maxMag - wState.magCurrent;
        if (needed <= 0) return false; // Full

        const reserve = this.data.ammo[wConfig.ammoType];
        if (reserve <= 0) return false; // No ammo

        // Take what we need, or whatever is left
        const amountToLoad = Math.min(needed, reserve);
        
        this.data.ammo[wConfig.ammoType] -= amountToLoad;
        wState.magCurrent += amountToLoad;
        
        this.save();
        return true;
    }
}

export const state = new GameState();