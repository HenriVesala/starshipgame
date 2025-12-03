// Aggressiivisen vihollisen konfiguraatio
const aggressiveEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 180,            // Tulokulkunopeus (pikselit/sekunti) - 1.5x nopeampi!
    chaseEnabled: true,         // Jahtaa pelaajaa
    bounceEnabled: false,       // Ei kimppoa seinistä (jahtaa läpi seinien)

    // Ampumisen konfiguraatio
    shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)

    // Ulkoasu
    enemyClassName: 'aggressive-enemy',  // CSS-luokan nimi

    // Kestopisteet
    health: 100,                // Vihollisen kestopisteet

    // Spawnaus
    spawnIntervalMin: 12000,    // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 25000,    // Suurin spawnausväli (millisekuntia)
    maxCount: 2                 // Maksimimäärä samanaikaisia vihollisia
};

// Aggressive Enemy class - moves 1.5x faster and chases the player
class AggressiveEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, aggressiveEnemyConfig);
    }
}
