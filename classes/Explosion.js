// Räjähdyksen konfiguraatio
const explosionConfig = {
    // Koon konfiguraatio
    sizeSmall: 30,          // Pieni räjähdys (pikselit)
    sizeMedium: 50,         // Keskikokoinen räjähdys (pikselit)
    sizeLarge: 80,          // Suuri räjähdys (pikselit)

    // Animaation konfiguraatio
    duration: 0.5,          // Animaation kesto (sekuntia)
    particleCount: 8,       // Partikkelien määrä
    particleSpeed: 100      // Partikkelien nopeus (pikselit/sekunti)
};

// Räjähdys-luokka
class Explosion {
    constructor(x, y, size = 'medium', gameContainer) {
        this.x = x;
        this.y = y;
        this.gameContainer = gameContainer;
        this.age = 0;
        this.duration = explosionConfig.duration;

        // Aseta koko tyypin mukaan
        const sizes = {
            'small': explosionConfig.sizeSmall,
            'medium': explosionConfig.sizeMedium,
            'large': explosionConfig.sizeLarge
        };
        this.size = sizes[size] || explosionConfig.sizeMedium;

        // Luo pääräjähdys-elementti
        this.element = document.createElement('div');
        this.element.className = 'explosion';
        this.element.style.width = this.size + 'px';
        this.element.style.height = this.size + 'px';
        this.element.style.left = (this.x - this.size / 2) + 'px';
        this.element.style.top = (this.y - this.size / 2) + 'px';
        gameContainer.appendChild(this.element);

        // Luo partikkelit
        this.particles = [];
        for (let i = 0; i < explosionConfig.particleCount; i++) {
            const angle = (Math.PI * 2 * i) / explosionConfig.particleCount;
            const particle = {
                element: document.createElement('div'),
                vx: Math.cos(angle) * explosionConfig.particleSpeed,
                vy: Math.sin(angle) * explosionConfig.particleSpeed,
                x: this.x,
                y: this.y,
                size: this.size * 0.2
            };

            particle.element.className = 'explosion-particle';
            particle.element.style.width = particle.size + 'px';
            particle.element.style.height = particle.size + 'px';
            gameContainer.appendChild(particle.element);

            this.particles.push(particle);
        }

        // Räjähdysääni
        soundManager.playExplosion(size);
    }

    update(dt) {
        this.age += dt;

        // Laske opacity animaation edistymisen mukaan
        const progress = this.age / this.duration;
        const opacity = 1 - progress;
        const scale = 1 + progress * 2; // Kasvaa 1x -> 3x

        // Päivitä pääräjähdys
        this.element.style.opacity = opacity;
        this.element.style.transform = `scale(${scale})`;

        // Päivitä partikkelit
        for (const particle of this.particles) {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;

            particle.element.style.left = (particle.x - particle.size / 2) + 'px';
            particle.element.style.top = (particle.y - particle.size / 2) + 'px';
            particle.element.style.opacity = opacity;
        }

        // Palauta true jos animaatio on valmis
        return this.age >= this.duration;
    }

    destroy() {
        this.element.remove();
        for (const particle of this.particles) {
            particle.element.remove();
        }
    }
}
