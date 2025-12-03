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

        if (this.elHP) this.elHP.innerText = Math.ceil(d.hp);
        if (this.elArmor) this.elArmor.innerText = (d.armor * 100) + "%";

        if (this.elXP) this.elXP.innerText = d.xp;
        if (this.elMetal) this.elMetal.innerText = d.materials.metal;
        if (this.elElec) this.elElec.innerText = d.materials.electronics;
        if (this.elChip) this.elChip.innerText = d.materials.microchips;
        if (this.elPills) this.elPills.innerText = d.consumables.ragePills;

        // Weapon Info
        let weaponId = null;
        if (d.currentSlot === 2) weaponId = 'PISTOL_9MM';
        if (d.currentSlot === 3) weaponId = 'JOLT_DIPLOMAT';

        if (weaponId) {
            const wConfig = state.getWeaponState(weaponId); // This returns the state object { magCurrent, ... }
            // Wait, I need the config for the name and ammo type.
            // I should import WeaponConfig in HUD.js or access it via state if possible, but state doesn't expose config directly.
            // I'll assume I need to import WeaponConfig.

            // Actually, let's just hardcode the mapping for now or import WeaponConfig.
            // Importing WeaponConfig is cleaner.

            // Since I can't easily add an import at the top with this tool without replacing the whole file or using multi_replace,
            // and I want to keep it simple, I'll use a local mapping or just check the ID.

            let name = "UNKNOWN";
            let ammoType = "9mm";

            if (weaponId === 'PISTOL_9MM') { name = "9MM PISTOL"; ammoType = "9mm"; }
            if (weaponId === 'JOLT_DIPLOMAT') { name = "JOLT DIPLOMAT"; ammoType = "44mag"; }

            if (this.elWpnName) this.elWpnName.innerText = name;

            if (this.elAmmo) {
                const wState = state.getWeaponState(weaponId);
                const reserve = d.ammo[ammoType];
                this.elAmmo.innerText = `${wState.magCurrent} / ${reserve}`;
            }
        } else {
            if (this.elWpnName) this.elWpnName.innerText = "UNARMED";
            if (this.elAmmo) this.elAmmo.innerText = "- / -";
        }

        // Slots styling
        for (let i = 1; i <= 6; i++) {
            const slotEl = document.getElementById(`slot-${i}`);
            if (slotEl) {
                // Active Highlight
                if (i === d.currentSlot) slotEl.classList.add('active'); // Changed currentWeaponSlot to currentSlot
                else slotEl.classList.remove('active');

                // Dim if not owned (Check the Class Method, not data)
                if (state.hasWeapon(i)) {
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