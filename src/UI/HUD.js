import { state } from '../Game/GameState.js';

export class HUD {
    constructor() {
        this.elHP = document.getElementById('val-hp');
        this.elArmor = document.getElementById('val-armor');
        this.elXP = document.getElementById('val-xp');
        this.elMetal = document.getElementById('val-metal');
        this.elElec = document.getElementById('val-elec');
        this.elChip = document.getElementById('val-chip');
        this.elPills = document.getElementById('val-pills');
        
        this.elAmmo = document.getElementById('val-ammo');
        this.elWpnName = document.getElementById('val-weapon-name');
        
        this.update();
    }

    update() {
        // 'd' is the raw data object inside the class
        const d = state.data;

        if(this.elHP) this.elHP.innerText = Math.ceil(d.hp);
        if(this.elArmor) this.elArmor.innerText = (d.armor * 100) + "%";

        if(this.elXP) this.elXP.innerText = d.xp;
        if(this.elMetal) this.elMetal.innerText = d.materials.metal;
        if(this.elElec) this.elElec.innerText = d.materials.electronics;
        if(this.elChip) this.elChip.innerText = d.materials.microchips;
        if(this.elPills) this.elPills.innerText = d.consumables.ragePills;

        // Weapon Info
        if(this.elWpnName) this.elWpnName.innerText = "9MM PISTOL";
        
        if(this.elAmmo) {
            // Get Pistol State
            const wState = state.getWeaponState('PISTOL_9MM');
            const reserve = d.ammo['9mm'];
            this.elAmmo.innerText = `${wState.magCurrent} / ${reserve}`;
        }

        // Slots styling
        for(let i=1; i<=6; i++) {
            const slotEl = document.getElementById(`slot-${i}`);
            if(slotEl) {
                // Active Highlight
                if(i === d.currentSlot) slotEl.classList.add('active'); // Changed currentWeaponSlot to currentSlot
                else slotEl.classList.remove('active');
                
                // Dim if not owned (Check the Class Method, not data)
                if(state.hasWeapon(i)) {
                    slotEl.style.opacity = 1;
                    slotEl.style.color = "#fff";
                } else {
                    slotEl.style.opacity = 0.3;
                    slotEl.style.color = "#500";
                }
            }
        }
    }
}