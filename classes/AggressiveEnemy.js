// Aggressiivisen vihollisen konfiguraatio
const aggressiveEnemyConfig = {
    enterSpeed: 180,            // Tulokulkunopeus (pikselit/sekunti) - 1.5x nopeampi!
    chaseEnabled: true,         // Jahtaa pelaajaa
    shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)
    bounceEnabled: false,       // Ei kimppoa seinistä (jahtaa läpi seinien)
    enemyClassName: 'aggressive-enemy'  // CSS-luokan nimi
};

// Aggressive Enemy class - moves 1.5x faster and chases the player
class AggressiveEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, aggressiveEnemyConfig);
    }
}
