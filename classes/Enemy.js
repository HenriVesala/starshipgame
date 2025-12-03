// Normaalin vihollisen konfiguraatio
const normalEnemyConfig = {
    enterSpeed: 120,            // Tulokulkunopeus (pikselit/sekunti)
    chaseEnabled: false,        // Ei jahtaa pelaajaa
    shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)
    bounceEnabled: true,        // Kimpoaa seinistä
    enemyClassName: 'enemy'     // CSS-luokan nimi
};

// Enemy class - basic enemy that bounces around
class Enemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, normalEnemyConfig);
    }
}

