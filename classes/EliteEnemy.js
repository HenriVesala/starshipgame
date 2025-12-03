// Elite-vihollisen konfiguraatio
const eliteEnemyConfig = {
    enterSpeed: 120,            // Tulokulkunopeus (pikselit/sekunti)
    chaseEnabled: false,        // Ei jahtaa pelaajaa
    shootCooldownMin: 0.5,      // Pienin ampumisaikaväli (sekunti) - ampuu nopeammin!
    shootCooldownMax: 1.33,     // Suurin ampumisaikaväli (sekunti)
    bounceEnabled: true,        // Kimpoaa seinistä
    enemyClassName: 'elite-enemy'  // CSS-luokan nimi
};

// Elite Enemy class - shoots faster than regular enemies
class EliteEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, eliteEnemyConfig);
    }
}
