// Tähtisumun konfiguraatio
const nebulaCloudConfig = {
    // Koon konfiguraatio
    width: 400,              // Leveys pikseleissä
    height: 400,             // Korkeus pikseleissä
    
    // Liikkeen konfiguraatio
    speedMin: 20,            // Pienin nopeus (pikselit/sekunti)
    speedMax: 40,            // Suurin nopeus (pikselit/sekunti)
    
    // Hidastuskonfiguraatio
    slowdownStrength: 0.5,  // Hidastuskerroin pelaajalle ja vihollisille (50% normaalista)
    bulletSlowdownStrength: 0.8,  // Hidastuskerroin ammuksille (80% normaalista - vähemmän hidastusta)
    
    // Vaikutuksen konfiguraatio
    affectsPlayer: true,     // Vaikuttaa pelaajaan
    affectsEnemies: true,    // Vaikuttaa vihollisiin
    affectsBullets: true,    // Vaikuttaa ammuksiin
    affectsMeteors: true     // Vaikutus meteoriitteihin
};

// Tähtisumu-luokka
class NebulaCloud {
    constructor(gameContainer) {
        this.gameContainer = gameContainer;
        this.width = nebulaCloudConfig.width;
        this.height = nebulaCloudConfig.height;
        
        // Satunnainen spawnipaikka ruudun reunoilta
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Ylhäältä
                this.x = Math.random() * 1200;
                this.y = -this.height;
                break;
            case 1: // Alhaalta
                this.x = Math.random() * 1200;
                this.y = 900 + this.height;
                break;
            case 2: // Vasemmalta
                this.x = -this.width;
                this.y = Math.random() * 900;
                break;
            case 3: // Oikealta
                this.x = 1200 + this.width;
                this.y = Math.random() * 900;
                break;
        }

        // Hidas liike: käytetään konfiguraation arvoja (pikselit/sekunti)
        const speed = Math.random() * (nebulaCloudConfig.speedMax - nebulaCloudConfig.speedMin) + nebulaCloudConfig.speedMin;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Luodaan HTML-elementti tähtisumun visualisaatiolle
        this.element = document.createElement('div');
        this.element.className = 'nebula-cloud';
        this.element.style.width = this.width + 'px';
        this.element.style.height = this.height + 'px';
        gameContainer.appendChild(this.element);
    }

    update(dt = 0.016) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Kierrä näytön reunoilla
        if (this.x < -this.width * 2) this.x = 1200 + this.width;
        if (this.x > 1200 + this.width * 2) this.x = -this.width;
        if (this.y < -this.height * 2) this.y = 900 + this.height;
        if (this.y > 900 + this.height * 2) this.y = -this.height;

        this.render();
    }

    // Tarkistetaan, ovatko objektit tähtisumun sisällä
    isObjectInside(obj) {
        return obj.x > this.x && 
               obj.x < this.x + this.width && 
               obj.y > this.y && 
               obj.y < this.y + this.height;
    }

    // Levitetään hidastava vaikutus objektiin
    applySlowdown(obj, isBullet = false, minVelocity = 0) {
        if (obj.hasOwnProperty('vx') && obj.hasOwnProperty('vy')) {
            // Käytä eri kerrainta ammuksille ja muille objekteille
            const slowdownFactor = isBullet ? 
                nebulaCloudConfig.bulletSlowdownStrength : 
                nebulaCloudConfig.slowdownStrength;
            
            // Laske nykyinen nopeus
            const currentSpeed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
            
            // Käytä hidastusta vain jos nopeus on suurempi kuin minimi
            if (currentSpeed > minVelocity) {
                obj.vx *= slowdownFactor;
                obj.vy *= slowdownFactor;
                
                // Varmista että nopeus ei mene alle minimin
                const newSpeed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
                if (newSpeed < minVelocity) {
                    // Normalisoi uudestaan minimin nopeuteen
                    const scale = minVelocity / newSpeed;
                    obj.vx *= scale;
                    obj.vy *= scale;
                }
            }
        }
    }

    render() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }

    destroy() {
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -this.width * 2 || this.x > 1200 + this.width * 2 ||
               this.y < -this.height * 2 || this.y > 900 + this.height * 2;
    }
}
