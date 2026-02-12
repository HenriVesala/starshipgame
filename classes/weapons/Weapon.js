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
        this.nebulaCoefficient = config.nebulaCoefficient ?? 1.0;
        this.element = null;

        // Laske alkunopeus kulman perusteella (lähtönopeudella) + ampujan nopeus
        const adjustedAngle = (config.angle - 90) * Math.PI / 180;
        this.vx = Math.cos(adjustedAngle) * (config.initialSpeed || 0) + (config.ownerVx || 0);
        this.vy = Math.sin(adjustedAngle) * (config.initialSpeed || 0) + (config.ownerVy || 0);
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
