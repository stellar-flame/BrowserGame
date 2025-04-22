import { Scene } from 'phaser';
import { Item } from './Item';

export class Potion extends Item {
  private healAmount: number = 20;

  public static readonly COLLECTED_EVENT = 'potion-collected';
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'potion');
  }

  protected getCollectData(): { [key: string]: any } {
    return {
      healAmount: this.healAmount
    };
  }

  public getHealAmount(): number {
    return this.healAmount;
  }

  public setHealAmount(healAmount: number): void {
    this.healAmount = healAmount;
  }

  protected getCollectEvent(): string {
    return Potion.COLLECTED_EVENT;
  }

} 