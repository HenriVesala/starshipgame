// Planeetan konfiguraatio
const planetConfig = {
    // Koon konfiguraatio
    radiusMin: 60,            // Pienin säde pikseleissä
    radiusMax: 110,           // Suurin säde pikseleissä

    // Vahinko
    collisionDamage: 500,     // Vahinko joka planeetta aiheuttaa törmätessään

    // Liikkeen konfiguraatio
    speedMin: 9.36,          // Pienin nopeus (pikselit/sekunti)
    speedMax: 18.75,         // Suurin nopeus (pikselit/sekunti)

    // Painovoiman konfiguraatio
    gravityRadiusMultiplier: 6,   // Painovoimakentän säde = säde * tämä arvo
    baseGravityStrength: 80,      // Painovoiman perusvoimakkuus aluksille/vihollisille (px/s²)
    bulletGravityMultiplier: 4,  // Ammukset kokevat tämän kerrannaisen painovoimaa

    // Painovoiman väheneminen
    gravityFalloffMin: 0.1,  // Vähintään painovoima reunalla (10% täydestä)
    gravityFalloffMax: 0.95,  // Vähenemisalue (1.0 - 0.1 = 0.9)

    // Spawnaus
    spawnIntervalMin: 15000,  // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 25000   // Suurin spawnausväli (millisekuntia)
};

// Planet class with gravity field
class Planet {
    constructor(gameContainer) {
        this.gameContainer = gameContainer;
        // Size: random radius between config min and max
        this.radius = Math.random() * (planetConfig.radiusMax - planetConfig.radiusMin) + planetConfig.radiusMin;
        this.damage = planetConfig.collisionDamage;
        
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

        // Very slow movement: using config values (pixels per second)
        const speed = Math.random() * (planetConfig.speedMax - planetConfig.speedMin) + planetConfig.speedMin;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Gravity field radius: configured multiplier
        this.gravityRadius = this.radius * planetConfig.gravityRadiusMultiplier;
        this.gravityStrength = planetConfig.baseGravityStrength;

        this.element = document.createElement('div');
        this.element.className = 'planet';
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
        // Calculate distance from planet center to object
        const dx = this.x - obj.x;
        const dy = this.y - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if object is within gravity field
        if (dist < this.gravityRadius && dist > 0) {
            // Normalize direction
            const nx = dx / dist;
            const ny = dy / dist;

            // Gravity strength depends on object type (using config values)
            let baseGravityStrength = planetConfig.baseGravityStrength;
            
            // Bullets (playerBullets and enemyBullets) experience increased gravity
            if (obj.hasOwnProperty('type') && (obj.type === 'player' || obj.type === 'enemy')) {
                baseGravityStrength = planetConfig.baseGravityStrength * planetConfig.bulletGravityMultiplier;
            }
            
            // Gravity falls off from full strength at center to min at edge
            // At dist = 0: factor = 1.0 (full strength)
            // At dist = gravityRadius: factor = gravityFalloffMin
            const distanceFactor = planetConfig.gravityFalloffMin + 
                                  (1 - dist / this.gravityRadius) * planetConfig.gravityFalloffMax;
            const gravityFactor = baseGravityStrength * distanceFactor;

            // Apply gravity acceleration to velocity
            obj.vx += nx * gravityFactor * dt;
            obj.vy += ny * gravityFactor * dt;
        }
    }

    render() {
        this.element.style.left = (this.x - this.radius) + 'px';
        this.element.style.top = (this.y - this.radius) + 'px';
    }

    destroy() {
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -this.radius * 2 || this.x > gameConfig.screenWidth + this.radius * 2 ||
               this.y < -this.radius * 2 || this.y > gameConfig.screenHeight + this.radius * 2;
    }
}
