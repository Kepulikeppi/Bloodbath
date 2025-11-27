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
        
        recoilKick: 0.1,  
        recoilRise: 0.1, 
        recoilSnap: 8.0, 
        
        bodyColor: 0x111111,
        slideColor: 0x1a1a1a,
        flashColor: 0xffaa00,
        position: { x: 0.35, y: -0.3, z: -0.2 }
    }
    

};