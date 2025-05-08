import { Scene, GameObjects } from 'phaser';
import { Weapon } from './Weapon';
import { DeployableWeapon } from './DeployableWeapon';

export class WeaponOverlay {
    private scene: Scene;
    private container: GameObjects.Container;
    private weaponIcon: GameObjects.Sprite;
    private weaponName: GameObjects.Text;
    private weaponStats: GameObjects.Text;
    private background: GameObjects.Rectangle;
    private deployableContainer: GameObjects.Container;
    private deployableIcon: GameObjects.Sprite;
    private deployableName: GameObjects.Text;
    private deployableStats: GameObjects.Text;

    constructor(scene: Scene) {
        this.scene = scene;

        // Create container for all overlay elements
        this.container = scene.add.container(0, 0);
        this.container.setScrollFactor(0); // Make it fixed to the screen
        this.container.setDepth(100); // Ensure it's above other elements

        // Create semi-transparent background with reduced opacity
        this.background = scene.add.rectangle(0, 0, 140, 60, 0xffffff, 0.2);
        this.background.setOrigin(0, 0);
        this.container.add(this.background);

        // Create weapon icon if texture exists
        if (scene.textures.exists('weapon-upgrade')) {
            this.weaponIcon = scene.add.sprite(25, 25, 'weapon-upgrade');
            this.weaponIcon.setScale(1);
            this.container.add(this.weaponIcon);
        }

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

        // Create deployable container
        this.deployableContainer = scene.add.container(0, 60);
        this.container.add(this.deployableContainer);

        // Create deployable icon if texture exists
        if (scene.textures.exists('turret')) {
            this.deployableIcon = scene.add.sprite(25, 25, 'turret');
            this.deployableIcon.setScale(1);
            this.deployableContainer.add(this.deployableIcon);
        }

        // Create deployable name text
        this.deployableName = scene.add.text(55, 5, '', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial',
        });
        this.deployableContainer.add(this.deployableName);

        // Create deployable stats text
        this.deployableStats = scene.add.text(55, 30, '', {
            fontSize: '10px',
            color: '#cccccc',
            fontFamily: 'Arial'
        });
        this.deployableContainer.add(this.deployableStats);

        // Hide initially
        this.container.setVisible(false);
        this.deployableContainer.setVisible(false);

        // Add resize handler
        this.scene.scale.on('resize', this.handleResize, this);

        // Initial position update
        this.updatePosition();
    }

    private handleResize(gameSize: Phaser.Structs.Size): void {
        this.updatePosition();
    }

    private updatePosition(): void {
        const scale = Math.min(
            this.scene.scale.width / 800, // Base width
            this.scene.scale.height / 600  // Base height
        );

        // Calculate responsive position
        const padding = 10 * scale;
        const x = this.scene.scale.width - (180 * scale) - padding;
        const y = padding;

        // Update container position
        this.container.setPosition(x, y);

        // Update background size
        const bgWidth = 140 * scale;
        const bgHeight = this.deployableContainer.visible ? 120 * scale : 60 * scale;
        this.background.setSize(bgWidth, bgHeight);

        // Update icon scales
        if (this.weaponIcon) {
            this.weaponIcon.setScale(scale);
        }
        if (this.deployableIcon) {
            this.deployableIcon.setScale(scale);
        }

        // Update text styles
        const nameStyle = {
            fontSize: `${12 * scale}px`,
            color: '#ffffff',
            fontFamily: 'Arial',
        };
        const statsStyle = {
            fontSize: `${10 * scale}px`,
            color: '#cccccc',
            fontFamily: 'Arial'
        };

        this.weaponName.setStyle(nameStyle);
        this.weaponStats.setStyle(statsStyle);
        this.deployableName.setStyle(nameStyle);
        this.deployableStats.setStyle(statsStyle);

        // Update text positions
        const iconOffset = 55 * scale;
        this.weaponName.setPosition(iconOffset, 5 * scale);
        this.weaponStats.setPosition(iconOffset, 30 * scale);
        this.deployableName.setPosition(iconOffset, 5 * scale);
        this.deployableStats.setPosition(iconOffset, 30 * scale);
    }

    public updateWeapon(weapon: Weapon, deployableWeapon?: DeployableWeapon | null): void {
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

        // Update deployable weapon if available
        if (deployableWeapon) {
            this.background.setSize(140, 120);
            this.deployableContainer.setVisible(true);

            // Update deployable icon color
            if (deployableWeapon.displayConfig?.color) {
                this.deployableIcon.setTint(parseInt(deployableWeapon.displayConfig.color, 16));
            } else {
                this.deployableIcon.clearTint();
            }

            // Format deployable name
            const deployableDisplayName = deployableWeapon.weaponType
                .split('_')
                .map(word => word.charAt(0) + word.slice(1).toLowerCase())
                .join(' ');

            // Update deployable name
            this.deployableName.setText(deployableDisplayName);

            // Format and update deployable stats
            const deployableAttackRate = (1000 / deployableWeapon.attackRate).toFixed(1);
            const deployableStats = [
                `Damage: ${deployableWeapon.damage}`,
                `Attack Rate: ${deployableAttackRate}/s`
            ].join('\n');
            this.deployableStats.setText(deployableStats);
        } else {
            this.deployableContainer.setVisible(false);
        }

        // Update position after content changes
        this.updatePosition();
    }

    public destroy(): void {
        this.scene.scale.off('resize', this.handleResize, this);
        this.container.destroy();
    }
} 