import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';
import { GreedyMesher } from '../Utils/GreedyMesher.js';

export class LevelBuilder {
    constructor(scene) {
        this.scene = scene;
        
        // FIX: Use LoadingManager to track texture downloads
        this.manager = new THREE.LoadingManager();
        this.loader = new THREE.TextureLoader(this.manager);
        
        this.geometries = [];
        this.materials = [];
    }

    // NEW: Async helper to wait for textures
    waitForLoad() {
        return new Promise((resolve) => {
            // If everything is already loaded (or cached), onLoad fires immediately.
            // If not, it waits for the pending requests from build().
            this.manager.onLoad = () => {
                resolve();
            };
        });
    }

    build(mapData) {
        const WALL_ASSET = Config.TEX_WALL;
        const FLOOR_ASSET = Config.TEX_FLOOR;
        const CEIL_ASSET = Config.TEX_CEILING;
        const TEXTURE_PATH = Config.TEXTURE_PATH;
        const WALL_HEIGHT = Config.WALL_HEIGHT || 4;

        console.log(`[LevelBuilder] Starting 3D build...`);

        // 1. RUN MESHER
        const mesher = new GreedyMesher(mapData, WALL_HEIGHT);
        const geometryData = mesher.generateGeometry();

        // 2. LOAD MATERIALS (This now registers tasks with this.manager)
        const wallMat = this.loadMaterial(TEXTURE_PATH, WALL_ASSET, WALL_HEIGHT);
        const floorMat = this.loadMaterial(TEXTURE_PATH, FLOOR_ASSET, 1);
        const ceilingMat = this.loadMaterial(TEXTURE_PATH, CEIL_ASSET, 1);

        // 3. BUILD GEOMETRY
        this.buildVerticalSurfaces(geometryData.walls, wallMat);
        this.buildHorizontalSurfaces(geometryData.floors, floorMat, false); 
        this.buildHorizontalSurfaces(geometryData.ceilings, ceilingMat, true); 

        console.log(`[LevelBuilder] Geometry generated. Waiting for textures...`);
    }

    // ... [buildVerticalSurfaces, buildHorizontalSurfaces, createMesh, getFaceNormal KEEP AS IS] ...
    
    buildVerticalSurfaces(walls, material) {
        const allVertices = [];
        const allNormals = [];
        const allUvs = [];
        const allIndices = [];
        let indexOffset = 0;

        walls.forEach(w => {
            const { x, z, y, h, face } = w;
            let v0, v1, v2, v3;
            const uRep = 1;
            const vRep = h; 

            switch (face) {
                case 'north':
                    v0 = [x + 1, y, z]; v1 = [x, y, z]; v2 = [x, y + h, z]; v3 = [x + 1, y + h, z];
                    break;
                case 'south':
                    v0 = [x, y, z + 1]; v1 = [x + 1, y, z + 1]; v2 = [x + 1, y + h, z + 1]; v3 = [x, y + h, z + 1];
                    break;
                case 'east':
                    v0 = [x + 1, y, z + 1]; v1 = [x + 1, y, z]; v2 = [x + 1, y + h, z]; v3 = [x + 1, y + h, z + 1];
                    break;
                case 'west':
                    v0 = [x, y, z]; v1 = [x, y, z + 1]; v2 = [x, y + h, z + 1]; v3 = [x, y + h, z];
                    break;
            }

            allVertices.push(...v0, ...v1, ...v2, ...v3);
            const n = this.getFaceNormal(face);
            for (let i = 0; i < 4; i++) allNormals.push(...n);
            allUvs.push(0, 0, uRep, 0, uRep, vRep, 0, vRep);
            allIndices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
            indexOffset += 4;
        });

        if (allVertices.length > 0) this.createMesh(allVertices, allNormals, allUvs, allIndices, material);
    }

    buildHorizontalSurfaces(list, material, isCeiling) {
        const allVertices = [];
        const allNormals = [];
        const allUvs = [];
        const allIndices = [];
        let indexOffset = 0;
        const normal = isCeiling ? [0, -1, 0] : [0, 1, 0];

        list.forEach(item => {
            const { x, z, y } = item;
            const w = 1; const d = 1;
            let v0, v1, v2, v3;

            if (isCeiling) {
                v0 = [x, y, z]; v1 = [x + w, y, z]; v2 = [x + w, y, z + d]; v3 = [x, y, z + d];
            } else {
                v0 = [x, y, z + d]; v1 = [x + w, y, z + d]; v2 = [x + w, y, z]; v3 = [x, y, z];
            }

            allVertices.push(...v0, ...v1, ...v2, ...v3);
            for (let i = 0; i < 4; i++) allNormals.push(...normal);
            allUvs.push(0, 0, 1, 0, 1, 1, 0, 1);
            allIndices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
            indexOffset += 4;
        });

        if (allVertices.length > 0) this.createMesh(allVertices, allNormals, allUvs, allIndices, material);
    }

    createMesh(vertices, normals, uvs, indices, material) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeTangents();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.geometries.push(geometry);
    }

    getFaceNormal(face) {
        switch (face) {
            case 'north': return [0, 0, -1];
            case 'south': return [0, 0, 1];
            case 'east': return [1, 0, 0];
            case 'west': return [-1, 0, 0];
            default: return [0, 1, 0];
        }
    }

    loadMaterial(basePath, assetName, repeatY = 1) {
        const fullPath = `${basePath}${assetName}`;
        const onError = (err) => { console.error(`[TEXTURE ERROR] Could not load: ${fullPath}`); };

        // Calls are now tracked by this.manager
        const colorMap = this.loader.load(`${fullPath}_Color.jpg`, undefined, undefined, onError);
        const normalMap = this.loader.load(`${fullPath}_NormalGL.jpg`, undefined, undefined, onError);
        const roughMap = this.loader.load(`${fullPath}_Roughness.jpg`, undefined, undefined, onError);

        colorMap.colorSpace = THREE.SRGBColorSpace;

        [colorMap, normalMap, roughMap].forEach(tex => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
        });

        const material = new THREE.MeshStandardMaterial({
            map: colorMap,
            normalMap: normalMap,
            roughnessMap: roughMap,
            roughness: 1.0,
            metalness: 0.1,
            color: 0xaaaaaa,
            side: THREE.DoubleSide
        });

        this.materials.push(material);
        return material;
    }

    createExit(x, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#444444'; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 246, 246);
        ctx.fillStyle = '#00ff00'; ctx.font = 'bold 80px Courier New';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', 128, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshStandardMaterial({ 
            map: texture, color: 0xffffff, roughness: 0.3, metalness: 0.5, 
            emissive: 0x00ff00, emissiveMap: texture, emissiveIntensity: 0.3 
        });
        const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), mat);
        beacon.position.set(x + 0.5, 0.45, z + 0.5);
        const light = new THREE.PointLight(0x00ff00, 15, 10);
        light.position.set(0, 1.0, 0);
        beacon.add(light);
        this.scene.add(beacon);
        return beacon;
    }

    dispose() {
        this.geometries.forEach(g => g.dispose());
        this.materials.forEach(m => {
            if (m.map) m.map.dispose();
            if (m.normalMap) m.normalMap.dispose();
            if (m.roughnessMap) m.roughnessMap.dispose();
            m.dispose();
        });
        this.geometries = [];
        this.materials = [];
    }
}