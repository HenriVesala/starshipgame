// Yhdistä asekonfiguraatio syvällisesti (sisäkkäiset objektit yhdistetään kenttätasolla)
function mergeWeaponConfig(base, override) {
    if (!override) return { ...base };
    const merged = { ...base };
    for (const key of Object.keys(override)) {
        const baseVal = base[key];
        const overVal = override[key];
        // Yhdistä sisäkkäiset objektit (ei korvaa kokonaan)
        if (baseVal && overVal && typeof baseVal === 'object' && typeof overVal === 'object'
            && !Array.isArray(baseVal) && !Array.isArray(overVal)) {
            if (key === 'interactions') {
                // interactions: yhdistä per ympäristö (2 tasoa syvä)
                merged.interactions = {};
                for (const env of Object.keys(baseVal)) {
                    merged.interactions[env] = { ...baseVal[env], ...(overVal[env] || {}) };
                }
                for (const env of Object.keys(overVal)) {
                    if (!merged.interactions[env]) merged.interactions[env] = { ...overVal[env] };
                }
            } else {
                // muzzleFlash, fireFlash ym.: 1 taso syvä yhdistäminen
                merged[key] = { ...baseVal, ...overVal };
            }
        } else {
            merged[key] = overVal;
        }
    }
    return merged;
}

// Aseen kantaluokka - yhteinen pohja ammuksille ja ohjuksille
class Weapon {
    constructor(config = {}) {
        this.gameContainer = config.gameContainer;
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.angle = config.angle || 0;
        this.damage = config.damage || 0;
        this.maxSpeed = config.maxSpeed || 500;
        this.owner = config.owner || 'player'; // 'player' tai 'enemy'
        this.interactions = config.interactions || null;
        this.nebulaCoefficient = config.interactions?.nebula?.dragCoefficient ?? 1.0;
        this.element = null;

        // Miniminopeuspoisto (optionaalinen)
        this.minSpeedThreshold = config.minSpeedThreshold || 0;
        this.minSpeedTimeout = config.minSpeedTimeout || 0;
        this.slowTimer = 0;
        this.shouldRemove = false;

        // Laske alkunopeus kulman perusteella (lähtönopeudella) + ampujan nopeus
        const adjustedAngle = (config.angle - 90) * Math.PI / 180;
        this.vx = Math.cos(adjustedAngle) * (config.initialSpeed || 0) + (config.ownerVx || 0);
        this.vy = Math.sin(adjustedAngle) * (config.initialSpeed || 0) + (config.ownerVy || 0);

        // Suuliekki (optionaalinen) — luodaan automaattisesti jos konfiguraatio annettu
        if (config.muzzleFlash && typeof MuzzleFlash !== 'undefined') {
            muzzleFlashes.push(new MuzzleFlash(this.x, this.y, this.angle, config.muzzleFlash, this.gameContainer));
        }
    }

    // Palauta nykyinen nopeus
    getSpeed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    // Rajoita nopeus maksiminopeuteen
    capSpeed() {
        const speed = this.getSpeed();
        if (speed > this.maxSpeed) {
            const scale = this.maxSpeed / speed;
            this.vx *= scale;
            this.vy *= scale;
        }
    }

    // Tarkista onko nopeus liian hidas liian kauan
    checkMinSpeed(dt) {
        if (this.minSpeedThreshold <= 0) return;
        if (this.getSpeed() < this.minSpeedThreshold) {
            this.slowTimer += dt;
            if (this.slowTimer >= this.minSpeedTimeout) {
                this.shouldRemove = true;
            }
        } else {
            this.slowTimer = 0;
        }
    }

    // Tuhoa aseen DOM-elementti
    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }

    // Tarkista onko ruudun ulkopuolella
    isOffscreen() {
        return this.x < -20 || this.x > gameConfig.screenWidth + 20 ||
               this.y < -20 || this.y > gameConfig.screenHeight + 20;
    }
}
