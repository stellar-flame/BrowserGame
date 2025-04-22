import { Scene } from 'phaser';
import { Item } from './Item';

export class Powerup extends Item {
    private duration: number = 5000;
    private speedBoost: number = 1.5;

    public static readonly COLLECTED_EVENT = 'powerup-collected';

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'powerup');
        console.log('powerup');

    }

    protected getCollectData(): { [key: string]: any } {
        return {
            duration: this.duration,
            speedBoost: this.speedBoost
        };
    }
    public getSpeedBoost(): number {
        return this.speedBoost;
    }
    public setSpeedBoost(speedBoost: number): void {
        this.speedBoost = speedBoost;
    }

    protected getCollectEvent(): string {
        return Powerup.COLLECTED_EVENT;
    }
}


