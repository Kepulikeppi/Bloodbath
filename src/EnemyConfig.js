export const EnemyConfig = {
    FLOATING_DIAMOND: {
        name: "Watcher",
        hp: 50,
        speed: 3.5,
        
        // AI Behavior
        aggroRange: 20,
        stopDist: 1.2, // Stop slightly closer so they can hit you
        radius: 0.4,   // Collision size
        
        // Combat Stats
        damage: 10,        // Health lost per hit
        attackRange: 1.5,  // Distance required to hit
        attackSpeed: 1.0,  // Seconds between attacks
        
        // Visuals
        color: 0xff0000,
        emissive: 0x220000,
        scale: 0.5
    },
};