// Tähtisumun konfiguraatio
const nebulaCloudConfig = {
    // Ympyröiden konfiguraatio
    circleCountMin: 10,           // Pienin ympyrämäärä
    circleCountMax: 20,          // Suurin ympyrämäärä
    circleRadiusMin: 50,         // Pienin ympyrän säde (pikseliä)
    circleRadiusMax: 110,        // Suurin ympyrän säde (pikseliä)
    circleSpread: 120,           // Ympyröiden max hajonta keskipisteestä (pikseliä)

    // Värikonfiguraatio
    baseHueMin: 250,             // Värisävyn alaraja (purppura)
    baseHueMax: 310,             // Värisävyn yläraja (violetti)
    hueVariation: 40,            // Värisävyn vaihtelu ympyröiden välillä

    // Liikkeen konfiguraatio
    speedMin: 20,                // Pienin nopeus (pikselit/sekunti)
    speedMax: 40,                // Suurin nopeus (pikselit/sekunti)

    // Hidastuskonfiguraatio
    slowdownStrength: 0.5,       // Hidastuskerroin pelaajalle ja vihollisille (50% normaalista)
    bulletSlowdownStrength: 0.8, // Hidastuskerroin ammuksille (80% normaalista)

    // Vaikutuksen konfiguraatio
    affectsPlayer: true,         // Vaikuttaa pelaajaan
    affectsEnemies: true,        // Vaikuttaa vihollisiin
    affectsBullets: true,        // Vaikuttaa ammuksiin
    affectsMeteors: true,        // Vaikutus meteoriitteihin

    // Mustan aukon vuorovaikutus
    shrinkRate: 50,              // Ympyrän kutistumisnopeus (pikseliä/sekunti)
    blackHoleGrowRate: 0.3,      // Mustan aukon kasvunopeus nielaistessa (pikseliä/sekunti)

    // Spawnaus
    spawnIntervalMin: 12000,     // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 20000      // Suurin spawnausväli (millisekuntia)
};

// Tähtisumu-luokka - koostuu useista päällekkäisistä ympyröistä
class NebulaCloud {
    constructor(gameContainer) {
        this.gameContainer = gameContainer;

        // Ympyröiden määrä
        const circleCount = Math.floor(Math.random() * (nebulaCloudConfig.circleCountMax - nebulaCloudConfig.circleCountMin + 1)) + nebulaCloudConfig.circleCountMin;

        // Efektiivinen säde wrapping-laskentaan
        this.effectiveRadius = nebulaCloudConfig.circleSpread + nebulaCloudConfig.circleRadiusMax;

        // Satunnainen spawnipaikka ruudun reunoilta
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Ylhäältä
                this.x = Math.random() * gameConfig.screenWidth;
                this.y = -this.effectiveRadius;
                break;
            case 1: // Alhaalta
                this.x = Math.random() * gameConfig.screenWidth;
                this.y = gameConfig.screenHeight + this.effectiveRadius;
                break;
            case 2: // Vasemmalta
                this.x = -this.effectiveRadius;
                this.y = Math.random() * gameConfig.screenHeight;
                break;
            case 3: // Oikealta
                this.x = gameConfig.screenWidth + this.effectiveRadius;
                this.y = Math.random() * gameConfig.screenHeight;
                break;
        }

        // Hidas liike
        const speed = Math.random() * (nebulaCloudConfig.speedMax - nebulaCloudConfig.speedMin) + nebulaCloudConfig.speedMin;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Perusvärisävy tälle tähtisumulle
        const baseHue = Math.random() * (nebulaCloudConfig.baseHueMax - nebulaCloudConfig.baseHueMin) + nebulaCloudConfig.baseHueMin;

        // Luodaan ympyrät
        this.circles = [];
        for (let i = 0; i < circleCount; i++) {
            const radius = Math.random() * (nebulaCloudConfig.circleRadiusMax - nebulaCloudConfig.circleRadiusMin) + nebulaCloudConfig.circleRadiusMin;
            const offsetX = (Math.random() - 0.5) * 2 * nebulaCloudConfig.circleSpread;
            const offsetY = (Math.random() - 0.5) * 2 * nebulaCloudConfig.circleSpread;
            const hue = baseHue + (Math.random() - 0.5) * nebulaCloudConfig.hueVariation;

            const element = document.createElement('div');
            element.className = 'nebula-circle';
            element.style.width = (radius * 2) + 'px';
            element.style.height = (radius * 2) + 'px';
            element.style.background = `radial-gradient(circle at 40% 40%,
                hsla(${hue}, 60%, 50%, 0.35) 0%,
                hsla(${hue}, 50%, 35%, 0.2) 50%,
                transparent 100%)`;
            element.style.boxShadow = `0 0 20px hsla(${hue}, 50%, 40%, 0.3), inset 2px 2px 8px hsla(${hue}, 40%, 60%, 0.15)`;
            // Porrastettu animaatio orgaaniselle ilmeelle
            element.style.animationDelay = (Math.random() * 4) + 's';
            gameContainer.appendChild(element);

            this.circles.push({
                element,
                offsetX,
                offsetY,
                radius,
                hue,
                destroyed: false
            });
        }
    }

    update(dt = 0.016) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Kierrä näytön reunoilla
        const bound = this.effectiveRadius;
        if (this.x < -bound * 2) this.x = gameConfig.screenWidth + bound;
        if (this.x > gameConfig.screenWidth + bound * 2) this.x = -bound;
        if (this.y < -bound * 2) this.y = gameConfig.screenHeight + bound;
        if (this.y > gameConfig.screenHeight + bound * 2) this.y = -bound;

        this.render();
    }

    // Tarkistetaan, onko objekti minkään ympyrän sisällä
    isObjectInside(obj) {
        for (const circle of this.circles) {
            if (circle.destroyed) continue;
            const cx = this.x + circle.offsetX;
            const cy = this.y + circle.offsetY;
            const dx = obj.x - cx;
            const dy = obj.y - cy;
            if (dx * dx + dy * dy < circle.radius * circle.radius) {
                return true;
            }
        }
        return false;
    }

    // Levitetään hidastava vaikutus objektiin
    applySlowdown(obj, isBullet = false, minVelocity = 0) {
        if (obj.hasOwnProperty('vx') && obj.hasOwnProperty('vy')) {
            // Käytä eri kerrainta ammuksille ja muille objekteille
            const slowdownFactor = isBullet ?
                nebulaCloudConfig.bulletSlowdownStrength :
                nebulaCloudConfig.slowdownStrength;

            // Laske nykyinen nopeus
            const currentSpeed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);

            // Käytä hidastusta vain jos nopeus on suurempi kuin minimi
            if (currentSpeed > minVelocity) {
                obj.vx *= slowdownFactor;
                obj.vy *= slowdownFactor;

                // Varmista että nopeus ei mene alle minimin
                const newSpeed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
                if (newSpeed < minVelocity) {
                    const scale = minVelocity / newSpeed;
                    obj.vx *= scale;
                    obj.vy *= scale;
                }
            }
        }
    }

    // Kutista ympyrät jotka koskettavat mustaa aukkoa
    shrinkCirclesTouchingBlackHole(blackHole, dt) {
        let absorbed = false;
        for (const circle of this.circles) {
            if (circle.destroyed) continue;
            const cx = this.x + circle.offsetX;
            const cy = this.y + circle.offsetY;
            const dx = cx - blackHole.x;
            const dy = cy - blackHole.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < blackHole.radius + circle.radius) {
                // Kutista ympyrää
                circle.radius -= nebulaCloudConfig.shrinkRate * dt;
                absorbed = true;

                if (circle.radius <= 0) {
                    circle.radius = 0;
                    circle.destroyed = true;
                    circle.element.remove();
                }
            }
        }

        // Kasvata mustaa aukkoa jos se nielaisi sumua
        if (absorbed) {
            const growAmount = nebulaCloudConfig.blackHoleGrowRate * dt;
            blackHole.radius += growAmount;
            blackHole.gravityRadius = blackHole.radius * blackHoleConfig.gravityRadiusMultiplier;
            blackHole.distortionRadius += growAmount;

            // Päivitä visuaaliset elementit
            blackHole.element.style.width = (blackHole.radius * 2) + 'px';
            blackHole.element.style.height = (blackHole.radius * 2) + 'px';
            blackHole.distortionField.style.width = (blackHole.distortionRadius * 2) + 'px';
            blackHole.distortionField.style.height = (blackHole.distortionRadius * 2) + 'px';
        }
    }

    // Tarkista onko kaikki ympyrät tuhottu
    isFullyDestroyed() {
        return this.circles.every(c => c.destroyed);
    }

    render() {
        for (const circle of this.circles) {
            if (circle.destroyed) continue;
            circle.element.style.left = (this.x + circle.offsetX - circle.radius) + 'px';
            circle.element.style.top = (this.y + circle.offsetY - circle.radius) + 'px';
            circle.element.style.width = (circle.radius * 2) + 'px';
            circle.element.style.height = (circle.radius * 2) + 'px';
        }
    }

    destroy() {
        for (const circle of this.circles) {
            if (!circle.destroyed) {
                circle.element.remove();
            }
        }
    }

    isOffscreen() {
        const bound = this.effectiveRadius;
        return this.x < -bound * 2 || this.x > gameConfig.screenWidth + bound * 2 ||
               this.y < -bound * 2 || this.y > gameConfig.screenHeight + bound * 2;
    }
}
