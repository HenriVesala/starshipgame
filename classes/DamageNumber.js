// Vahinkoluvun konfiguraatio
const damageNumberConfig = {
    duration: 0.8,       // Kesto sekunteina
    riseSpeed: 60,       // Nousunopeus (pikseliä/s)
    fontSize: 16         // Fonttikoko pikseleinä
};

// Kelluva vahinkoluku — näyttää saadun vahingon aluksen päällä
class DamageNumber {
    constructor(x, y, damage, gameContainer) {
        this.x = x;
        this.y = y;
        this.age = 0;
        this.duration = damageNumberConfig.duration;

        this.element = document.createElement('div');
        this.element.className = 'damage-number';
        this.element.textContent = Math.round(damage);
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        this.element.style.fontSize = damageNumberConfig.fontSize + 'px';
        gameContainer.appendChild(this.element);
    }

    update(dt) {
        this.age += dt;
        this.y -= damageNumberConfig.riseSpeed * dt;

        const opacity = 1 - (this.age / this.duration);
        this.element.style.top = this.y + 'px';
        this.element.style.opacity = opacity;

        // Palauta true jos animaatio on valmis
        return this.age >= this.duration;
    }

    destroy() {
        this.element.remove();
    }
}
