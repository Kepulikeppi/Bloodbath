import { WeaponBlok17 } from './WeaponBlok17.js'; 
import { WeaponJoltDiplomat } from './WeaponJoltDiplomat.js';
import { MeleeWeapon } from './MeleeWeapon.js'; 
import { WeaponConfig } from '../../WeaponConfig.js';

export class WeaponFactory {
    static create(weaponId, camera, audioManager) {
        const config = WeaponConfig[weaponId];
        if (!config) {
            console.error(`Weapon Config not found for ID: ${weaponId}`);
            return null;
        }

        switch (weaponId) {
            case 'PISTOL_9MM':
                return new WeaponBlok17(camera, config, audioManager);
            
            case 'JOLT_DIPLOMAT':
                // FIXED: Use the correct class for the .44
                return new WeaponJoltDiplomat(camera, config, audioManager);
            
            case 'MELEE_KNIFE':
                return new MeleeWeapon(camera, config, audioManager);

            default:
                console.warn(`No specific class for ${weaponId}, using generic.`);
                if (config.type === 'MELEE') {
                    return new MeleeWeapon(camera, config, audioManager);
                } else {
                    // Fallback to 9mm logic if a new gun class isn't made yet
                    return new WeaponBlok17(camera, config, audioManager);
                }
        }
    }
}