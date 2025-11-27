import * as THREE from 'https://esm.sh/three@0.160.0';
import { PointerLockControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/PointerLockControls.js';
import { Config } from '../Config.js';

export class Engine {
    constructor(onUpdate) { 
        this.onUpdate = onUpdate;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.id = "game-canvas"; 
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(Config.COLOR_BG);
        this.scene.fog = new THREE.FogExp2(Config.COLOR_FOG, Config.FOG_DENSITY);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.controls = new PointerLockControls(this.camera, document.body);
        
        // Lighting
        const ambient = new THREE.AmbientLight(Config.COLOR_AMBIENT, Config.AMBIENT_INTENSITY); 
        this.scene.add(ambient);

        const flashlight = new THREE.SpotLight(Config.COLOR_FLASHLIGHT, Config.FL_INTENSITY);
        flashlight.angle = Config.FL_ANGLE;
        flashlight.penumbra = Config.FL_PENUMBRA;
        flashlight.decay = 2;
        flashlight.distance = Config.FL_DISTANCE;
        flashlight.castShadow = true;
        
        // Shadow Properties
        flashlight.shadow.mapSize.width = Config.FL_SHADOW_MAP_SIZE || 1024;
        flashlight.shadow.mapSize.height = Config.FL_SHADOW_MAP_SIZE || 1024;
        flashlight.shadow.bias = Config.FL_SHADOW_BIAS || -0.0001;
        flashlight.shadow.normalBias = Config.FL_SHADOW_NORMAL_BIAS || 0.02;
        
        flashlight.position.set(0.2, -0.1, -0.5); 
        flashlight.target.position.set(0, 0.05, -10);
        
        this.camera.add(flashlight);
        this.camera.add(flashlight.target);
        this.scene.add(this.camera);
        
        // Store reference for toggling
        this.flashlight = flashlight;
        this.flashlightOn = true;

        // --- FPS TRACKING VARIABLES ---
        this.fpsElement = document.getElementById('fps-value');
        this.frames = 0;
        this.lastTime = performance.now();
        
        // Pause state tracking
        this.wasPaused = false;
        this.isPaused = false;

        // Loop
        this.clock = new THREE.Clock();
        this.animate();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    toggleFlashlight() {
        this.flashlightOn = !this.flashlightOn;
        this.flashlight.visible = this.flashlightOn;
    }

    animate() {
        this.isPaused = !this.controls.isLocked;
        
        // Schedule next frame
        if (this.isPaused) {
            // When paused, use setTimeout for 4 FPS (just to detect unpause)
            setTimeout(() => this.animate(), 250);
            
            // Only render ONCE when we first pause
            if (!this.wasPaused) {
                this.wasPaused = true;
                this.renderer.render(this.scene, this.camera);
            }
            
            // Reset FPS counter display when paused
            if (this.fpsElement) {
                this.fpsElement.innerText = '0';
            }
            
            // Skip everything else while paused
            return;
        }
        
        // We're unpaused - use normal animation frame
        requestAnimationFrame(() => this.animate());
        this.wasPaused = false;
        
        // Get delta time
        const delta = this.clock.getDelta();
        
        // Game Logic
        if (this.onUpdate) {
            this.onUpdate(delta);
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
        
        // FPS Counter
        this.frames++;
        const time = performance.now();
        
        if (time >= this.lastTime + 1000) {
            if (this.fpsElement) {
                this.fpsElement.innerText = this.frames;
            }
            this.frames = 0;
            this.lastTime = time;
        }
    }
}