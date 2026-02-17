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
    accelerationForward: 80,      // Kiihtyvyys eteenpäin (pikselit/sekunti²) - hidas, suosii etäisyyttä
    accelerationReverse: 80,      // Kiihtyvyys taaksepäin (pikselit/sekunti²)

    // Energia
    maxEnergy: 120,               // Maksimi energia - enemmän ohjuksia varten
    energyRegenRate: 8,           // Energian latausnopeus (yksikköä/sekunti) - hidas

    // Ampumisen konfiguraatio
    weapon: 'missile',            // Asetyyppi: ohjus
    shootMinDistance: 400,         // Ampuu vain 400px+ etäisyydeltä
    shootMaxDistance: 800,         // Ampuu vain alle 800px etäisyydeltä
    shootConeAngle: 60,

    // Ulkoasu
    enemyClassName: 'missile-enemy',  // CSS-luokan nimi

    // Kestopisteet ja nopeus
    health: 200,                  // Vahvempi kuin perusvihollinen
    maxSpeed: 350,                // Maksiminopeus (pikselit/sekunti)

    // Spawnaus
    spawnIntervalMin: 15000,      // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 25000,      // Suurin spawnausväli (millisekuntia)
    maxCount: 1,                  // Maksimimäärä samanaikaisia vihollisia

    // Pudotukset
    rateOfFireBoostDropChance: 0.15,  // 15% todennäköisyys pudottaa ampumisnopeusboosti

    // Aseylikirjoitukset
    weapons: {
        missile: {
            colors: {
                bodyGradient: 'linear-gradient(to bottom, #ffffff, #ff0088, #cc0066)',
                glowColor1: 'rgba(255, 0, 136, 0.9)',
                glowColor2: 'rgba(204, 0, 102, 0.6)',
                glowColor3: 'rgba(204, 0, 102, 0.3)'
            }
        }
    }
};

// MissileEnemy class - ranged enemy that keeps distance and fires missiles
class MissileEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, missileEnemyConfig);
    }
}
