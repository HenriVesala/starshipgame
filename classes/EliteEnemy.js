// Elite Enemy class - shoots faster than regular enemies
class EliteEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, {
            enterSpeed: 120, // pixels per second
            chaseEnabled: false,
            shootCooldownMin: 0.5, // seconds (was 30 frames, 30/60 = 0.5 seconds)
            shootCooldownMax: 1.33, // seconds (was 80 frames, 80/60 = 1.33 seconds)
            bounceEnabled: true,
            enemyClassName: 'elite-enemy'
        });
    }
}
