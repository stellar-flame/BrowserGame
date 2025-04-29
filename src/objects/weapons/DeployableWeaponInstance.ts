import { MainScene } from "../../scenes/MainScene";
import { Enemy } from "../enemy/Enemy";
import { Weapon } from "./Weapon";
import { DeployableWeapon } from "./DeployableWeapon";

export class DeployableWeaponInstance extends Phaser.Physics.Arcade.Sprite {
    private weapon: Weapon;
    private targetEnemy: Enemy | null = null;
    private targetUpdateTimer: number = 0;
    private targetUpdateInterval: number = 500; // Update target every 500ms

    constructor(scene: Phaser.Scene, x: number, y: number, weapon: DeployableWeapon) {
        super(scene, x, y, weapon.config.displayConfig?.sprite || 'turret'); // Using canon sprite for now
        this.setScale(2);
        this.scene.add.existing(this);
        this.scene.physics.world.enable(this);

        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.setSize(32, 32);
            this.body.setBounce(0);
            this.body.immovable = true;
        }

        // Create weapon for the turret
        this.weapon = weapon;
        this.createSpawnEffect();
    }


    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        // Update target enemy
        this.targetUpdateTimer += delta;
        if (this.targetUpdateTimer >= this.targetUpdateInterval) {
            this.findNearestEnemy();
            this.targetUpdateTimer = 0;
        }

        // Attack target enemy if found
        if (this.targetEnemy && this.weapon) {
            this.weapon.fireAtTarget(this, this.targetEnemy);
        }
    }

    private findNearestEnemy() {
        const mainScene = this.scene as MainScene;
        const room = mainScene.getRoomManager().getRoomAtPosition(this.x, this.y);

        if (!room) return;

        const enemies = room.getEnemies();
        if (enemies.length === 0) return;

        let nearestEnemy: Enemy | null = null;
        let nearestDistance = Number.MAX_VALUE;

        for (const enemy of enemies) {
            const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }

        this.targetEnemy = nearestEnemy;
    }

    private createSpawnEffect() {
        // Create a flash effect
        const flash = this.scene.add.graphics();
        flash.fillStyle(0x00ff00, 0.5); // Green color
        flash.fillCircle(this.x, this.y, 20);

        // Fade out the flash
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });

        // Create particle effect
        const particles = this.scene.add.particles(0, 0, 'particle', {
            x: this.x,
            y: this.y,
            speed: { min: 50, max: 100 },
            scale: { start: 0.5, end: 0 },
            lifespan: 800,
            quantity: 10,
            tint: 0x00ff00, // Green color
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            gravityY: 0
        });

        // Emit particles for a short duration
        particles.explode(10, this.x, this.y);

        // Destroy particles after animation completes
        this.scene.time.delayedCall(500, () => {
            particles.destroy();
        });
    }


    private createDestroyEffect() {
        // Create explosion particles
        const particles = this.scene.add.particles(0, 0, 'particle', {
            x: this.x,
            y: this.y,
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            lifespan: 800,
            quantity: 20,
            tint: 0xff5500, // Orange-red color
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            gravityY: 0
        });

        // Emit particles for a short duration
        particles.explode(20, this.x, this.y);

        // Destroy particles after animation completes
        this.scene.time.delayedCall(800, () => {
            particles.destroy();
        });
    }


    public destroy() {
        this.createDestroyEffect();
        super.destroy();
    }

} 