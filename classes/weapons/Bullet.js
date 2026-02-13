// Ammuksien konfiguraatio
const bulletConfig = {
    playerBullet: {
        initialSpeed: 250,    // Lähtönopeus laukaistaessa (pikselit/sekunti)
        maxSpeed: 2000,        // Maksiminopeus (pikselit/sekunti)
        nebulaCoefficient: 1.0, // Nebulan vastuskerroin (0 = ei vaikutusta, 1 = normaali)
        damage: 100,          // Vahinko joka ammus aiheuttaa
        energyCost: 25,        // Energiakustannus per laukaus
        recoil: 5              // Rekyylivoima (pikselit/sekunti)
    },
    enemyBullet: {
        initialSpeed: 240,    // Lähtönopeus laukaistaessa (pikselit/sekunti)
        maxSpeed: 2000,        // Maksiminopeus (pikselit/sekunti)
        nebulaCoefficient: 1.0, // Nebulan vastuskerroin (0 = ei vaikutusta, 1 = normaali)
        damage: 100,          // Vahinko joka ammus aiheuttaa
        energyCost: 30,        // Energiakustannus per laukaus
        recoil: 5              // Rekyylivoima (pikselit/sekunti)
    },
    // Suuliekki
    muzzleFlash: {
        color: 'rgba(255, 200, 50, 0.9)',  // Liekin väri
        size: 12,                           // Koko pikseleinä
        duration: 0.2                       // Kesto sekunteina
    }
};

// Ammus-luokka - pelaajan ja vihollisten ammuksille
class Bullet extends Weapon {
    constructor(gameContainer, x, y, angle, type = 'player', ownerVx = 0, ownerVy = 0) {
        const config = type === 'player' ? bulletConfig.playerBullet : bulletConfig.enemyBullet;

        super({
            gameContainer,
            x, y, angle,
            damage: config.damage,
            maxSpeed: config.maxSpeed,
            initialSpeed: config.initialSpeed,
            nebulaCoefficient: config.nebulaCoefficient,
            owner: type,
            ownerVx, ownerVy,
            muzzleFlash: bulletConfig.muzzleFlash
        });

        // Bulletilla type-kenttä painovoiman tunnistusta varten (Planet.js, BlackHole.js)
        this.type = type;

        this.element = document.createElement('div');
        this.element.className = `bullet ${type}-bullet`;
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
