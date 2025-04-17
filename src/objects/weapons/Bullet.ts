import { Scene, Physics } from 'phaser';

// Extend Physics.Arcade.Sprite for physics and automatic updates
export class Bullet extends Physics.Arcade.Sprite {
    // Removed redundant body declaration, it's inherited
    private speed: number = 300; // Increased bullet speed to be faster than player movement
    private damage: number = 10; // Default damage amount

    constructor(scene: Scene, x: number, y: number, textureKey: string = '__WHITE') {
        // Call Sprite constructor with the provided texture
        super(scene, x, y, textureKey);

        // Add to scene's display list and update list
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Initial visual setup (will be confirmed in fire method)
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

    setSpeed(speed: number): void {
        this.speed = speed;
    }   
    
    // Method to set the damage amount
    setDamage(amount: number): void {
        this.damage = amount;
    }

    // Method to get the damage amount
    getDamage(): number {
        return this.damage;
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
        

        // 6. Calculate and set velocity manually
        const vx = Math.cos(angle) * this.speed;
        const vy = Math.sin(angle) * this.speed;
        body.setVelocity(vx, vy);
        
        // 7. Set rotation to match the angle
        this.setRotation(angle);
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