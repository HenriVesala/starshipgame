// Normaalin vihollisen konfiguraatio
const normalEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 120,            // Tulokulkunopeus (pikselit/sekunti)
    chaseEnabled: false,        // Ei jahtaa pelaajaa jatkuvasti
    bounceEnabled: true,        // Kimpoaa seinistä
    turnInterval: 5.0,          // Kääntyy pelaajaa kohti kerran 5 sekunnissa
    turnSpeed: 90,              // Maksimi kääntymiskulma (astetta/sekunti)

    // Ampumisen konfiguraatio
    shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
    shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)

    // Ulkoasu
    enemyClassName: 'enemy',    // CSS-luokan nimi

    // Kestopisteet
    health: 100,                // Vihollisen kestopisteet

    // Spawnaus
    spawnIntervalMin: 3000,     // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 8000,     // Suurin spawnausväli (millisekuntia)
    maxCount: 3                 // Maksimimäärä samanaikaisia vihollisia
};

// Enemy class - basic enemy that turns towards player periodically
class Enemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, normalEnemyConfig);
        this.timeSinceLastTurn = 0; // Ajastin käännöksille
        this.targetAngle = null;    // Kohdekulma johon käännytään
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

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Tarkista onko täysin tullut pelialueelle
        if (this.isEntering) {
            if (this.x >= 0 && this.x <= gameConfig.screenWidth - gameConfig.playerWidth &&
                this.y >= 0 && this.y <= gameConfig.screenHeight - gameConfig.playerHeight) {
                this.isEntering = false;
            }
        }

        // Käänny pelaajaa kohti määrävälein (jos pelialueella)
        if (!this.isEntering && playerX !== null && playerY !== null) {
            this.timeSinceLastTurn += dt;
            if (this.timeSinceLastTurn >= this.config.turnInterval) {
                // Laske uusi kohdekulma pelaajaa kohti
                const halfShipSize = gameConfig.playerWidth / 2;
                const dx = playerX + halfShipSize - (this.x + halfShipSize);
                const dy = playerY + halfShipSize - (this.y + halfShipSize);
                this.targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                this.timeSinceLastTurn = 0;
            }

            // Käänny asteittain kohti kohdekulmaa
            if (this.targetAngle !== null) {
                const currentVelocityAngle = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 90;
                const angleDiff = this.angleDifference(this.targetAngle, currentVelocityAngle);
                const maxTurn = this.config.turnSpeed * dt;

                let turnAmount = angleDiff;
                if (Math.abs(angleDiff) > maxTurn) {
                    turnAmount = Math.sign(angleDiff) * maxTurn;
                }

                // Laske uusi kulma
                const newAngle = currentVelocityAngle + turnAmount;
                const radians = (newAngle - 90) * Math.PI / 180;
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx = Math.cos(radians) * speed;
                this.vy = Math.sin(radians) * speed;
            }
        }

        // Päivitä kulma nopeuden mukaan
        this.angle = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 90;

        this.shootCooldown -= dt;

        // Kimppoa seinistä jos käytössä ja ei tulossa sisään
        if (!this.isEntering && this.config.bounceEnabled) {
            if (this.x < 0 || this.x > gameConfig.screenWidth - gameConfig.playerWidth) this.vx *= -1;
            if (this.y < 0 || this.y > gameConfig.screenHeight - gameConfig.playerHeight) this.vy *= -1;
        }

        // Shoot
        if (this.shootCooldown <= 0) {
            this.shoot(enemyBullets);
            this.shootCooldown = Math.random() * (this.config.shootCooldownMax - this.config.shootCooldownMin) + this.config.shootCooldownMin;
        }

        this.render();
    }
}

