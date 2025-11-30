import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js'; 
import { AudioConfig } from '../AudioConfig.js';
import { MusicConfig } from '../MusicConfig.js';

export class AudioManager {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.music = new THREE.Audio(this.listener);
        
        // --- ANALYSER CONFIGURATION ---
        this.analyser = new THREE.AudioAnalyser(this.music, AudioConfig.FFT_SIZE); 
        this.analyser.analyser.smoothingTimeConstant = AudioConfig.SMOOTHING;
        this.analyser.analyser.minDecibels = AudioConfig.MIN_DB;
        this.analyser.analyser.maxDecibels = AudioConfig.MAX_DB;

        this.loader = new THREE.AudioLoader();
        this.ambience = new THREE.Audio(this.listener);
        this.ambience.setVolume(AudioConfig.DEFAULT_VOL); 

        this.sfxBuffers = {};
        this.preloadSFX();

        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        
        this.musicVolume = AudioConfig.DEFAULT_VOL;
        this.music.setVolume(this.musicVolume);
        
        this.camera = null; 
    }

    setCamera(camera) {
        this.camera = camera;
    }

    preloadSFX() {
        const load = (name, path) => {
            if (!path) return; 
            this.loader.load(
                path, 
                (buffer) => { this.sfxBuffers[name] = buffer; },
                undefined, 
                (err) => { console.warn(`Audio File Missing: ${path}`); }
            );
        };

        const SFX = AudioConfig.SFX;

        // === 1. WEAPONS (Refactored) ===
        if (SFX.WEAPONS) {
            for (const [weaponId, sounds] of Object.entries(SFX.WEAPONS)) {
                if (sounds.SHOOT)  load(`${weaponId}_SHOOT`, sounds.SHOOT);
                if (sounds.RELOAD) load(`${weaponId}_RELOAD`, sounds.RELOAD);
                if (sounds.EMPTY)  load(`${weaponId}_EMPTY`, sounds.EMPTY);
            }
        }
        
        // === 2. ENVIRONMENT ===
        if (SFX.STEPS) {
            SFX.STEPS.forEach((path, index) => load(`step${index}`, path));
        }

        if (SFX.AMBIENCE) {
            this.loader.load(SFX.AMBIENCE, (buffer) => {
                this.ambience.setBuffer(buffer);
                this.ambience.setLoop(true);
                this.ambience.setVolume(AudioConfig.DEFAULT_VOL); 
            }, undefined, (err) => console.warn("Ambience Missing"));
        }

        // === 3. ENTITIES ===
        if (SFX.HIT) load('hit', SFX.HIT);
        if (SFX.MONSTER_DEATH) load('death', SFX.MONSTER_DEATH);
        if (SFX.PLAYER_DEATH) load('player_death', SFX.PLAYER_DEATH);
        
        // === 4. LOOT (UPDATED TO MATCH AUDIOCONFIG KEYS) ===
        if (SFX.LOOT) {
            const L = SFX.LOOT;
            // General
            if (L.HEALTH)     load('pickup_health', L.HEALTH);
            if (L.METAL)      load('pickup_metal', L.METAL);
            if (L.ELEC)       load('pickup_elec', L.ELEC);
            if (L.CHIP)       load('pickup_chip', L.CHIP);
            if (L.PILLS)      load('pickup_pills', L.PILLS);
            if (L.XP)         load('pickup_XP', L.XP);

            // Specific Ammo Types (Must match keys in LootConfig.js)
            if (L.AMMO_9MM)   load('pickup_ammo9mm', L.AMMO_9MM);
            if (L.AMMO_44)    load('pickup_ammo44', L.AMMO_44);
            if (L.AMMO_762)   load('pickup_ammo762', L.AMMO_762);
            if (L.AMMO_127MM) load('pickup_ammo127mm', L.AMMO_127MM);
        }
    }

    startAmbience() {
        if (this.ambience.buffer && !this.ambience.isPlaying) {
            this.ambience.play();
        }
    }

    playSFX(name, position = null) {
        if (!this.sfxBuffers[name]) {
            // console.warn(`SFX not found: ${name}`);
            return; 
        }

        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(this.sfxBuffers[name]);
        
        const detune = 1.0 + (Math.random() * 0.2 - 0.1);
        sound.setPlaybackRate(detune);
        
        let vol = name.includes('step') ? 0.3 : 0.8;

        // --- DISTANCE ATTENUATION ---
        if (position && this.camera) {
            const dist = this.camera.position.distanceTo(position);
            const maxDist = AudioConfig.MAX_DIST; 
            
            let factor = 1 - (dist / maxDist);
            if (factor < 0) factor = 0;
            factor = factor * factor; 
            
            vol *= factor;
        }

        sound.setVolume(vol);
        
        if (vol > 0.01) {
            if (sound.context.state === 'suspended') sound.context.resume();
            sound.play();
        }
    }

    playRandomStep() {
        if (!AudioConfig.SFX.STEPS) return;
        const count = AudioConfig.SFX.STEPS.length;
        const randIndex = Math.floor(Math.random() * count);
        this.playSFX(`step${randIndex}`);
    }

    setPlaylist(paths) {
        this.playlist = paths;
        this.currentTrackIndex = 0;
    }

    play() {
        if (this.playlist.length === 0) return;
        if (this.listener.context.state === 'suspended') this.listener.context.resume();

        if (this.music.buffer && !this.isPlaying && !this.music.isPlaying) {
            this.music.onEnded = () => { this.isPlaying = false; this.next(); };
            this.music.play();
            this.isPlaying = true;
            const currentPath = this.playlist[this.currentTrackIndex];
            window.dispatchEvent(new CustomEvent('trackchange', { detail: currentPath }));
            return;
        }
        if (this.isPlaying) return;
        this.loadAndPlay(this.playlist[this.currentTrackIndex]);
    }

    stop() {
        this.music.onEnded = function() {}; 
        if (this.music.isPlaying) this.music.stop();
        this.isPlaying = false;
    }

    next() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        this.loadAndPlay(this.playlist[this.currentTrackIndex]);
    }

    loadAndPlay(path) {
        this.loader.load(path, (buffer) => {
            this.music.onEnded = function() {}; 
            if (this.music.isPlaying) this.music.stop();
            
            this.music.setBuffer(buffer);
            this.music.setLoop(false); 
            this.music.setVolume(this.musicVolume);

            this.music.onEnded = () => {
                this.isPlaying = false;
                this.next(); 
            };

            this.music.play();
            this.isPlaying = true;
            window.dispatchEvent(new CustomEvent('trackchange', { detail: path }));
        });
    }

    setVolume(val) {
        this.musicVolume = val;
        this.music.setVolume(val);
    }

    getFrequencyData() {
        if (this.isPlaying) return this.analyser.getFrequencyData();
        return new Uint8Array(this.analyser.data.length).fill(0); 
    }
}