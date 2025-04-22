import { Scene } from "phaser";

export class Item extends Phaser.Physics.Arcade.Sprite {
    protected isCollected: boolean = false;
    protected isHovered: boolean = false;
    protected originalTint: number = 0xffffff;
    protected floatTween: Phaser.Tweens.Tween | null = null;
    protected glowEffect: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);

        // Add to scene
        scene.add.existing(this);

        // Enable physics
        scene.physics.add.existing(this);

        // Set up physics body
        if (this.body) {
            this.body.immovable = true;
            if (this.body instanceof Phaser.Physics.Arcade.Body) {
                this.body.setSize(16, 16);
                this.body.setBounce(0);
            }
        }

        // Set depth to ensure items are drawn above the background
        this.setDepth(0.2);

        // Set up interactive properties
        this.setInteractive();

        // Add hover effects
        this.on('pointerover', this.onMouseOver, this);
        this.on('pointerout', this.onMouseOut, this);

        // Create glow effect
        this.createGlowEffect();

        // Start floating animation
        this.startFloatingAnimation();
    }

    protected createGlowEffect(): void {
        this.glowEffect = this.scene.add.graphics();
        this.glowEffect.setDepth(this.depth - 0.01);

        // Update glow position
        this.scene.events.on('update', this.updateGlowPosition, this);
    }

    protected updateGlowPosition = (): void => {
        if (this.glowEffect && this.active) {
            this.glowEffect.clear();

            // Draw a pulsing glow
            const alpha = 0.3 + Math.sin(this.scene.time.now / 300) * 0.2;
            this.glowEffect.lineStyle(4, 0xffffff, alpha);
            this.glowEffect.strokeCircle(this.x, this.y, 16);
        }
    };

    protected startFloatingAnimation(): void {
        this.floatTween = this.scene.tweens.add({
            targets: this,
            y: this.y - 5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    protected onMouseOver(): void {
        if (!this.isCollected) {
            this.isHovered = true;
            this.setTint(0xffffff);

            // Add a subtle scale effect
            this.scene.tweens.add({
                targets: this,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                ease: 'Power2'
            });
        }
    }

    protected onMouseOut(): void {
        if (!this.isCollected) {
            this.isHovered = false;
            this.clearTint();

            // Reset scale
            this.scene.tweens.add({
                targets: this,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Power2'
            });
        }
    }

    public collect(): void {
        if (!this.isCollected) {
            this.isCollected = true;

            // Visual feedback when collected
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                scale: 1.5,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    // Emit the collected event with the item's position and data
                    this.scene.events.emit(this.getCollectEvent(), {
                        x: this.x,
                        y: this.y,
                        ...this.getCollectData()
                    });

                    // Clean up
                    this.cleanup();

                    // Disable active state to prevent further interactions
                    this.setActive(false);
                }
            });
        }
    }

    protected getCollectEvent(): string {
        return 'item-collected';
    }

    protected getCollectData(): { [key: string]: any } {
        return {};
    }

    public isItemCollected(): boolean {
        return this.isCollected;
    }

    public isItemHovered(): boolean {
        return this.isHovered;
    }

    protected cleanup(): void {
        // Stop the floating animation
        if (this.floatTween) {
            this.floatTween.stop();
            this.floatTween = null;
        }

        // Remove glow effect
        if (this.glowEffect) {
            this.glowEffect.destroy();
            this.glowEffect = null;
        }

        // Remove event listener
        this.scene.events.off('update', this.updateGlowPosition, this);
    }

    public destroy(fromScene?: boolean): void {
        this.cleanup();
        super.destroy(fromScene);
    }

}