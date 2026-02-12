// Elite-vihollisen konfiguraatio
const eliteEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 120,            // Maksimi nopeus (pikselit/sekunti)
    chaseMode: 'distance-based', // Älykäs jahtaaminen etäisyyden mukaan
    wallBehavior: 'wrap',       // Ilmestyy toiselle puolelle
    turnSpeed: 120,             // Maksimi kääntymiskulma (astetta/sekunti) - nopeampi kuin normaali
    minSpeed: 30,               // Minimi nopeus kun hyvin lähellä pelaajaa
    slowdownStartDistance: 400, // Aloita hidastaminen tällä etäisyydellä (pikselit)
    slowdownStopDistance: 200,  // Lopeta hidastaminen tällä etäisyydellä (pikselit)
    accelerationForward: 150,   // Kiihtyvyys eteenpäin (pikselit/sekunti²) - taktinen
    accelerationReverse: 150,   // Kiihtyvyys taaksepäin (pikselit/sekunti²)

    // Energia
    maxEnergy: 150,             // Maksimi energia
    energyRegenRate: 18,        // Energian latausnopeus (yksikköä/sekunti)

    // Ampumisen konfiguraatio
    shootCooldownMin: 0.5,      // Pienin ampumisaikaväli (sekunti) - ampuu nopeammin!
    shootCooldownMax: 1.33,     // Suurin ampumisaikaväli (sekunti)

    // Ulkoasu
    enemyClassName: 'elite-enemy',  // CSS-luokan nimi

    // Kestopisteet ja nopeus
    health: 300,                // Vihollisen kestopisteet - vahvempi kuin normaali
    maxSpeed: 400,              // Maksiminopeus (pikselit/sekunti)

    // Spawnaus
    spawnIntervalMin: 10000,    // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 20000,    // Suurin spawnausväli (millisekuntia)
    maxCount: 2,                // Maksimimäärä samanaikaisia vihollisia

    // Pudotukset
    rateOfFireBoostDropChance: 0.20  // 20% todennäköisyys pudottaa ampumisnopeusboosti
};

// Elite Enemy class - intelligent enemy that maintains shooting angle and distance
class EliteEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, eliteEnemyConfig);
    }
}
