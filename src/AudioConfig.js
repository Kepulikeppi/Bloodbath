export const AudioConfig = {
    // --- ENGINE SETTINGS ---
    DEFAULT_VOL: 0.3,
    FFT_SIZE: 1024,
    SMOOTHING: 0.6, 
    MIN_DB: -80, 
    MAX_DB: -20,
    MAX_DIST: 50, // 3D rolloff distance

    // --- SOUND EFFECTS ---
    SFX: {
        // Weapons
        PISTOL: './assets/sounds/pistol.mp3',
        RELOAD: './assets/sounds/pistol-reload.mp3',
        EMPTY: './assets/sounds/pistol-empty-click.mp3',
        
        // Environment
        AMBIENCE: './assets/sounds/ambience2.mp3', 
        
        // Entities
        HIT: './assets/sounds/body_impact.mp3',
        MONSTER_DEATH: './assets/sounds/monster_death.mp3',
        PLAYER_DEATH: './assets/sounds/player-death.mp3',
        
        // Movement
        STEPS: [
            './assets/sounds/footstep.mp3',
            './assets/sounds/footstep.mp3',
            './assets/sounds/footstep.mp3'
        ],
        STEP_FREQUENCY: 0.5,

        // Loot (Placeholders for your new files)
        LOOT: {
            HEALTH: './assets/sfx/pickup_health.mp3',
            AMMO_9MM: './assets/sfx/pickup_ammo9mm.mp3',
            AMMO_44: './assets/sfx/pickup_ammo44.mp3',
            AMMO_762: './assets/sfx/pickup_ammo762.mp3',
            AMMO_127MM: './assets/sfx/pickup_ammo127mm.mp3',
            METAL: './assets/sfx/pickup_metal.mp3',
            ELEC: './assets/sfx/pickup_elec.mp3',
            CHIP: './assets/sfx/pickup_chip.mp3',
            PILLS: './assets/sfx/pill_rattle.mp3',
            XP: './assets/sfx/xp_gain.mp3'
        }
    }
};