// Vihollisten konfiguraatio
const enemyConfig = {
    baseHealth: 100,          // Perus vihollisen kestopisteet
    collisionDamage: 200,     // Vahinko joka viholliset aiheuttavat törmätessään
    maxSpeed: 400,            // Oletus maksiminopeus (pikselit/sekunti)
    nebulaCoefficient: 1.0    // Nebulan vastuskerroin (0 = ei vaikutusta, 1 = normaali)
};

// Base Enemy class - parent class for all enemy types
class BaseEnemy extends SpaceShip {
    constructor(gameContainer, spawnConfig = {}) {
        // Default spawn configuration
        const defaultConfig = {
            enterSpeed: 120,            // Nopeus (pikselit/sekunti)
            chaseMode: 'none',          // 'none', 'periodic', 'continuous', 'distance-based'
            wallBehavior: 'wrap',       // 'wrap', 'clamp', 'ignore'
            turnSpeed: 90,              // Maksimi kääntymiskulma (astetta/sekunti)
            turnInterval: 5.0,          // Kääntymistaajuus (sekunti) - vain 'periodic' modelle
            minSpeed: 30,               // Minimi nopeus - vain 'distance-based' modelle
            slowdownStartDistance: 200, // Hidastamisen aloitusetäisyys - vain 'distance-based'
            slowdownStopDistance: 100,  // Hidastamisen loppuetäisyys - vain 'distance-based'
            keepDistance: false,         // Perääntyy jos liian lähellä - vain 'distance-based'
            accelerationForward: 120,   // Kiihtyvyys eteenpäin (pikselit/sekunti²)
            accelerationReverse: 120,   // Kiihtyvyys taaksepäin (pikselit/sekunti²)
            weapon: 'bullet',           // Asetyyppi: 'bullet' | 'missile' | 'laser' | 'railgun'
            shootMinDistance: 0,         // Minimi ampumisetäisyys (0 = ei rajaa)
            shootMaxDistance: Infinity,  // Maksimi ampumisetäisyys (Infinity = ei rajaa)
            shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
            shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)
            shootConeAngle: 30,         // Ampumisen etusektorin puolikulma (±30° = 60° kartio)
            enemyClassName: 'enemy',
            health: enemyConfig.baseHealth,
            maxSpeed: enemyConfig.maxSpeed,
            nebulaCoefficient: enemyConfig.nebulaCoefficient,
            maxEnergy: 80,              // Maksimi energia
            energyRegenRate: 12         // Energian latausnopeus (yksikköä/sekunti)
        };

        const config = { ...defaultConfig, ...spawnConfig };

        super({
            health: config.health,
            maxSpeed: config.maxSpeed,
            nebulaCoefficient: config.nebulaCoefficient,
            maxEnergy: config.maxEnergy,
            energyRegenRate: config.energyRegenRate
        });

        this.gameContainer = gameContainer;
        this.config = config;
        this.isEntering = true;

        // Liikekäyttäytymisen tilamuuttujat
        this.timeSinceLastTurn = 0;  // Ajastin käännöksille (periodic mode)
        this.targetAngle = null;      // Kohdekulma johon käännytään (periodic mode)
        this.desiredDirX = undefined; // Haluttu suuntavektori (periodic mode)
        this.desiredDirY = undefined;

        // Spawn ruudun reunoilta
        const side = Math.floor(Math.random() * 4);
        const randomX = Math.random() * (gameConfig.screenWidth - gameConfig.playerWidth);
        const randomY = Math.random() * (gameConfig.screenHeight - gameConfig.playerHeight);
        const spawnOffset = 50; // Kuinka kaukana ruudun ulkopuolella spawnaus tapahtuu

        switch(side) {
            case 0: // Ylhäältä
                this.x = randomX;
                this.y = -spawnOffset;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = this.config.enterSpeed;
                break;
            case 1: // Alhaalta
                this.x = randomX;
                this.y = gameConfig.screenHeight + spawnOffset;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = -this.config.enterSpeed;
                break;
            case 2: // Vasemmalta
                this.x = -spawnOffset;
                this.y = randomY;
                this.vx = this.config.enterSpeed;
                this.vy = (Math.random() - 0.5) * 2;
                break;
            case 3: // Oikealta
                this.x = gameConfig.screenWidth + spawnOffset;
                this.y = randomY;
                this.vx = -this.config.enterSpeed;
                this.vy = (Math.random() - 0.5) * 2;
                break;
        }

        this.angle = 180;
        this.shootCooldown = Math.random() * (this.config.shootCooldownMax - this.config.shootCooldownMin) + this.config.shootCooldownMin;

        this.element = document.createElement('div');
        this.element.className = this.config.enemyClassName;

        this.bodyElement = document.createElement('div');
        this.bodyElement.className = 'ship-body';
        this.element.appendChild(this.bodyElement);

        this.flameMain = document.createElement('div');
        this.flameMain.className = 'ship-flame-main';
        this.element.appendChild(this.flameMain);

        this.flameLeft = document.createElement('div');
        this.flameLeft.className = 'ship-flame-left';
        this.element.appendChild(this.flameLeft);

        this.flameRight = document.createElement('div');
        this.flameRight.className = 'ship-flame-right';
        this.element.appendChild(this.flameRight);

        gameContainer.appendChild(this.element);

        // Laser-instanssi jos asetyyppi on laser
        this.laser = null;
        if (this.config.weapon === 'laser') {
            this.laser = new Laser(document.getElementById('laserCanvas'));
        }

        // Railgun-latauksen tilamuuttujat
        this.isChargingRailgun = false;
        this.railgunCharge = 0;
        this.railgunChargeTarget = 0;
        this.railgunChargeTimer = 0;
    }

    // Apufunktio: laske lyhin kulmaero
    angleDifference(target, current) {
        let diff = target - current;
        // Normalisoi välille -180...180
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    }

    update(enemyBullets, enemyMissiles, playerX = null, playerY = null, dt = 0.016) {
        // Jos kutistuu, sammuta laser, nollaa railgun ja renderöi
        if (this.isShrinking) {
            if (this.laser) this.laser.active = false;
            this.isChargingRailgun = false;
            this.railgunCharge = 0;
            this.render();
            return;
        }

        // Päivitä vahinkoválähdys-ajastin
        this.updateDamageFlash(dt);

        // Tarkista onko täysin tullut pelialueelle
        if (this.isEntering) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            if (this.x >= 0 && this.x <= gameConfig.screenWidth - gameConfig.playerWidth &&
                this.y >= 0 && this.y <= gameConfig.screenHeight - gameConfig.playerHeight) {
                this.isEntering = false;
            }
        } else if (playerX !== null && playerY !== null) {
            // Pelialueella - käytä konfiguroitua liikekäyttäytymistä
            this.handleMovement(playerX, playerY, dt);
        } else {
            // Ei pelaajan sijaintia - liiku normaalisti
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        // Rajoita maksiminopeus (ulkoiset voimat kuten painovoima voivat kiihdyttää)
        this.capSpeed();

        // Päivitä kulma ja käsittele seinät
        this.updateAngle(playerX, playerY, dt);
        this.handleWalls();

        // Lataa energiaa (puolitettu kiihdyttäessä/jarrutettaessa)
        const energyRegenMult = this.thrustState !== 'none' ? 0.5 : 1.0;
        this.energy = Math.min(this.maxEnergy, this.energy + this.config.energyRegenRate * energyRegenMult * dt);

        // Ampumislogiikka
        if (playerX !== null && playerY !== null) {
            const halfShipSize = gameConfig.playerWidth / 2;
            const sdx = playerX + halfShipSize - (this.x + halfShipSize);
            const sdy = playerY + halfShipSize - (this.y + halfShipSize);
            const shootDist = Math.sqrt(sdx * sdx + sdy * sdy);

            // Tarkista onko pelaaja etusektorilla
            const angleToPlayer = Math.atan2(sdy, sdx) * (180 / Math.PI) + 90;
            const angleDiff = Math.abs(this.angleDifference(angleToPlayer, this.angle));
            const inCone = angleDiff <= this.config.shootConeAngle;

            if (this.config.weapon === 'railgun') {
                // Railgun: lataa kun pelaaja etusektorilla, laukaise kun latausaika saavutettu
                if (inCone && this.energy > 0) {
                    if (!this.isChargingRailgun) {
                        // Aloita lataus, aseta satunnainen lataustavoite
                        this.isChargingRailgun = true;
                        this.railgunCharge = 0;
                        this.railgunChargeTarget = railgunConfig.enemyChargeTimeMin +
                            Math.random() * (railgunConfig.enemyChargeTimeMax - railgunConfig.enemyChargeTimeMin);
                        this.railgunChargeTimer = 0;
                    }

                    // Lataa tai ylläpidä varausta
                    if (this.railgunCharge >= railgunConfig.maxCharge) {
                        // Ylläpitotila
                        const maintenanceCost = railgunConfig.maintenanceEnergyPerSecond * dt;
                        this.energy -= Math.min(maintenanceCost, this.energy);
                    } else {
                        const energyCost = railgunConfig.chargeEnergyPerSecond * dt;
                        const actualCost = Math.min(energyCost, this.energy);
                        this.energy -= actualCost;
                        this.railgunCharge += actualCost;
                    }
                    this.railgunChargeTimer += dt;

                    // Laukaise kun latausaika saavutettu tai maksimivaraus täynnä
                    if (this.railgunChargeTimer >= this.railgunChargeTarget ||
                        this.railgunCharge >= railgunConfig.maxCharge) {
                        this.fireRailgun(enemyBullets);
                    }
                } else if (this.isChargingRailgun) {
                    // Pelaaja poistui sektorilta tai energia loppui — laukaise heti
                    this.fireRailgun(enemyBullets);
                }

            } else if (this.config.weapon === 'laser') {
                // Laser: jatkuva säde kun etusektorilla ja energiaa riittää
                const laserEnergyCost = laserConfig.energyCostPerSecond * dt;
                if (inCone && this.energy >= laserEnergyCost) {
                    this.energy -= laserEnergyCost;

                    const rad = (this.angle - 90) * Math.PI / 180;
                    const startX = this.x + halfShipSize + Math.cos(rad) * 20;
                    const startY = this.y + halfShipSize + Math.sin(rad) * 20;

                    const laserTargets = {
                        enemies: null,
                        planets: planets,
                        meteors: meteors,
                        blackHoles: blackHoles,
                        nebulaClouds: nebulaClouds,
                        player: player
                    };

                    const hit = this.laser.trace(startX, startY, this.angle, 'enemy', laserTargets);
                    this.laser.active = true;

                    if (hit.target) {
                        const intensity = this.laser.getIntensity(hit.distance) * (hit.mul || 1);
                        handleLaserHit(hit.target, laserConfig.damagePerSecond * dt * intensity, 'enemy');
                    }

                    // Laserin rekyyli (jatkuva)
                    this.vx -= Math.cos(rad) * laserConfig.recoilPerSecond * dt;
                    this.vy -= Math.sin(rad) * laserConfig.recoilPerSecond * dt;
                } else {
                    if (this.laser) this.laser.active = false;
                }
            } else {
                // Bullet/Missile: cooldown-pohjainen ampuminen
                this.shootCooldown -= dt;

                if (this.shootCooldown <= 0) {
                    const shootEnergyCost = this.config.weapon === 'missile' ? missileConfig.energyCost : bulletConfig.enemyBullet.energyCost;
                    if (inCone && shootDist >= this.config.shootMinDistance && shootDist <= this.config.shootMaxDistance && this.energy >= shootEnergyCost) {
                        this.energy -= shootEnergyCost;
                        this.shoot(enemyBullets, enemyMissiles);
                        this.shootCooldown = Math.random() * (this.config.shootCooldownMax - this.config.shootCooldownMin) + this.config.shootCooldownMin;
                    }
                }
            }
        } else {
            // Ei pelaajan sijaintia — sammuta laser ja nollaa railgun-lataus
            if (this.laser) this.laser.active = false;
            if (this.isChargingRailgun) this.fireRailgun(enemyBullets);
            this.shootCooldown -= dt;
        }

        this.render();
    }

    handleMovement(playerX, playerY, dt) {
        const halfShipSize = gameConfig.playerWidth / 2;
        const dx = playerX + halfShipSize - (this.x + halfShipSize);
        const dy = playerY + halfShipSize - (this.y + halfShipSize);

        // Oletuksena nykyinen nopeus (ei kiihdytystä)
        let desiredVx = this.vx;
        let desiredVy = this.vy;

        switch (this.config.chaseMode) {
            case 'periodic':
                // Päivitä kohdesuunta määrävälein
                this.timeSinceLastTurn += dt;
                if (this.timeSinceLastTurn >= this.config.turnInterval) {
                    const targetAngle = Math.atan2(dy, dx);
                    this.desiredDirX = Math.cos(targetAngle);
                    this.desiredDirY = Math.sin(targetAngle);
                    this.timeSinceLastTurn = 0;
                }

                // Kiihdytä kohdesuuntaan jos asetettu
                if (this.desiredDirX !== undefined) {
                    desiredVx = this.desiredDirX * this.config.enterSpeed;
                    desiredVy = this.desiredDirY * this.config.enterSpeed;
                }
                break;

            case 'continuous': {
                // Jatkuvasti kohti pelaajaa
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    desiredVx = (dx / dist) * this.config.enterSpeed;
                    desiredVy = (dy / dist) * this.config.enterSpeed;
                }
                break;
            }

            case 'distance-based': {
                // Älykäs jahtaaminen etäisyyden mukaan
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    const dirX = dx / distance;
                    const dirY = dy / distance;

                    if (distance < this.config.slowdownStopDistance) {
                        if (this.config.keepDistance) {
                            // Peräänny pelaajasta
                            desiredVx = -dirX * this.config.minSpeed;
                            desiredVy = -dirY * this.config.minSpeed;
                        } else {
                            desiredVx = dirX * this.config.minSpeed;
                            desiredVy = dirY * this.config.minSpeed;
                        }
                    } else if (distance < this.config.slowdownStartDistance) {
                        const slowdownRange = this.config.slowdownStartDistance - this.config.slowdownStopDistance;
                        const distanceInRange = distance - this.config.slowdownStopDistance;
                        const slowdownFactor = distanceInRange / slowdownRange;
                        const speed = this.config.minSpeed + (this.config.enterSpeed - this.config.minSpeed) * slowdownFactor;
                        desiredVx = dirX * speed;
                        desiredVy = dirY * speed;
                    } else {
                        desiredVx = dirX * this.config.enterSpeed;
                        desiredVy = dirY * this.config.enterSpeed;
                    }
                }
                break;
            }

            default:
                // 'none' - ei kiihdytystä, ajelehtii inertialla
                break;
        }

        // Kiihdytä kohti haluttua nopeutta
        const dvx = desiredVx - this.vx;
        const dvy = desiredVy - this.vy;
        const dLen = Math.sqrt(dvx * dvx + dvy * dvy);
        let thrustDot = 0;

        if (dLen > 0) {
            // Valitse kiihtyvyys: eteenpäin jos kiihdytetään nopeuden suuntaan, taaksepäin jos jarrutetaan
            thrustDot = dvx * this.vx + dvy * this.vy;
            const accelRate = thrustDot >= 0 ? this.config.accelerationForward : this.config.accelerationReverse;
            const nebulaAccelMult = this.inNebula ? 0.5 : 1.0;
            const maxAccel = accelRate * nebulaAccelMult * dt;
            const accel = Math.min(maxAccel, dLen);
            this.vx += (dvx / dLen) * accel;
            this.vy += (dvy / dLen) * accel;
        }

        // Päivitä liekin tila: forward = kiihdytys, reverse = jarrutus/peruutus
        if (dLen > 0.1) {
            this.thrustState = thrustDot >= 0 ? 'forward' : 'reverse';
        } else {
            this.thrustState = 'none';
        }

        // Päivitä sijainti
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    updateAngle(playerX, playerY, dt) {
        // Erikoiskäsittely distance-based modelle (ampumasuunta kohti pelaajaa)
        if (this.config.chaseMode === 'distance-based' && playerX !== null && playerY !== null) {
            const halfShipSize = gameConfig.playerWidth / 2;
            const dx = playerX + halfShipSize - (this.x + halfShipSize);
            const dy = playerY + halfShipSize - (this.y + halfShipSize);
            const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

            const angleDiff = this.angleDifference(targetAngle, this.angle);
            const maxTurn = this.config.turnSpeed * dt;

            let turnAmount = angleDiff;
            if (Math.abs(angleDiff) > maxTurn) {
                turnAmount = Math.sign(angleDiff) * maxTurn;
            }

            this.angle += turnAmount;
        } else {
            // Muille modeille: kulma nopeuden suuntaan
            this.angle = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 90;
        }
    }

    handleWalls() {
        if (this.isEntering) return;

        switch (this.config.wallBehavior) {
            case 'wrap':
                if (this.x < -gameConfig.playerWidth) this.x = gameConfig.screenWidth;
                if (this.x > gameConfig.screenWidth) this.x = -gameConfig.playerWidth;
                if (this.y < -gameConfig.playerHeight) this.y = gameConfig.screenHeight;
                if (this.y > gameConfig.screenHeight) this.y = -gameConfig.playerHeight;
                break;

            case 'clamp':
                if (this.x < 0) this.x = 0;
                if (this.x > gameConfig.screenWidth - gameConfig.playerWidth) {
                    this.x = gameConfig.screenWidth - gameConfig.playerWidth;
                }
                if (this.y < 0) this.y = 0;
                if (this.y > gameConfig.screenHeight - gameConfig.playerHeight) {
                    this.y = gameConfig.screenHeight - gameConfig.playerHeight;
                }
                break;

            case 'ignore':
            default:
                // Älä tee mitään seinien kanssa
                break;
        }
    }

    shoot(enemyBullets, enemyMissiles) {
        const halfShipSize = gameConfig.playerWidth / 2;
        const centerX = this.x + halfShipSize;
        const centerY = this.y + halfShipSize;

        // Ammu aluksen nokan suuntaan (kulman perusteella)
        const radians = (this.angle - 90) * Math.PI / 180;
        const forwardOffset = 20;
        const spawnX = centerX + Math.cos(radians) * forwardOffset;
        const spawnY = centerY + Math.sin(radians) * forwardOffset;

        if (this.config.weapon === 'missile') {
            enemyMissiles.push(new Missile(this.gameContainer, spawnX, spawnY, this.angle, 'enemy', this.vx, this.vy));
            // Ohjuksen rekyyli
            this.vx -= Math.cos(radians) * missileConfig.recoil;
            this.vy -= Math.sin(radians) * missileConfig.recoil;
        } else {
            const bullet = new Bullet(this.gameContainer, spawnX, spawnY, this.angle, 'enemy', this.vx, this.vy);
            bullet.firedBy = this;
            enemyBullets.push(bullet);
            // Ammuksen rekyyli
            this.vx -= Math.cos(radians) * bulletConfig.enemyBullet.recoil;
            this.vy -= Math.sin(radians) * bulletConfig.enemyBullet.recoil;
        }
    }

    // Railgun-laukaisu: luo ammus kertyneen latauksen perusteella
    fireRailgun(enemyBullets) {
        if (this.railgunCharge >= railgunConfig.minCharge) {
            const chargePercent = this.railgunCharge / railgunConfig.maxCharge;
            const speed = railgunConfig.minSpeed + chargePercent * (railgunConfig.maxSpeed - railgunConfig.minSpeed);

            const halfShip = gameConfig.playerWidth / 2;
            const rad = (this.angle - 90) * Math.PI / 180;
            const spawnX = this.x + halfShip + Math.cos(rad) * 20;
            const spawnY = this.y + halfShip + Math.sin(rad) * 20;

            const projectile = new RailgunProjectile(
                this.gameContainer, spawnX, spawnY, this.angle,
                'enemy', speed, this.vx, this.vy
            );
            projectile.firedBy = this;
            enemyBullets.push(projectile);

            // Rekyyli
            const recoilAmount = railgunConfig.recoilPerCharge * this.railgunCharge;
            this.vx -= Math.cos(rad) * recoilAmount;
            this.vy -= Math.sin(rad) * recoilAmount;
        }

        this.isChargingRailgun = false;
        this.railgunCharge = 0;
    }

    destroy() {
        if (this.laser) this.laser.clear();
        super.destroy();
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';

        // Lisää kutistumisanimaatio
        if (this.isShrinking) {
            const scale = 1 - this.shrinkProgress;
            this.element.style.transform = `rotate(${this.angle + 180}deg) scale(${scale})`;
            this.flameMain.classList.remove('active');
            this.flameLeft.classList.remove('active');
            this.flameRight.classList.remove('active');
        } else {
            this.element.style.transform = `rotate(${this.angle + 180}deg)`;

            // Päivitä liekkien näkyvyys kiihtyvyystilan mukaan
            if (this.thrustState === 'forward') {
                this.flameMain.classList.add('active');
                this.flameLeft.classList.remove('active');
                this.flameRight.classList.remove('active');
            } else if (this.thrustState === 'reverse') {
                this.flameMain.classList.remove('active');
                this.flameLeft.classList.add('active');
                this.flameRight.classList.add('active');
            } else {
                this.flameMain.classList.remove('active');
                this.flameLeft.classList.remove('active');
                this.flameRight.classList.remove('active');
            }
        }

        // Lisää vahinkoválähdys
        if (this.damageFlashTimer > 0) {
            this.element.classList.add('damage-flash');
        } else {
            this.element.classList.remove('damage-flash');
        }
    }
}
