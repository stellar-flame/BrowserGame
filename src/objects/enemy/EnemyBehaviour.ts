import { Canon } from "../items/Canon";
import { Scene } from "phaser";
import { Enemy } from "./Enemy";
import { MainScene } from "../../scenes/MainScene";

export interface EnemyBehaviour {
    init(scene: Scene, enemy: Enemy): void;
    preUpdate(time: number, delta: number): void;
}


export class DropCanonBehaviour implements EnemyBehaviour {
    private actionTimer: number = 0;
    private actionInterval: number = 3000;
    private enemy: Enemy | null = null;
    private scene: Scene | null = null;

    public init(scene: Scene, enemy: Enemy) {
        this.scene = scene;
        this.enemy = enemy;
    }

    public preUpdate(time: number, delta: number) {
        this.actionTimer += delta;
        if (this.actionTimer >= this.actionInterval) {
            if (this.scene && this.enemy) {
                new Canon(this.scene, this.enemy.x, this.enemy.y);
            }
            this.actionTimer = 0;
        }
    }

}