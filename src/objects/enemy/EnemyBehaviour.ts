import { Canon } from "../items/Canon";
import { Scene } from "phaser";
import { Enemy } from "./Enemy";
import { Room, RoomState } from "../rooms/Room";
import { MainScene } from "../../scenes/MainScene";
export interface EnemyBehaviour {

    init(scene: Scene, enemy: Enemy): void;
    preUpdate(time: number, delta: number, scene: Scene, enemy: Enemy): void;
    destroy(scene: Scene): void;
}


export class DropCanonBehaviour implements EnemyBehaviour {
    private actionTimer: number = 0;
    private actionInterval: number = 2000;
    private canons: Phaser.Physics.Arcade.Group | null = null;
    private isDestroying: boolean = false;
    private direction: { x: number, y: number }[] =
        [{ x: 150, y: 150 },
        { x: 150, y: 0 },
        { x: 0, y: 150 },
        { x: -150, y: 150 },
        { x: -150, y: 0 },
        { x: 0, y: -150 },
        { x: 150, y: -150 },
        { x: 150, y: 0 },
        { x: 0, y: 150 },
        { x: -150, y: 150 }];

    constructor() {
        // Group will be initialized in init method
    }

    public init(scene: Scene, enemy: Enemy) {
        // Initialize the group with the scene
        this.canons = scene.physics.add.group({
            classType: Canon,
            runChildUpdate: true,
            maxSize: 10
        });
        scene.events.on(Room.ROOM_STATE_CHANGED, (room: Room) => {
            if (room.getState() === RoomState.ROOM_CLEARED) {
                this.destroy(scene);
            }
        });
    }

    public preUpdate(time: number, delta: number, scene: Scene, enemy: Enemy) {
        // Don't create new canons if we're in the process of destroying
        if (this.isDestroying) return;

        this.actionTimer += delta;
        if (this.actionTimer >= this.actionInterval) {
            if (scene && enemy && enemy.active && this.canons) {
                // Try to get a canon from the pool
                const canon = this.canons.getFirstDead() as Canon;
                const position = this.getValidPosition(enemy.x, enemy.y, scene);

                if (canon) {
                    // Reactivate existing canon
                    canon.activate(position.x, position.y);
                } else {
                    // Create new canon if pool is empty
                    const newCanon = new Canon(scene, position.x, position.y);
                    this.canons.add(newCanon);
                }
            }
            this.actionTimer = 0;
        }
    }

    private getValidPosition(x: number, y: number, scene: Scene): { x: number, y: number } {
        const position = { x: x, y: y };
        for (const direction of this.direction) {
            position.x += direction.x;
            position.y += direction.y;
            if (scene instanceof MainScene && scene.isPositionValid(position.x, position.y)) {
                return position;
            }
        }
        return { x: x, y: y };
    }
    private areAllCanonsInactive(): boolean {
        if (!this.canons) return true;

        let allInactive = true;
        this.canons.getChildren().forEach((canon: Phaser.GameObjects.GameObject) => {
            if (canon.active) {
                allInactive = false;
            }
        });
        return allInactive;
    }

    public destroy(scene: Scene): void {
        if (this.isDestroying) return;
        this.isDestroying = true;

        // If there are active canons, wait for them to explode
        if (!this.areAllCanonsInactive()) {
            // Check every 100ms if all canons are inactive
            const checkInterval = scene?.time.addEvent({
                delay: 100,
                callback: () => {
                    if (this.areAllCanonsInactive()) {
                        checkInterval?.destroy();
                        this.finalizeDestroy();
                    }
                },
                loop: true
            });
        } else {
            this.finalizeDestroy();
        }
    }

    private finalizeDestroy(): void {
        console.log('Finalizing destroy', this.canons);
        if (this.canons) {
            this.canons.clear(true, true);
            this.canons.destroy();
            this.canons = null;
        }
    }
}