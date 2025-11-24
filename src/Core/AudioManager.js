import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';

export class AudioManager {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.music = new THREE.Audio(this.listener);
        
        // Config settings
        this.analyser = new THREE.AudioAnalyser(this.music, Config.AUDIO_FFT_SIZE || 1024); 
        this.analyser.analyser.smoothingTimeConstant = Config.AUDIO_SMOOTHING || 0.6;
        this.analyser.analyser.minDecibels = Config.AUDIO_MIN_DB || -80;
        this.analyser.analyser.maxDecibels = Config.AUDIO_MAX_DB || -10;

        this.ambience = new THREE.Audio(this.listener);
        this.ambience.setVolume(0.5); 

        this.sfxBuffers = {};
        this.loader = new THREE.AudioLoader();
        
        this.preloadSFX();

        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.musicVolume = Config.AUDIO_DEFAULT_VOL || 0.3;
        this.music.setVolume(this.musicVolume);
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

        // 1. Weapons
        if (Config.SFX_PISTOL) load('pistol', Config.SFX_PISTOL);
        
        // 2. Steps
        if (Config.SFX_STEPS && Array.isArray(Config.SFX_STEPS)) {
            Config.SFX_STEPS.forEach((path, index) => {
                load(`step${index}`, path);
            });
        }

        // 3. Ambience
        if (Config.SFX_AMBIENCE) {
            this.loader.load(Config.SFX_AMBIENCE, (buffer) => {
                this.ambience.setBuffer(buffer);
                this.ambience.setLoop(true);
            }, undefined, (err) => console.warn("Ambience Missing"));
        }

        // --- FIX: LOAD ENEMY SOUNDS ---
        // The game logic calls playSFX('hit') and playSFX('death')
        // so we must load them into buffers with those names.
        if (Config.SFX_HIT) load('hit', Config.SFX_HIT);
        if (Config.SFX_DEATH) load('death', Config.SFX_DEATH);
    }

    playSFX(name) {
        if (!this.sfxBuffers[name]) return; 

        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(this.sfxBuffers[name]);
        
        const detune = 1.0 + (Math.random() * 0.2 - 0.1);
        sound.setPlaybackRate(detune);
        
        const vol = name.includes('step') ? 0.3 : 0.8;
        sound.setVolume(vol);
        
        if (sound.context.state === 'suspended') {
            sound.context.resume();
        }
        
        sound.play();
    }

    playRandomStep() {
        if (!Config.SFX_STEPS) return;
        const count = Config.SFX_STEPS.length;
        const randIndex = Math.floor(Math.random() * count);
        this.playSFX(`step${randIndex}`);
    }

    // --- MUSIC LOGIC ---
    setPlaylist(paths) {
        this.playlist = paths;
        this.currentTrackIndex = 0;
    }

    play() {
        if (this.playlist.length === 0) return;

        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume();
        }

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
        if (this.analyser && this.analyser.data) return new Uint8Array(this.analyser.data.length).fill(0);
        return new Uint8Array(16).fill(0);
    }
}