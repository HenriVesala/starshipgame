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
    maintenanceEnergyPerSecond: 15, // Energiankulutus ylläpitotilassa (maksimivaraus saavutettu)

    // Vuorovaikutukset ympäristökappaleiden kanssa
    interactions: {
        planet:    { gravityMultiplier: 4.0, collision: 'destroy' },
        blackHole: { gravityMultiplier: 5.0, collision: 'destroy' },
        meteor:    { collision: 'penetrate' },
        nebula:    { dragCoefficient: 0.5 }
    },
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
    trailMaxLength: 200,          // Vanan maksimipituus pikselissä

    // Suuliekki
    muzzleFlash: {
        color: 'rgba(100, 180, 255, 0.9)',  // Liekin väri
        size: 25,                            // Koko pikseleinä
        duration: 0.15                       // Kesto sekunteina
    },
    // Rungon välähdys laukaistaessa (3-osainen liukuväri keulasta perään)
    fireFlash: {
        tipColor: 'rgba(255, 255, 255, 1)',        // Keulan väri (vaalea)
        midColor: 'rgba(50, 180, 255, 0.8)',       // Keskiosan väri
        baseColor: 'rgba(0, 149, 255, 0.2)',       // Perän väri
        duration: 0.2                               // Kesto sekunteina
    }
};

// Railgun-ammus — nopea projektiili jonka vahinko perustuu liike-energiaan (KE ∝ v²)
class RailgunProjectile extends Weapon {
    constructor(gameContainer, x, y, angle, type, speed, ownerVx, ownerVy, overrideCfg = null) {
        const cfg = overrideCfg || railgunConfig;
        const initialDamage = Math.min(
            cfg.damageCoefficient * speed * speed,
            cfg.maxDamage
        );
        super({
            gameContainer, x, y, angle,
            damage: initialDamage,
            maxSpeed: cfg.projectileMaxSpeed,
            initialSpeed: speed,
            interactions: cfg.interactions,
            owner: type,
            ownerVx, ownerVy,
            minSpeedThreshold: cfg.minSpeedThreshold,
            minSpeedTimeout: cfg.minSpeedTimeout,
            muzzleFlash: cfg.muzzleFlash
        });

        this.cfg = cfg;

        // 'player' | 'enemy' — ammuksen omistaja
        this.type = type;
        this.penetrating = true; // Ammus läpäisee kohteet (alus-kohde-törmäyksissä)

        this.currentSpeed = speed;

        this.element = document.createElement('div');
        this.element.className = 'railgun-projectile';
        const isPlayer = type === 'player';
        const color = isPlayer ? cfg.playerColor : cfg.enemyColor;
        const fade = isPlayer ? cfg.playerColorFade : cfg.enemyColorFade;
        const glowIn = isPlayer ? cfg.playerGlowInner : cfg.enemyGlowInner;
        const glowMid = isPlayer ? cfg.playerGlowMid : cfg.enemyGlowMid;
        const glowOut = isPlayer ? cfg.playerGlowOuter : cfg.enemyGlowOuter;
        this.element.style.background = `linear-gradient(to right, transparent, ${fade} 30%, ${color} 70%, ${cfg.tipColor} 100%)`;
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
            this.cfg.damageCoefficient * collisionSpeed * collisionSpeed,
            this.cfg.maxDamage
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
            this.cfg.damageCoefficient * currentSpeed * currentSpeed,
            this.cfg.maxDamage
        );

        this.checkMinSpeed(dt);
        this.render();
    }

    render() {
        const speed = this.currentSpeed || 0;
        const trailLength = Math.max(
            this.cfg.trailMinLength,
            Math.min(speed * this.cfg.trailCoefficient, this.cfg.trailMaxLength)
        );

        this.element.style.width = trailLength + 'px';
        this.element.style.left = (this.x - trailLength) + 'px';
        this.element.style.top = (this.y - 2) + 'px';
        this.element.style.transform = `rotate(${this.angle - 90}deg)`;
    }
}
