import { Scene } from 'phaser';
import { Potion } from './Potion';
import { Player } from '../player/Player';
import { Room } from '../rooms/Room';
import { Barrel } from '../props/Barrel';

export class PotionManager {
  private scene: Scene;
  private potions: Phaser.Physics.Arcade.Group;
  private player: Player | null = null;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private maxPotions: number = 3;
  private roomsToSpawnPotions: string[] = ['2'];

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    // Create potions group
    this.potions = scene.physics.add.group({
      classType: Potion,
      maxSize: this.maxPotions,
      runChildUpdate: true
    });

    // Listen for potion collected events
    scene.events.on(Barrel.SMASHED_EVENT, (data: { x: number, y: number, barrel: Barrel, spawnPotion: boolean }) => {
      if (data.spawnPotion) {
        console.log('Spawning potion');
        this.spawnPotion(data.x, data.y);
      }
    });


  }


  // Set spawn points for potions
  public setSpawnPoints(rooms: Map<string, Room>): void {
    for (const rommId of this.roomsToSpawnPotions) {
      const room = rooms.get(rommId);
      const barrel = room?.getBarrels()[Phaser.Math.Between(0, room.getBarrels().length - 1)];
      if (barrel) {
        barrel.addPotion();
      }
    }
  }


  // Spawn a potion at a random spawn point
  private spawnPotion(x: number, y: number): void {
    // Check if we've reached the maximum number of potions
    if (this.potions.countActive(true) >= this.maxPotions) {
      return;
    }

    // Create a new potion
    const potion = this.potions.get(x, y) as Potion;

    if (potion) {
      // Set random heal amount between 15 and 25
      const healAmount = Phaser.Math.Between(15, 25);
      potion.setHealAmount(healAmount);

      // Make the potion visible and active
      potion.setActive(true);
      potion.setVisible(true);
    }
  }

  public setupCollisions(): void {
    if (this.player) {
      this.scene.physics.add.overlap(this.player, this.potions, this.handlePlayerPotionOverlap, undefined, this);
    }
  }

  // Handle potion collected event
  private handlePotionCollected(data: { x: number; y: number; healAmount: number }): void {
    // Heal the player if available
    if (this.player) {
      this.player.heal(data.healAmount);

      // Visual feedback
      this.showHealEffect(data.x, data.y, data.healAmount);
    }
  }

  // Show a visual heal effect
  private showHealEffect(x: number, y: number, amount: number): void {
    // Create a text object to show the heal amount
    const healText = this.scene.add.text(x, y, `+${amount}`, {
      fontSize: '16px',
      color: '#00ff00',
      fontStyle: 'bold'
    });

    // Animate the text
    this.scene.tweens.add({
      targets: healText,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        healText.destroy();
      }
    });
  }


  // Handle collision between player and potion
  private handlePlayerPotionOverlap(player: any, potionObj: any): void {
    console.log('Player potion overlap');
    const potion = potionObj as Potion;
    if (!potion.isPotionCollected()) {
      potion.collect();
    }
  }

  // Clean up resources
  public destroy(): void {
    // Stop the spawn timer
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null;
    }

    // Remove event listener
    this.scene.events.off(Potion.COLLECTED_EVENT, this.handlePotionCollected, this);

    // Destroy all potions
    this.potions.clear(true, true);
  }
} 