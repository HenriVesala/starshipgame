// Normaalin vihollisen konfiguraatio
const normalEnemyConfig = {
    enterSpeed: 120,            // Tulokulkunopeus (pikselit/sekunti)
    chaseEnabled: false,        // Ei jahtaa pelaajaa
    shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)
    bounceEnabled: true,        // Kimpoaa seinistä
    enemyClassName: 'enemy',    // CSS-luokan nimi

    // Spawnaus
    spawnIntervalMin: 3000,     // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 8000,     // Suurin spawnausväli (millisekuntia)
    maxCount: 3                 // Maksimimäärä samanaikaisia vihollisia
};

// Enemy class - basic enemy that bounces around
class Enemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, normalEnemyConfig);
    }
}

