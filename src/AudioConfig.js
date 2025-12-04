export const AudioConfig = {
    // --- ENGINE SETTINGS ---
    DEFAULT_VOL: 0.3,
    FFT_SIZE: 1024,
    SMOOTHING: 0.6, 
    MIN_DB: -80, 
    MAX_DB: -20,
    MAX_DIST: 50, 

    // --- SOUND EFFECTS ---
    SFX: {
        // WEAPONS: Organized by Weapon ID
        WEAPONS: {
            'PISTOL_9MM': {
                SHOOT: './assets/sounds/pistol.mp3',
                RELOAD: './assets/sounds/pistol-reload.mp3',
                EMPTY: './assets/sounds/pistol-empty-click.mp3'
            },
            'JOLT_DIPLOMAT': {
                SHOOT: './assets/sounds/pistol_44.mp3', 
                RELOAD: './assets/sounds/pistol_44_reload.mp3',
                EMPTY: './assets/sounds/pistol-empty-click.mp3' 
            }
        },
        
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

        // Loot (Updated with your list)
        LOOT: {
            HEALTH: './assets/sounds/pickup_health.mp3',
            AMMO_9MM: './assets/sounds/pickup_ammo9mm.mp3',
            AMMO_44: './assets/sounds/pickup_ammo44.mp3',
            AMMO_762: './assets/sounds/pickup_ammo762.mp3',
            AMMO_127MM: './assets/sounds/pickup_ammo127mm.mp3',
            AMMO_SHELL: './assets/sounds/pickup_shotgunshell.mp3',
            METAL: './assets/sounds/pickup_metal.mp3',
            ELEC: './assets/sounds/pickup_elec.mp3',
            CHIP: './assets/sounds/pickup_chip.mp3',
            PILLS: './assets/sounds/pickup_pills.mp3',
            XP: './assets/sounds/pickup_XP.mp3'
        }
    }
};