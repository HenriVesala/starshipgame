// Vihollisten konfiguraatio
const enemyConfig = {
    minVelocityInNebula: 30,  // Minimi nopeus tähtisumassa (px/s)
    baseHealth: 100,          // Perus vihollisen kestopisteet
    collisionDamage: 200      // Vahinko joka viholliset aiheuttavat törmätessään
};

// Base Enemy class - parent class for all enemy types
class BaseEnemy {
    constructor(gameContainer, spawnConfig = {}) {
        this.gameContainer = gameContainer;
        this.isEntering = true;

        // Default spawn configuration
        const defaultConfig = {
            enterSpeed: 120,            // Nopeus (pikselit/sekunti)
            chaseMode: 'none',          // 'none', 'periodic', 'continuous', 'distance-based'
            wallBehavior: 'bounce',     // 'bounce', 'ignore', 'clamp'
            turnSpeed: 90,              // Maksimi kääntymiskulma (astetta/sekunti)
            turnInterval: 5.0,          // Kääntymistaajuus (sekunti) - vain 'periodic' modelle
            minSpeed: 30,               // Minimi nopeus - vain 'distance-based' modelle
            slowdownStartDistance: 200, // Hidastamisen aloitusetäisyys - vain 'distance-based'
            slowdownStopDistance: 100,  // Hidastamisen loppuetäisyys - vain 'distance-based'
            shootCooldownMin: 1.0,      // Pienin ampumisaikaväli (sekunti)
            shootCooldownMax: 2.67,     // Suurin ampumisaikaväli (sekunti)
            enemyClassName: 'enemy',
            health: enemyConfig.baseHealth
        };

        this.config = { ...defaultConfig, ...spawnConfig };
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.isShrinking = false;    // Kutistumistila (mustan aukon tapahtumahorisontti)
        this.shrinkProgress = 0;     // Kutistumisen edistyminen (0-1)
        this.shrinkDuration = 0.5;   // Kutistumisen kesto sekunteina
        this.damageFlashTimer = 0;   // Välähdysajastin vahingon jälkeen
        this.damageFlashDuration = 0.15; // Välähdyksen kesto sekunteina

        // Liikekäyttäytymisen tilamuuttujat
        this.timeSinceLastTurn = 0;  // Ajastin käännöksille (periodic mode)
        this.targetAngle = null;      // Kohdekulma johon käännytään (periodic mode)

        // Spawn ruudun reunoilta
        const side = Math.floor(Math.random() * 4);
        const randomX = Math.random() * (gameConfig.screenWidth - gameConfig.playerWidth);
        const randomY = Math.random() * gameConfig.screenHeight;
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
            // Pelialueella - käytä konfiguroitua liikekäyttäytymistä
            this.handleMovement(playerX, playerY, dt);
        } else {
            // Ei pelaajan sijaintia - liiku normaalisti
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        // Päivitä kulma ja käsittele seinät
        this.updateAngle(playerX, playerY, dt);
        this.handleWalls();

        this.shootCooldown -= dt;

        // Shoot
        if (this.shootCooldown <= 0) {
            this.shoot(enemyBullets);
            this.shootCooldown = Math.random() * (this.config.shootCooldownMax - this.config.shootCooldownMin) + this.config.shootCooldownMin;
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
                        speed = this.config.minSpeed;
                    } else if (distance < this.config.slowdownStartDistance) {
                        const slowdownRange = this.config.slowdownStartDistance - this.config.slowdownStopDistance;
                        const distanceInRange = distance - this.config.slowdownStopDistance;
                        const slowdownFactor = distanceInRange / slowdownRange;
                        speed = this.config.minSpeed + (this.config.enterSpeed - this.config.minSpeed) * slowdownFactor;
                    }

                    this.vx = dirX * speed;
                    this.vy = dirY * speed;
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
            case 'bounce':
                if (this.x < 0 || this.x > gameConfig.screenWidth - gameConfig.playerWidth) this.vx *= -1;
                if (this.y < 0 || this.y > gameConfig.screenHeight - gameConfig.playerHeight) this.vy *= -1;
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

    shoot(enemyBullets) {
        const halfShipSize = gameConfig.playerWidth / 2;
        const bullet = new Bullet(this.gameContainer, this.x + halfShipSize, this.y + gameConfig.playerHeight, this.angle, 'enemy');
        enemyBullets.push(bullet);
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';

        // Lisää kutistumisanimaatio
        if (this.isShrinking) {
            const scale = 1 - this.shrinkProgress;
            this.element.style.transform = `rotate(${this.angle + 180}deg) scale(${scale})`;
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

    // Ota vahinkoa
    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;

        // Aktivoi välähdys jos alus ei tuhoudu
        if (this.health > 0) {
            this.damageFlashTimer = this.damageFlashDuration;
        }

        return this.health <= 0; // Palauta true jos alus tuhoutui
    }

    destroy() {
        this.element.remove();
    }
}
