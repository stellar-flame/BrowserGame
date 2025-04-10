import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';
import { Bullet } from './Bullet';

export class RangedEnemy extends Enemy {
  private bullets: Physics.Arcade.Group;
  private lastFired: number = 0;
  private fireRate: number = 2000; // Fire every 2 seconds

  constructor(scene: Scene, x: number, y: number, id: string) {
    super(scene, x, y, id);
    this.setTexture('ranged-enemy-sprite'); // Use a specific sprite for this enemy type
    this.setTint(0xff00ff); // Optional: Set a specific tint

    // Initialize bullets group
    this.bullets = scene.physics.add.group({ classType: Bullet, maxSize: 10 });
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    // Check if it's time to fire
    if (time - this.lastFired > this.fireRate) {
      this.fire();
      this.lastFired = time;
    }
  }

  private fire() {
    const bullet = this.bullets.get() as Bullet;
    if (bullet) {
      // Calculate angle to player (assuming player is at a fixed position for simplicity)
      const angle = Phaser.Math.Angle.Between(this.x, this.y, 400, 300); // Example player position
      bullet.fire(this.x, this.y, angle);
    }
  }
} 