import { Scene } from "phaser";
import { Player } from "../player/Player";
import { Enemy } from "./Enemy";
import { MainScene } from "../../scenes/MainScene";
import { PathfindingGrid } from "../pathfinding/PathfindingGrid";
import { RangedEnemy } from "./RangedEnemy";
import { MeleeEnemy } from "./MeleeEnemy";
import { EnemySpawner } from "../enemy/EnemySpawner";
export class MovementManager {
    private scene: Scene;
    private player: Player;
    private pathfindingGrid: PathfindingGrid;
    private targetReachedEnemies: Set<string> = new Set();
    private lastFlankingUpdate: number = -2000;
    private flankingUpdateInterval: number = 2000; // Update flanking points every 2 seconds
    private enemyCreated: boolean = false;


    constructor(scene: Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.pathfindingGrid = (this.scene as MainScene).getPathfindingGrid();
        this.scene.events.on(Enemy.TARGET_REACHED, this.onTargetReached, this);
        this.scene.events.on(EnemySpawner.ENEMY_CREATED, (data: { enemy: Enemy }) => {
            this.enemyCreated = true;
        }, this);
    }

    private onTargetReached(data: { enemy: Enemy }): void {
        this.targetReachedEnemies.add(data.enemy.id);
    }


    public updateFlankingPoints(enemies: Enemy[]): void {
        if (enemies.length === 0) return;
        const currentTime = Date.now();

        if (this.enemyCreated || currentTime - this.lastFlankingUpdate > this.flankingUpdateInterval || this.targetReachedEnemies.size > 0) {
            this.enemyCreated = false;
            this.targetReachedEnemies.clear();
            this.lastFlankingUpdate = currentTime;
            this.calculateFlankingPoints(enemies.filter(enemy => enemy instanceof RangedEnemy), 100);
            this.calculateFlankingPoints(enemies.filter(enemy => enemy instanceof MeleeEnemy), 60);
        }
    }

    public async calculateFlankingPoints(enemies: Enemy[], radius: number) {
        if (enemies.length === 0) return;

        const numberOfPoints = Math.max(8, enemies.length * 4 + 4, 10);

        // Generate all possible points around the player
        const points: { x: number, y: number }[] = [];
        for (let i = 0; i < numberOfPoints; i++) {
            const angle = (Math.PI * 2 * i) / numberOfPoints;
            const x = Math.round(this.player.x + radius * Math.cos(angle));
            const y = Math.round(this.player.y + radius * Math.sin(angle));
            if (this.pathfindingGrid.isTileWalkable(this.pathfindingGrid.getGridX(x), this.pathfindingGrid.getGridY(y))) {
                points.push({ x, y });
            }
        }

        // Keep track of which points have been assigned
        const assignedEnemies = new Set<Enemy>();

        points.sort(() => Math.random() - 0.5);
        let pointsToRemove: { x: number, y: number }[] = [];

        while (assignedEnemies.size < enemies.length && points.length > 0) {
            for (const point of points) {
                const found = await this.findPathForEnemy(enemies, point, assignedEnemies);
                if (!found) {
                    pointsToRemove.push(point);
                }
            }
            for (const point of pointsToRemove) {
                points.splice(points.indexOf(point), 1);
            }
            pointsToRemove = [];
        }
    }


    private async findPathForEnemy(enemies: Enemy[], point: { x: number, y: number }, assignedEnemies: Set<Enemy>): Promise<boolean> {
        const easystar = this.pathfindingGrid.getEasyStar();
        for (const enemy of enemies) {
            if (!assignedEnemies.has(enemy)) {
                const enemyTileX = this.pathfindingGrid.getGridX(enemy.x);
                const enemyTileY = this.pathfindingGrid.getGridY(enemy.y);
                const pointTileX = this.pathfindingGrid.getGridX(point.x);
                const pointTileY = this.pathfindingGrid.getGridY(point.y);
                const pathPromise = new Promise<boolean>((resolve) => {
                    easystar.findPath(enemyTileX, enemyTileY, pointTileX, pointTileY, (path) => {
                        if (path && path.length > 0) {
                            enemy.setPath(path);
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    });
                });

                easystar.calculate();
                const hasPath = await pathPromise;
                if (hasPath) {
                    assignedEnemies.add(enemy);
                    return true;
                }
            }
        }
        return false;
    }



    public findAPointAroundPlayer(): { x: number, y: number } | null {

        const dir = [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }];
        for (const d of dir) {
            const x = Math.round(this.player.x + d.x * 50);
            const y = Math.round(this.player.y + d.y * 50);
            const xGrid = this.pathfindingGrid.getGridX(x);
            const yGrid = this.pathfindingGrid.getGridY(y);
            if (this.pathfindingGrid.isTileWalkable(xGrid, yGrid)) {
                return { x, y };
            }
        }
        return { x: this.player.x, y: this.player.y };;
    }
}