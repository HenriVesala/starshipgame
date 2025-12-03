// Elite-vihollisen konfiguraatio
const eliteEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 120,            // Tulokulkunopeus (pikselit/sekunti)
    chaseEnabled: false,        // Ei jahtaa pelaajaa
    bounceEnabled: true,        // Kimpoaa seinistä

    // Ampumisen konfiguraatio
    shootCooldownMin: 0.5,      // Pienin ampumisaikaväli (sekunti) - ampuu nopeammin!
    shootCooldownMax: 1.33,     // Suurin ampumisaikaväli (sekunti)

    // Ulkoasu
    enemyClassName: 'elite-enemy',  // CSS-luokan nimi

    // Kestopisteet
    health: 300,                // Vihollisen kestopisteet - vahvempi kuin normaali

    // Spawnaus
    spawnIntervalMin: 10000,    // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 20000,    // Suurin spawnausväli (millisekuntia)
    maxCount: 2                 // Maksimimäärä samanaikaisia vihollisia
};

// Elite Enemy class - shoots faster than regular enemies
class EliteEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, eliteEnemyConfig);
    }
}
