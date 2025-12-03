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
            enterSpeed: 120, // pixels per second (was 2 per frame at 60fps)
            chaseEnabled: false,
            shootCooldownMin: 1.0, // seconds (was 60 frames, 60/60 = 1 second)
            shootCooldownMax: 2.67, // seconds (was 160 frames, 160/60 = 2.67 seconds)
            bounceEnabled: true,
            enemyClassName: 'enemy',
            health: enemyConfig.baseHealth  // Default health
        };

        this.config = { ...defaultConfig, ...spawnConfig };
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.isShrinking = false;    // Kutistumistila (mustan aukon tapahtumahorisontti)
        this.shrinkProgress = 0;     // Kutistumisen edistyminen (0-1)
        this.shrinkDuration = 0.5;   // Kutistumisen kesto sekunteina

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

    update(enemyBullets, playerX = null, playerY = null, dt = 0.016) {
        // Jos kutistuu, älä tee mitään muuta kuin renderöi
        if (this.isShrinking) {
            this.render();
            return;
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

        // Chase player if enabled and inside game area
        if (!this.isEntering && this.config.chaseEnabled && playerX !== null && playerY !== null) {
            this.chasePlayer(playerX, playerY);
        }

        // Update angle based on velocity
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

    chasePlayer(playerX, playerY) {
        const halfShipSize = gameConfig.playerWidth / 2;
        const dx = playerX + halfShipSize - (this.x + halfShipSize);
        const dy = playerY + halfShipSize - (this.y + halfShipSize);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const dirX = dx / distance;
            const dirY = dy / distance;

            this.vx = dirX * this.config.enterSpeed;
            this.vy = dirY * this.config.enterSpeed;
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
    }

    // Ota vahinkoa
    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
        return this.health <= 0; // Palauta true jos alus tuhoutui
    }

    destroy() {
        this.element.remove();
    }
}
