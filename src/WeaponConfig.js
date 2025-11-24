export const WeaponConfig = {
    // Global settings
    SWAY_AMOUNT: 0.02,
    SWAY_SPEED: 2.0,
    BOB_AMOUNT: 0.05,
    BOB_SPEED: 10.0,

    // Specific Weapon Definitions
    PISTOL_9MM: {
        name: "9mm Pistol",
        type: "RANGED",
        damage: 15,
        fireRate: 0.15, // Seconds between shots
        
        // Recoil Physics
        recoilKick: 0.1,  // Backward z-movement
        recoilRise: 0.2,  // Upward rotation
        recoilSnap: 8.0,  // How fast it snaps back
        
        // Visuals (Procedural Generation colors)
        bodyColor: 0x222222,
        slideColor: 0x333333,
        flashColor: 0xffaa00,
		
		position: { x: 0.35, y: -0.3, z: -0.2 }
    }
    

};