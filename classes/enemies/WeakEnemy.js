// Heikon vihollisen konfiguraatio
const weakEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 120,            // Tulokulkunopeus (pikselit/sekunti)
    chaseMode: 'periodic',      // Kääntyy pelaajaa kohti määrävälein
    wallBehavior: 'wrap',       // Ilmestyy toiselle puolelle
    turnInterval: 5.0,          // Kääntyy pelaajaa kohti kerran 5 sekunnissa
    turnSpeed: 90,              // Maksimi kääntymiskulma (astetta/sekunti)
    accelerationForward: 100,   // Kiihtyvyys eteenpäin (pikselit/sekunti²) - hidas ja kömpelö
    accelerationReverse: 100,   // Kiihtyvyys taaksepäin (pikselit/sekunti²)

    // Energia
    maxEnergy: 60,              // Maksimi energia
    energyRegenRate: 10,        // Energian latausnopeus (yksikköä/sekunti)

    // Ampumisen konfiguraatio
    weapon: 'bullet',           // Asetyyppi: 'bullet' | 'missile'
    shootCooldownMin: 0.7,      // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 2,        // Suurin ampumisaikaväli (sekunti)

    // Ulkoasu
    enemyClassName: 'weak-enemy',    // CSS-luokan nimi

    // Kestopisteet ja nopeus
    health: 100,                // Vihollisen kestopisteet
    maxSpeed: 400,              // Maksiminopeus (pikselit/sekunti)

    // Spawnaus
    spawnIntervalMin: 3000,     // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 8000,     // Suurin spawnausväli (millisekuntia)
    maxCount: 3,                // Maksimimäärä samanaikaisia vihollisia

    // Pudotukset
    rateOfFireBoostDropChance: 0.05  // 5% todennäköisyys pudottaa ampumisnopeusboosti
};

// WeakEnemy class - basic enemy that turns towards player periodically
class WeakEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, weakEnemyConfig);
    }
}

