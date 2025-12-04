import { Config } from '../Config.js';
import { WeaponConfig } from '../WeaponConfig.js';
import { LootTypes } from '../LootConfig.js'; 
import { TechTreeConfig } from '../TechTreeConfig.js';

export class GameState {
    constructor() {
        this.data = this.getDefaults();
        this.load();
    }

    getDefaults() {
        return {
            hp: 100,
            maxHp: 100,
            armor: 0.0,
            xp: 0,
            ammo: {
                '9mm': 50,
                '44mag': 24,
                'shells': 0,
                '762mm': 0,
                '127mm': 0,
                '40mm': 0,
                'battery': 0
            },
            materials: { metal: 0, electronics: 0, microchips: 0 },
            consumables: { ragePills: 0 },
            unlockedWeapons: ['PISTOL_9MM', 'JOLT_DIPLOMAT'], 
            unlockedTech: [],
            upgrades: {},
            activeWeaponId: 'PISTOL_9MM',
            weaponData: {
                'PISTOL_9MM': { magCurrent: 17, magSizeMod: 0, isAuto: false },
                'JOLT_DIPLOMAT': { magCurrent: 6, magSizeMod: 0, isAuto: false }
            },
            attributes: { speedMult: 1.0, sprintMult: 1.0, staminaMax: 100, reloadSpeedMult: 1.0 },
            runStats: { kills: 0, shotsFired: 0, shotsHit: 0, startTime: Date.now() }
        };
    }
    
    save() { 
        sessionStorage.setItem('bloodbath_gamestate', JSON.stringify(this.data)); 
    }
    
    load() {
        const saved = sessionStorage.getItem('bloodbath_gamestate');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.data = { ...this.getDefaults(), ...parsed };
        }
    }

    setData(serverData) {
        if (!serverData) return;
        this.data = { ...this.data, ...serverData };
        this.save(); 
    }

    reset() { 
        sessionStorage.removeItem('bloodbath_gamestate'); 
        this.data = this.getDefaults();
    }
    
    addXp(amount) { 
        this.data.xp += amount; 
        this.save(); 
    }
    
    heal(amount) { 
        this.modifyHP(amount); 
    }

    addResource(type, amount) {
        // Ensure amount is a number
        amount = Number(amount) || 1;
        
        switch(type) {
            case LootTypes.SCRAP: this.data.materials.metal += amount; break;
            case LootTypes.ELEC:  this.data.materials.electronics += amount; break;
            case LootTypes.CHIP:  this.data.materials.microchips += amount; break;
            case LootTypes.RAGE:  this.data.consumables.ragePills += amount; break;
            case LootTypes.BATTERY: this.data.ammo.battery += amount; break; 
            default: console.warn("Unknown Resource Type:", type); return;
        }
        this.save();
    }

    addAmmo(lootType, amount) {
        amount = Number(amount) || 1;
        let key = null;

        // Debug Log
        console.log(`[GameState] Adding Ammo: Type=${lootType}, Amount=${amount}`);

        switch(lootType) {
            case LootTypes.AMMO_9MM:   key = '9mm'; break;
            case LootTypes.AMMO_44:    key = '44mag'; break;
            case LootTypes.AMMO_SHELL: key = 'shells'; break;
            case LootTypes.AMMO_762:   key = '762mm'; break;
            case LootTypes.AMMO_127:   key = '127mm'; break;
            case LootTypes.AMMO_40MM:  key = '40mm'; break;
        }

        if (key) {
            if (this.data.ammo[key] === undefined) this.data.ammo[key] = 0;
            
            let cap = 999;
            // Check for potential Ammo Cap upgrade in data
            if (this.data.upgrades && this.data.upgrades['AMMO_CAP_1']) cap = 1500;

            const oldVal = this.data.ammo[key];
            this.data.ammo[key] = Math.min(oldVal + amount, cap);
            
            console.log(`[GameState] ${key} went from ${oldVal} to ${this.data.ammo[key]}`);
            this.save();
        } else {
            console.warn(`[GameState] Failed to map LootType '${lootType}' to ammo key.`);
        }
    }

    modifyHP(amount) {
        this.data.hp += amount;
        if (this.data.hp > this.data.maxHp) this.data.hp = this.data.maxHp;
        if (this.data.hp < 0) this.data.hp = 0;
        this.save();
        return this.data.hp <= 0;
    }

    // ... [Rest of file remains unchanged: Tech Tree, Weapons, Telemetry] ...
    // (I'm keeping the rest as it was in the working version to avoid regressions)

    canAffordTech(techId) {
        const tech = TechTreeConfig[techId];
        if (!tech) return false;
        if (this.data.unlockedTech.includes(techId)) return false;
        if (tech.currency === 'xp' && this.data.xp < tech.cost) return false;
        if (tech.req) {
            for (const reqId of tech.req) {
                if (!this.data.unlockedTech.includes(reqId)) return false;
            }
        }
        return true;
    }

    purchaseTech(techId) {
        if (!this.canAffordTech(techId)) return false;
        const tech = TechTreeConfig[techId];
        if (tech.currency === 'xp') this.data.xp -= tech.cost;
        this.data.unlockedTech.push(techId);
        if (tech.effect) tech.effect(this);
        this.save();
        return true;
    }

    hasWeapon(slotIndex) {
        return Object.values(WeaponConfig).some(conf => 
            conf.slot === slotIndex && this.data.unlockedWeapons.includes(conf.id)
        );
    }

    trySwitchWeaponSlot(slotNum) {
        const candidates = Object.values(WeaponConfig)
            .filter(conf => conf.slot === slotNum)
            .filter(conf => this.data.unlockedWeapons.includes(conf.id))
            .map(conf => conf.id);

        if (candidates.length === 0) return null; 

        const currentId = this.data.activeWeaponId;
        const currentConfig = WeaponConfig[currentId];

        if (currentConfig && currentConfig.slot === slotNum) {
            const currentIndex = candidates.indexOf(currentId);
            const nextIndex = (currentIndex + 1) % candidates.length;
            const nextId = candidates[nextIndex];
            
            if (nextId !== currentId) {
                this.data.activeWeaponId = nextId;
                this.save();
                return nextId;
            }
        } else {
            const nextId = candidates[0];
            this.data.activeWeaponId = nextId;
            this.save();
            return nextId;
        }
        return null; 
    }

    getSlotStatus(slotNum) {
        const currentId = this.data.activeWeaponId;
        const currentConfig = WeaponConfig[currentId];
        const isActive = currentConfig && currentConfig.slot === slotNum;
        const ownsAny = Object.values(WeaponConfig).some(conf => 
            conf.slot === slotNum && this.data.unlockedWeapons.includes(conf.id)
        );
        if (isActive) return 'active';
        if (ownsAny) return 'owned';
        return 'locked';
    }

    getWeaponState(weaponId) {
        if (!this.data.weaponData[weaponId]) {
            this.data.weaponData[weaponId] = { magCurrent: 0, magSizeMod: 0 };
        }
        return this.data.weaponData[weaponId];
    }

    getMaxMag(weaponId) {
        const base = WeaponConfig[weaponId] ? WeaponConfig[weaponId].baseMagSize : 0;
        if (weaponId === 'PISTOL_9MM') { 
            if (this.data.weaponData['PISTOL_9MM'].magSizeMod === 1) return 33; 
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
    recordKill() { this.data.runStats.kills++; this.addXp(10); }
    
    getAccuracy() {
        if (this.data.runStats.shotsFired === 0) return "0%";
        return ((this.data.runStats.shotsHit / this.data.runStats.shotsFired) * 100).toFixed(1) + "%";
    }
    
    getRunTime() {
        const ms = Date.now() - this.data.runStats.startTime;
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
    }   
}

export const state = new GameState();