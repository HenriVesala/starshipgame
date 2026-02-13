// Suuliekki-luokka — lyhyt visuaalinen efekti aseen laukaisupisteessä
class MuzzleFlash {
    constructor(x, y, angle, config, gameContainer) {
        this.x = x;
        this.y = y;
        this.age = 0;
        this.duration = config.duration;

        this.element = document.createElement('div');
        this.element.className = 'muzzle-flash';
        this.element.style.width = config.size + 'px';
        this.element.style.height = config.size + 'px';
        this.element.style.left = (x - config.size / 2) + 'px';
        this.element.style.top = (y - config.size / 2) + 'px';
        this.element.style.background = `radial-gradient(circle, ${config.color} 0%, transparent 70%)`;
        gameContainer.appendChild(this.element);
    }

    update(dt) {
        this.age += dt;
        const progress = this.age / this.duration;
        this.element.style.opacity = 1 - progress;
        this.element.style.transform = `scale(${1 + progress})`;
        return this.age >= this.duration;
    }

    destroy() {
        this.element.remove();
    }
}
