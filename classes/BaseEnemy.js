// Vihollisten konfiguraatio
const enemyConfig = {
    minVelocityInNebula: 30  // Minimi nopeus tähtisumassa (px/s)
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
            enemyClassName: 'enemy'
        };
        
        this.config = { ...defaultConfig, ...spawnConfig };
        
        // Spawn from screen edges
        const side = Math.floor(Math.random() * 4);
        const randomX = Math.random() * (1200 - 40);
        const randomY = Math.random() * 900;
        
        switch(side) {
            case 0: // Top
                this.x = randomX;
                this.y = -50;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = this.config.enterSpeed;
                break;
            case 1: // Bottom
                this.x = randomX;
                this.y = 900 + 50;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = -this.config.enterSpeed;
                break;
            case 2: // Left
                this.x = -50;
                this.y = randomY;
                this.vx = this.config.enterSpeed;
                this.vy = (Math.random() - 0.5) * 2;
                break;
            case 3: // Right
                this.x = 1200 + 50;
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
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Check if fully entered game area
        if (this.isEntering) {
            if (this.x >= 0 && this.x <= 1200 - 40 && this.y >= 0 && this.y <= 900 - 40) {
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

        // Bounce off walls if enabled and not entering
        if (!this.isEntering && this.config.bounceEnabled) {
            if (this.x < 0 || this.x > 1200 - 40) this.vx *= -1;
            if (this.y < 0 || this.y > 900 - 40) this.vy *= -1;
        }

        // Shoot
        if (this.shootCooldown <= 0) {
            this.shoot(enemyBullets);
            this.shootCooldown = Math.random() * (this.config.shootCooldownMax - this.config.shootCooldownMin) + this.config.shootCooldownMin;
        }

        this.render();
    }

    chasePlayer(playerX, playerY) {
        const dx = playerX + 20 - (this.x + 20);
        const dy = playerY + 20 - (this.y + 20);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            this.vx = dirX * this.config.enterSpeed;
            this.vy = dirY * this.config.enterSpeed;
        }
    }

    shoot(enemyBullets) {
        const bullet = new Bullet(this.gameContainer, this.x + 20, this.y + 40, this.angle, 'enemy');
        enemyBullets.push(bullet);
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.style.transform = `rotate(${this.angle + 180}deg)`;
    }

    destroy() {
        this.element.remove();
    }
}
