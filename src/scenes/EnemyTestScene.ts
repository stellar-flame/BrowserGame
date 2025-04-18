import { EnemyFactory } from "../objects/enemy/EnemyFactory";
import { Player } from "../objects/player/Player";
import { EnemyType } from "../objects/enemy/EnemyFactory";
import { EnemyManager } from "../objects/enemy/EnemyManager";
import { Room } from "../objects/rooms/Room";
import { MainScene } from "./MainScene";
import { MovementManager } from "../objects/enemy/MovementManager";


export class EnemyTestScene extends MainScene {

    private index: number = 0;
    private count: number = 0;
    private enemyTypes: string[] = ['ZOMBIE', 'SKELETON', 'NINJA', 'CHOMPER'];
    private enemyType: string = this.enemyTypes[this.index];

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
        this.movementManager = new MovementManager(this, this.player);
        this.enemyManager = new EnemyManager(this, this.player);
    }

    private toggleEnemyType() {
        this.index = (this.index + 1) % this.enemyTypes.length;
        this.enemyType = this.enemyTypes[this.index];
    }

    private spawnEnemy(player: Player) {
        this.count++;
        
        if (!this.enemyManager) {
            throw new Error('EnemyManager not initialized');
        }
        const x = 1100;
        const y = 300
        // Create enemy based on current type

        this.getRoomManager()?.getCurrentRoom()?._testSpawnEnemies(x, y, this.enemyType as EnemyType, this.count.toString());
       
         console.log(`Spawned ${this.enemyType} enemy at (${x}, ${y})`);
    }
}