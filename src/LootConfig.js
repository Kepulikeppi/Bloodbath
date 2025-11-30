// src/LootConfig.js

export const LootTypes = {
    // === CONSUMABLES ===
    HEALTH: 'HEALTH',
    XP: 'XP', // Rare map spawn
    RAGE: 'RAGE',
    BATTERY: 'BATTERY',

    // === MATERIALS (Mech Drops) ===
    SCRAP: 'SCRAP',
    ELEC: 'ELEC',
    CHIP: 'CHIP',

    // === AMMO (Bio Drops) ===
    AMMO_9MM: 'AMMO_9MM',
    AMMO_44: 'AMMO_44',
    AMMO_SHELL: 'AMMO_SHELL',
    AMMO_762: 'AMMO_762',
    AMMO_127: 'AMMO_127',
    AMMO_40MM: 'AMMO_40MM'
};

export const LootConfig = {
    // Green Box with Glow
    [LootTypes.HEALTH]: { color: 0x00ff00, scale: 0.5, value: 25, shape: 'BOX', glow: true },
    
    // Cyan Octahedron
    [LootTypes.XP]:     { color: 0x00ffff, scale: 0.4, value: 250, shape: 'OCTAHEDRON', glow: true },
    
    // Pink Sphere
    [LootTypes.RAGE]:   { color: 0xff00aa, scale: 0.3, value: 1, shape: 'SPHERE', glow: true },
    
    // Yellow Cylinder
    [LootTypes.BATTERY]:{ color: 0xffff00, scale: 0.4, value: 1, shape: 'CYLINDER', glow: false },

    // Grey Tetrahedron
    [LootTypes.SCRAP]:  { color: 0xaaaaaa, scale: 0.3, value: 5, shape: 'TETRAHEDRON', glow: false },
    
    // Blue small box
    [LootTypes.ELEC]:   { color: 0x0088ff, scale: 0.3, value: 1, shape: 'BOX', glow: true },
    
    // Orange small chip
    [LootTypes.CHIP]:   { color: 0xffaa00, scale: 0.2, value: 1, shape: 'BOX', glow: true },

    // Ammo Types (Yellow-ish for standard, Red for shotgun)
    [LootTypes.AMMO_9MM]: { color: 0xffffaa, scale: 0.3, value: 12, shape: 'BOX', glow: false },
    [LootTypes.AMMO_SHELL]: { color: 0xff0000, scale: 0.35, value: 6, shape: 'CYLINDER', glow: false },
    [LootTypes.AMMO_44]: { color: 0xcccccc, scale: 0.3, value: 6, shape: 'BOX', glow: false },
};