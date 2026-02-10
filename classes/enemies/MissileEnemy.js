// Ohjusvihollisen konfiguraatio
const missileEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 100,              // Hitaampi kuin muut viholliset
    chaseMode: 'distance-based',  // Älykäs jahtaaminen etäisyyden mukaan
    wallBehavior: 'wrap',         // Ilmestyy toiselle puolelle
    turnSpeed: 120,               // Maksimi kääntymiskulma (astetta/sekunti)
    minSpeed: 20,                 // Minimi nopeus
    slowdownStartDistance: 700,   // Hidasta 700px kohdalla
    slowdownStopDistance: 400,    // Peräänny alle 400px
    keepDistance: true,            // Pyrkii pysymään etäällä pelaajasta

    // Ampumisen konfiguraatio
    weapon: 'missile',            // Asetyyppi: ohjus
    shootCooldownMin: 5.0,        // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 10.0,       // Suurin ampumisaikaväli (sekunti)
    shootMinDistance: 400,         // Ampuu vain 400px+ etäisyydeltä
    shootMaxDistance: 800,         // Ampuu vain alle 800px etäisyydeltä

    // Ulkoasu
    enemyClassName: 'missile-enemy',  // CSS-luokan nimi

    // Kestopisteet
    health: 200,                  // Vahvempi kuin perusvihollinen

    // Spawnaus
    spawnIntervalMin: 15000,      // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 25000,      // Suurin spawnausväli (millisekuntia)
    maxCount: 1,                  // Maksimimäärä samanaikaisia vihollisia

    // Pudotukset
    rateOfFireBoostDropChance: 0.15  // 15% todennäköisyys pudottaa ampumisnopeusboosti
};

// MissileEnemy class - ranged enemy that keeps distance and fires missiles
class MissileEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, missileEnemyConfig);
    }
}
