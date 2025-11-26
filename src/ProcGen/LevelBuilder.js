import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';
import { GreedyMesher } from '../Utils/GreedyMesher.js';

export class LevelBuilder {
    constructor(scene) {
        this.scene = scene;
        this.loader = new THREE.TextureLoader();
        this.geometries = [];
        this.materials = [];
    }

    build(mapData) {
        const WALL_ASSET = Config.TEX_WALL;
        const FLOOR_ASSET = Config.TEX_FLOOR;
        const CEIL_ASSET = Config.TEX_CEILING;
        const TEXTURE_PATH = Config.TEXTURE_PATH;
        const WALL_HEIGHT = 4; 

        console.log(`[LevelBuilder] Starting optimized build...`);

        // 1. RUN GREEDY MESHER
        const mesher = new GreedyMesher(mapData, WALL_HEIGHT);
        const wallQuads = mesher.generateWallGeometry();
        const { floors, ceilings } = mesher.generateFloorCeilingGeometry();

        // 2. LOAD MATERIALS
        const wallMat = this.loadMaterial(TEXTURE_PATH, WALL_ASSET, WALL_HEIGHT);
        const floorMat = this.loadMaterial(TEXTURE_PATH, FLOOR_ASSET, 1);
        const ceilingMat = this.loadMaterial(TEXTURE_PATH, CEIL_ASSET, 1);

        // 3. BUILD GEOMETRY (With Subdivision)
        this.buildWalls(wallQuads, wallMat, WALL_HEIGHT);
        this.buildHorizontalSurfaces(floors, floorMat, 0, false); 
        this.buildHorizontalSurfaces(ceilings, ceilingMat, WALL_HEIGHT, true); 

        console.log(`[LevelBuilder] Build complete.`);
    }

    // --- HELPER: Subdivides massive quads into smaller chunks for better lighting ---
    // If we don't do this, a 20-meter wall is just 2 triangles, which breaks spotlight math.
    subdivideAndAdd(quad, addFunction, maxsize = 4) {
        const { x, z, width, depth, face } = quad;

        // If it's small enough, just add it
        if (width <= maxsize && depth <= maxsize) {
            addFunction(x, z, width, depth);
            return;
        }

        // Otherwise, chop it up loops
        for (let currX = 0; currX < width; currX += maxsize) {
            const chunkW = Math.min(maxsize, width - currX);
            
            for (let currZ = 0; currZ < depth; currZ += maxsize) {
                const chunkD = Math.min(maxsize, depth - currZ);
                
                // Add the sub-quad
                addFunction(x + currX, z + currZ, chunkW, chunkD);
            }
        }
    }

    buildWalls(quads, material, wallHeight) {
        const allVertices = [];
        const allNormals = [];
        const allUvs = [];
        const allIndices = [];
        let indexOffset = 0;

        const addQuadGeometry = (qx, qz, qw, qd, face) => {
            let v0, v1, v2, v3; 
            
            // UV Tiling (Relative to the specific chunk size)
            const uRepeat = (face === 'north' || face === 'south') ? qw : qd;
            const vRepeat = wallHeight;

            switch (face) {
                case 'north': // -Z
                    v0 = [qx + qw, 0, qz];
                    v1 = [qx, 0, qz];
                    v2 = [qx, wallHeight, qz];
                    v3 = [qx + qw, wallHeight, qz];
                    break;
                case 'south': // +Z
                    v0 = [qx, 0, qz + 1];
                    v1 = [qx + qw, 0, qz + 1];
                    v2 = [qx + qw, wallHeight, qz + 1];
                    v3 = [qx, wallHeight, qz + 1];
                    break;
                case 'east': // +X
                    v0 = [qx + 1, 0, qz + qd];
                    v1 = [qx + 1, 0, qz];
                    v2 = [qx + 1, wallHeight, qz];
                    v3 = [qx + 1, wallHeight, qz + qd];
                    break;
                case 'west': // -X
                    v0 = [qx, 0, qz];
                    v1 = [qx, 0, qz + qd];
                    v2 = [qx, wallHeight, qz + qd];
                    v3 = [qx, wallHeight, qz];
                    break;
                case 'top': // +Y
                    v0 = [qx, wallHeight, qz + qd];
                    v1 = [qx + qw, wallHeight, qz + qd];
                    v2 = [qx + qw, wallHeight, qz];
                    v3 = [qx, wallHeight, qz];
                    break;
            }

            allVertices.push(...v0, ...v1, ...v2, ...v3);

            const n = this.getFaceNormal(face);
            for (let i = 0; i < 4; i++) allNormals.push(...n);

            allUvs.push(0, 0, uRepeat, 0, uRepeat, vRepeat, 0, vRepeat);

            allIndices.push(
                indexOffset, indexOffset + 1, indexOffset + 2,
                indexOffset, indexOffset + 2, indexOffset + 3
            );
            indexOffset += 4;
        };

        // Process faces with subdivision
        const processFaceList = (list, faceName) => {
            list.forEach(q => {
                this.subdivideAndAdd(q, (sx, sz, sw, sd) => {
                    addQuadGeometry(sx, sz, sw, sd, faceName);
                }, 4); // Max wall segment length = 4
            });
        };

        processFaceList(quads.north, 'north');
        processFaceList(quads.south, 'south');
        processFaceList(quads.east, 'east');
        processFaceList(quads.west, 'west');
        processFaceList(quads.top, 'top');

        if (allVertices.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
        geometry.setIndex(allIndices);
        geometry.computeTangents();

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.geometries.push(geometry);
    }

    buildHorizontalSurfaces(quads, material, yPos, faceDown) {
        const allVertices = [];
        const allNormals = [];
        const allUvs = [];
        const allIndices = [];
        let indexOffset = 0;

        const normal = faceDown ? [0, -1, 0] : [0, 1, 0];

        quads.forEach(quad => {
            // Subdivide floors too, otherwise the flashlight looks bad on the ground
            this.subdivideAndAdd(quad, (x, z, width, depth) => {
                let v0, v1, v2, v3;

                if (faceDown) { // Ceiling
                    v0 = [x, yPos, z];
                    v1 = [x + width, yPos, z];
                    v2 = [x + width, yPos, z + depth];
                    v3 = [x, yPos, z + depth];
                } else { // Floor
                    v0 = [x, yPos, z + depth];
                    v1 = [x + width, yPos, z + depth];
                    v2 = [x + width, yPos, z];
                    v3 = [x, yPos, z];
                }

                allVertices.push(...v0, ...v1, ...v2, ...v3);
                for (let i = 0; i < 4; i++) allNormals.push(...normal);

                allUvs.push(0, 0, width, 0, width, depth, 0, depth);

                allIndices.push(
                    indexOffset, indexOffset + 1, indexOffset + 2,
                    indexOffset, indexOffset + 2, indexOffset + 3
                );
                indexOffset += 4;
            }, 4); // Max floor tile size = 4x4
        });

        if (allVertices.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
        geometry.setIndex(allIndices);
        geometry.computeTangents();

        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.geometries.push(geometry);
    }

    // ... (keep getFaceNormal, loadMaterial, createExit, dispose exactly as they were)
    getFaceNormal(face) {
        switch (face) {
            case 'north': return [0, 0, -1];
            case 'south': return [0, 0, 1];
            case 'east': return [1, 0, 0];
            case 'west': return [-1, 0, 0];
            case 'top': return [0, 1, 0];
            default: return [0, 1, 0];
        }
    }

    loadMaterial(basePath, assetName, repeatY = 1) {
        const fullPath = `${basePath}${assetName}`;
        const onError = (err) => { console.error(`[TEXTURE ERROR] Could not load: ${fullPath}`); };

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