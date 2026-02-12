// Ammuksien konfiguraatio
const bulletConfig = {
    playerBullet: {
        speed: 250,           // Pikselit/sekunti
        minVelocityInNebula: 150,  // Minimi nopeus tähtisumassa (px/s)
        damage: 100           // Vahinko joka ammus aiheuttaa
    },
    enemyBullet: {
        speed: 240,           // Pikselit/sekunti
        minVelocityInNebula: 120,   // Minimi nopeus tähtisumassa (px/s)
        damage: 100           // Vahinko joka ammus aiheuttaa
    }
};

// Base Bullet class - used for both player and enemy bullets
class Bullet {
    constructor(gameContainer, x, y, angle, type = 'player', ownerVx = 0, ownerVy = 0) {
        this.gameContainer = gameContainer;
        this.x = x;
        this.y = y;
        this.speed = type === 'player' ? bulletConfig.playerBullet.speed : bulletConfig.enemyBullet.speed;
        this.damage = type === 'player' ? bulletConfig.playerBullet.damage : bulletConfig.enemyBullet.damage;
        this.angle = angle;
        this.type = type; // 'player' or 'enemy'

        // Calculate velocity based on angle and speed + owner's velocity
        const adjustedAngle = angle - 90;
        const radians = (adjustedAngle * Math.PI) / 180;
        this.vx = Math.cos(radians) * this.speed + ownerVx;
        this.vy = Math.sin(radians) * this.speed + ownerVy;

        this.element = document.createElement('div');
        this.element.className = `bullet ${type}-bullet`;
        gameContainer.appendChild(this.element);
    }

    update(dt = 0.016) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.render();
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        // Aseta ammuksen suunta ampumasuunnan mukaan
        this.element.style.transform = `rotate(${this.angle}deg)`;
    }

    destroy() {
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -20 || this.x > gameConfig.screenWidth + 20 || this.y < -20 || this.y > gameConfig.screenHeight + 20;
    }
}
