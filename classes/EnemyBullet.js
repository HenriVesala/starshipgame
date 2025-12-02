// Bullet class for enemies
class EnemyBullet {
    constructor(gameContainer, x, y, angle) {
        this.gameContainer = gameContainer;
        this.x = x;
        this.y = y;
        this.speed = 4;
        this.angle = angle;
        // Adjust angle by -90 to match the enemy ship's visual direction
        const adjustedAngle = angle - 90;
        const radians = (adjustedAngle * Math.PI) / 180;
        this.vx = Math.cos(radians) * this.speed;
        this.vy = Math.sin(radians) * this.speed;
        this.element = document.createElement('div');
        this.element.className = 'bullet enemy-bullet';
        gameContainer.appendChild(this.element);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.render();
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }

    destroy() {
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -20 || this.x > 1220 || this.y < -20 || this.y > 920;
    }
}
