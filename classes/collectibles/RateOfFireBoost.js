// Ampumisnopeusboostin konfiguraatio
const rateOfFireBoostConfig = {
    // Koon konfiguraatio
    size: 24,                       // Boostin koko pikseleissä

    // Liikkeen konfiguraatio
    floatSpeed: 40,                 // Kellumisen nopeus (pikselit/sekunti)
    floatAmplitude: 12,             // Kellumisen amplitudi (pikselit)
    rotationSpeed: 180,             // Pyörimisnopeus (astetta/sekunti)

    // Elinaika
    lifetime: 12,                   // Boostin elinaika sekunteina ennen katoamista
    fadeStartTime: 3,               // Kuinka monta sekuntia ennen katoamista fade alkaa

    // Kerääminen
    collectRadius: 30               // Säde jolta pelaaja voi kerätä boostin
};

// Ampumisnopeusboosti -luokka
class RateOfFireBoost {
    constructor(x, y, gameContainer) {
        this.x = x;
        this.y = y;
        this.startY = y;            // Alkuperäinen Y-koordinaatti kellumista varten
        this.gameContainer = gameContainer;

        // Elinaika
        this.age = 0;
        this.lifetime = rateOfFireBoostConfig.lifetime;

        // Kellumis- ja pyörimisanimaatio
        this.floatPhase = Math.random() * Math.PI * 2; // Satunnainen aloitusvaihe
        this.rotation = Math.random() * 360; // Satunnainen aloituskulma

        // Luo DOM-elementti
        this.element = document.createElement('div');
        this.element.className = 'rate-of-fire-boost';

        // Aseta koko
        this.element.style.width = rateOfFireBoostConfig.size + 'px';
        this.element.style.height = rateOfFireBoostConfig.size + 'px';

        // Luo nuoli-symboli boostin sisälle
        const arrowSymbol = document.createElement('div');
        arrowSymbol.className = 'rate-of-fire-boost-arrow';
        arrowSymbol.innerHTML = '&raquo;'; // Tupla-nuoli oikealle
        this.element.appendChild(arrowSymbol);

        gameContainer.appendChild(this.element);
        this.render();
    }

    update(dt) {
        this.age += dt;

        // Kellumisanimaatio
        this.floatPhase += rateOfFireBoostConfig.floatSpeed * dt * 0.1;
        const floatOffset = Math.sin(this.floatPhase) * rateOfFireBoostConfig.floatAmplitude;
        this.y = this.startY + floatOffset;

        // Pyörimisanimaatio
        this.rotation += rateOfFireBoostConfig.rotationSpeed * dt;
        if (this.rotation >= 360) this.rotation -= 360;

        // Fade-out animaatio loppua kohti
        const timeLeft = this.lifetime - this.age;
        if (timeLeft < rateOfFireBoostConfig.fadeStartTime) {
            const opacity = timeLeft / rateOfFireBoostConfig.fadeStartTime;
            this.element.style.opacity = opacity;
        }

        this.render();

        // Palauta true jos boosti on vanhentunut
        return this.age >= this.lifetime;
    }

    render() {
        this.element.style.left = (this.x - rateOfFireBoostConfig.size / 2) + 'px';
        this.element.style.top = (this.y - rateOfFireBoostConfig.size / 2) + 'px';
        this.element.style.transform = `rotate(${this.rotation}deg)`;
    }

    // Tarkista osuuko pelaaja boostiin
    checkCollision(player) {
        const halfPlayerSize = gameConfig.playerWidth / 2;
        const dx = this.x - (player.x + halfPlayerSize);
        const dy = this.y - (player.y + halfPlayerSize);
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < rateOfFireBoostConfig.collectRadius;
    }

    // Tuhoa boosti
    destroy() {
        this.element.remove();
    }
}
