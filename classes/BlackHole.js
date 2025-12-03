// Mustan aukon konfiguraatio
const blackHoleConfig = {
    // Tapahtumahorisontin koko
    eventHorizonRadius: 20,  // 40x40 pikseliä = 20px säde

    // Visuaalisen vääristymän säde
    distortionRadius: 100,   // Vääristymäkentän säde pikseleissä

    // Liikkeen konfiguraatio
    speedMin: 5,             // Pienin nopeus (pikselit/sekunti)
    speedMax: 12,            // Suurin nopeus (pikselit/sekunti)

    // Painovoiman konfiguraatio (vahvempi kuin planeetta)
    gravityRadiusMultiplier: 15,   // Painovoimakentän säde = säde * tämä arvo (planeetta: 6)
    baseGravityStrength: 150,      // Painovoiman perusvoimakkuus (planeetta: 80)
    bulletGravityMultiplier: 5,    // Ammukset kokevat tämän kerrannaisen painovoimaa

    // Painovoiman väheneminen
    gravityFalloffMin: 0.2,   // Vähintään painovoima reunalla (20% täydestä)
    gravityFalloffMax: 0.9,   // Vähenemisalue

    // Spawnaus
    spawnIntervalMin: 20000,  // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 35000   // Suurin spawnausväli (millisekuntia)
};

// Black Hole class with stronger gravity field than Planet
class BlackHole {
    constructor(gameContainer) {
        this.gameContainer = gameContainer;
        // Kiinteä tapahtumahorisontin koko
        this.radius = blackHoleConfig.eventHorizonRadius;

        // Satunnainen spawnipaikka ruudun reunoilta
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Ylhäältä
                this.x = Math.random() * gameConfig.screenWidth;
                this.y = -this.radius;
                break;
            case 1: // Alhaalta
                this.x = Math.random() * gameConfig.screenWidth;
                this.y = gameConfig.screenHeight + this.radius;
                break;
            case 2: // Vasemmalta
                this.x = -this.radius;
                this.y = Math.random() * gameConfig.screenHeight;
                break;
            case 3: // Oikealta
                this.x = gameConfig.screenWidth + this.radius;
                this.y = Math.random() * gameConfig.screenHeight;
                break;
        }

        // Hidas liike
        const speed = Math.random() * (blackHoleConfig.speedMax - blackHoleConfig.speedMin) + blackHoleConfig.speedMin;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Painovoimakentän säde: paljon suurempi kuin planeetoilla
        this.gravityRadius = this.radius * blackHoleConfig.gravityRadiusMultiplier;
        this.gravityStrength = blackHoleConfig.baseGravityStrength;

        // Visuaalisen vääristymäkentän säde
        this.distortionRadius = blackHoleConfig.distortionRadius;

        // Create visual element for gravity field distortion
        this.distortionField = document.createElement('div');
        this.distortionField.className = 'black-hole-distortion';
        this.distortionField.style.width = (this.distortionRadius * 2) + 'px';
        this.distortionField.style.height = (this.distortionRadius * 2) + 'px';
        gameContainer.appendChild(this.distortionField);

        // Create visual element for event horizon
        this.element = document.createElement('div');
        this.element.className = 'black-hole';
        this.element.style.width = (this.radius * 2) + 'px';
        this.element.style.height = (this.radius * 2) + 'px';
        gameContainer.appendChild(this.element);
    }

    update(dt = 0.016) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Kierrä näytön reunoilla
        if (this.x < -this.radius * 2) this.x = gameConfig.screenWidth + this.radius;
        if (this.x > gameConfig.screenWidth + this.radius * 2) this.x = -this.radius;
        if (this.y < -this.radius * 2) this.y = gameConfig.screenHeight + this.radius;
        if (this.y > gameConfig.screenHeight + this.radius * 2) this.y = -this.radius;

        this.render();
    }

    applyGravity(obj, dt = 0.016) {
        // Calculate distance from black hole center to object
        const dx = this.x - obj.x;
        const dy = this.y - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if object is within gravity field
        if (dist < this.gravityRadius && dist > 0) {
            // Normalize direction
            const nx = dx / dist;
            const ny = dy / dist;

            // Gravity strength depends on object type
            let baseGravityStrength = blackHoleConfig.baseGravityStrength;

            // Bullets experience increased gravity
            if (obj.hasOwnProperty('type') && (obj.type === 'player' || obj.type === 'enemy')) {
                baseGravityStrength = blackHoleConfig.baseGravityStrength * blackHoleConfig.bulletGravityMultiplier;
            }

            // Gravity falls off from full strength at center to min at edge
            const distanceFactor = blackHoleConfig.gravityFalloffMin +
                                  (1 - dist / this.gravityRadius) * blackHoleConfig.gravityFalloffMax;
            const gravityFactor = baseGravityStrength * distanceFactor;

            // Apply gravity acceleration to velocity
            obj.vx += nx * gravityFactor * dt;
            obj.vy += ny * gravityFactor * dt;
        }
    }

    render() {
        // Update distortion field position
        this.distortionField.style.left = (this.x - this.distortionRadius) + 'px';
        this.distortionField.style.top = (this.y - this.distortionRadius) + 'px';

        // Update event horizon position
        this.element.style.left = (this.x - this.radius) + 'px';
        this.element.style.top = (this.y - this.radius) + 'px';
    }

    destroy() {
        this.distortionField.remove();
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -this.radius * 2 || this.x > gameConfig.screenWidth + this.radius * 2 ||
               this.y < -this.radius * 2 || this.y > gameConfig.screenHeight + this.radius * 2;
    }
}
