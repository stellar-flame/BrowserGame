import { Scene, Tilemaps, GameObjects } from 'phaser';
import EasyStar from 'easystarjs';

export class PathfindingGrid {
  private static instance: PathfindingGrid | null = null;
  private grid: number[][] | null = null;
  private bufferedGrid: number[][] | null = null;
  private easystar: EasyStar.js = new EasyStar.js();
  private gridSize: number = 32; // Tile size in pixels
  private bufferSize: number = 1; // Buffer size around walls
  private gridLabels: GameObjects.Text[] = [];
  private isCalculatingPath: boolean = false;

  private constructor() {}

  public static getInstance(): PathfindingGrid {
    if (!PathfindingGrid.instance) {
      PathfindingGrid.instance = new PathfindingGrid();
    }
    return PathfindingGrid.instance;
  }

  public initialize(scene: Scene, map: Tilemaps.Tilemap, wallsLayer: Tilemaps.TilemapLayer): void {
    if (this.grid && this.bufferedGrid) {
      // Grid already initialized
      return;
    }

    // Create the base grid
    this.grid = this.createBaseGrid(map, wallsLayer);
    
    // Create the buffered grid
    this.bufferedGrid = this.createBufferedGrid(this.grid, map.width, map.height);
    
    // Configure EasyStar
    this.configureEasyStar();
    
    // Debug output
    this.debugGrid(this.bufferedGrid);
    
    // Draw grid labels
    // this.drawGridLabels(scene, map.width, map.height);
  }

  public debugBufferedGrid(): void {
    if (this.bufferedGrid) {
      this.debugGrid(this.bufferedGrid);
    }
  }

  public getGridX(x: number): number {
    return Math.floor(x / this.gridSize);
  }

  public getGridY(y: number): number {
    return Math.floor(y / this.gridSize);
  }

  public getWorldX(x: number): number {
    return x * this.gridSize;
  }

  public getWorldY(y: number): number {
    return y * this.gridSize;
  }
  
  public setIsCalculatingPath(isCalculating: boolean): void {
    this.isCalculatingPath = isCalculating;
  }
  
  public isPathCalculationInProgress(): boolean {
    return this.isCalculatingPath;
  }
  
  private drawGridLabels(scene: Scene, width: number, height: number): void {
    // Clear any existing labels
    this.clearGridLabels();
    
    // Create new labels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate world position for the label
        const worldX = this.getWorldX(x) + this.gridSize / 2;
        const worldY = this.getWorldY(y) + this.gridSize / 2;
        
        // Create the label text
        const label = scene.add.text(worldX, worldY, `${x},${y}`, {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 2, y: 2 }
        });
        
        // Center the text
        label.setOrigin(0.5);
        
        // Set depth to ensure labels are visible
        label.setDepth(10);
        
        // Store the label for later reference
        this.gridLabels.push(label);
      }
    }
  }
  
  public clearGridLabels(): void {
    // Remove all existing labels
    this.gridLabels.forEach(label => label.destroy());
    this.gridLabels = [];
  }
  
  public toggleGridLabels(scene: Scene): void {
    if (this.gridLabels.length > 0) {
      this.clearGridLabels();
    } else if (this.bufferedGrid) {
      const width = this.getGridWidth();
      const height = this.getGridHeight();
      this.drawGridLabels(scene, width, height);
    }
  }

  private createBaseGrid(map: Tilemaps.Tilemap, wallsLayer: Tilemaps.TilemapLayer): number[][] {
    const width = map.width;
    const height = map.height;
    
    // Create a grid for pathfinding
    const grid: number[][] = [];
    
    // Initialize grid with all tiles walkable (0)
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        row.push(0); // 0 = walkable
      }
      grid.push(row);
    }
    
    // Mark wall tiles as unwalkable (1)
    wallsLayer.forEachTile((tile) => {
      if (tile && tile.index > 0) { // Only mark as wall if tile index is greater than 0
        const tileX = tile.x;
        const tileY = tile.y;
        grid[tileY][tileX] = 1; // 1 = unwalkable
      }
    });
    
    return grid;
  }

  private createBufferedGrid(baseGrid: number[][], width: number, height: number): number[][] {
    const bufferedGrid: number[][] = JSON.parse(JSON.stringify(baseGrid)); // Deep copy
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (baseGrid[y][x] === 1) { // If this is a wall
          // Add buffer around the wall
          for (let by = -this.bufferSize; by <= this.bufferSize; by++) {
            for (let bx = -this.bufferSize; bx <= this.bufferSize; bx++) {
              const ny = y + by;
              const nx = x + bx;
              
              // Check if the buffer position is within bounds
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                // Mark as unwalkable (with a different value to distinguish from walls)
                bufferedGrid[ny][nx] = 2;
              }
            }
          }
        }
      }
    }
    
    return bufferedGrid;
  }

  private configureEasyStar(): void {
    if (!this.bufferedGrid) return;
    
    // Set the grid in EasyStar
    this.easystar.setGrid(this.bufferedGrid);
    
    // Set acceptable tiles (0 = walkable)
    this.easystar.setAcceptableTiles([0]);
    
    // Set diagonal movement to true for more natural paths
    this.easystar.enableDiagonals();
    
    // Set the iteration count to a reasonable value for performance
    this.easystar.setIterationsPerCalculation(1000);
  }

  public getEasyStar(): EasyStar.js {
    return this.easystar;
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  private debugGrid(grid: number[][]): void {
    // Log the grid to console for debugging
    let gridStr = "";
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        gridStr += grid[y][x] === 0 ? "." : (grid[y][x] === 1 ? "#" : "+");
      }
      gridStr += "\n";
    }
  }

  public getGridWidth(): number {
    return this.bufferedGrid ? this.bufferedGrid[0].length : 0;
  }
  
  public getGridHeight(): number {
    return this.bufferedGrid ? this.bufferedGrid.length : 0;
  }
} 