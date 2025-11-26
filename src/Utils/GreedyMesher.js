/**
 * GreedyMesher.js
 * 
 * Optimizes level geometry by:
 * 1. Only generating faces where walls meet air (face culling)
 * 2. Merging adjacent coplanar faces into larger quads (greedy meshing)
 * 
 * This can reduce geometry by 70-90% compared to naive box-per-cell approaches.
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
            return true; // Out of bounds = solid (prevents edge gaps)
        }
        return this.map[z][x] === 1;
    }

    /**
     * Check if a cell is air (floor)
     */
    isAir(x, z) {
        return !this.isSolid(x, z);
    }

    /**
     * Generate optimized wall geometry
     * Returns arrays of quads for each face direction
     */
    generateWallGeometry() {
        const quads = {
            north: [], // -Z facing
            south: [], // +Z facing
            east: [],  // +X facing
            west: [],  // -X facing
            top: []    // +Y facing (top of walls)
        };

        // Track which faces we've already processed
        const processedNorth = this.createGrid();
        const processedSouth = this.createGrid();
        const processedEast = this.createGrid();
        const processedWest = this.createGrid();
        const processedTop = this.createGrid();

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.isSolid(x, z)) continue;

                // NORTH FACE (-Z): Wall here, air to the north
                if (this.isAir(x, z - 1) && !processedNorth[z][x]) {
                    const quad = this.greedyExpandX(x, z, processedNorth, 
                        (cx, cz) => this.isSolid(cx, cz) && this.isAir(cx, cz - 1));
                    quad.face = 'north';
                    quads.north.push(quad);
                }

                // SOUTH FACE (+Z): Wall here, air to the south
                if (this.isAir(x, z + 1) && !processedSouth[z][x]) {
                    const quad = this.greedyExpandX(x, z, processedSouth,
                        (cx, cz) => this.isSolid(cx, cz) && this.isAir(cx, cz + 1));
                    quad.face = 'south';
                    quads.south.push(quad);
                }

                // EAST FACE (+X): Wall here, air to the east
                if (this.isAir(x + 1, z) && !processedEast[z][x]) {
                    const quad = this.greedyExpandZ(x, z, processedEast,
                        (cx, cz) => this.isSolid(cx, cz) && this.isAir(cx + 1, cz));
                    quad.face = 'east';
                    quads.east.push(quad);
                }

                // WEST FACE (-X): Wall here, air to the west
                if (this.isAir(x - 1, z) && !processedWest[z][x]) {
                    const quad = this.greedyExpandZ(x, z, processedWest,
                        (cx, cz) => this.isSolid(cx, cz) && this.isAir(cx - 1, cz));
                    quad.face = 'west';
                    quads.west.push(quad);
                }

                // TOP FACE: Only for walls adjacent to air (visible from above)
                // We generate top faces for all wall cells since player might look down
                if (!processedTop[z][x]) {
                    const hasAdjacentAir = this.isAir(x-1, z) || this.isAir(x+1, z) || 
                                           this.isAir(x, z-1) || this.isAir(x, z+1);
                    if (hasAdjacentAir) {
                        const quad = this.greedyExpandXZ(x, z, processedTop,
                            (cx, cz) => {
                                if (!this.isSolid(cx, cz)) return false;
                                return this.isAir(cx-1, cz) || this.isAir(cx+1, cz) || 
                                       this.isAir(cx, cz-1) || this.isAir(cx, cz+1);
                            });
                        quad.face = 'top';
                        quads.top.push(quad);
                    }
                }
            }
        }

        return quads;
    }

    /**
     * Generate floor and ceiling geometry (simpler - just merge adjacent floor tiles)
     */
    generateFloorCeilingGeometry() {
        const floors = [];
        const ceilings = [];
        const processedFloor = this.createGrid();
        const processedCeiling = this.createGrid();

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isSolid(x, z)) continue;

                // Floor
                if (!processedFloor[z][x]) {
                    const quad = this.greedyExpandXZ(x, z, processedFloor,
                        (cx, cz) => this.isAir(cx, cz));
                    floors.push(quad);
                }

                // Ceiling (same positions as floor, different Y)
                if (!processedCeiling[z][x]) {
                    const quad = this.greedyExpandXZ(x, z, processedCeiling,
                        (cx, cz) => this.isAir(cx, cz));
                    ceilings.push(quad);
                }
            }
        }

        return { floors, ceilings };
    }

    /**
     * Greedy expand along X axis (for north/south faces)
     */
    greedyExpandX(startX, startZ, processed, condition) {
        let endX = startX;
        
        // Expand right along X
        while (endX < this.width && !processed[startZ][endX] && condition(endX, startZ)) {
            processed[startZ][endX] = true;
            endX++;
        }

        return {
            x: startX,
            z: startZ,
            width: endX - startX,
            depth: 1
        };
    }

    /**
     * Greedy expand along Z axis (for east/west faces)
     */
    greedyExpandZ(startX, startZ, processed, condition) {
        let endZ = startZ;
        
        // Expand down along Z
        while (endZ < this.height && !processed[endZ][startX] && condition(startX, endZ)) {
            processed[endZ][startX] = true;
            endZ++;
        }

        return {
            x: startX,
            z: startZ,
            width: 1,
            depth: endZ - startZ
        };
    }

    /**
     * Greedy expand in both X and Z (for floors, ceilings, wall tops)
     */
    greedyExpandXZ(startX, startZ, processed, condition) {
        let endX = startX;
        let endZ = startZ;

        // First, expand along X as far as possible
        while (endX < this.width && !processed[startZ][endX] && condition(endX, startZ)) {
            endX++;
        }
        const rowWidth = endX - startX;

        // Now try to expand along Z, but only if entire row matches
        endZ = startZ;
        let canExpand = true;
        
        while (canExpand && endZ < this.height) {
            // Check if entire row at endZ can be included
            for (let x = startX; x < startX + rowWidth; x++) {
                if (processed[endZ][x] || !condition(x, endZ)) {
                    canExpand = false;
                    break;
                }
            }
            
            if (canExpand) {
                // Mark row as processed
                for (let x = startX; x < startX + rowWidth; x++) {
                    processed[endZ][x] = true;
                }
                endZ++;
            }
        }

        return {
            x: startX,
            z: startZ,
            width: rowWidth,
            depth: endZ - startZ
        };
    }

    /**
     * Create a 2D boolean grid for tracking processed cells
     */
    createGrid() {
        const grid = [];
        for (let z = 0; z < this.height; z++) {
            grid.push(new Array(this.width).fill(false));
        }
        return grid;
    }

    /**
     * Get statistics about the optimization
     */
    getStats(quads, floors, ceilings) {
        const wallQuadCount = quads.north.length + quads.south.length + 
                              quads.east.length + quads.west.length + quads.top.length;
        
        // Count original cells
        let wallCells = 0;
        let floorCells = 0;
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isSolid(x, z)) wallCells++;
                else floorCells++;
            }
        }

        // Naive approach: 6 faces per wall cell, 1 face per floor/ceiling
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
