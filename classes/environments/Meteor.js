// Meteoriitin konfiguraatio
const meteorConfig = {
    // Koon konfiguraatio
    radiusMin: 20,              // Pienin säde pikseleissä
    radiusMax: 40,              // Suurin säde pikseleissä

    // Liikkeen konfiguraatio
    speedMin: 75,               // Pienin nopeus (pikselit/sekunti)
    speedMax: 112.5,            // Suurin nopeus (pikselit/sekunti) (75 + 37.5)

    // Kiertokulma
    rotationSpeedMin: -120,     // Minimi kiertokulma-nopeus (astetta/sekunti)
    rotationSpeedMax: 120,      // Maksimi kiertokulma-nopeus (astetta/sekunti)

    // Vahinko
    collisionDamage: 200,       // Vahinko joka meteoriitti aiheuttaa törmätessään

    // Tähtisumun vaikutus
    nebulaCoefficient: 0.3,     // Nebulan vastuskerroin (0 = ei vaikutusta, 1 = normaali)

    // Spawnaus
    spawnIntervalMin: 5000,     // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 10000     // Suurin spawnausväli (millisekuntia)
};

// Meteor class
class Meteor {
    constructor(gameContainer) {
        this.gameContainer = gameContainer;
        // Satunnainen koko konfiguraation rajoissa
        this.radius = Math.random() * (meteorConfig.radiusMax - meteorConfig.radiusMin) + meteorConfig.radiusMin;
        this.damage = meteorConfig.collisionDamage;

        // Satunnainen spawnipaikka ruudun reunoilta
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Ylhäältä
                this.x = Math.random() * gameConfig.screenWidth;
                this.y = -this.radius;
                break;
            case 1: // Alhaalta
                this.x = Math.random() * gameConfig.screenWidth;
                this.y = gameConfig.screenHeight + this.radius;
                break;
            case 2: // Vasemmalta
                this.x = -this.radius;
                this.y = Math.random() * gameConfig.screenHeight;
                break;
            case 3: // Oikealta
                this.x = gameConfig.screenWidth + this.radius;
                this.y = Math.random() * gameConfig.screenHeight;
                break;
        }

        // Satunnainen nopeus konfiguraation rajoissa
        const speed = Math.random() * (meteorConfig.speedMax - meteorConfig.speedMin) + meteorConfig.speedMin;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Satunnainen kiertokulma
        this.rotation = 0;
        this.rotationSpeed = Math.random() * (meteorConfig.rotationSpeedMax - meteorConfig.rotationSpeedMin) + meteorConfig.rotationSpeedMin;

        // Nebulan vastuskerroin
        this.nebulaCoefficient = meteorConfig.nebulaCoefficient;

        // Kutistumisanimaatio
        this.isShrinking = false;    // Kutistumistila (mustan aukon tapahtumahorisontti)
        this.shrinkProgress = 0;     // Kutistumisen edistyminen (0-1)
        this.shrinkDuration = 0.5;   // Kutistumisen kesto sekunteina

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

        // Kierrä näytön reunoilla
        if (this.x < -this.radius * 2) this.x = gameConfig.screenWidth + this.radius;
        if (this.x > gameConfig.screenWidth + this.radius * 2) this.x = -this.radius;
        if (this.y < -this.radius * 2) this.y = gameConfig.screenHeight + this.radius;
        if (this.y > gameConfig.screenHeight + this.radius * 2) this.y = -this.radius;

        this.render();
    }

    render() {
        this.element.style.left = (this.x - this.radius) + 'px';
        this.element.style.top = (this.y - this.radius) + 'px';

        // Lisää kutistumisanimaatio
        if (this.isShrinking) {
            const scale = 1 - this.shrinkProgress;
            this.element.style.transform = `rotate(${this.rotation}deg) scale(${scale})`;
        } else {
            this.element.style.transform = `rotate(${this.rotation}deg)`;
        }
    }

    destroy() {
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -this.radius * 2 || this.x > gameConfig.screenWidth + this.radius * 2 ||
               this.y < -this.radius * 2 || this.y > gameConfig.screenHeight + this.radius * 2;
    }
}
