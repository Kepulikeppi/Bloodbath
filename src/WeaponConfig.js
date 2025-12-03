export const WeaponConfig = {
    // Global settings
    SWAY_AMOUNT: 0.02,
    SWAY_SPEED: 2.0,
    BOB_AMOUNT: 0.05,
    BOB_SPEED: 10.0,

    // Specific Weapon Definitions
    PISTOL_9MM: {
        id: 'PISTOL_9MM', // Unique ID for save data
        name: "9mm Pistol",
        type: "RANGED",
        ammoType: "9mm",  // Links to GameState ammo reserve
        baseMagSize: 17,  // Default capacity
        reloadTime: 2.0,  // Seconds
        damage: 15,
        fireRate: 0.15,

        recoilKick: 0.02,
        recoilRise: 0.0,
        recoilSnap: 8.0,
        cameraRecoil: 0.02,

        bodyColor: 0x111111,
        slideColor: 0x1a1a1a,
        flashColor: 0xffaa00,
        position: { x: 0.35, y: -0.3, z: -0.2 }
    },

    JOLT_DIPLOMAT: {
        id: 'JOLT_DIPLOMAT',
        name: "Jolt Diplomat .44",
        type: "RANGED",
        ammoType: "44mag",
        baseMagSize: 6,
        reloadTime: 6.5, // Approx total time
        damage: 45, // 3x 9mm
        fireRate: 0.6, // Slower fire rate

        recoilKick: 0.4, // Much higher kick
        recoilRise: 0.5, // Much higher rise
        recoilSnap: 4.0, // Slower recovery

        bodyColor: 0x222222, // Shiny Gun Metal Black handled in class, but good for ref
        flashColor: 0xffdd44,
        position: { x: 0.35, y: -0.3, z: -0.2 }
    }


};