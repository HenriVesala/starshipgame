// Heikon vihollisen konfiguraatio
const weakEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 120,            // Tulokulkunopeus (pikselit/sekunti)
    chaseMode: 'periodic',      // Kääntyy pelaajaa kohti määrävälein
    wallBehavior: 'bounce',     // Kimpoaa seinistä
    turnInterval: 5.0,          // Kääntyy pelaajaa kohti kerran 5 sekunnissa
    turnSpeed: 90,              // Maksimi kääntymiskulma (astetta/sekunti)

    // Ampumisen konfiguraatio
    shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)

    // Ulkoasu
    enemyClassName: 'weak-enemy',    // CSS-luokan nimi

    // Kestopisteet
    health: 100,                // Vihollisen kestopisteet

    // Spawnaus
    spawnIntervalMin: 3000,     // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 8000,     // Suurin spawnausväli (millisekuntia)
    maxCount: 3                 // Maksimimäärä samanaikaisia vihollisia
};

// WeakEnemy class - basic enemy that turns towards player periodically
class WeakEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, weakEnemyConfig);
    }
}

