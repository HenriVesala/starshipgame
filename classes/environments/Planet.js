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

    // Painovoiman väheneminen
    gravityFalloffMin: 0.1,  // Vähintään painovoima reunalla (10% täydestä)
    gravityFalloffMax: 0.95,  // Vähenemisalue (1.0 - 0.1 = 0.9)

    // Spawnaus
    spawnIntervalMin: 15000,  // Pienin spawnausväli (millisekuntia)
    spawnIntervalMax: 25000   // Suurin spawnausväli (millisekuntia)
};

// Planeettatyypit väripaletteineen
const planetTypes = [
    { // Kiviplaneetta (Mars-tyylinen)
        base: [180, 100, 60],
        accent: [200, 130, 80],
        dark: [120, 60, 30],
        atmosphere: 'rgba(200, 120, 60, 0.3)',
        reflectivity: 0.4
    },
    { // Jääplaneetta
        base: [140, 180, 220],
        accent: [200, 230, 255],
        dark: [60, 90, 140],
        atmosphere: 'rgba(150, 200, 255, 0.3)',
        reflectivity: 0.8
    },
    { // Vulkaaninen planeetta
        base: [80, 40, 30],
        accent: [220, 80, 20],
        dark: [40, 20, 15],
        atmosphere: 'rgba(255, 100, 20, 0.3)',
        reflectivity: 0.15
    },
    { // Metsäplaneetta
        base: [60, 130, 70],
        accent: [80, 170, 90],
        dark: [30, 70, 40],
        atmosphere: 'rgba(80, 180, 80, 0.3)',
        reflectivity: 0.35
    },
    { // Aavikkoplaneetta
        base: [190, 170, 120],
        accent: [220, 200, 150],
        dark: [140, 110, 70],
        atmosphere: 'rgba(210, 190, 140, 0.3)',
        reflectivity: 0.7
    },
    { // Kaasujättiläinen
        base: [180, 140, 80],
        accent: [220, 180, 120],
        dark: [120, 80, 40],
        atmosphere: 'rgba(200, 160, 80, 0.4)',
        reflectivity: 0.5
    },
    { // Sininen kaasujättiläinen
        base: [40, 80, 160],
        accent: [80, 130, 220],
        dark: [20, 40, 100],
        atmosphere: 'rgba(60, 120, 220, 0.4)',
        reflectivity: 0.3
    }
];

// Generoi proseduraalinen planeetan tekstuuri canvasille
function generatePlanetTexture(radius, planetType) {
    const size = radius * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = radius;
    const cy = radius;
    const col = planetType;

    // Täytä pohjaväri ympyränä
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${col.base[0]}, ${col.base[1]}, ${col.base[2]})`;
    ctx.fill();
    ctx.save();
    ctx.clip();

    // Pintanoise - pienet värivariaatiot
    const noiseScale = 0.06;
    for (let y = 0; y < size; y += 3) {
        for (let x = 0; x < size; x += 3) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy > radius * radius) continue;
            const noise = (Math.sin(x * noiseScale * 7.3 + y * noiseScale * 3.1) *
                          Math.cos(y * noiseScale * 5.7 + x * noiseScale * 2.3) + 1) * 0.5;
            const variation = noise * 40 - 20;
            ctx.fillStyle = `rgba(${col.base[0] + variation}, ${col.base[1] + variation}, ${col.base[2] + variation}, 0.4)`;
            ctx.fillRect(x, y, 3, 3);
        }
    }

    // Pintakerrokset - vaakasuuntaiset vyöhykkeet (erityisesti kaasujättiläisille)
    const bandCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < bandCount; i++) {
        const bandY = (size * (i + 0.5)) / bandCount + (Math.random() - 0.5) * 15;
        const bandHeight = 8 + Math.random() * 20;
        const useAccent = Math.random() > 0.5;
        const bandCol = useAccent ? col.accent : col.dark;
        ctx.fillStyle = `rgba(${bandCol[0]}, ${bandCol[1]}, ${bandCol[2]}, ${0.15 + Math.random() * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(cx, bandY, radius * (0.8 + Math.random() * 0.2), bandHeight, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Kraatterit
    const craterCount = 3 + Math.floor(Math.random() * 6);
    for (let i = 0; i < craterCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.75;
        const craterX = cx + Math.cos(angle) * dist;
        const craterY = cy + Math.sin(angle) * dist;
        const craterR = 4 + Math.random() * (radius * 0.15);

        // Kraatterin varjo
        ctx.beginPath();
        ctx.arc(craterX, craterY, craterR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.dark[0]}, ${col.dark[1]}, ${col.dark[2]}, ${0.3 + Math.random() * 0.2})`;
        ctx.fill();

        // Kraatterin vaalea reuna
        ctx.beginPath();
        ctx.arc(craterX - craterR * 0.2, craterY - craterR * 0.2, craterR * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.accent[0]}, ${col.accent[1]}, ${col.accent[2]}, 0.15)`;
        ctx.fill();
    }

    // 3D-valaistus: valoisa kohta vasemmassa yläkulmassa
    const lightGrad = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.3, radius * 0.1,
        cx, cy, radius
    );
    lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    lightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)');
    lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    return canvas.toDataURL();
}

// Planet class with gravity field
class Planet {
    constructor(gameContainer) {
        this.gameContainer = gameContainer;
        // Size: random radius between config min and max
        this.radius = Math.random() * (planetConfig.radiusMax - planetConfig.radiusMin) + planetConfig.radiusMin;
        this.damage = planetConfig.collisionDamage;

        // Valitse satunnainen planeetta-tyyppi
        this.planetType = planetTypes[Math.floor(Math.random() * planetTypes.length)];

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

        // Generoi tekstuuri ja luo elementti
        const textureUrl = generatePlanetTexture(Math.round(this.radius), this.planetType);

        this.element = document.createElement('div');
        this.element.className = 'planet';
        this.element.style.width = (this.radius * 2) + 'px';
        this.element.style.height = (this.radius * 2) + 'px';
        this.element.style.backgroundImage = `url(${textureUrl})`;
        this.element.style.backgroundSize = 'cover';
        this.element.style.boxShadow = `inset -3px -3px 6px rgba(0, 0, 0, 0.6), 0 0 20px ${this.planetType.atmosphere}, inset 2px 2px 4px rgba(255, 255, 255, 0.1)`;
        gameContainer.appendChild(this.element);

        // Kutistumisanimaatio (mustan aukon nielaisu)
        this.isShrinking = false;
        this.shrinkProgress = 0;
        this.shrinkDuration = 0.8;
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
            
            // Aseen painovoimakerroin (interactions.planet.gravityMultiplier)
            const gravMul = obj.interactions?.planet?.gravityMultiplier;
            if (gravMul != null) {
                baseGravityStrength *= gravMul;
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

        if (this.isShrinking) {
            const scale = 1 - this.shrinkProgress;
            this.element.style.transform = `scale(${scale})`;
        }
    }

    destroy() {
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -this.radius * 2 || this.x > gameConfig.screenWidth + this.radius * 2 ||
               this.y < -this.radius * 2 || this.y > gameConfig.screenHeight + this.radius * 2;
    }
}
