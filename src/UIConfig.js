export const UIConfig = {
    // Shared Buttons & Labels
    COMMON: {
        BTN_CANCEL: "CANCEL",
        BTN_SAVE: "SAVE",
        BTN_CONTINUE: "CONTINUE",
        BTN_NEW_GAME: "NEW GAME",
        BTN_RESTART: "START NEW GAME",
        BTN_EXIT_MENU: "EXIT TO MAIN MENU",
        BTN_RESUME: "RESUME GAME",
        LABEL_DEFAULT: "DEFAULT",
        LABEL_LOADING: "LOADING...",
        LABEL_LEVEL_PREFIX: "LEVEL "
    },

    // Loading Screen Steps
    LOADING: {
        TEXT_INIT: "INITIALIZING...",
        STEP_GEN: "GENERATING SECTOR...",
        STEP_GEO: "BUILDING GEOMETRY...",
        STEP_ASSETS: "DOWNLOADING ASSETS...", // NEW
        STEP_SPAWN: "SPAWNING ENTITIES...",
        STEP_SHADER: "COMPILING SHADERS..."
    },

    // In-Game Heads Up Display
    HUD: {
        MAP_RADAR: "SECTOR RADAR",
        MAP_FULL: "TACTICAL MAP OVERVIEW",
        LABEL_XP: "XP:",
        LABEL_SCRAP: "SCRAP:",
        LABEL_ELEC: "ELEC:",
        LABEL_CHIP: "CHIP:",
        LABEL_PILLS: "RAGE PILLS:",
        LABEL_HP: "HEALTH",
        LABEL_ARMOR: "ARMOR",
        LABEL_FPS: "FPS:"
    },

    // Controls Overlay
    CONTROLS: [
        { key: "ESC", desc: "Release mouse / Pause game" },
        { key: "F", desc: "Flashlight" },
        { key: "M", desc: "Map" },
        { key: "N", desc: "Toggle minimap" },
        { key: "K / L", desc: "Minimap zoom" }
    ],

    // Pause Menu
    PAUSE: {
        TITLE: "GAME PAUSED",
        SUBTITLE: "MOUSE RELEASED"
    },

    // Level Complete
    LEVEL_END: {
        TITLE_SUFFIX: " CLEARED", 
        BTN_UPLINKING: "UPLINKING...",
        BTN_ENTER_PREFIX: "ENTER LEVEL ",
        BTN_ERROR_SERVER: "UPLINK ERROR (RETRY)",
        BTN_ERROR_NET: "CONNECTION LOST (FORCE RELOAD)",
        STAT_KILLS: "KILLS:",
        STAT_ACC: "ACCURACY:",
        STAT_TIME: "TIME:"
    },

    // Game Over
    GAME_OVER: {
        TITLE: "GAME OVER",
        STAT_LEVEL: "LEVEL REACHED:",
        STAT_KILLS: "MONSTERS KILLED:",
        STAT_ACC: "ACCURACY:",
        STAT_TIME: "TIME SURVIVED:"
    },

    // Main Menu
    MENU: {
        WARN_TITLE: "WARNING",
        WARN_RESET: "RESET CURRENT RUN AND START FROM LEVEL 1?\n(SESSION '{name}' WILL BE KEPT)",
        WARN_LOGOUT: "RESET SESSION?\nTHIS WILL DELETE YOUR IDENTITY.",
        INPUT_PLACEHOLDER: "ENTER A NAME...",
        ERROR_EMPTY: "INPUT A NAME FIRST!"
    }
};