import { Scene, Physics } from 'phaser';

// Extend Physics.Arcade.Sprite for physics and preUpdate/update capabilities
export class Enemy extends Physics.Arcade.Sprite {
  // Removed redundant body declaration, it's inherited
  id: string; // Store the unique ID

  constructor(scene: Scene, x: number, y: number, id: string) {
    // Call Sprite constructor (use __WHITE texture key for tinting)
    super(scene, x, y, '__WHITE');

    this.id = id; // Assign the ID

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Make it look like the old rectangle
    this.setDisplaySize(32, 32);
    this.setTint(0xff00ff); // Purple tint
    this.setOrigin(0.5, 0.5); // Center the origin

    // Setup physics properties
    (this.body as Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.body as Physics.Arcade.Body).setImmovable(false); // Enemies should be movable
    (this.body as Physics.Arcade.Body).setBounce(1); // Optional: Make them bounce off each other/walls slightly
  }

  // We can add enemy-specific update logic here later if needed.
  // For now, movement logic based on player distance will remain in MainScene's update loop
  // as it requires knowledge of the player's position.
  // preUpdate(time: number, delta: number) {
  //   super.preUpdate(time, delta);
  //   // Potential future logic: patrol patterns, state changes?
  // }

  // Example method (not used yet, but shows potential)
  public takeDamage() {
    // Logic for when the enemy is hit
    console.log(`Enemy ${this.id} took damage`);
  }
}
