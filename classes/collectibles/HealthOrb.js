// Terveyspallon konfiguraatio
const healthOrbConfig = {
    // Koon konfiguraatio
    size: 20,                       // Pallon koko pikseleissä

    // Liikkeen konfiguraatio
    floatSpeed: 30,                 // Kellumisen nopeus (pikselit/sekunti)
    floatAmplitude: 10,             // Kellumisen amplitudi (pikselit)

    // Elinaika
    lifetime: 15,                   // Pallon elinaika sekunteina ennen katoamista
    fadeStartTime: 3,               // Kuinka monta sekuntia ennen katoamista fade alkaa

    // Kerääminen
    collectRadius: 30               // Säde jolta pelaaja voi kerätä pallon
};

// Terveyspallo -luokka
class HealthOrb {
    constructor(x, y, healthValue, gameContainer) {
        this.x = x;
        this.y = y;
        this.startY = y;            // Alkuperäinen Y-koordinaatti kellumista varten
        this.healthValue = healthValue;
        this.gameContainer = gameContainer;

        // Elinaika
        this.age = 0;
        this.lifetime = healthOrbConfig.lifetime;

        // Kellumisanimaatio
        this.floatPhase = Math.random() * Math.PI * 2; // Satunnainen aloitusvaihe

        // Luo DOM-elementti
        this.element = document.createElement('div');
        this.element.className = 'health-orb';

        // Aseta koko ja väri healthValuen perusteella
        this.element.style.width = healthOrbConfig.size + 'px';
        this.element.style.height = healthOrbConfig.size + 'px';

        // Luo plus-symboli pallon sisälle
        const plusSymbol = document.createElement('div');
        plusSymbol.className = 'health-orb-plus';
        plusSymbol.textContent = '+';
        this.element.appendChild(plusSymbol);

        gameContainer.appendChild(this.element);
        this.render();
    }

    update(dt) {
        this.age += dt;

        // Kellumisanimaatio
        this.floatPhase += healthOrbConfig.floatSpeed * dt * 0.1;
        const floatOffset = Math.sin(this.floatPhase) * healthOrbConfig.floatAmplitude;
        this.y = this.startY + floatOffset;

        // Fade-out animaatio loppua kohti
        const timeLeft = this.lifetime - this.age;
        if (timeLeft < healthOrbConfig.fadeStartTime) {
            const opacity = timeLeft / healthOrbConfig.fadeStartTime;
            this.element.style.opacity = opacity;
        }

        this.render();

        // Palauta true jos pallo on vanhentunut
        return this.age >= this.lifetime;
    }

    render() {
        this.element.style.left = (this.x - healthOrbConfig.size / 2) + 'px';
        this.element.style.top = (this.y - healthOrbConfig.size / 2) + 'px';
    }

    // Tarkista osuuko pelaaja palloon
    checkCollision(player) {
        const halfPlayerSize = gameConfig.playerWidth / 2;
        const dx = this.x - (player.x + halfPlayerSize);
        const dy = this.y - (player.y + halfPlayerSize);
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < healthOrbConfig.collectRadius;
    }

    // Tuhoa pallo
    destroy() {
        this.element.remove();
    }
}
