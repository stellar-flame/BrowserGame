import { Scene } from "phaser";
import { Player } from "../player/Player";
import { Enemy } from "./Enemy";
import { MainScene } from "../../scenes/MainScene";
import { PathfindingGrid } from "../pathfinding/PathfindingGrid";


export class MovementManager {
    private scene: Scene;
    private player: Player;
    private flankingPoints: { [key: string]: { x: number, y: number } } = {};
    private pathfindingGrid: PathfindingGrid;
    private targetReachedEnemies: Set<string> = new Set();
    private lastFlankingUpdate: number = -2000;
    private flankingUpdateInterval: number = 2000; // Update flanking points every 2 seconds


    constructor(scene: Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.pathfindingGrid = (this.scene as MainScene).getPathfindingGrid();
        console.log('lastFlankingUpdate', this.lastFlankingUpdate);
    }


    public updateFlankingPoints(enemies: Enemy[]): void {
        if (enemies.length === 0) return;
        const currentTime = Date.now();
        console.log('enemies', enemies, currentTime - this.lastFlankingUpdate);

        // Check for stuck enemies
        // Update flanking points periodically or when targets are reached
        if (currentTime - this.lastFlankingUpdate > this.flankingUpdateInterval ||
            this.targetReachedEnemies.size > 0) {
            console.log('Updating flanking points');
            this.flankingPoints = {};
            this.targetReachedEnemies.clear();
            this.lastFlankingUpdate = currentTime;


            enemies.forEach((enemy, i) => {
                const radius = enemy.weapon?.minDistance || 50;
                const angle = (Math.PI * 2 * i) / enemies.length;
                const x = Math.round(this.player.x + radius * Math.cos(angle));
                const y = Math.round(this.player.y + radius * Math.sin(angle));
                this.flankingPoints[enemy.id] = { x, y };
            });

        }
    }


    public assignFlankingPointsToEnemies(enemies: Enemy[]) {
        const easystar = this.pathfindingGrid.getEasyStar();

        for (const enemy of enemies) {
            // Skip dead enemies
            if (enemy.isEnemyDead()) continue;

            const point = this.flankingPoints[enemy.id];
            if (!point) {
                console.log('No point for enemy', enemy.id);
                continue;
            }

            // Check if enemy has reached its current target
            const currentTarget = this.getTargetPoint(enemy);
            if (currentTarget) {
                const distanceToTarget = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    currentTarget.x, currentTarget.y
                );

                // If enemy is close to its target, mark it for flanking point recalculation
                if (distanceToTarget < 10) {
                    this.targetReachedEnemies.add(enemy.id);
                }
            }

            const pointTileX = this.pathfindingGrid.getGridX(point.x);
            const pointTileY = this.pathfindingGrid.getGridY(point.y);
            const enemyTileX = this.pathfindingGrid.getGridX(enemy.x);
            const enemyTileY = this.pathfindingGrid.getGridY(enemy.y);

            // Check if point is within grid bounds
            if (!this.pathfindingGrid.isValidTile(pointTileX, pointTileY)) {
                console.log('Point outside grid bounds:', pointTileX, pointTileY);
                continue;
            }


            easystar.findPath(enemyTileX, enemyTileY, pointTileX, pointTileY, path => {
                let targetPoint = { x: point.x, y: point.y };
                if (!path || path.length === 0) {
                    console.log('No path to flanking point, finding new path');
                    targetPoint = this.attemptToFindPath(targetPoint, enemyTileX, enemyTileY) || targetPoint;
                    this.flankingPoints[enemy.id] = targetPoint;
                }

            });
            easystar.calculate();
        }
    }

    private attemptToFindPath(targetPoint: { x: number, y: number }, enemyTileX: number, enemyTileY: number): { x: number, y: number } | null {
        const easystar = this.pathfindingGrid.getEasyStar();
        let attempt = 0;
        const maxAttempts = 5;
        const tryPath = () => {
            if (attempt >= maxAttempts) {
                console.log('Failed to find any path after multiple attempts');
                return null;
            }
            const dx = targetPoint.x - enemyTileX;
            const dy = targetPoint.y - enemyTileY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Normalize direction vector
            const dirX = dx / distance;
            const dirY = dy / distance;

            const attemptDistance = Math.min(distance * 0.5, (attempt + 1) * 5);
            const targetX = Math.floor(enemyTileX + dirX * attemptDistance);
            const targetY = Math.floor(enemyTileY + dirY * attemptDistance);
            easystar.findPath(enemyTileX, enemyTileY, targetX, targetY, path => {
                if (path && path.length > 0) {
                    // console.log('Found path to', targetX, targetY, path);
                    return { x: targetX, y: targetY };
                }
            });
            easystar.calculate();
        }
        attempt++;
        tryPath();
        return null;
    }

    public getTargetPoint(enemy: Enemy): { x: number, y: number } | null {
        return this.flankingPoints[enemy.id];
    }
}