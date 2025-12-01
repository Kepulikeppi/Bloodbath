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
    COLOR_AMBIENT: 0x333333, // Grey light preserves texture details
    
    COLOR_FLASHLIGHT: 0xffffff,

    FOG_DENSITY: 0.015,
    AMBIENT_INTENSITY: 1.0, 
    
    // Flashlight
    FL_INTENSITY: 160,
    FL_DISTANCE: 70,
    FL_ANGLE: Math.PI / 6,
    FL_PENUMBRA: 0.5,
    
    // Shadow Quality Settings
    FL_SHADOW_MAP_SIZE: 2048,   
    FL_SHADOW_BIAS: -0.0001,    
    FL_SHADOW_NORMAL_BIAS: 0.02, 

    // --- MENU ATMOSPHERE ---
    MENU_PARTICLE_COUNT: 300,
    MENU_PARTICLE_SPEED: 0.5,
    MENU_CAMERA_SWAY: 0.5,
    
    // --- TEXTURE ASSETS ---
    TEXTURE_PATH: 'https://pub-001995af37744801acc11c0d74cd4450.r2.dev/textures/',
    TEX_WALL: 'Bricks069_2K-JPG',
    TEX_FLOOR: 'PavingStones116_2K-JPG',
    TEX_CEILING: 'Asphalt013_1K-JPG',
	
	 // --- GORE SETTINGS ---
    GORE: {
        COLOR_BLOOD: 0x740707, 
        COLOR_FLESH: 0x740707, 
        COLOR_BONE: 0xdddddd,  
        MAX_DECALS: 60,        
        GIBS_COUNT: 6,         
        BLOOD_SPRAY_COUNT: 8   
    }
};