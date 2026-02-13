// Aggressiivisen vihollisen konfiguraatio
const aggressiveEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 180,            // Tulokulkunopeus (pikselit/sekunti) - 1.5x nopeampi!
    chaseMode: 'continuous',    // Jatkuva jahtaus
    wallBehavior: 'wrap',       // Ilmestyy toiselle puolelle
    turnSpeed: 120,             // Maksimi kääntymiskulma (astetta/sekunti) - nopea käännös
    accelerationForward: 250,   // Kiihtyvyys eteenpäin (pikselit/sekunti²) - nopea ja ketterä
    accelerationReverse: 250,   // Kiihtyvyys taaksepäin (pikselit/sekunti²)

    // Energia
    maxEnergy: 50,              // Maksimi energia
    energyRegenRate: 10,        // Energian latausnopeus (yksikköä/sekunti)

    // Ampumisen konfiguraatio
    shootConeAngle: 40,

    // Ulkoasu
    enemyClassName: 'aggressive-enemy',  // CSS-luokan nimi

    // Kestopisteet ja nopeus
    health: 100,                // Vihollisen kestopisteet
    maxSpeed: 500,              // Maksiminopeus (pikselit/sekunti)

    // Spawnaus
    spawnIntervalMin: 12000,    // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 25000,    // Suurin spawnausväli (millisekuntia)
    maxCount: 2,                // Maksimimäärä samanaikaisia vihollisia

    // Pudotukset
    rateOfFireBoostDropChance: 0.05,  // 5% todennäköisyys pudottaa ampumisnopeusboosti

    // Aseylikirjoitukset (tyhjä = käytä globaaleja oletuksia)
    weapons: {
        // bullet: { damage: 50, energyCost: 15 },
        // laser: { damagePerSecond: 300 },
        // missile: { damage: 150 },
        // railgun: { maxCharge: 30 }
    }
};

// Aggressive Enemy class - moves 1.5x faster and chases the player
class AggressiveEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, aggressiveEnemyConfig);
    }
}
