// Aggressiivisen vihollisen konfiguraatio
const aggressiveEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 180,            // Tulokulkunopeus (pikselit/sekunti) - 1.5x nopeampi!
    chaseMode: 'continuous',    // Jatkuva jahtaus
    wallBehavior: 'wrap',       // Ilmestyy toiselle puolelle
    turnSpeed: 120,             // Maksimi kääntymiskulma (astetta/sekunti) - nopea käännös

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
    maxCount: 2,                // Maksimimäärä samanaikaisia vihollisia

    // Pudotukset
    rateOfFireBoostDropChance: 0.05  // 5% todennäköisyys pudottaa ampumisnopeusboosti
};

// Aggressive Enemy class - moves 1.5x faster and chases the player
class AggressiveEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, aggressiveEnemyConfig);
    }
}
