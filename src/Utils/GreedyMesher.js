/**
 * GreedyMesher.js (3D Heightmap Support)
 * 
 * Generates geometry from the new object-based map data.
 * - Handles variable floor heights (steps)
 * - Handles explicit walls vs floors
 * - Generates vertical faces to bridge height gaps
 */

export class GreedyMesher {
    constructor(mapData, wallHeight = 4) {
        this.map = mapData; // Expects 2D array of { type, height }
        this.height = mapData.length;
        this.width = mapData[0].length;
        this.globalCeiling = wallHeight; // Standard ceiling height
    }

    getTile(x, z) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            // Out of bounds acts like a solid wall
            return { type: 1, height: this.globalCeiling }; 
        }
        return this.map[z][x];
    }

    /**
     * Generate all geometry for the level
     */
    generateGeometry() {
        const geometry = {
            floors: [],
            ceilings: [],
            walls: [] // One list for all vertical faces
        };

        this.generateHorizontalSurfaces(geometry);
        this.generateVerticalSurfaces(geometry);

        return geometry;
    }

    generateHorizontalSurfaces(geo) {
        // Naive meshing for floors/ceilings (1 quad per tile)
        // This ensures texture mapping aligns perfectly with the grid logic
        
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.map[z][x];
                
                // TYPE 0 = Floor
                if (tile.type === 0) {
                    // Add Floor
                    geo.floors.push({ 
                        x, z, y: tile.height, 
                        width: 1, depth: 1 
                    });
                    
                    // Add Ceiling (Fixed height for now)
                    geo.ceilings.push({ 
                        x, z, y: this.globalCeiling, 
                        width: 1, depth: 1 
                    });
                }
                
                // TYPE 2 = Chasm (No floor, only ceiling)
                // (We haven't implemented chasm generation yet, but logic is ready)
                if (tile.type === 2) {
                    geo.ceilings.push({ 
                        x, z, y: this.globalCeiling, 
                        width: 1, depth: 1 
                    });
                }
            }
        }
    }

    generateVerticalSurfaces(geo) {
        // Iterate every tile and check neighbors
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                const current = this.map[z][x];
                
                // Determine Visual Height
                // Walls (Type 1) are treated as full height blocks
                const currentY = (current.type === 1) ? this.globalCeiling : current.height;

                // Check 4 directions
                this.checkNeighbor(x, z, x, z - 1, currentY, 'north', geo.walls);
                this.checkNeighbor(x, z, x, z + 1, currentY, 'south', geo.walls);
                this.checkNeighbor(x, z, x + 1, z, currentY, 'east', geo.walls);
                this.checkNeighbor(x, z, x - 1, z, currentY, 'west', geo.walls);
            }
        }
    }

    checkNeighbor(x, z, nx, nz, currentY, face, list) {
        const neighbor = this.getTile(nx, nz);
        
        // Treat Chasm as deep pit (-10)
        let neighborY = 0;
        if (neighbor.type === 1) neighborY = this.globalCeiling;
        else if (neighbor.type === 2) neighborY = -10;
        else neighborY = neighbor.height;

        // If I am higher than my neighbor, I need a wall to cover the side dirt
        if (currentY > neighborY) {
            
            // Optimization: Don't render internal faces between two solid walls
            if (currentY === this.globalCeiling && neighborY === this.globalCeiling) return;

            // The wall goes from Neighbor's top up to My top
            const height = currentY - neighborY;

            list.push({
                x, z, 
                y: neighborY, // Start at neighbor's level
                h: height,    // Go up to my level
                width: 1, depth: 1, 
                face: face
            });
        }
    }
}