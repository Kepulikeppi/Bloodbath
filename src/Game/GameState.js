import { Config } from '../Config.js';
import { WeaponConfig } from '../WeaponConfig.js';
import { LootTypes } from '../LootConfig.js'; // We will create this next

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
                '762mm': 0,
                '127mm': 0,
                '40mm': 0,
                'battery': 0
            },
            materials: { metal: 0, electronics: 0, microchips: 0 },
            consumables: { ragePills: 0 },

            // Weapons Inventory
            unlockedWeapons: ['PISTOL_9MM'], 
            currentSlot: 2, 

            // Detailed Weapon State
            weaponData: {
                'PISTOL_9MM': {
                    magCurrent: 17,
                    magSizeMod: 0, 
                    isAuto: false
                }
            },
            
            attributes: { speedMult: 1.0, sprintMult: 1.0, staminaMax: 100 },
            
            runStats: {
                kills: 0,
                shotsFired: 0,
                shotsHit: 0,
                startTime: Date.now()
            }
        };

        this.load();
    }
    
    save() { sessionStorage.setItem('bloodbath_gamestate', JSON.stringify(this.data)); }
    
    load() {
        const saved = sessionStorage.getItem('bloodbath_gamestate');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.data = { ...this.data, ...parsed };
            
            if(!this.data.weaponData) this.data.weaponData = {
                'PISTOL_9MM': { magCurrent: 17, magSizeMod: 0, isAuto: false }
            };
            if(!this.data.unlockedWeapons) this.data.unlockedWeapons = ['PISTOL_9MM'];
        }
    }

    reset() { sessionStorage.removeItem('bloodbath_gamestate'); }
    
    // === LOOT & ECONOMY HELPERS ===

    addXp(amount) { 
        this.data.xp += amount; 
        this.save(); 
        // TODO: trigger UI update event
    }
    
    heal(amount) {
        this.modifyHP(amount);
    }

    addResource(type, amount) {
        // Map LootConfig types to internal state keys
        switch(type) {
            case LootTypes.SCRAP: this.data.materials.metal += amount; break;
            case LootTypes.ELEC:  this.data.materials.electronics += amount; break;
            case LootTypes.CHIP:  this.data.materials.microchips += amount; break;
            case LootTypes.RAGE:  this.data.consumables.ragePills += amount; break;
            case LootTypes.BATTERY: this.data.ammo.battery += amount; break; // Battery is treated as ammo
        }
        this.save();
    }

    addAmmo(lootType, amount) {
        // Map LootTypes to internal ammo keys
        let key = null;
        switch(lootType) {
            case LootTypes.AMMO_9MM:   key = '9mm'; break;
            case LootTypes.AMMO_44:    key = '44mag'; break;
            case LootTypes.AMMO_SHELL: key = 'shells'; break;
            case LootTypes.AMMO_762:   key = '762mm'; break;
            case LootTypes.AMMO_127:   key = '127mm'; break;
            case LootTypes.AMMO_40MM:  key = '40mm'; break;
        }

        if (key) {
            if (!this.data.ammo[key]) this.data.ammo[key] = 0;
            this.data.ammo[key] += amount;
            this.save();
        }
    }

    // === EXISTING HELPERS ===

    modifyHP(amount) {
        this.data.hp += amount;
        if (this.data.hp > this.data.maxHp) this.data.hp = this.data.maxHp;
        if (this.data.hp < 0) this.data.hp = 0;
        this.save();
        return this.data.hp <= 0;
    }

    hasWeapon(slotIndex) {
        if (slotIndex === 1) return this.data.unlockedWeapons.includes('MELEE_KNIFE');
        if (slotIndex === 2) return this.data.unlockedWeapons.includes('PISTOL_9MM');
        return false; 
    }

    getWeaponState(weaponId) {
        if (!this.data.weaponData[weaponId]) {
            this.data.weaponData[weaponId] = { magCurrent: 0, magSizeMod: 0 };
        }
        return this.data.weaponData[weaponId];
    }

    getMaxMag(weaponId) {
        const state = this.getWeaponState(weaponId);
        const base = WeaponConfig[weaponId] ? WeaponConfig[weaponId].baseMagSize : 0;
        
        if (weaponId === 'PISTOL_9MM') {
            if (state.magSizeMod === 1) return 33; 
            if (state.magSizeMod === 2) return 100; 
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
        if (needed <= 0) return false; 

        const reserve = this.data.ammo[wConfig.ammoType];
        if (reserve <= 0) return false; 

        const amountToLoad = Math.min(needed, reserve);
        
        this.data.ammo[wConfig.ammoType] -= amountToLoad;
        wState.magCurrent += amountToLoad;
        
        this.save();
        return true;
    }

    recordShot() { this.data.runStats.shotsFired++; }
    recordHit() { this.data.runStats.shotsHit++; }
    
    recordKill() {
        this.data.runStats.kills++;
        this.addXp(10); 
    }

    getAccuracy() {
        if (this.data.runStats.shotsFired === 0) return "0%";
        const acc = (this.data.runStats.shotsHit / this.data.runStats.shotsFired) * 100;
        return acc.toFixed(1) + "%";
    }

    getRunTime() {
        const ms = Date.now() - this.data.runStats.startTime;
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
    }   
}

export const state = new GameState();