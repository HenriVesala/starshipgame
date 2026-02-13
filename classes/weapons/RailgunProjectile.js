// Railgun-ammuksen konfiguraatio
const railgunConfig = {
    chargeEnergyPerSecond: 25,   // Energiankulutus latauksen aikana
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
    enemyChargeTimeMax: 2.0      // Vihollisen latausaika max (s)
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
            ownerVx, ownerVy
        });

        // 'player' | 'enemy' — painovoiman tunnistusta varten (Planet.js, BlackHole.js)
        this.type = type;
        this.penetrating = true; // Ammus läpäisee kohteet jos vahinkoa riittää

        this.element = document.createElement('div');
        this.element.className = `railgun-projectile ${type}-railgun-projectile`;
        gameContainer.appendChild(this.element);
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

        // Päivitä oletusvahinko absoluuttisen nopeuden perusteella (KE ∝ v²)
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.damage = Math.min(
            railgunConfig.damageCoefficient * currentSpeed * currentSpeed,
            railgunConfig.maxDamage
        );

        this.render();
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.style.transform = `rotate(${this.angle}deg)`;
    }
}
