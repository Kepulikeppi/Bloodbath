export const UIConfig = {
    // Shared Buttons & Labels
    COMMON: {
        BTN_CANCEL: "CANCEL",
        BTN_SAVE: "SAVE",
        BTN_CONTINUE: "CONTINUE",
        BTN_NEW_GAME: "NEW GAME",
        LABEL_DEFAULT: "DEFAULT",
        LABEL_LOADING: "LOADING..."
    },

    // Loading Screen Steps
    LOADING: {
        STEP_GEN: "GENERATING SECTOR...",
        STEP_GEO: "BUILDING GEOMETRY...",
        STEP_SPAWN: "SPAWNING ENTITIES...",
        STEP_SHADER: "COMPILING SHADERS..."
    },

    // Level Complete / Transition Screen
    LEVEL_END: {
        BTN_UPLINKING: "LOADING...",
        BTN_ENTER_PREFIX: "ENTER LEVEL ", // Keeps the space at the end for the number
        BTN_ERROR_SERVER: "UPLINK ERROR (RETRY)",
        BTN_ERROR_NET: "CONNECTION LOST (FORCE RELOAD)"
    },

    // Main Menu Specifics
    MENU: {
        WARN_TITLE: "WARNING",
        WARN_RESET: "RESET CURRENT RUN AND START FROM LEVEL 1?\n(SESSION '{name}' WILL BE KEPT)",
        WARN_LOGOUT: "RESET SESSION?\nTHIS WILL DELETE YOUR IDENTITY.",
        INPUT_PLACEHOLDER: "A friendly name..."
    }
};