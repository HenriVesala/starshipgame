// Elite-vihollisen konfiguraatio
const eliteEnemyConfig = {
    // Liikkeen konfiguraatio
    enterSpeed: 120,            // Maksimi nopeus (pikselit/sekunti)
    minSpeed: 30,               // Minimi nopeus kun hyvin lähellä pelaajaa
    chaseEnabled: true,         // Jahtaa pelaajaa älykkäästi
    bounceEnabled: false,       // Ei kimppoa seinistä
    slowdownStartDistance: 200, // Aloita hidastaminen tällä etäisyydellä (pikselit)
    slowdownStopDistance: 100,  // Lopeta hidastaminen tällä etäisyydellä (pikselit)
    turnSpeed: 120,             // Maksimi kääntymiskulma (astetta/sekunti) - nopeampi kuin normaali

    // Ampumisen konfiguraatio
    shootCooldownMin: 0.5,      // Pienin ampumisaikaväli (sekunti) - ampuu nopeammin!
    shootCooldownMax: 1.33,     // Suurin ampumisaikaväli (sekunti)

    // Ulkoasu
    enemyClassName: 'elite-enemy',  // CSS-luokan nimi

    // Kestopisteet
    health: 300,                // Vihollisen kestopisteet - vahvempi kuin normaali

    // Spawnaus
    spawnIntervalMin: 10000,    // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 20000,    // Suurin spawnausväli (millisekuntia)
    maxCount: 2                 // Maksimimäärä samanaikaisia vihollisia
};

// Elite Enemy class - intelligent enemy that maintains shooting angle and distance
class EliteEnemy extends BaseEnemy {
    constructor(gameContainer) {
        super(gameContainer, eliteEnemyConfig);
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
            // Älykäs jahtaaminen: pidä ampumasuunta pelaajaa kohti ja säädä etäisyyttä
            const halfShipSize = gameConfig.playerWidth / 2;
            const dx = playerX + halfShipSize - (this.x + halfShipSize);
            const dy = playerY + halfShipSize - (this.y + halfShipSize);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const dirX = dx / distance;
                const dirY = dy / distance;

                // Laske nopeus etäisyyden perusteella
                let speed = this.config.enterSpeed;

                if (distance < this.config.slowdownStopDistance) {
                    // Hyvin lähellä - liiku minimillä tai pysähdy
                    speed = this.config.minSpeed;
                } else if (distance < this.config.slowdownStartDistance) {
                    // Hidastamisalueella - interpoloi nopeus etäisyyden mukaan
                    const slowdownRange = this.config.slowdownStartDistance - this.config.slowdownStopDistance;
                    const distanceInRange = distance - this.config.slowdownStopDistance;
                    const slowdownFactor = distanceInRange / slowdownRange;
                    speed = this.config.minSpeed + (this.config.enterSpeed - this.config.minSpeed) * slowdownFactor;
                }

                // Aseta nopeus pelaajaa kohti
                this.vx = dirX * speed;
                this.vy = dirY * speed;
            }

            // Liiku
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Vältä törmäyksiä seiniin pysymällä pelialueella
            if (this.x < 0) this.x = 0;
            if (this.x > gameConfig.screenWidth - gameConfig.playerWidth) {
                this.x = gameConfig.screenWidth - gameConfig.playerWidth;
            }
            if (this.y < 0) this.y = 0;
            if (this.y > gameConfig.screenHeight - gameConfig.playerHeight) {
                this.y = gameConfig.screenHeight - gameConfig.playerHeight;
            }
        } else {
            // Ei pelaajan sijaintia - liiku normaalisti
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        // Päivitä kulma (ampumasuunta) asteittain pelaajaa kohti
        if (playerX !== null && playerY !== null) {
            const halfShipSize = gameConfig.playerWidth / 2;
            const dx = playerX + halfShipSize - (this.x + halfShipSize);
            const dy = playerY + halfShipSize - (this.y + halfShipSize);
            const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

            // Käänny asteittain kohti pelaajaa
            const angleDiff = this.angleDifference(targetAngle, this.angle);
            const maxTurn = this.config.turnSpeed * dt;

            let turnAmount = angleDiff;
            if (Math.abs(angleDiff) > maxTurn) {
                turnAmount = Math.sign(angleDiff) * maxTurn;
            }

            this.angle += turnAmount;
        } else {
            // Jos ei pelaajaa, käytä nopeuden suuntaa
            this.angle = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 90;
        }

        this.shootCooldown -= dt;

        // Shoot
        if (this.shootCooldown <= 0) {
            this.shoot(enemyBullets);
            this.shootCooldown = Math.random() * (this.config.shootCooldownMax - this.config.shootCooldownMin) + this.config.shootCooldownMin;
        }

        this.render();
    }
}
