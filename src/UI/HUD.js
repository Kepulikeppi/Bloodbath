import { state } from '../Game/GameState.js';
import { WeaponConfig } from '../WeaponConfig.js';
import { UIConfig } from '../UIConfig.js';

export class HUD {
    constructor() {
        // Cache elements
        this.xpVal = document.getElementById('val-xp');
        
        this.scrapVal = document.getElementById('val-metal');
        this.elecVal = document.getElementById('val-elec');
        this.chipVal = document.getElementById('val-chip');
        this.pillsVal = document.getElementById('val-pills');

        this.hpVal = document.getElementById('val-hp');
        this.armorVal = document.getElementById('val-armor');

        this.weaponName = document.getElementById('val-weapon-name');
        this.ammoVal = document.getElementById('val-ammo');
        
        this.slots = [];
        for(let i=1; i<=6; i++) {
            this.slots[i] = document.getElementById(`slot-${i}`);
        }
    }

    update() {
        // 1. Resources
        this.xpVal.innerText = state.data.xp;
        this.scrapVal.innerText = state.data.materials.metal;
        this.elecVal.innerText = state.data.materials.electronics;
        this.chipVal.innerText = state.data.materials.microchips;
        this.pillsVal.innerText = state.data.consumables.ragePills;

        // 2. Vitals
        this.hpVal.innerText = Math.ceil(state.data.hp);
        this.armorVal.innerText = Math.ceil(state.data.armor) + "%";
        
        // Color HP warning
        if (state.data.hp < 30) this.hpVal.style.color = '#ff0000';
        else this.hpVal.style.color = '#ffffff';

        // 3. Weapon Info
        const wId = state.data.activeWeaponId;
        const wConf = WeaponConfig[wId];
        
        if (wConf) {
            this.weaponName.innerText = wConf.name;
            
            if (wConf.type === 'MELEE') {
                this.ammoVal.innerText = "--";
            } else {
                const wState = state.getWeaponState(wId);
                const reserve = state.data.ammo[wConf.ammoType];
                this.ammoVal.innerText = `${wState.magCurrent} / ${reserve}`;
            }
        }

        // 4. Weapon Slots (1-6)
        for(let i=1; i<=6; i++) {
            const el = this.slots[i];
            if (!el) continue;

            const status = state.getSlotStatus(i); // 'active', 'owned', 'locked'
            
            // Reset classes
            el.className = 'slot';
            
            if (status === 'active') {
                el.classList.add('active'); // Bright Red
            } else if (status === 'owned') {
                el.classList.add('owned'); // Dark Red
            } else {
                el.classList.add('locked'); // Grey/Dim
            }
        }
    }
}