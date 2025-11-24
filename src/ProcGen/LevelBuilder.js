import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';

export class LevelBuilder {
    constructor(scene) {
        this.scene = scene;
        this.loader = new THREE.TextureLoader();
    }

    build(mapData) {
        // 1. CONFIGURATION (Read from Config.js)
        // We use the values defined in the config file
        const WALL_ASSET   = Config.TEX_WALL; 
        const FLOOR_ASSET  = Config.TEX_FLOOR; 
        const CEIL_ASSET   = Config.TEX_CEILING; 
        const TEXTURE_PATH = Config.TEXTURE_PATH;
        
        console.log(`[LevelBuilder] Loading assets from: ${TEXTURE_PATH}`);

        const height = mapData.length;
        const width = mapData[0].length;
        
        const walls = [];
        const floors = [];
        const ceilings = [];

        // 2. Parse Map
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (mapData[y][x] === 1) {
                    walls.push({ x, z: y });
                } else {
                    floors.push({ x, z: y });
                    ceilings.push({ x, z: y }); 
                }
            }
        }
        console.log(`[LevelBuilder] Objects: ${walls.length} Walls, ${floors.length} Floors`);

        // 3. Texture Loading Helper
        const loadMaterial = (assetName, repeatY) => {
            // Construct path using Config
            const basePath = `${TEXTURE_PATH}${assetName}`;

            const onError = (err) => {
                console.error(`[TEXTURE ERROR] Could not load: ${basePath} -- Check filename/path!`);
            };

            const colorMap = this.loader.load(`${basePath}_Color.jpg`, undefined, undefined, onError);
            const normalMap = this.loader.load(`${basePath}_NormalGL.jpg`, undefined, undefined, onError);
            const roughMap = this.loader.load(`${basePath}_Roughness.jpg`, undefined, undefined, onError);

            colorMap.colorSpace = THREE.SRGBColorSpace;

            [colorMap, normalMap, roughMap].forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(1, repeatY);
            });

            return new THREE.MeshStandardMaterial({ 
                map: colorMap,
                normalMap: normalMap,
                roughnessMap: roughMap,
                roughness: 1.0, 
                metalness: 0.1,
                color: 0xaaaaaa 
            });
        };

        // 4. Create Materials
        const wallMat = loadMaterial(WALL_ASSET, 4);     
        const floorMat = loadMaterial(FLOOR_ASSET, 1);   
        const ceilingMat = loadMaterial(CEIL_ASSET, 1);

        // 5. Build Meshes
        const wallGeo = new THREE.BoxGeometry(1, 4, 1);
        this.createInstancedMesh(wallGeo, wallMat, walls, (dummy, obj) => {
            dummy.position.set(obj.x, 2, obj.z); 
        });

        const floorGeo = new THREE.PlaneGeometry(1, 1);
        this.createInstancedMesh(floorGeo, floorMat, floors, (dummy, obj) => {
            dummy.position.set(obj.x, 0, obj.z);
            dummy.rotation.x = -Math.PI / 2;
        });

        this.createInstancedMesh(floorGeo, ceilingMat, ceilings, (dummy, obj) => {
            dummy.position.set(obj.x, 4, obj.z); 
            dummy.rotation.x = Math.PI / 2; 
        });
    }

    createInstancedMesh(geo, mat, data, transformFn) {
        if (data.length === 0) return;

        const mesh = new THREE.InstancedMesh(geo, mat, data.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        
        data.forEach((obj, index) => {
            transformFn(dummy, obj);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
        });

        this.scene.add(mesh);
    }
    
    // EXIT BEACON LOGIC
    createExit(x, z) {
        // 1. GENERATE "EXIT" TEXTURE DYNAMICALLY
        const canvas = document.createElement('canvas');
        canvas.width = 256; 
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // A. Background (Grey Paint)
        ctx.fillStyle = '#444444'; 
        ctx.fillRect(0, 0, 256, 256);

        // B. Green Border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, 246, 246);

        // C. "EXIT" Text
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 80px Courier New'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EXIT', 128, 128);

        // Create Texture from Canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        // 2. THE PEDESTAL MESH
        const geo = new THREE.BoxGeometry(0.8, 0.9, 0.8);
        
        const mat = new THREE.MeshStandardMaterial({ 
            map: texture,       
            color: 0xffffff,
            roughness: 0.3,     
            metalness: 0.5,     
            emissive: 0x00ff00, 
            emissiveMap: texture, 
            emissiveIntensity: 0.3
        });

        const beacon = new THREE.Mesh(geo, mat);
        beacon.position.set(x + 0.5, 0.45, z + 0.5); 
        
        const light = new THREE.PointLight(0x00ff00, 15, 10);
        light.position.set(0, 1.0, 0); 
        beacon.add(light);

        this.scene.add(beacon);
        return beacon; 
    }
}