export class GreedyMesher {
    constructor(mapData, wallHeight = 4) {
        this.map = mapData; 
        this.height = mapData.length;
        this.width = mapData[0].length;
        this.defaultCeiling = wallHeight; // Fallback
    }

    getTile(x, z) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            return { type: 1, height: this.defaultCeiling, ceiling: this.defaultCeiling }; 
        }
        return this.map[z][x];
    }

    generateGeometry() {
        const geometry = {
            floors: [],
            ceilings: [],
            walls: [] 
        };

        this.generateHorizontalSurfaces(geometry);
        this.generateVerticalSurfaces(geometry);

        return geometry;
    }

    generateHorizontalSurfaces(geo) {
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.map[z][x];
                
                // Floor
                if (tile.type === 0) {
                    geo.floors.push({ x, z, y: tile.height, width: 1, depth: 1 });
                    geo.ceilings.push({ x, z, y: tile.ceiling, width: 1, depth: 1 });
                }
                
                // Chasm (Ceiling only)
                if (tile.type === 2) {
                    geo.ceilings.push({ x, z, y: tile.ceiling, width: 1, depth: 1 });
                }
            }
        }
    }

    generateVerticalSurfaces(geo) {
        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                const current = this.map[z][x];
                
                // Determine Effective Floor Y (for bottom walls)
                let currentFloorY;
                if (current.type === 1) currentFloorY = current.ceiling; // Walls act as filled blocks up to ceiling
                else if (current.type === 2) currentFloorY = -10;        // Chasms are deep
                else currentFloorY = current.height;

                const currentCeilY = current.ceiling;

                // Check neighbors
                this.checkNeighbor(x, z, x, z - 1, currentFloorY, currentCeilY, 'north', geo.walls);
                this.checkNeighbor(x, z, x, z + 1, currentFloorY, currentCeilY, 'south', geo.walls);
                this.checkNeighbor(x, z, x + 1, z, currentFloorY, currentCeilY, 'east', geo.walls);
                this.checkNeighbor(x, z, x - 1, z, currentFloorY, currentCeilY, 'west', geo.walls);
            }
        }
    }

    checkNeighbor(x, z, nx, nz, currentFloorY, currentCeilY, face, list) {
        const neighbor = this.getTile(nx, nz);
        
        let neighborFloorY;
        if (neighbor.type === 1) neighborFloorY = neighbor.ceiling; 
        else if (neighbor.type === 2) neighborFloorY = -10;
        else neighborFloorY = neighbor.height;
        
        const neighborCeilY = neighbor.ceiling;

        // 1. BOTTOM WALLS
        // If I am higher than my neighbor, I need a wall going DOWN
        if (currentFloorY > neighborFloorY) {
            // Don't render inside solid walls
            if (currentFloorY === neighborFloorY) return; // (Should be covered by > check but safety)

            const height = currentFloorY - neighborFloorY;
            list.push({
                x, z, 
                y: neighborFloorY,
                h: height,
                width: 1, depth: 1, face: face
            });
        }

        // 2. TOP WALLS (Facade)
        // If my ceiling is LOWER than neighbor's ceiling (and neighbor is empty air),
        // I need a wall going UP from my ceiling to neighbor's ceiling.
        // Wait, careful with orientation.
        // If I am standing in a TALL room looking at a SHORT room, I see the wall above the short room's ceiling.
        // So, if Neighbor Ceil > Current Ceil, generate wall on CURRENT tile from Current Ceil to Neighbor Ceil.
        
        // Note: We only generate if current tile is NOT solid wall (walls are filled top-to-bottom already)
        // Actually, if current is floor, we see the wall above us.
        
        if (neighbor.type !== 1 && currentCeilY < neighborCeilY) {
             const height = neighborCeilY - currentCeilY;
             list.push({
                 x, z,
                 y: currentCeilY,
                 h: height,
                 width: 1, depth: 1, face: face
             });
        }
    }
}