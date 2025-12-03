export const TechTreeConfig = {
    // === TIER 1 ===
    'HP_BOOST_1': {
        name: "STIM INJECTOR",
        description: "Permanently increases Max HP by 25.",
        cost: 300,
        currency: 'xp',
        req: [],
        effect: (state) => { 
            state.data.maxHp += 25; 
            state.data.hp += 25; 
        }
    },
    'SPEED_1': {
        name: "HYDRAULIC JOINTS",
        description: "Increases movement speed by 10%.",
        cost: 400,
        currency: 'xp',
        req: [],
        effect: (state) => { 
            state.data.attributes.speedMult += 0.1; 
        }
    },
    'AMMO_CAP_1': {
        name: "LOAD BEARING VEST",
        description: "Increases max ammo capacity by 50%.",
        cost: 350,
        currency: 'xp',
        req: [],
        effect: (state) => {
            // We just flag it here, GameState logic must handle the math
            state.data.upgrades['AMMO_CAP_1'] = true;
        }
    },

    // === TIER 2 ===
    'HP_BOOST_2': {
        name: "ADRENALINE SHUNT",
        description: "Permanently increases Max HP by another 50.",
        cost: 800,
        currency: 'xp',
        req: ['HP_BOOST_1'],
        effect: (state) => { 
            state.data.maxHp += 50; 
            state.data.hp += 50; 
        }
    },
    'RELOAD_SPEED': {
        name: "MAG-LOCK GLOVES",
        description: "Reload weapons 20% faster.",
        cost: 700,
        currency: 'xp',
        req: [],
        effect: (state) => {
            state.data.attributes.reloadSpeedMult = 1.2;
        }
    }
};