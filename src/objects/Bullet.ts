import { Scene, Physics } from 'phaser';

// Extend Physics.Arcade.Sprite for physics and automatic updates
export class Bullet extends Physics.Arcade.Sprite {
    // Removed redundant body declaration, it's inherited
    private speed: number = 150; // Bullet speed

    constructor(scene: Scene, x: number, y: number) {
        // Call Sprite constructor (use __WHITE texture key for tinting)
        super(scene, x, y, '__WHITE');

        // Add to scene's display list but NOT update list initially
        scene.add.existing(this);
        // Enable physics but keep it inactive initially
        scene.physics.world.enable(this);

        // Initial visual setup (will be confirmed in fire method)
        this.setDisplaySize(10, 10);
        this.setTint(0xff0000); // Red tint
        this.setOrigin(0.5, 0.5); // Center the origin

        // Initial physics setup (cast to Arcade.Body)
        const body = this.body as Physics.Arcade.Body;
        body.setCollideWorldBounds(false); // Don't stop at bounds
        body.onWorldBounds = true;       // But detect when hitting bounds
        body.setAllowGravity(false);
        body.setBounce(0);

        // Deactivate by default
        this.deactivate();
    }

    // Method to fire the bullet from a specific position towards an angle
    fire(x: number, y: number, angle: number): void {
        // 1. Activate the GameObject
        this.setActive(true);
        this.setVisible(true);

        // 2. Enable the physics body
        (this.body as Physics.Arcade.Body).setEnable(true);

        // 3. Set position *after* enabling
        this.setPosition(x, y);
        // Make sure the body's internal position is also synced
        (this.body as Physics.Arcade.Body).reset(x, y);

        // 4. Ensure physics properties are correct for an active bullet
        const body = this.body as Physics.Arcade.Body;
        body.setCollideWorldBounds(false);
        body.onWorldBounds = true;
        body.setAllowGravity(false);
        body.setBounce(0);

        // 5. Calculate and set velocity manually
        const vx = Math.cos(angle) * this.speed;
        const vy = Math.sin(angle) * this.speed;
        body.setVelocity(vx, vy);
        
        // 6. Ensure visual properties
        this.setDisplaySize(10, 10);
        this.setTint(0xff0000);
    }

    // Method to deactivate the bullet (return to pool)
    deactivate(): void {
        // 1. Deactivate GameObject
        this.setActive(false);
        this.setVisible(false);

        // 2. Disable physics body
        const body = this.body as Physics.Arcade.Body;
        if (body) {
            body.setEnable(false);
            body.setVelocity(0, 0); // Explicitly stop motion
        }
    }

    // Override preUpdate to check for world bounds
    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);

        const body = this.body as Physics.Arcade.Body;
        
        if (this.active && body.checkWorldBounds()) {
            this.deactivate();
        }
    }
} 