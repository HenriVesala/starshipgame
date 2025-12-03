// Aggressiivisen vihollisen konfiguraatio
const aggressiveEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 180,            // Tulokulkunopeus (pikselit/sekunti) - 1.5x nopeampi!
    chaseEnabled: true,         // Jahtaa pelaajaa
    bounceEnabled: false,       // Ei kimppoa seinistä (jahtaa läpi seinien)
    turnSpeed: 150,             // Maksimi kääntymiskulma (astetta/sekunti) - nopea käännös

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

    // Apufunktio: laske lyhin kulmaero
    angleDifference(target, current) {
        let diff = target - current;
        // Normalisoi välille -180...180
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    }

    update(enemyBullets, playerX = null, playerY = null, dt = 0.016) {
        // Jos kutistuu, älä tee mitään muuta kuin renderöi
        if (this.isShrinking) {
            this.render();
            return;
        }

        // Päivitä vahinkoválähdys-ajastin
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= dt;
            if (this.damageFlashTimer < 0) {
                this.damageFlashTimer = 0;
            }
        }

        // Tarkista onko täysin tullut pelialueelle
        if (this.isEntering) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            if (this.x >= 0 && this.x <= gameConfig.screenWidth - gameConfig.playerWidth &&
                this.y >= 0 && this.y <= gameConfig.screenHeight - gameConfig.playerHeight) {
                this.isEntering = false;
            }
        } else if (playerX !== null && playerY !== null) {
            // Jatkuva jahtaus asteittaisella kääntymisellä
            const halfShipSize = gameConfig.playerWidth / 2;
            const dx = playerX + halfShipSize - (this.x + halfShipSize);
            const dy = playerY + halfShipSize - (this.y + halfShipSize);
            const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

            // Laske nykyinen kulma nopeuden perusteella
            const currentVelocityAngle = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 90;
            const angleDiff = this.angleDifference(targetAngle, currentVelocityAngle);
            const maxTurn = this.config.turnSpeed * dt;

            let turnAmount = angleDiff;
            if (Math.abs(angleDiff) > maxTurn) {
                turnAmount = Math.sign(angleDiff) * maxTurn;
            }

            // Laske uusi kulma
            const newAngle = currentVelocityAngle + turnAmount;
            const radians = (newAngle - 90) * Math.PI / 180;
            this.vx = Math.cos(radians) * this.config.enterSpeed;
            this.vy = Math.sin(radians) * this.config.enterSpeed;

            // Liiku
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        } else {
            // Ei pelaajan sijaintia - liiku normaalisti
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        // Päivitä kulma nopeuden mukaan
        this.angle = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 90;

        this.shootCooldown -= dt;

        // Shoot
        if (this.shootCooldown <= 0) {
            this.shoot(enemyBullets);
            this.shootCooldown = Math.random() * (this.config.shootCooldownMax - this.config.shootCooldownMin) + this.config.shootCooldownMin;
        }

        this.render();
    }
}
