import { EnemyTypes } from './game/LootManager.js';

export const EnemyConfig = {
    WATCHER: {
        name: "Watcher",
        // Loot System: Flesh & Blood drops
        enemyType: EnemyTypes.BIO, 

        hp: 50,
        speed: 3.5,
        
        // AI Behavior
        aggroRange: 20,
        stopDist: 1.2, 
        radius: 0.4,
        
        // Combat Stats
        damage: 10,
        attackRange: 1.5,
        attackSpeed: 1.0,
        
        // Visuals (Base colors, used if model loading fails or for flash)
        color: 0x880000, 
        emissive: 0x000000,
        scale: 0.5
    },
};