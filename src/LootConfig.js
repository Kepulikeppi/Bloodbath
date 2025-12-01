export const LootTypes = {
    // === CONSUMABLES ===
    HEALTH: 'HEALTH',
    XP: 'XP',
    RAGE: 'RAGE',
    BATTERY: 'BATTERY',

    // === MATERIALS ===
    SCRAP: 'SCRAP',
    ELEC: 'ELEC',
    CHIP: 'CHIP',

    // === AMMO ===
    AMMO_9MM: 'AMMO_9MM',
    AMMO_44: 'AMMO_44',
    AMMO_SHELL: 'AMMO_SHELL',
    AMMO_762: 'AMMO_762',
    AMMO_127: 'AMMO_127',
    AMMO_40MM: 'AMMO_40MM'
};

export const LootConfig = {
    // === CONSUMABLES ===
    [LootTypes.HEALTH]: { 
        name: "MEDKIT", 
        color: 0x00ff00, scale: 0.5, value: 25, shape: 'BOX', glow: true, 
        sound: 'pickup_health' 
    },
    [LootTypes.XP]: { 
        name: "XP DATA", 
        color: 0x00ffff, scale: 0.4, value: 250, shape: 'OCTAHEDRON', glow: true,
        sound: 'pickup_XP'
    },
    [LootTypes.RAGE]: { 
        name: "RAGE PILL", 
        color: 0xff00aa, scale: 0.3, value: 1, shape: 'SPHERE', glow: true,
        sound: 'pickup_pills'
    },
    [LootTypes.BATTERY]: { 
        name: "HEAVY BATTERY", 
        color: 0xffff00, scale: 0.4, value: 1, shape: 'CYLINDER', glow: false,
        sound: 'pickup_metal'
    },

    // === MATERIALS ===
    [LootTypes.SCRAP]: { 
        name: "METAL SCRAP", 
        color: 0xaaaaaa, scale: 0.3, value: 5, shape: 'TETRAHEDRON', glow: false,
        sound: 'pickup_metal'
    },
    [LootTypes.ELEC]: { 
        name: "ELECTRONICS", 
        color: 0x0088ff, scale: 0.3, value: 1, shape: 'BOX', glow: true,
        sound: 'pickup_elec'
    },
    [LootTypes.CHIP]: { 
        name: "MICROCHIP", 
        color: 0xffaa00, scale: 0.2, value: 1, shape: 'BOX', glow: true,
        sound: 'pickup_chip'
    },

    // === AMMO ===
    [LootTypes.AMMO_9MM]: { 
        name: "9MM AMMO", 
        color: 0xffffaa, scale: 0.3, value: 12, shape: 'BOX', glow: false,
        sound: 'pickup_ammo9mm' // Updated Key
    },
    [LootTypes.AMMO_SHELL]: { 
        name: "SHOTGUN SHELLS", 
        color: 0xff0000, scale: 0.35, value: 6, shape: 'CYLINDER', glow: false,
        sound: 'pickup_shotgunshell' // Mapped to heavy shell sound for now
    },
    [LootTypes.AMMO_44]: { 
        name: ".44 MAGNUM AMMO", 
        color: 0xcccccc, scale: 0.3, value: 6, shape: 'BOX', glow: false,
        sound: 'pickup_ammo44' // Updated Key
    },
};