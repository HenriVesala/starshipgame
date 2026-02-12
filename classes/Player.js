// Pelaajan aluksen konfiguraatio
const playerConfig = {
    // Koon konfiguraatio
    width: 40,                      // Leveys pikseleissä
    height: 40,                     // Korkeus pikseleissä

    // Liikkeen konfiguraatio
    rotationSpeed: 200,             // Astetta/sekunti
    accelerationForward: 200,       // Kiihtyvyys eteenpäin (pikselit/sekunnin²)
    accelerationReverse: 100,       // Kiihtyvyys taaksepäin (pikselit/sekunnin²)
    maxSpeed: 600,                  // Pikselit/sekunti

    // Sijainti konfiguraatio
    startX: 580,                    // Aloituspaikka X
    startY: 430,                    // Aloituspaikka Y
    maxX: 1200 - 40,                // Maksimi X (ruudun leveys - leveys)
    maxY: 900 - 40,                 // Maksimi Y (ruudun korkeus - korkeus)

    // Tähtisumun vaikutus
    nebulaCoefficient: 1.0,         // Nebulan vastuskerroin (0 = ei vaikutusta, 1 = normaali)

    // Kestopisteet ja vahinko
    maxHealth: 1000,                 // Pelaajan maksimi kestopisteet
    collisionDamage: 200,           // Vahinko joka pelaaja aiheuttaa törmätessään

    // Immuniteetti
    invulnerabilityDuration: 0.3,   // Immuniteettiaika sekunteina vahingon jälkeen

    // Ampuminen
    shootCooldown: 0.7,             // Ampumisen cooldown (sekuntia) - 3 ampumista/sekunti
    rateOfFireBoostMultiplier: 0.95, // Ampumisnopeuden lisäys per boosti (5% nopeampi = 0.95x cooldown)

    // Energia
    maxEnergy: 100,                 // Maksimi energia
    energyRegenRate: 15,            // Energiaa/sekunti (puolitettu kiihdyttäessä)

    // Aloitusase
    startWeapon: 'bullet'          // Aloitusase: 'missile' | 'bullet'
};

// Pelaajan alus -luokka
class Player extends SpaceShip {
    constructor() {
        super({
            x: playerConfig.startX,
            y: playerConfig.startY,
            health: playerConfig.maxHealth,
            maxSpeed: playerConfig.maxSpeed,
            nebulaCoefficient: playerConfig.nebulaCoefficient,
            maxEnergy: playerConfig.maxEnergy,
            energyRegenRate: playerConfig.energyRegenRate
        });
        this.score = 0;
        this.gameOver = false;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.shootCooldownTimer = 0; // Ampumisen cooldown-ajastin
        this.shootSpeedMultiplier = 1.0; // Ampumisnopeuden kerroin (alkaa 1.0, pienenee boostien myötä)
        this.weapon = playerConfig.startWeapon; // Nykyinen ase
    }

    // Ota vahinkoa (override: lisää immuniteetti törmäyksille)
    takeDamage(damage, isCollisionDamage = false) {
        // Jos immuuni ja kyseessä törmäysvahinko, älä ota vahinkoa
        if (isCollisionDamage && this.isInvulnerable) {
            return false;
        }

        // Kutsu kantaluokan vahinkologiikka
        const isDead = super.takeDamage(damage);

        // Aktivoi immuniteetti vain törmäysvahingosta JA jos ei ole jo aktiivinen
        // Tämä estää ajastimen nollautumisen jatkuvissa törmäyksissä
        if (isCollisionDamage && this.health > 0 && !this.isInvulnerable) {
            this.isInvulnerable = true;
            this.invulnerabilityTimer = playerConfig.invulnerabilityDuration;
        }

        return isDead;
    }

    // Palauta kesto ja energia täyteen (esim. uuden pelin alkaessa)
    resetHealth() {
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.shootCooldownTimer = 0;
    }

    // Tarkista onko tarpeeksi energiaa
    hasEnergy(cost) {
        return this.energy >= cost;
    }

    // Kuluta energiaa
    consumeEnergy(cost) {
        this.energy -= cost;
        if (this.energy < 0) this.energy = 0;
    }

    // Tarkista voiko ampua
    canShoot() {
        return this.shootCooldownTimer <= 0;
    }

    // Aseta ampumisen cooldown
    setShootCooldown() {
        this.shootCooldownTimer = playerConfig.shootCooldown * this.shootSpeedMultiplier;
    }

    // Lisää ampumisnopeusboosti
    applyRateOfFireBoost() {
        this.shootSpeedMultiplier *= playerConfig.rateOfFireBoostMultiplier;
    }

    // Päivitä pelaajan asento ja nopeus
    update(dt, keys) {
        // Päivitä immuniteetti-ajastin
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= dt;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }

        // Päivitä ampumisen cooldown-ajastin
        if (this.shootCooldownTimer > 0) {
            this.shootCooldownTimer -= dt;
            if (this.shootCooldownTimer < 0) {
                this.shootCooldownTimer = 0;
            }
        }

        // Päivitä vahinkoválähdys-ajastin
        this.updateDamageFlash(dt);

        // Kierrä alusta
        if (keys.ArrowLeft) {
            this.angle -= playerConfig.rotationSpeed * dt;
        }
        if (keys.ArrowRight) {
            this.angle += playerConfig.rotationSpeed * dt;
        }

        // Kiihdytä alusta
        const dirX = Math.cos((this.angle - 90) * Math.PI / 180);
        const dirY = Math.sin((this.angle - 90) * Math.PI / 180);

        if (keys.ArrowUp) {
            this.vx += dirX * playerConfig.accelerationForward * dt;
            this.vy += dirY * playerConfig.accelerationForward * dt;
        }
        if (keys.ArrowDown) {
            this.vx -= dirX * playerConfig.accelerationReverse * dt;
            this.vy -= dirY * playerConfig.accelerationReverse * dt;
        }

        // Rajoita maksimi nopeus
        this.capSpeed();

        // Päivitä sijainti
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Rajoita ruudun rajoihin
        if (this.x < 0) this.x = 0;
        if (this.x > playerConfig.maxX) this.x = playerConfig.maxX;
        if (this.y < 0) this.y = 0;
        if (this.y > playerConfig.maxY) this.y = playerConfig.maxY;
    }

    // Palauta pelaajan nopeus
    getVelocity() {
        return this.getSpeed();
    }

    // Tarkista ovatko koordinaatit pelaajan sisällä (törmäys)
    isPointInside(px, py) {
        return px > this.x &&
               px < this.x + playerConfig.width &&
               py > this.y &&
               py < this.y + playerConfig.height;
    }
}
