import { Scene } from 'phaser';
import { MainScene } from "../../scenes/MainScene";
import { Enemy } from "../enemy/Enemy";
import { Weapon } from "./Weapon";
import { DeployableWeapon } from "./DeployableWeapon";
import { Room } from "../rooms/Room";

export class DeployableWeaponInstance extends Phaser.Physics.Arcade.Sprite {
    private weapon: Weapon;
    private targetEnemy: Enemy | null = null;
    private targetUpdateTimer: number = 0;
    private targetUpdateInterval: number = 500; // Update target every 500ms
    private respawnTimer: number = 0;
    private respawnInterval: number = 5000; // Respawn every 5 seconds
    private room: Room;
    private shooter: any;

    public static create(scene: Scene, shooter: any, room: Room): void {
        const weapon = shooter.getDeployableWeapon();
        if (!weapon) return;
        const spawnPoint = this.getSpawnPoint(scene, shooter);
        if (!spawnPoint) return;
        new DeployableWeaponInstance(scene, spawnPoint.x, spawnPoint.y, weapon as DeployableWeapon, shooter, room);
    }

    constructor(scene: Phaser.Scene, x: number, y: number, weapon: DeployableWeapon, shooter: any, room: Room) {
        super(scene, x, y, weapon.config.displayConfig?.sprite || 'turret');
        this.setScale(1.5);
        this.scene.add.existing(this);
        this.scene.physics.world.enable(this);
        this.room = room;
        this.shooter = shooter;

        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.setSize(32, 32);
            this.body.setBounce(0);
            this.body.immovable = true;
        }

        // Create weapon for the turret
        this.weapon = weapon;
        this.createSpawnEffect();

        this.createAnimation();
    }

    private createAnimation() {
        if (this.scene.anims.exists('turret-animation')) return;
        this.scene.anims.create({
            key: 'turret-animation',
            frames: this.scene.anims.generateFrameNumbers(this.weapon.config.displayConfig?.animation || 'turret', {
                start: 0,
                end: 3
            }),
            frameRate: 10,
            repeat: -1
        });
    }
    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.play('turret-animation', true);

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

        // Handle respawn
        this.respawnTimer += delta;
        if (this.respawnTimer >= this.respawnInterval) {
            this.respawnTimer = 0;
            if (!this.room.isRoomCleared()) {
                this.respawn();
            }
            else {
                this.destroy();
            }
        }
    }

    private static getSpawnPoint(scene: Scene, shooter: any): { x: number, y: number } | null {
        const tries = 10;
        for (let i = 0; i < tries; i++) {
            // Get player position with random offset
            const offsetX = Phaser.Math.Between(-100, 100);
            const offsetY = Phaser.Math.Between(-100, 100);
            const x = shooter.x + offsetX;
            const y = shooter.y + offsetY;
            const points = [
                { x: x - 100, y },
                { x: x + 100, y },
                { x, y: y - 100 },
                { x, y: y + 100 },
                { x: x - 100, y: y - 100 },
                { x: x + 100, y: y - 100 },
                { x: x - 100, y: y + 100 },
                { x: x + 100, y: y + 100 }
            ];
            points.sort(() => Math.random() - 0.5);

            for (const point of points) {
                const pathfindingGrid = (scene as MainScene).getPathfindingGrid();
                const gridX = pathfindingGrid.getGridX(point.x);
                const gridY = pathfindingGrid.getGridY(point.y);
                const isWalkable = pathfindingGrid.isTileWalkable(gridX, gridY);
                if (isWalkable) {
                    return point;
                }
            }
        }
        return null;
    }

    private respawn() {
        const mainScene = this.scene as MainScene;
        const spawnPoint = DeployableWeaponInstance.getSpawnPoint(mainScene, this.shooter);
        if (!spawnPoint) return;

        // Create new instance
        new DeployableWeaponInstance(this.scene, spawnPoint.x, spawnPoint.y, this.weapon as DeployableWeapon, this.shooter, this.room);

        this.destroy();
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
        this.scene.time.delayedCall(100, () => {
            super.destroy();
        });
    }

} 