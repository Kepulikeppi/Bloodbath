import * as THREE from 'https://esm.sh/three@0.160.0';
import { Config } from '../Config.js';
import { GreedyMesher } from '../Utils/GreedyMesher.js';

export class LevelBuilder {
    constructor(scene) {
        this.scene = scene;
        this.loader = new THREE.TextureLoader();
        this.geometries = []; // Track for disposal
        this.materials = [];  // Track for disposal
    }

    build(mapData) {
        const WALL_ASSET = Config.TEX_WALL;
        const FLOOR_ASSET = Config.TEX_FLOOR;
        const CEIL_ASSET = Config.TEX_CEILING;
        const TEXTURE_PATH = Config.TEXTURE_PATH;
        const WALL_HEIGHT = Config.WALL_HEIGHT || 4;

        console.log(`[LevelBuilder] Starting optimized build...`);
        console.log(`[LevelBuilder] Map size: ${mapData[0].length}x${mapData.length}`);

        // 1. RUN GREEDY MESHER
        const mesher = new GreedyMesher(mapData, WALL_HEIGHT);
        const wallQuads = mesher.generateWallGeometry();
        const { floors, ceilings } = mesher.generateFloorCeilingGeometry();

        // Stats
        const stats = mesher.getStats(wallQuads, floors, ceilings);
        console.log(`[LevelBuilder] Optimization Stats:`);
        console.log(`  - Wall cells: ${stats.wallCells}, Floor cells: ${stats.floorCells}`);
        console.log(`  - Naive faces: ${stats.naiveFaces}`);
        console.log(`  - Optimized quads: ${stats.optimizedFaces}`);
        console.log(`  - Reduction: ${stats.reduction}`);

        // 2. LOAD MATERIALS
        const wallMat = this.loadMaterial(TEXTURE_PATH, WALL_ASSET, WALL_HEIGHT);
        const floorMat = this.loadMaterial(TEXTURE_PATH, FLOOR_ASSET, 1);
        const ceilingMat = this.loadMaterial(TEXTURE_PATH, CEIL_ASSET, 1);

        // 3. BUILD WALL GEOMETRY
        this.buildWalls(wallQuads, wallMat, WALL_HEIGHT);

        // 4. BUILD FLOORS
        this.buildHorizontalSurfaces(floors, floorMat, 0, false); // Y=0, face up

        // 5. BUILD CEILINGS
        this.buildHorizontalSurfaces(ceilings, ceilingMat, WALL_HEIGHT, true); // Y=height, face down

        console.log(`[LevelBuilder] Build complete.`);
    }

    /**
     * Build wall quads from greedy mesher output
     */
    buildWalls(quads, material, wallHeight) {
        const allVertices = [];
        const allNormals = [];
        const allUvs = [];
        const allIndices = [];
        let indexOffset = 0;

        const addQuad = (quad, normal, uvScale) => {
            const { x, z, width, depth, face } = quad;
            let v0, v1, v2, v3; // Vertices (counter-clockwise from outside)

            // Calculate UV tiling based on quad size
            const uRepeat = face === 'north' || face === 'south' ? width : depth;
            const vRepeat = wallHeight;

            switch (face) {
                case 'north': // -Z face
                    v0 = [x, 0, z];
                    v1 = [x + width, 0, z];
                    v2 = [x + width, wallHeight, z];
                    v3 = [x, wallHeight, z];
                    break;
                case 'south': // +Z face
                    v0 = [x + width, 0, z + 1];
                    v1 = [x, 0, z + 1];
                    v2 = [x, wallHeight, z + 1];
                    v3 = [x + width, wallHeight, z + 1];
                    break;
                case 'east': // +X face
                    v0 = [x + 1, 0, z + depth];
                    v1 = [x + 1, 0, z];
                    v2 = [x + 1, wallHeight, z];
                    v3 = [x + 1, wallHeight, z + depth];
                    break;
                case 'west': // -X face
                    v0 = [x, 0, z];
                    v1 = [x, 0, z + depth];
                    v2 = [x, wallHeight, z + depth];
                    v3 = [x, wallHeight, z];
                    break;
                case 'top': // +Y face (top of wall)
                    v0 = [x, wallHeight, z + depth];
                    v1 = [x + width, wallHeight, z + depth];
                    v2 = [x + width, wallHeight, z];
                    v3 = [x, wallHeight, z];
                    break;
            }

            // Add vertices
            allVertices.push(...v0, ...v1, ...v2, ...v3);

            // Add normals
            const n = this.getFaceNormal(face);
            for (let i = 0; i < 4; i++) {
                allNormals.push(...n);
            }

            // Add UVs (tiled based on quad size)
            if (face === 'top') {
                allUvs.push(
                    0, 0,
                    width, 0,
                    width, depth,
                    0, depth
                );
            } else {
                allUvs.push(
                    0, 0,
                    uRepeat, 0,
                    uRepeat, vRepeat,
                    0, vRepeat
                );
            }

            // Add indices (two triangles)
            allIndices.push(
                indexOffset, indexOffset + 1, indexOffset + 2,
                indexOffset, indexOffset + 2, indexOffset + 3
            );
            indexOffset += 4;
        };

        // Process all wall quads
        quads.north.forEach(q => addQuad(q, [0, 0, -1]));
        quads.south.forEach(q => addQuad(q, [0, 0, 1]));
        quads.east.forEach(q => addQuad(q, [1, 0, 0]));
        quads.west.forEach(q => addQuad(q, [-1, 0, 0]));
        quads.top.forEach(q => addQuad(q, [0, 1, 0]));

        if (allVertices.length === 0) return;

        // Create BufferGeometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
        geometry.setIndex(allIndices);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        this.geometries.push(geometry);

        const quadCount = quads.north.length + quads.south.length + 
                          quads.east.length + quads.west.length + quads.top.length;
        console.log(`[LevelBuilder] Wall mesh: ${quadCount} quads, ${allVertices.length / 3} vertices`);
    }

    /**
     * Build floor or ceiling surfaces
     */
    buildHorizontalSurfaces(quads, material, yPos, faceDown) {
        const allVertices = [];
        const allNormals = [];
        const allUvs = [];
        const allIndices = [];
        let indexOffset = 0;

        const normal = faceDown ? [0, -1, 0] : [0, 1, 0];

        quads.forEach(quad => {
            const { x, z, width, depth } = quad;

            let v0, v1, v2, v3;
            if (faceDown) {
                // Ceiling - face down
                v0 = [x, yPos, z];
                v1 = [x + width, yPos, z];
                v2 = [x + width, yPos, z + depth];
                v3 = [x, yPos, z + depth];
            } else {
                // Floor - face up
                v0 = [x, yPos, z + depth];
                v1 = [x + width, yPos, z + depth];
                v2 = [x + width, yPos, z];
                v3 = [x, yPos, z];
            }

            allVertices.push(...v0, ...v1, ...v2, ...v3);

            for (let i = 0; i < 4; i++) {
                allNormals.push(...normal);
            }

            // UVs tiled to quad size
            allUvs.push(
                0, 0,
                width, 0,
                width, depth,
                0, depth
            );

            allIndices.push(
                indexOffset, indexOffset + 1, indexOffset + 2,
                indexOffset, indexOffset + 2, indexOffset + 3
            );
            indexOffset += 4;
        });

        if (allVertices.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
        geometry.setIndex(allIndices);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        this.geometries.push(geometry);

        const label = faceDown ? 'Ceiling' : 'Floor';
        console.log(`[LevelBuilder] ${label} mesh: ${quads.length} quads, ${allVertices.length / 3} vertices`);
    }

    /**
     * Get normal vector for a face direction
     */
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

    /**
     * Load PBR material with tiling support
     */
    loadMaterial(basePath, assetName, repeatY = 1) {
        const fullPath = `${basePath}${assetName}`;

        const onError = (err) => {
            console.error(`[TEXTURE ERROR] Could not load: ${fullPath}`);
        };

        const colorMap = this.loader.load(`${fullPath}_Color.jpg`, undefined, undefined, onError);
        const normalMap = this.loader.load(`${fullPath}_NormalGL.jpg`, undefined, undefined, onError);
        const roughMap = this.loader.load(`${fullPath}_Roughness.jpg`, undefined, undefined, onError);

        colorMap.colorSpace = THREE.SRGBColorSpace;

        // Enable repeating for all maps
        [colorMap, normalMap, roughMap].forEach(tex => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            // Don't set repeat here - UVs handle tiling per-quad
        });

        const material = new THREE.MeshStandardMaterial({
            map: colorMap,
            normalMap: normalMap,
            roughnessMap: roughMap,
            roughness: 1.0,
            metalness: 0.1,
            color: 0xaaaaaa
        });

        this.materials.push(material);
        return material;
    }

    /**
     * Create exit beacon (unchanged from original)
     */
    createExit(x, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#444444';
        ctx.fillRect(0, 0, 256, 256);

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, 246, 246);

        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 80px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EXIT', 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

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

    /**
     * Cleanup resources
     */
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
