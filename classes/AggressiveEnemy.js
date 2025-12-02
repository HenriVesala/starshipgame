// Aggressive Enemy class - moves 1.5x faster and chases the player
class AggressiveEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, {
            enterSpeed: 180, // 1.5x faster (120 * 1.5 = 180 pixels per second)
            chaseEnabled: true,
            shootCooldownMin: 1.0, // seconds (was 60 frames)
            shootCooldownMax: 2.67, // seconds (was 160 frames)
            bounceEnabled: false,
            enemyClassName: 'aggressive-enemy'
        });
    }
}
