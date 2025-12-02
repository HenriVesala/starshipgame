// Pelaajan aluksen konfiguraatio
const playerConfig = {
    // Koon konfiguraatio
    width: 40,                      // Leveys pikseleissä
    height: 40,                     // Korkeus pikseleissä
    
    // Liikkeen konfiguraatio
    rotationSpeed: 200,             // Astetta/sekunti
    acceleration: 300,              // Pikselit/sekunnin²
    maxSpeed: 500,                  // Pikselit/sekunti
    
    // Sijainti konfiguraatio
    startX: 580,                    // Aloituspaikka X
    startY: 430,                    // Aloituspaikka Y
    maxX: 1200 - 40,                // Maksimi X (ruudun leveys - leveys)
    maxY: 900 - 40,                 // Maksimi Y (ruudun korkeus - korkeus)
    
    // Tähtisumun vaikutus
    minVelocityInNebula: 120         // Minimi nopeus tähtisumassa (px/s)
};

// Pelaajan alus -luokka
class Player {
    constructor() {
        this.x = playerConfig.startX;
        this.y = playerConfig.startY;
        this.vx = 0;                // Nopeus X-akselilla
        this.vy = 0;                // Nopeus Y-akselilla
        this.angle = 0;             // Kääntymiskulma (asteet)
        this.score = 0;
        this.gameOver = false;
    }

    // Päivitä pelaajan asento ja nopeus
    update(dt, keys) {
        // Kierrä alusta
        if (keys.ArrowLeft) {
            this.angle -= playerConfig.rotationSpeed * dt;
        }
        if (keys.ArrowRight) {
            this.angle += playerConfig.rotationSpeed * dt;
        }

        // Kiihdytä alusta
        const dirX = Math.cos((this.angle - 90) * Math.PI / 180);
        const dirY = Math.sin((this.angle - 90) * Math.PI / 180);

        if (keys.ArrowUp) {
            this.vx += dirX * playerConfig.acceleration * dt;
            this.vy += dirY * playerConfig.acceleration * dt;
        }
        if (keys.ArrowDown) {
            this.vx -= dirX * playerConfig.acceleration * dt;
            this.vy -= dirY * playerConfig.acceleration * dt;
        }

        // Rajoita maksimi nopeus
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > playerConfig.maxSpeed) {
            const scale = playerConfig.maxSpeed / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Päivitä sijainti
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Rajoita ruudun rajoihin
        if (this.x < 0) this.x = 0;
        if (this.x > playerConfig.maxX) this.x = playerConfig.maxX;
        if (this.y < 0) this.y = 0;
        if (this.y > playerConfig.maxY) this.y = playerConfig.maxY;
    }

    // Palauta pelaajan nopeus
    getVelocity() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    // Tarkista ovatko koordinaatit pelaajan sisällä (törmäys)
    isPointInside(px, py) {
        return px > this.x && 
               px < this.x + playerConfig.width && 
               py > this.y && 
               py < this.y + playerConfig.height;
    }
}
