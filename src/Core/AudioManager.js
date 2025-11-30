import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js'; 
import { AudioConfig } from '../AudioConfig.js';
import { MusicConfig } from '../MusicConfig.js';

export class AudioManager {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.music = new THREE.Audio(this.listener);
        
        // --- ANALYSER CONFIGURATION (Loaded from AudioConfig) ---
        this.analyser = new THREE.AudioAnalyser(this.music, AudioConfig.FFT_SIZE); 
        this.analyser.analyser.smoothingTimeConstant = AudioConfig.SMOOTHING;
        this.analyser.analyser.minDecibels = AudioConfig.MIN_DB;
        this.analyser.analyser.maxDecibels = AudioConfig.MAX_DB;

        this.loader = new THREE.AudioLoader();
        this.ambience = new THREE.Audio(this.listener);
        
        // Use Config for initial volume
        this.ambience.setVolume(AudioConfig.DEFAULT_VOL); 

        this.sfxBuffers = {};
        this.preloadSFX();

        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        
        // Use Config for initial music volume
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

        // Weapons
        if (SFX.PISTOL) load('pistol', SFX.PISTOL);
        if (SFX.RELOAD) load('reload', SFX.RELOAD);
        if (SFX.EMPTY) load('empty', SFX.EMPTY);
        
        // Steps
        if (SFX.STEPS) {
            SFX.STEPS.forEach((path, index) => load(`step${index}`, path));
        }

        // Ambience
        if (SFX.AMBIENCE) {
            this.loader.load(SFX.AMBIENCE, (buffer) => {
                this.ambience.setBuffer(buffer);
                this.ambience.setLoop(true);
                this.ambience.setVolume(AudioConfig.DEFAULT_VOL); // Use Config
            }, undefined, (err) => console.warn("Ambience Missing"));
        }

        // Combat
        if (SFX.HIT) load('hit', SFX.HIT);
        if (SFX.MONSTER_DEATH) load('death', SFX.MONSTER_DEATH); 
        
        // Loot Sounds
        if (SFX.LOOT) {
            if (SFX.LOOT.HEALTH)     load('pickup_health', SFX.LOOT.HEALTH);
            if (SFX.LOOT.AMMO_LIGHT) load('pickup_ammo_light', SFX.LOOT.AMMO_LIGHT);
            if (SFX.LOOT.AMMO_HEAVY) load('pickup_ammo_heavy', SFX.LOOT.AMMO_HEAVY);
            if (SFX.LOOT.METAL)      load('pickup_metal', SFX.LOOT.METAL);
            if (SFX.LOOT.TECH)       load('pickup_tech', SFX.LOOT.TECH);
            if (SFX.LOOT.PILLS)      load('pickup_pills', SFX.LOOT.PILLS);
            if (SFX.LOOT.XP)         load('pickup_xp', SFX.LOOT.XP);
        }
    }

    startAmbience() {
        if (this.ambience.buffer && !this.ambience.isPlaying) {
            this.ambience.play();
        }
    }

    playSFX(name, position = null) {
        if (!this.sfxBuffers[name]) return; 

        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(this.sfxBuffers[name]);
        
        const detune = 1.0 + (Math.random() * 0.2 - 0.1);
        sound.setPlaybackRate(detune);
        
        // Base Volume logic could also be moved to config later if needed, 
        // but relative mixing is usually logic-dependent.
        let vol = name.includes('step') ? 0.3 : 0.8;

        // --- DISTANCE ATTENUATION ---
        if (position && this.camera) {
            const dist = this.camera.position.distanceTo(position);
            const maxDist = AudioConfig.MAX_DIST; // Use Config
            
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
            const event = new CustomEvent('trackchange', { detail: currentPath });
            window.dispatchEvent(event);
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
            const event = new CustomEvent('trackchange', { detail: path });
            window.dispatchEvent(event);
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