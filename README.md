# Browser-Based Dungeon Shooter

A top-down dungeon shooter game built with Phaser 3 and TypeScript. Battle enemies, collect potions, and navigate through procedurally generated rooms in this action-packed adventure.

![Game Screenshot](screenshot.png)

## Features

- **Dynamic Room System**: Procedurally generated rooms with varying layouts and challenges
- **Enemy Variety**: Face off against different enemy types (Zombies, Skeletons, Ninjas) with unique behaviors
- **Weapon System**: Upgrade and customize your weapons as you progress
- **Physics-Based Combat**: Realistic collision detection and physics for immersive gameplay
- **Pathfinding AI**: Enemies use A* pathfinding to navigate the dungeon and track you down
- **Interactive Environment**: Breakable barrels that may contain valuable potions
- **Health Management**: Collect potions to restore health during intense battles
- **Responsive Controls**: Smooth player movement and aiming mechanics

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/stellar-flame/browser-game.git
   cd browser-game
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:8080`

## How to Play

- **Movement**: Use WASD keys to move your character
- **Aiming**: Move your mouse to aim
- **Shooting**: Left-click to fire your weapon
- **Fullscreen**: Press F to toggle fullscreen mode
- **Restart**: Press R to restart after game over

## Game Mechanics

### Rooms
- Each room has a specific layout and may contain enemies, barrels, and potions
- Clear all enemies in a room to unlock doors to adjacent rooms
- Some rooms may have special challenges or rewards

### Enemies
- **Zombies**: Slow but tough, they take more hits to defeat
- **Skeletons**: Faster than zombies but with less health
- **Ninjas**: Quick and agile, they can dodge your attacks

### Weapons
- Start with a basic gun that can be upgraded
- Different weapon types offer various advantages (rate of fire, damage, etc.)

### Items
- **Potions**: Restore health when collected
- **Barrels**: Breakable objects that may contain potions or other items

## Development

### Project Structure

```
src/
├── objects/           # Game objects (Player, Enemy, Weapon, etc.)
│   ├── enemy/         # Enemy-related classes
│   ├── player/        # Player-related classes
│   ├── weapons/       # Weapon-related classes
│   ├── props/         # Props like barrels
│   ├── items/         # Collectible items
│   └── rooms/         # Room generation and management
├── scenes/            # Game scenes (MainScene, EnemyTestScene, etc.)
└── utils/             # Utility functions and helpers
```

### Building for Production

```
npm run build
```

This will create a production-ready build in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Phaser 3](https://phaser.io/phaser3) - The game framework used
- [TypeScript](https://www.typescriptlang.org/) - The programming language used
- [A* Pathfinding](https://github.com/roydejong/phaser-pathfinding) - For enemy AI navigation 