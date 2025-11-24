export const EnemyConfig = {
    // The default red diamond enemy
    FLOATING_DIAMOND: {
        name: "Watcher",
        hp: 50,
        speed: 3.5,
        aggroRange: 20,
        stopDist: 1.5,
        radius: 0.4, // Hitbox size
        
        // Visuals
        color: 0xff0000,
        emissive: 0x220000,
        scale: 0.5
    },

    // Future placeholder
    // ZOMBIE_SOLDIER: {
    //     name: "Grunt",
    //     hp: 100,
    //     speed: 2.0,
    //     aggroRange: 15,
    //     ...
    // }
};