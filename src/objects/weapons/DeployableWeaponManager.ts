import { Scene } from 'phaser';
import { Player } from '../player/Player';
import { Room, RoomState } from '../rooms/Room';
import { DeployableWeaponInstance } from './DeployableWeaponInstance';
import { DeployableWeapon } from './DeployableWeapon';


export class DeployableWeaponManager {
    private scene: Scene;
    private player: Player;
    private instance: DeployableWeaponInstance | null = null;
    private room: Room | null = null;

    private timeSinceLastSpawn: number = 0;
    private spawnInterval: number = 5000;
    constructor(scene: Scene, player: Player) {
        this.scene = scene;
        this.player = player;

        this.scene.events.on(Room.ROOM_STATE_CHANGED, (room: Room, state: RoomState) => {
            if (state === RoomState.TRIGGERED) {
                this.room = room;
                this.spawnWeaponNearPlayer();
            }
        });

    }

    public preUpdate(time: number, delta: number) {
        if (!this.room) return;
        this.timeSinceLastSpawn += delta;
        if (this.timeSinceLastSpawn >= this.spawnInterval) {
            if (this.instance) {
                this.destroyWeaponInstance();
            }
            if (!this.room.isRoomCleared()) {
                this.spawnWeaponNearPlayer();
                this.timeSinceLastSpawn = 0;
            }
        }
    }

    public spawnWeaponNearPlayer() {
        if (!this.player) return;


        // Get player position
        const playerX = this.player.x;
        const playerY = this.player.y;

        // Spawn turret near player (offset by a random amount)
        const offsetX = Phaser.Math.Between(-100, 100);
        const offsetY = Phaser.Math.Between(-100, 100);


        const weapon = this.player.getDeployableWeapon();
        if (!weapon) return;
        this.instance = new DeployableWeaponInstance(this.scene, playerX + offsetX, playerY + offsetY, weapon as DeployableWeapon);
    }



    public destroyWeaponInstance() {
        if (this.instance) {
            this.instance.destroy();
            this.instance = null;
        }
    }

    public destroy() {
        this.destroyWeaponInstance();
    }
} 