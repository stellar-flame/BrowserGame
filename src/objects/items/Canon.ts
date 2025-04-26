import { MainScene } from "../../scenes/MainScene";

export class Canon extends Phaser.Physics.Arcade.Sprite {
    private actionTimer: number = 0;
    private actionInterval: number = 10000;
    public static readonly CANON_EXPLODE = 'canon-explode';


    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'canon');
        this.setScale(2);
        this.createAnimations();
        this.scene.add.existing(this);
        this.scene.physics.world.enable(this);
        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.setSize(16, 16);
            this.body.setBounce(0);
            this.body.immovable = true;
        }
        this.setupOverlap();

    }

    private setupOverlap() {
        const player = (this.scene as MainScene).getPlayer();
        this.scene.physics.add.overlap(this, player, this.handleOverlap, undefined, this);
        this.scene.physics.add.overlap(this, player.weapon.bullets as Phaser.Physics.Arcade.Group, this.handleOverlap, undefined, this);
    }

    private handleOverlap(canon: any, player: any) {
        console.log('handleOverlap canon', canon);
        this.explode();

    }

    createAnimations() {
        if (this.scene.anims.exists('canon-explode')) return;
        this.scene.anims.create({
            key: 'canon-explode',
            frames: this.scene.anims.generateFrameNames('canon', {
                start: 0,
                end: 2,
            }),
            frameRate: 10
        });
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.play('canon-explode', true);
        this.actionTimer += delta;
        if (this.actionTimer >= this.actionInterval) {
            this.explode();
            this.actionTimer = 0;
        }
    }

    public explode() {
        const player = (this.scene as MainScene).getPlayer();
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (distance < 50) {
            player.takeDamage(10);
        }
        this.scene.events.emit(Canon.CANON_EXPLODE, this.x, this.y);

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

        this.destroy();
    }

    destroy() {
        this.scene.anims.remove('canon');
        super.destroy();
    }

}