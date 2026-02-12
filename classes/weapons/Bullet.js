// Ammuksien konfiguraatio
const bulletConfig = {
    playerBullet: {
        initialSpeed: 250,    // Lähtönopeus laukaistaessa (pikselit/sekunti)
        maxSpeed: 500,        // Maksiminopeus (pikselit/sekunti)
        minVelocityInNebula: 150,  // Minimi nopeus tähtisumassa (px/s)
        damage: 100           // Vahinko joka ammus aiheuttaa
    },
    enemyBullet: {
        initialSpeed: 240,    // Lähtönopeus laukaistaessa (pikselit/sekunti)
        maxSpeed: 480,        // Maksiminopeus (pikselit/sekunti)
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
        const config = type === 'player' ? bulletConfig.playerBullet : bulletConfig.enemyBullet;
        this.maxSpeed = config.maxSpeed;
        this.damage = config.damage;
        this.angle = angle;
        this.type = type; // 'player' or 'enemy'

        // Laske alkunopeus kulman perusteella (lähtönopeudella) + ampujan nopeus
        const adjustedAngle = angle - 90;
        const radians = (adjustedAngle * Math.PI) / 180;
        this.vx = Math.cos(radians) * config.initialSpeed + ownerVx;
        this.vy = Math.sin(radians) * config.initialSpeed + ownerVy;

        this.element = document.createElement('div');
        this.element.className = `bullet ${type}-bullet`;
        gameContainer.appendChild(this.element);
    }

    update(dt = 0.016) {
        // Rajoita maksiminopeus (ulkoiset voimat voivat kiihdyttää)
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > this.maxSpeed) {
            const scale = this.maxSpeed / currentSpeed;
            this.vx *= scale;
            this.vy *= scale;
        }

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
