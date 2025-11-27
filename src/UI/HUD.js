import { state } from '../Game/GameState.js';

export class HUD {
    constructor() {
        // Cache DOM elements
        this.elHP = document.getElementById('val-hp');
        this.elArmor = document.getElementById('val-armor');
        this.elXP = document.getElementById('val-xp');
        this.elMetal = document.getElementById('val-metal');
        this.elElec = document.getElementById('val-elec');
        this.elChip = document.getElementById('val-chip');
        this.elPills = document.getElementById('val-pills');
        
        this.elAmmo = document.getElementById('val-ammo');
        this.elWpnName = document.getElementById('val-weapon-name');
        
        // Update immediately
        this.update();
    }

    update() {
        const d = state.data;

        // Vitals
        if(this.elHP) this.elHP.innerText = Math.ceil(d.hp);
        if(this.elArmor) this.elArmor.innerText = (d.armor * 100) + "%";

        // Resources
        if(this.elXP) this.elXP.innerText = d.xp;
        if(this.elMetal) this.elMetal.innerText = d.materials.metal;
        if(this.elElec) this.elElec.innerText = d.materials.electronics;
        if(this.elChip) this.elChip.innerText = d.materials.microchips;
        if(this.elPills) this.elPills.innerText = d.consumables.ragePills;

        // Weapon Info
        // (In the future, we check d.currentWeaponSlot to get the actual name/ammo type)
        if(this.elWpnName) this.elWpnName.innerText = "9MM PISTOL";
        if(this.elAmmo) this.elAmmo.innerText = d.ammo['9mm'];

        // Slots styling
        for(let i=1; i<=6; i++) {
            const slotEl = document.getElementById(`slot-${i}`);
            if(slotEl) {
                // Highlight active
                if(i === d.currentWeaponSlot) slotEl.classList.add('active');
                else slotEl.classList.remove('active');
                
                // Dim if not owned (Visual polish for later)
                if(state.hasWeapon(i)) slotEl.style.opacity = 1;
                else slotEl.style.opacity = 0.3;
            }
        }
    }
}