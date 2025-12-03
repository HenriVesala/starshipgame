// Normaalin vihollisen konfiguraatio
const normalEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 120,            // Tulokulkunopeus (pikselit/sekunti)
    chaseEnabled: false,        // Ei jahtaa pelaajaa
    bounceEnabled: true,        // Kimpoaa seinistä

    // Ampumisen konfiguraatio
    shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)

    // Ulkoasu
    enemyClassName: 'enemy',    // CSS-luokan nimi

    // Kestopisteet
    health: 100,                // Vihollisen kestopisteet

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

