// Avaruusaluksen kantaluokka - yhteinen pohja pelaajalle ja vihollisille
class SpaceShip {
    constructor(config = {}) {
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.vx = 0;
        this.vy = 0;
        this.angle = config.angle || 0;
        this.health = config.health || 100;
        this.maxHealth = config.health || 100;
        this.maxSpeed = config.maxSpeed || 500;
        this.isShrinking = false;
        this.shrinkProgress = 0;
        this.shrinkDuration = 0.5;
        this.damageFlashTimer = 0;
        this.damageFlashDuration = 0.15;
        this.nebulaCoefficient = config.nebulaCoefficient ?? 1.0;
        this.thrustState = 'none'; // 'none', 'forward', 'reverse'
        this.element = null;
    }

    // Ota vahinkoa - palauttaa true jos alus tuhoutui
    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;

        // Aktivoi välähdys jos alus ei tuhoudu
        if (this.health > 0) {
            this.damageFlashTimer = this.damageFlashDuration;
        }

        return this.health <= 0;
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

    // Päivitä vahinkoválähdys-ajastin
    updateDamageFlash(dt) {
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= dt;
            if (this.damageFlashTimer < 0) {
                this.damageFlashTimer = 0;
            }
        }
    }

    // Päivitä kutistuminen - palauttaa true kun kutistuminen valmis
    updateShrinking(dt) {
        if (!this.isShrinking) return false;
        this.shrinkProgress += dt / this.shrinkDuration;
        return this.shrinkProgress >= 1.0;
    }

    // Tuhoa aluksen DOM-elementti
    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }
}
