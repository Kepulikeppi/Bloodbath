import { UIConfig } from '../UIConfig.js';

export class UIInitializer {
    static init() {
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };

        // --- LOADING ---
        setText('loading-text', UIConfig.LOADING.TEXT_INIT);

        // --- HUD LABELS ---
        setText('lbl-minimap', UIConfig.HUD.MAP_RADAR);
        setText('lbl-fullmap', UIConfig.HUD.MAP_FULL);
        
        setText('lbl-xp', UIConfig.HUD.LABEL_XP);
        setText('lbl-scrap', UIConfig.HUD.LABEL_SCRAP);
        setText('lbl-elec', UIConfig.HUD.LABEL_ELEC);
        setText('lbl-chip', UIConfig.HUD.LABEL_CHIP);
        setText('lbl-pills', UIConfig.HUD.LABEL_PILLS);
        
        setText('lbl-hp', UIConfig.HUD.LABEL_HP);
        setText('lbl-armor', UIConfig.HUD.LABEL_ARMOR);
        setText('lbl-fps', UIConfig.HUD.LABEL_FPS);

        // --- CONTROLS ---
        // Dynamically build the controls list
        const controlsContainer = document.getElementById('controls-overlay');
        if (controlsContainer) {
            controlsContainer.innerHTML = ''; // Clear defaults
            UIConfig.CONTROLS.forEach(ctrl => {
                const row = document.createElement('div');
                row.className = 'control-row';
                row.innerHTML = `
                    <span class="key-badge">${ctrl.key}</span>
                    <span class="action-text">${ctrl.desc}</span>
                `;
                controlsContainer.appendChild(row);
            });
        }

        // --- PAUSE MENU ---
        setText('pause-title', UIConfig.PAUSE.TITLE);
        setText('pause-sub', UIConfig.PAUSE.SUBTITLE);
        setText('btn-resume', UIConfig.COMMON.BTN_RESUME);
        setText('btn-quit', UIConfig.COMMON.BTN_EXIT_MENU);

        // --- GAME OVER ---
        setText('go-title', UIConfig.GAME_OVER.TITLE);
        setText('lbl-go-level', UIConfig.GAME_OVER.STAT_LEVEL);
        setText('lbl-go-kills', UIConfig.GAME_OVER.STAT_KILLS);
        setText('lbl-go-acc', UIConfig.GAME_OVER.STAT_ACC);
        setText('lbl-go-time', UIConfig.GAME_OVER.STAT_TIME);
        setText('btn-restart', UIConfig.COMMON.BTN_RESTART);
        setText('btn-menu', UIConfig.COMMON.BTN_EXIT_MENU);

        // --- LEVEL COMPLETE ---
        setText('lbl-lc-cleared', UIConfig.LEVEL_END.TITLE_SUFFIX);
        setText('lbl-lc-kills', UIConfig.LEVEL_END.STAT_KILLS);
        setText('lbl-lc-acc', UIConfig.LEVEL_END.STAT_ACC);
        setText('lbl-lc-time', UIConfig.LEVEL_END.STAT_TIME);
        setText('btn-next-level', UIConfig.COMMON.BTN_CONTINUE); // Default text before logic takes over
    }
}