export const Config = {
    // --- WORLD GENERATION ---
    MAP_WIDTH: 200,
    MAP_HEIGHT: 200,
    
    // Dungeon Generation (Diablo-style)
    TARGET_ROOMS: 12,        // Main path length
    BRANCH_CHANCE: 40,       // % chance for side branches
    MAX_BRANCH_DEPTH: 3,     // How deep branches can go
    ROOM_MIN_SIZE: 10,
    ROOM_MAX_SIZE: 30,
    DIRECTION_WIGGLE: 80,    // Path randomness (0=straight, 90=chaotic)
    CORRIDOR_WIDTH: 4,

    // Wall Geometry
    WALL_HEIGHT: 4,

    // --- PLAYER PHYSICS ---
    PLAYER_SPEED: 8.0,
    PLAYER_FRICTION: 10.0,
    PLAYER_RADIUS: 0.3, 
    EYE_HEIGHT: 1.7,

    // --- GRAPHICS & ATMOSPHERE ---
    COLOR_BG: 0x050000,
    COLOR_FOG: 0x110000,
    // Grey light preserves the texture details in the dark.
    COLOR_AMBIENT: 0x333333, 
    
    COLOR_FLASHLIGHT: 0xffffff,

    FOG_DENSITY: 0.015,
    
    // FIX 2: Increased from 0.8 to 2.5. 
    // This acts as your "30% visibility" floor. The dark isn't black anymore.
    AMBIENT_INTENSITY: 1.0, 
    
    // Flashlight
    FL_INTENSITY: 160,
    FL_DISTANCE: 70,
    FL_ANGLE: Math.PI / 6,
    FL_PENUMBRA: 0.5,
    
    // Shadow Quality Settings
    FL_SHADOW_MAP_SIZE: 2048,   // Higher res shadows (crisper)
    FL_SHADOW_BIAS: -0.0001,    // Offsets calculation to prevent acne
    FL_SHADOW_NORMAL_BIAS: 0.02, // Helps on angled surfaces

    // --- MENU ATMOSPHERE ---
    MENU_PARTICLE_COUNT: 300,
    MENU_PARTICLE_SPEED: 0.5,
    MENU_CAMERA_SWAY: 0.5,
    
    // --- AUDIO ENGINE SETTINGS ---
    AUDIO_DEFAULT_VOL: 0.3,
    AUDIO_FFT_SIZE: 1024,
    AUDIO_SMOOTHING: 0.6, 
    AUDIO_MIN_DB: -80, 
    AUDIO_MAX_DB: -20,

    // 50 units is about 2 large rooms away.
    AUDIO_MAX_DIST: 50,

    // --- VISUALIZER UI SETTINGS ---
    VIZ_BAR_COUNT: 32,         
    VIZ_BIN_START: 2,          
    VIZ_BIN_STEP: 7,           
    
    // --- AUDIO PLAYER PLAYLIST ---
    PLAYLIST: [
        './assets/Bloodbath - Main Theme.mp3', 
        './assets/Tale of a Folk Hero.mp3', 
        './assets/Bloodthirsty Clown.mp3',
        './assets/Welcome to Hell.mp3'
    ],
	
	 // --- SOUND EFFECTS ---
    // 1. Pistol
    SFX_PISTOL: './assets/sounds/pistol.mp3',
    SFX_RELOAD: './assets/sounds/pistol-reload.mp3',
    SFX_EMPTY: './assets/sounds/pistol-empty-click.mp3',
    
    // 2. Ambience 
    SFX_AMBIENCE: './assets/sounds/ambience2.mp3', 
    
    // 3. Enemy Interactions
    SFX_HIT: './assets/sounds/body_impact.mp3',
    SFX_DEATH: './assets/sounds/monster_death.mp3',
    

    // 5. Footsteps 
    // (We use the same file 3 times so the randomizer works without crashing)
    SFX_STEPS: [
        './assets/sounds/footstep.mp3',
        './assets/sounds/footstep.mp3',
        './assets/sounds/footstep.mp3'
    ],
    STEP_FREQUENCY: 0.5,

    SFX_PLAYER_DEATH: './assets/sounds/player-death.mp3',
    MUSIC_DEATH: './assets/music/death_theme.mp3',
	// --- TEXTURE ASSETS (NEW) ---
    // Path must end with a slash /
    TEXTURE_PATH: './assets/textures/',
    
    // Asset Base Names (The code adds _Color.jpg, _NormalGL.jpg, etc.)
    TEX_WALL: 'Bricks069_2K-JPG',
    TEX_FLOOR: 'PavingStones116_2K-JPG',
    TEX_CEILING: 'Asphalt013_1K-JPG',
	
	 // --- GORE SETTINGS (NEW) ---
    GORE: {
        COLOR_BLOOD: 0x740707, // Dark dried blood
        COLOR_FLESH: 0x740707, // Matches blood
        COLOR_BONE: 0xdddddd,  // Dirty white
        MAX_DECALS: 60,        // Limit blood stains
        GIBS_COUNT: 6,         // How many chunks per kill
        BLOOD_SPRAY_COUNT: 8   // How many drops per hit
    }
};
