export const WeaponConfig = {
    // Global settings
    SWAY_AMOUNT: 0.02,
    SWAY_SPEED: 2.0,
    BOB_AMOUNT: 0.05,
    BOB_SPEED: 10.0,

    // --- MELEE ---
    MELEE_KNIFE: {
        id: 'MELEE_KNIFE',
        name: "Combat Knife",
        caliber: "Steel", // Placeholder
        type: "MELEE",
        slot: 1,
        
        damage: 25,
        attackSpeed: 0.4, 
        range: 2.5,       
        
        bodyColor: 0x333333,
        accentColor: 0x888888, 
        position: { x: 0.4, y: -0.4, z: -0.3 }
    },

    // --- PISTOLS ---
    PISTOL_9MM: {
        id: 'PISTOL_9MM',
        name: "Block 17",
        caliber: "9 mm",
        type: "RANGED",
        slot: 2,
        ammoType: "9mm",
        baseMagSize: 17,
        reloadTime: 2.0,
        
        damage: 15,
        fireRate: 0.15,
        isAuto: false,
        shotCount: 1,
        spread: 0.01,

        // Physics
        recoilKick: 0.02, 
        recoilRise: 0.0,  
        recoilSnap: 8.0,  
        cameraRecoil: 0.015, 

        // Visuals
        bodyColor: 0x111111,
        slideColor: 0x1a1a1a,
        flashColor: 0xffaa00,
        position: { x: 0.35, y: -0.3, z: -0.4 }
    },

    JOLT_DIPLOMAT: {
        id: 'JOLT_DIPLOMAT',
        name: "Jolt Diplomat",
        caliber: ".44 Magnum",
        type: "RANGED",
        slot: 2,
        ammoType: "44mag",
        baseMagSize: 6,
        reloadTime: 6.5,
        
        damage: 45,
        fireRate: 0.6,
        isAuto: false,
        shotCount: 1,
        spread: 0.002, 

        // Heavy Recoil
        recoilKick: 0.3, 
        recoilRise: 0.4, 
        recoilSnap: 3.0, 
        cameraRecoil: 0.15, 

        bodyColor: 0x444444, 
        gripColor: 0x3e2723, 
        flashColor: 0xffdd44,
        position: { x: 0.4, y: -0.35, z: -0.3 }
    }
};