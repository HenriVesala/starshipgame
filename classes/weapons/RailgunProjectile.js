// Railgun-ammuksen konfiguraatio
const railgunConfig = {
    chargeEnergyPerSecond: 40,   // Energiankulutus latauksen aikana
    maxCharge: 50,               // Maksimi lataus (energiayksikköä)
    minCharge: 1,                // Minimi lataus laukaisemiseen
    minSpeed: 10,               // Nopeus minimiliatauksella
    maxSpeed: 2000,              // Nopeus maksimilatauksella
    projectileMaxSpeed: 2000,    // Absoluuttinen nopeuskatto (painovoima ym.)
    damageCoefficient: 0.0002,   // KE-vahinkokerroin (vahinko = kerroin × nopeus²)
    maxDamage: 800,              // Absoluuttinen vahingon yläraja
    nebulaCoefficient: 0.5,      // Nebulan vaikutus (vähemmän kuin ammukset)
    maintenanceEnergyPerSecond: 15, // Energiankulutus ylläpitotilassa (maksimivaraus saavutettu)
    recoilPerCharge: 3,          // Rekyylivoima per energiayksikkö
    penetrationMaxDeflection: 30, // Läpäisyn maksimitaittuma (astetta)
    penetrationDeflectionFalloff: 200, // Taittuman vaimennus nopeuden mukaan (suurempi = vähemmän taittumaa nopeilla ammuksilla)
    enemyChargeTimeMin: 0.5,     // Vihollisen latausaika min (s)
    enemyChargeTimeMax: 2.0,     // Vihollisen latausaika max (s)

    // Miniminopeuspoisto (ammus poistetaan jos nopeus alle kynnyksen annetun ajan)
    minSpeedThreshold: 3,        // Nopeuskynnys (pikselit/sekunti)
    minSpeedTimeout: 1,          // Aika sekunteina kynnyksen alla ennen poistoa

    // Pelaajan ammuksen värit (täydelliset CSS-värimerkkijonot)
    playerColor: 'rgb(0, 150, 255)',                // Pääväri
    playerColorFade: 'rgba(0, 150, 255, 0.5)',      // Häivytys gradientissa
    playerGlowInner: 'rgba(0, 150, 255, 0.9)',      // Sisempi hehku
    playerGlowMid: 'rgba(0, 150, 255, 0.6)',        // Keskihehku
    playerGlowOuter: 'rgba(0, 150, 255, 0.3)',      // Ulompi hehku

    // Vihollisen ammuksen värit
    enemyColor: 'rgb(255, 100, 0)',                 // Pääväri
    enemyColorFade: 'rgba(255, 100, 0, 0.5)',       // Häivytys gradientissa
    enemyGlowInner: 'rgba(255, 100, 0, 0.9)',       // Sisempi hehku
    enemyGlowMid: 'rgba(255, 100, 0, 0.6)',         // Keskihehku
    enemyGlowOuter: 'rgba(255, 100, 0, 0.3)',       // Ulompi hehku

    // Ammuksen kärki
    tipColor: '#ffffff',                             // Kärjen väri

    // Latauksen vilkkuminen aluksella
    chargePulseTipColor: 'rgba(255, 255, 255, 1)',       // Keulan väri (vaalea)
    chargePulseMidColor: 'rgba(50, 180, 255, 0.8)', // Keskiosan väri
    chargePulseColor: 'rgba(0, 149, 255, 0.2)',      // Perän väri
    chargePulseInterval: 0.5,                        // Vilkkumisväli sekunteina (täysi sykli)

    // Vana (trail)
    trailCoefficient: 0.1,      // Vanan pituus pikseleissä per nopeusyksikkö
    trailMinLength: 15,          // Vanan minimipituus pikselissä
    trailMaxLength: 200          // Vanan maksimipituus pikselissä
};

// Railgun-ammus — nopea projektiili jonka vahinko perustuu liike-energiaan (KE ∝ v²)
class RailgunProjectile extends Weapon {
    constructor(gameContainer, x, y, angle, type, speed, ownerVx, ownerVy) {
        const initialDamage = Math.min(
            railgunConfig.damageCoefficient * speed * speed,
            railgunConfig.maxDamage
        );
        super({
            gameContainer, x, y, angle,
            damage: initialDamage,
            maxSpeed: railgunConfig.projectileMaxSpeed,
            initialSpeed: speed,
            nebulaCoefficient: railgunConfig.nebulaCoefficient,
            owner: type,
            ownerVx, ownerVy,
            minSpeedThreshold: railgunConfig.minSpeedThreshold,
            minSpeedTimeout: railgunConfig.minSpeedTimeout
        });

        // 'player' | 'enemy' — painovoiman tunnistusta varten (Planet.js, BlackHole.js)
        this.type = type;
        this.penetrating = true; // Ammus läpäisee kohteet jos vahinkoa riittää

        this.currentSpeed = speed;

        this.element = document.createElement('div');
        this.element.className = 'railgun-projectile';
        const isPlayer = type === 'player';
        const color = isPlayer ? railgunConfig.playerColor : railgunConfig.enemyColor;
        const fade = isPlayer ? railgunConfig.playerColorFade : railgunConfig.enemyColorFade;
        const glowIn = isPlayer ? railgunConfig.playerGlowInner : railgunConfig.enemyGlowInner;
        const glowMid = isPlayer ? railgunConfig.playerGlowMid : railgunConfig.enemyGlowMid;
        const glowOut = isPlayer ? railgunConfig.playerGlowOuter : railgunConfig.enemyGlowOuter;
        this.element.style.background = `linear-gradient(to right, transparent, ${fade} 30%, ${color} 70%, ${railgunConfig.tipColor} 100%)`;
        this.element.style.boxShadow = `0 0 8px ${glowIn}, 0 0 15px ${glowMid}, 0 0 25px ${glowOut}`;
        gameContainer.appendChild(this.element);
        this.render();
    }

    // Laske vahinko törmäysnopeuden perusteella (KE ∝ v²)
    getImpactDamage(targetVx, targetVy) {
        const relVx = this.vx - targetVx;
        const relVy = this.vy - targetVy;
        const collisionSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
        return Math.min(
            railgunConfig.damageCoefficient * collisionSpeed * collisionSpeed,
            railgunConfig.maxDamage
        );
    }

    update(dt) {
        this.capSpeed();
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Päivitä suunta, nopeus ja vahinko absoluuttisen nopeuden perusteella (KE ∝ v²)
        this.angle = Math.atan2(this.vy, this.vx) * 180 / Math.PI + 90;
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.currentSpeed = currentSpeed;
        this.damage = Math.min(
            railgunConfig.damageCoefficient * currentSpeed * currentSpeed,
            railgunConfig.maxDamage
        );

        this.checkMinSpeed(dt);
        this.render();
    }

    render() {
        const speed = this.currentSpeed || 0;
        const trailLength = Math.max(
            railgunConfig.trailMinLength,
            Math.min(speed * railgunConfig.trailCoefficient, railgunConfig.trailMaxLength)
        );

        this.element.style.width = trailLength + 'px';
        this.element.style.left = (this.x - trailLength) + 'px';
        this.element.style.top = (this.y - 2) + 'px';
        this.element.style.transform = `rotate(${this.angle - 90}deg)`;
    }
}
