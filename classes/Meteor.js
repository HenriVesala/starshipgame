// Meteor class
class Meteor {
    constructor(gameContainer) {
        this.gameContainer = gameContainer;
        // Random size: 1-2 times player ship size (40px), so 40-80px diameter, 20-40px radius
        this.radius = Math.random() * 20 + 20; // 20-40px radius
        
        // Random spawn position from screen edges
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Top
                this.x = Math.random() * 1200;
                this.y = -this.radius;
                break;
            case 1: // Bottom
                this.x = Math.random() * 1200;
                this.y = 900 + this.radius;
                break;
            case 2: // Left
                this.x = -this.radius;
                this.y = Math.random() * 900;
                break;
            case 3: // Right
                this.x = 1200 + this.radius;
                this.y = Math.random() * 900;
                break;
        }

        // Random velocity: 75-150 pixels per second (was 1.25-2.5 per frame at 60fps)
        const speed = Math.random() * 37.5 + 75;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Random rotation
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 240; // degrees per second (was -2 to 2 per frame)

        this.element = document.createElement('div');
        this.element.className = 'meteor';
        this.element.style.width = (this.radius * 2) + 'px';
        this.element.style.height = (this.radius * 2) + 'px';
        gameContainer.appendChild(this.element);
    }

    update(dt = 0.016) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotationSpeed * dt;

        // Wrap around screen edges
        if (this.x < -this.radius * 2) this.x = 1200 + this.radius;
        if (this.x > 1200 + this.radius * 2) this.x = -this.radius;
        if (this.y < -this.radius * 2) this.y = 900 + this.radius;
        if (this.y > 900 + this.radius * 2) this.y = -this.radius;

        this.render();
    }

    render() {
        this.element.style.left = (this.x - this.radius) + 'px';
        this.element.style.top = (this.y - this.radius) + 'px';
        this.element.style.transform = `rotate(${this.rotation}deg)`;
    }

    destroy() {
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -this.radius * 2 || this.x > 1200 + this.radius * 2 ||
               this.y < -this.radius * 2 || this.y > 900 + this.radius * 2;
    }
}
