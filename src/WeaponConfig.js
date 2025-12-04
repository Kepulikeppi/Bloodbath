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
        name: "Blok-17",
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
        recoilKick: 0.05, 
        recoilRise: 0.05,
        recoilSnap: 10.0,  
        cameraRecoil: 0.02, 

        // Visuals
        bodyColor: 0x111111,
        slideColor: 0x1a1a1a,
        flashColor: 0xffaa00,
        position: { x: 0.35, y: -0.3, z: -0.4 }
    },

    JOLT_DIPLOMAT: {
        id: 'JOLT_DIPLOMAT',
        name: "Jolt Diplomat .44",
        type: "RANGED",
        slot: 2,
        ammoType: "44mag",
        baseMagSize: 6,
        reloadTime: 6.5, // FIXED: 6.5 seconds
        
        damage: 45,
        fireRate: 0.6,
        isAuto: false,
        shotCount: 1,
        spread: 0.002, // Accurate

        // Heavy Recoil
        recoilKick: 0.3, // Big model kick back
        recoilRise: 0.4, // Big model kick up
        recoilSnap: 3.0, // Slow recovery
        cameraRecoil: 0.15, // Huge instant camera jump

        bodyColor: 0x444444, // Chrome/Steel look
        gripColor: 0x3e2723, // Wood grip
        flashColor: 0xffdd44,
        position: { x: 0.4, y: -0.35, z: -0.3 }
    }
};