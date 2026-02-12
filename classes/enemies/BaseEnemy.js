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
            weapon: 'bullet',           // Asetyyppi: 'bullet' | 'missile'
            shootMinDistance: 0,         // Minimi ampumisetäisyys (0 = ei rajaa)
            shootMaxDistance: Infinity,  // Maksimi ampumisetäisyys (Infinity = ei rajaa)
            shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
            shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)
            enemyClassName: 'enemy',
            health: enemyConfig.baseHealth,
            maxSpeed: enemyConfig.maxSpeed,
            nebulaCoefficient: enemyConfig.nebulaCoefficient
        };

        const config = { ...defaultConfig, ...spawnConfig };

        super({
            health: config.health,
            maxSpeed: config.maxSpeed,
            nebulaCoefficient: config.nebulaCoefficient
        });

        this.gameContainer = gameContainer;
        this.config = config;
        this.isEntering = true;

        // Liikekäyttäytymisen tilamuuttujat
        this.timeSinceLastTurn = 0;  // Ajastin käännöksille (periodic mode)
        this.targetAngle = null;      // Kohdekulma johon käännytään (periodic mode)

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
        this.flameMain.className = 'ship-flame-main active';
        this.element.appendChild(this.flameMain);

        gameContainer.appendChild(this.element);
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
        // Jos kutistuu, älä tee mitään muuta kuin renderöi
        if (this.isShrinking) {
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

        this.shootCooldown -= dt;

        // Shoot (tarkista ampumisetäisyys jos konfiguroitu)
        if (this.shootCooldown <= 0 && playerX !== null && playerY !== null) {
            const halfShipSize = gameConfig.playerWidth / 2;
            const sdx = playerX + halfShipSize - (this.x + halfShipSize);
            const sdy = playerY + halfShipSize - (this.y + halfShipSize);
            const shootDist = Math.sqrt(sdx * sdx + sdy * sdy);

            if (shootDist >= this.config.shootMinDistance && shootDist <= this.config.shootMaxDistance) {
                this.shoot(enemyBullets, enemyMissiles);
                this.shootCooldown = Math.random() * (this.config.shootCooldownMax - this.config.shootCooldownMin) + this.config.shootCooldownMin;
            }
        }

        this.render();
    }

    handleMovement(playerX, playerY, dt) {
        const halfShipSize = gameConfig.playerWidth / 2;
        const dx = playerX + halfShipSize - (this.x + halfShipSize);
        const dy = playerY + halfShipSize - (this.y + halfShipSize);

        switch (this.config.chaseMode) {
            case 'periodic':
                // Käänny pelaajaa kohti määrävälein
                this.timeSinceLastTurn += dt;
                if (this.timeSinceLastTurn >= this.config.turnInterval) {
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

                    const newAngle = currentVelocityAngle + turnAmount;
                    const radians = (newAngle - 90) * Math.PI / 180;
                    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                    this.vx = Math.cos(radians) * speed;
                    this.vy = Math.sin(radians) * speed;
                }

                this.x += this.vx * dt;
                this.y += this.vy * dt;
                break;

            case 'continuous':
                // Jatkuva jahtaus asteittaisella kääntymisellä
                const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                const currentVelocityAngle = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 90;
                const angleDiff = this.angleDifference(targetAngle, currentVelocityAngle);
                const maxTurn = this.config.turnSpeed * dt;

                let turnAmount = angleDiff;
                if (Math.abs(angleDiff) > maxTurn) {
                    turnAmount = Math.sign(angleDiff) * maxTurn;
                }

                const newAngle = currentVelocityAngle + turnAmount;
                const radians = (newAngle - 90) * Math.PI / 180;
                this.vx = Math.cos(radians) * this.config.enterSpeed;
                this.vy = Math.sin(radians) * this.config.enterSpeed;

                this.x += this.vx * dt;
                this.y += this.vy * dt;
                break;

            case 'distance-based':
                // Älykäs jahtaaminen etäisyyden mukaan
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    const dirX = dx / distance;
                    const dirY = dy / distance;

                    // Laske nopeus etäisyyden perusteella
                    let speed = this.config.enterSpeed;

                    if (distance < this.config.slowdownStopDistance) {
                        if (this.config.keepDistance) {
                            // Peräänny pelaajasta - liiku poispäin
                            speed = this.config.minSpeed;
                            this.vx = -dirX * speed;
                            this.vy = -dirY * speed;
                        } else {
                            speed = this.config.minSpeed;
                            this.vx = dirX * speed;
                            this.vy = dirY * speed;
                        }
                    } else if (distance < this.config.slowdownStartDistance) {
                        const slowdownRange = this.config.slowdownStartDistance - this.config.slowdownStopDistance;
                        const distanceInRange = distance - this.config.slowdownStopDistance;
                        const slowdownFactor = distanceInRange / slowdownRange;
                        speed = this.config.minSpeed + (this.config.enterSpeed - this.config.minSpeed) * slowdownFactor;
                        this.vx = dirX * speed;
                        this.vy = dirY * speed;
                    } else {
                        this.vx = dirX * speed;
                        this.vy = dirY * speed;
                    }
                }

                this.x += this.vx * dt;
                this.y += this.vy * dt;
                break;

            default:
                // 'none' - ei jahtaa, liiku vain eteenpäin
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                break;
        }
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
        } else {
            const bullet = new Bullet(this.gameContainer, spawnX, spawnY, this.angle, 'enemy', this.vx, this.vy);
            bullet.firedBy = this;
            enemyBullets.push(bullet);
        }
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';

        // Lisää kutistumisanimaatio
        if (this.isShrinking) {
            const scale = 1 - this.shrinkProgress;
            this.element.style.transform = `rotate(${this.angle + 180}deg) scale(${scale})`;
            this.flameMain.classList.remove('active');
        } else {
            this.element.style.transform = `rotate(${this.angle + 180}deg)`;
        }

        // Lisää vahinkoválähdys
        if (this.damageFlashTimer > 0) {
            this.element.classList.add('damage-flash');
        } else {
            this.element.classList.remove('damage-flash');
        }
    }
}
