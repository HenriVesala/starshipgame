// Enemy class - basic enemy that bounces around
class Enemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, {
            enterSpeed: 120, // pixels per second
            chaseEnabled: false,
            shootCooldownMin: 1.0, // seconds (was 60 frames)
            shootCooldownMax: 2.67, // seconds (was 160 frames)
            bounceEnabled: true,
            enemyClassName: 'enemy'
        });
    }
}

