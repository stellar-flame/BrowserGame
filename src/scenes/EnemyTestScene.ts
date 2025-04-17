import { EnemyFactory } from "../objects/enemy/EnemyFactory";
import { Player } from "../objects/Player";
import { EnemyType } from "../objects/enemy/EnemyFactory";
import { EnemyManager } from "../objects/enemy/EnemyManager";
import { Room } from "../objects/rooms/Room";
import { MainScene } from "./MainScene";


export class EnemyTestScene extends MainScene {
    private enemyType: EnemyType = 'ZOMBIE'; // Default enemy type to spawn
    private enemyTypeText!: Phaser.GameObjects.Text;

    constructor() {
        super('EnemyTestScene');
    }

    create() {
        super.create();
        this.player.setPosition(1400, 300);

        // Add keyboard input
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', () => {
                this.spawnEnemy(this.player);
            });

            this.input.keyboard.on('keydown-M', () => {
                this.toggleEnemyType();
            });
        }
    }

    protected setupEnemies() {
        this.enemyManager = new EnemyManager(this);
    }

    private toggleEnemyType() {
        switch (this.enemyType) {
            case 'ZOMBIE':
                this.enemyType = 'SKELETON';
                break;
            case 'SKELETON':
                this.enemyType = 'NINJA';
                break;
            case 'NINJA':
                this.enemyType = 'ZOMBIE';
                break;
        }
        this.enemyTypeText.setText(`Enemy Type: ${this.enemyType}`);
    }

    private spawnEnemy(player: Player) {
        if (!this.enemyManager) {
            throw new Error('EnemyManager not initialized');
        }
        const x = 1100;
        const y = 300
        // Create enemy based on current type
        const enemy = EnemyFactory.createEnemy(
            this,
            this.enemyType,
            x,
            y,
            `enemy_${this.enemyManager.getEnemies().getLength()}`
        );

        enemy.setPlayer(player);

        this.events.emit(Room.ENEMY_CREATED, { enemy });
        console.log(`Spawned ${this.enemyType} enemy at (${x}, ${y})`);
    }
}