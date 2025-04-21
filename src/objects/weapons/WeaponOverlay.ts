import { Scene, GameObjects } from 'phaser';
import { Weapon } from './Weapon';

export class WeaponOverlay {
    private scene: Scene;
    private container: GameObjects.Container;
    private weaponIcon: GameObjects.Sprite;
    private weaponName: GameObjects.Text;
    private weaponStats: GameObjects.Text;
    private background: GameObjects.Rectangle;

    constructor(scene: Scene) {
        this.scene = scene;

        // Create container for all overlay elements
        this.container = scene.add.container(scene.cameras.main.width - 180, 5);
        this.container.setScrollFactor(0); // Make it fixed to the screen
        this.container.setDepth(100); // Ensure it's above other elements

        // Create semi-transparent background with reduced opacity
        this.background = scene.add.rectangle(0, 0, 140, 60, 0xffffff, 0.2);
        this.background.setOrigin(0, 0);
        this.container.add(this.background);

        // Create weapon icon
        this.weaponIcon = scene.add.sprite(25, 25, 'weapon-upgrade');

        this.weaponIcon.setScale(1);
        this.container.add(this.weaponIcon);

        // Create weapon name text
        this.weaponName = scene.add.text(55, 5, '', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial',
        });
        this.container.add(this.weaponName);

        // Create weapon stats text
        this.weaponStats = scene.add.text(55, 30, '', {
            fontSize: '10px',
            color: '#cccccc',
            fontFamily: 'Arial'
        });
        this.container.add(this.weaponStats);

        // Hide initially
        this.container.setVisible(false);
    }

    public updateWeapon(weapon: Weapon): void {
        if (!weapon) {
            this.container.setVisible(false);
            return;
        }

        // Show container
        this.container.setVisible(true);

        // Update weapon icon color
        if (weapon.displayConfig?.color) {
            this.weaponIcon.setTint(parseInt(weapon.displayConfig.color, 16));
        } else {
            this.weaponIcon.clearTint();
        }

        // Format weapon name
        const displayName = weapon.weaponType
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');

        // Update weapon name
        this.weaponName.setText(displayName);

        // Format and update weapon stats
        const attackRate = (1000 / weapon.attackRate).toFixed(1);
        const stats = [
            `Damage: ${weapon.damage}`,
            `Attack Rate: ${attackRate}/s`
        ].join('\n');
        this.weaponStats.setText(stats);
    }

    public destroy(): void {
        this.container.destroy();
    }
} 