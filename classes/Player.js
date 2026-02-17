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
    startX: 560,                    // Aloituspaikka X
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
    rateOfFireBoostMultiplier: 0.95, // Ampumisnopeuden lisäys per boosti (5% nopeampi = 0.95x cooldown)

    // Energia
    maxEnergy: 100,                 // Maksimi energia
    energyRegenRate: 15,            // Energiaa/sekunti (puolitettu kiihdyttäessä)

    // Oletusaseet (voidaan ylikirjoittaa valikossa)
    startWeapon1: 'bullet',         // Ase 1: 'bullet' | 'missile' | 'laser' | 'railgun'
    startWeapon2: 'missile',        // Ase 2: 'bullet' | 'missile' | 'laser' | 'railgun'

    // Aseylikirjoitukset (tyhjä = käytä globaaleja oletuksia)
    weapons: {
        bullet: {
             shootCooldown: 0.2,        // Pelaajan cooldown (sekunti)
            initialSpeed: 250,      // 250 vs oletus 240
            energyCost: 16,          // 25 vs oletus 30
            color: '#00ff00',        // Vihreä (pelaajan väri)
            colorLight: '#88ff88',
            glowColor: '0, 255, 0'
        },
        missile: {
            colors: {
                bodyGradient: 'linear-gradient(to bottom, #a9f868, #aaf725, #f7cc32)',
                glowColor1: 'rgba(255, 136, 0, 0.9)',
                glowColor2: 'rgba(255, 68, 0, 0.6)',
                glowColor3: 'rgba(255, 68, 0, 0.3)'
            }
        },
        laser: {
            coreColor: '#ffffff',       // Ytimen väri
            glowColor: 'rgba(255, 50, 50, 1)', // Hehkun väri (punainen)
        },
        railgun: {
            playerColor: '#00ff00',                   // Pääväri
            playerColorFade: 'rgba(0, 255, 242, 0.5)',      // Häivytys gradientissa
            playerGlowInner: 'rgba(0, 150, 255, 0.9)',      // Sisempi hehku
            playerGlowMid: 'rgba(0, 150, 255, 0.6)',        // Keskihehku
            playerGlowOuter: 'rgba(0, 150, 255, 0.3)',      // Ulompi hehku
    }
    }
}

// Pelaaja 2:n konfiguraatio — sama kuin P1, mutta sininen väri ja eri aloituspaikka
const player2Config = {
    ...playerConfig,
    startX: 620,
    startY: 430,
    weapons: {
        bullet: {
            shootCooldown: 0.2,        // Pelaajan cooldown (sekunti)
            initialSpeed: 250,
            energyCost: 16,
            color: '#4488ff',
            colorLight: '#88bbff',
            glowColor: '68, 136, 255'
        },
        missile: {
            colors: {
                bodyGradient: 'linear-gradient(to bottom, #7eacfa, #7266f9, #d182fe)',
                glowColor1: 'rgba(255, 136, 0, 0.9)',
                glowColor2: 'rgba(255, 68, 0, 0.6)',
                glowColor3: 'rgba(255, 68, 0, 0.3)'
            }
        },
        laser: {
            coreColor: '#ffffff',       // Ytimen väri
            glowColor: 'rgba(204, 50, 255, 1)', // Hehkun väri (punainen)
        },
        railgun: {
            playerColor: 'rgb(0, 150, 255)',                // Pääväri
            playerColorFade: 'rgba(0, 150, 255, 0.5)',      // Häivytys gradientissa
            playerGlowInner: 'rgba(0, 150, 255, 0.9)',      // Sisempi hehku
            playerGlowMid: 'rgba(0, 150, 255, 0.6)',        // Keskihehku
            playerGlowOuter: 'rgba(0, 150, 255, 0.3)',      // Ulompi hehku
    }
    }
};

// Pelaajan alus -luokka
class Player extends SpaceShip {
    constructor(config = playerConfig) {
        super({
            x: config.startX,
            y: config.startY,
            health: config.maxHealth,
            maxSpeed: config.maxSpeed,
            nebulaCoefficient: config.nebulaCoefficient,
            maxEnergy: config.maxEnergy,
            energyRegenRate: config.energyRegenRate
        });
        this.config = config;
        // Resolve asekonfiguraatiot: globaalit oletukset + aluskohtaiset ylikirjoitukset
        const wo = config.weapons || {};
        this.weaponConfigs = {
            bullet: mergeWeaponConfig(bulletConfig, wo.bullet),
            missile: mergeWeaponConfig(missileConfig, wo.missile),
            laser: mergeWeaponConfig(laserConfig, wo.laser),
            railgun: mergeWeaponConfig(railgunConfig, wo.railgun)
        };

        this.score = 0;
        this.gameOver = false;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;

        // Kaksi aseslottia
        this.weaponSlots = [
            { type: config.startWeapon1, shootCooldownTimer: 0, shootSpeedMultiplier: 1.0, isChargingRailgun: false, railgunCharge: 0 },
            { type: config.startWeapon2, shootCooldownTimer: 0, shootSpeedMultiplier: 1.0, isChargingRailgun: false, railgunCharge: 0 }
        ];
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
            this.invulnerabilityTimer = this.config.invulnerabilityDuration;
        }

        return isDead;
    }

    // Palauta kesto ja energia täyteen (esim. uuden pelin alkaessa)
    resetHealth() {
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        for (const slot of this.weaponSlots) {
            slot.shootCooldownTimer = 0;
            slot.shootSpeedMultiplier = 1.0;
            slot.isChargingRailgun = false;
            slot.railgunCharge = 0;
        }
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

    // Tarkista voiko slotti ampua
    canShoot(slotIndex) {
        return this.weaponSlots[slotIndex].shootCooldownTimer <= 0;
    }

    // Aseta slotin cooldown
    setShootCooldown(slotIndex) {
        const slot = this.weaponSlots[slotIndex];
        slot.shootCooldownTimer = this.weaponConfigs[slot.type].shootCooldown * slot.shootSpeedMultiplier;
    }

    // Lisää ampumisnopeusboosti (vaikuttaa molempiin slotteihin)
    applyRateOfFireBoost() {
        for (const slot of this.weaponSlots) {
            slot.shootSpeedMultiplier *= this.config.rateOfFireBoostMultiplier;
        }
    }

    // Päivitä molempien aseslottien cooldown-ajastimet
    updateCooldowns(dt) {
        for (const slot of this.weaponSlots) {
            if (slot.shootCooldownTimer > 0) {
                slot.shootCooldownTimer -= dt;
                if (slot.shootCooldownTimer < 0) {
                    slot.shootCooldownTimer = 0;
                }
            }
        }
    }

    // Palauta pelaajan nopeus
    getVelocity() {
        return this.getSpeed();
    }

    // Tarkista ovatko koordinaatit pelaajan sisällä (törmäys)
    isPointInside(px, py) {
        return px > this.x &&
               px < this.x + this.config.width &&
               py > this.y &&
               py < this.y + this.config.height;
    }
}
