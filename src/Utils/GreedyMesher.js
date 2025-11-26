/**
 * GreedyMesher.js
 * 
 * Generates optimized level geometry by:
 * 1. Only generating faces where walls meet air (face culling)
 * 2. Merging adjacent coplanar faces into larger quads (greedy meshing)
 */

export class GreedyMesher {
    constructor(mapData, wallHeight = 4) {
        this.map = mapData;
        this.height = mapData.length;
        this.width = mapData[0].length;
        this.wallHeight = wallHeight;
    }

    /**
     * Check if a cell is solid (wall)
     */
    isSolid(x, z) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            return true; // Out of bounds = solid
        }
        return this.map[z][x] === 1;
    }

    /**
     * Check if a cell is air (floor)
     */
    isAir(x, z) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            return false; // Out of bounds = not air
        }
        return this.map[z][x] === 0;
    }

    /**
     * Generate wall geometry - simpler approach without greedy merging
     * Generates individual quads for each wall face that borders air
     */
    generateWallGeometry() {
        const quads = {
            north: [],
            south: [],
            east: [],
            west: [],
            top: []
        };

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.isSolid(x, z)) continue;

                // NORTH FACE (-Z): Wall here, air to the north
                if (this.isAir(x, z - 1)) {
                    quads.north.push({ x, z, width: 1, depth: 1, face: 'north' });
                }

                // SOUTH FACE (+Z): Wall here, air to the south
                if (this.isAir(x, z + 1)) {
                    quads.south.push({ x, z, width: 1, depth: 1, face: 'south' });
                }

                // EAST FACE (+X): Wall here, air to the east
                if (this.isAir(x + 1, z)) {
                    quads.east.push({ x, z, width: 1, depth: 1, face: 'east' });
                }

                // WEST FACE (-X): Wall here, air to the west
                if (this.isAir(x - 1, z)) {
                    quads.west.push({ x, z, width: 1, depth: 1, face: 'west' });
                }

                // TOP FACE: Generate for walls that have at least one air neighbor
                const hasAirNeighbor = this.isAir(x-1, z) || this.isAir(x+1, z) || 
                                       this.isAir(x, z-1) || this.isAir(x, z+1);
                if (hasAirNeighbor) {
                    quads.top.push({ x, z, width: 1, depth: 1, face: 'top' });
                }
            }
        }

        // Now merge adjacent quads (greedy meshing)
        quads.north = this.mergeQuadsX(quads.north);
        quads.south = this.mergeQuadsX(quads.south);
        quads.east = this.mergeQuadsZ(quads.east);
        quads.west = this.mergeQuadsZ(quads.west);
        quads.top = this.mergeQuadsX(quads.top);

        return quads;
    }

    /**
     * Merge quads along X axis (for north/south faces)
     */
    mergeQuadsX(quads) {
        if (quads.length === 0) return quads;
        
        // Group by z coordinate
        const byZ = new Map();
        for (const q of quads) {
            const key = q.z;
            if (!byZ.has(key)) byZ.set(key, []);
            byZ.get(key).push(q);
        }

        const merged = [];
        for (const [z, row] of byZ) {
            // Sort by x
            row.sort((a, b) => a.x - b.x);
            
            let current = null;
            for (const q of row) {
                if (current && q.x === current.x + current.width) {
                    // Extend current quad
                    current.width += 1;
                } else {
                    // Start new quad
                    if (current) merged.push(current);
                    current = { ...q };
                }
            }
            if (current) merged.push(current);
        }
        
        return merged;
    }

    /**
     * Merge quads along Z axis (for east/west faces)
     */
    mergeQuadsZ(quads) {
        if (quads.length === 0) return quads;
        
        // Group by x coordinate
        const byX = new Map();
        for (const q of quads) {
            const key = q.x;
            if (!byX.has(key)) byX.set(key, []);
            byX.get(key).push(q);
        }

        const merged = [];
        for (const [x, col] of byX) {
            // Sort by z
            col.sort((a, b) => a.z - b.z);
            
            let current = null;
            for (const q of col) {
                if (current && q.z === current.z + current.depth) {
                    // Extend current quad
                    current.depth += 1;
                } else {
                    // Start new quad
                    if (current) merged.push(current);
                    current = { ...q };
                }
            }
            if (current) merged.push(current);
        }
        
        return merged;
    }

    /**
     * Generate floor and ceiling geometry
     */
    generateFloorCeilingGeometry() {
        const floors = [];
        const ceilings = [];

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isSolid(x, z)) continue;
                
                floors.push({ x, z, width: 1, depth: 1 });
                ceilings.push({ x, z, width: 1, depth: 1 });
            }
        }

        // Merge floors and ceilings
        const mergedFloors = this.mergeQuadsX(floors);
        const mergedCeilings = this.mergeQuadsX(ceilings);

        return { floors: mergedFloors, ceilings: mergedCeilings };
    }

    /**
     * Get statistics about the optimization
     */
    getStats(quads, floors, ceilings) {
        const wallQuadCount = quads.north.length + quads.south.length + 
                              quads.east.length + quads.west.length + quads.top.length;
        
        let wallCells = 0;
        let floorCells = 0;
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isSolid(x, z)) wallCells++;
                else floorCells++;
            }
        }

        const naiveFaces = (wallCells * 6) + (floorCells * 2);
        const optimizedFaces = wallQuadCount + floors.length + ceilings.length;
        const reduction = ((naiveFaces - optimizedFaces) / naiveFaces * 100).toFixed(1);

        return {
            wallCells,
            floorCells,
            naiveFaces,
            optimizedFaces,
            wallQuads: wallQuadCount,
            floorQuads: floors.length,
            ceilingQuads: ceilings.length,
            reduction: `${reduction}%`
        };
    }
}