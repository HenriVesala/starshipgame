// Ammuksien konfiguraatio (oletukset = vihollisen arvot)
const bulletConfig = {
    // Tulinopeus
    shootCooldown: 0.2,        // Pelaajan cooldown (sekunti)
    shootCooldownMin: 1.0,     // Vihollisen min cooldown (sekunti)
    shootCooldownMax: 2.67,    // Vihollisen max cooldown (sekunti)

    // Ammuksen ominaisuudet
    initialSpeed: 240,         // Lähtönopeus laukaistaessa (pikselit/sekunti)
    maxSpeed: 2000,            // Maksiminopeus (pikselit/sekunti)
    damage: 100,               // Vahinko joka ammus aiheuttaa
    energyCost: 25,            // Energiakustannus per laukaus
    recoil: 5,                 // Rekyylivoima (pikselit/sekunti)

    // Vuorovaikutukset ympäristökappaleiden kanssa
    interactions: {
        planet:    { gravityMultiplier: 4.0, collision: 'destroy' },
        blackHole: { gravityMultiplier: 5.0, collision: 'destroy' },
        meteor:    { collision: 'bounce' },
        nebula:    { dragCoefficient: 1.0 }
    },

    // Väri (oletukset = vihollisen punainen)
    color: '#ff0000',
    colorLight: '#ff8888',
    glowColor: '255, 0, 0',   // RGB ilman rgba()-wrapperia

    // Suuliekki
    muzzleFlash: {
        color: 'rgba(255, 200, 50, 0.9)',  // Liekin väri
        size: 12,                           // Koko pikseleinä
        duration: 0.2                       // Kesto sekunteina
    },
    // Rungon välähdys laukaistaessa (3-osainen liukuväri keulasta perään)
    fireFlash: {
        tipColor: 'rgba(255, 255, 255, 1)',       // Keulan väri (vaalea)
        midColor: 'rgba(255, 200, 50, 0.5)',      // Keskiosan väri
        baseColor: 'rgba(255, 200, 50, 0.1)',     // Perän väri
        duration: 0.15                             // Kesto sekunteina
    }
};

// Ammus-luokka - pelaajan ja vihollisten ammuksille
class Bullet extends Weapon {
    constructor(gameContainer, x, y, angle, type = 'player', ownerVx = 0, ownerVy = 0, overrideCfg = null) {
        const config = overrideCfg || bulletConfig;

        super({
            gameContainer,
            x, y, angle,
            damage: config.damage,
            maxSpeed: config.maxSpeed,
            initialSpeed: config.initialSpeed,
            interactions: config.interactions,
            owner: type,
            ownerVx, ownerVy,
            muzzleFlash: config.muzzleFlash
        });

        // 'player' | 'enemy' — ammuksen omistaja
        this.type = type;

        this.element = document.createElement('div');
        this.element.className = 'bullet';
        this.element.style.background = `radial-gradient(ellipse at 50% 40%, ${config.colorLight}, ${config.color})`;
        this.element.style.boxShadow = `0 0 8px rgba(${config.glowColor}, 0.9), 0 0 15px rgba(${config.glowColor}, 0.6), 0 0 20px rgba(${config.glowColor}, 0.3), inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)`;
        gameContainer.appendChild(this.element);
    }

    update(dt = 0.016) {
        // Rajoita maksiminopeus (ulkoiset voimat voivat kiihdyttää)
        this.capSpeed();

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle = Math.atan2(this.vy, this.vx) * 180 / Math.PI + 90;
        this.render();
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        // Aseta ammuksen suunta ampumasuunnan mukaan
        this.element.style.transform = `rotate(${this.angle}deg)`;
    }
}
