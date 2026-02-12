// Ohjuksen konfiguraatio
const missileConfig = {
    speed: 2000,                 // Maksiminopeus (pikselit/sekunti)
    initialSpeed: 100,           // Lähtönopeus laukaistaessa (pikselit/sekunti)
    acceleration: 160,           // Kiihtyvyys (pikselit/sekunti²)
    damage: 250,                 // Vahinko osumassa
    health: 1,                   // Osumapisteet (1 = mikä tahansa vahinko tuhoaa)
    turnSpeed: 160,              // Kääntymiskyky (astetta/sekunti)
    frontConeAngle: 60,          // Etusektorin puolikulma (±60° = 120° kartio)
    maxTargetAngle: 90,          // Maksimi hakeutumiskulma (±90°) - ei takasektoria
    frontMaxRange: 400,          // Etusektorin hakeutumisetäisyys (~1/3 ruudusta)
    sideMaxRange: 200,           // Sivusektorin hakeutumisetäisyys (~1/6 ruudusta)
    width: 10,                   // Leveys pikseleissä
    height: 16,                  // Korkeus pikseleissä
    collisionRadius: 10,         // Törmäyssäde pikseleissä
    armingTime: 1,               // Aktivointiaika sekunteina (ei osu omistajaan ennen tätä)
    nebulaSlowdown: 0.3,         // Hidastuskerroin nebulassa (30% normaalista)
    minSpeedInNebula: 10         // Minimi nopeus nebulassa (pikselit/sekunti)
};

// Hakeutuva ohjus -luokka
class Missile {
    constructor(gameContainer, x, y, angle, owner, ownerVx = 0, ownerVy = 0) {
        this.gameContainer = gameContainer;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.owner = owner; // 'player' tai 'enemy'
        this.speed = missileConfig.speed;
        this.currentSpeed = missileConfig.initialSpeed; // Lähtönopeus, kiihtyy ajan myötä
        this.damage = missileConfig.damage;
        this.health = missileConfig.health;
        this.turnSpeed = missileConfig.turnSpeed;
        this.target = null;
        this.age = 0; // Aika laukaisusta (sekunteina)
        this.speedMultiplier = 1.0;

        // Laske alkunopeus kulman perusteella (lähtönopeudella) + ampujan nopeus
        const adjustedAngle = (angle - 90) * Math.PI / 180;
        this.thrustVx = Math.cos(adjustedAngle) * this.currentSpeed;
        this.thrustVy = Math.sin(adjustedAngle) * this.currentSpeed;
        // Kokonaisnopeus = oma työntövoima + ampujan liikemäärä
        this.vx = this.thrustVx + ownerVx;
        this.vy = this.thrustVy + ownerVy;

        // Luo DOM-elementit
        this.element = document.createElement('div');
        this.element.className = `missile ${owner}-missile`;

        // Ohjuksen runko (clip-path muoto)
        this.bodyElement = document.createElement('div');
        this.bodyElement.className = 'missile-body';
        this.element.appendChild(this.bodyElement);

        // Liekki-elementti (näkyy vain hakeutuessa)
        this.flameElement = document.createElement('div');
        this.flameElement.className = 'missile-flame';
        this.element.appendChild(this.flameElement);

        gameContainer.appendChild(this.element);

        // Ei etsi kohdetta laukaistaessa - lentää suoraan kunnes löytää kohteen
    }

    // Laske maksimi hakeutumisetäisyys kulman perusteella
    getMaxRangeAtAngle(angleDiffDeg) {
        const abs = Math.abs(angleDiffDeg);
        if (abs >= missileConfig.maxTargetAngle) return 0;
        if (abs <= missileConfig.frontConeAngle) return missileConfig.frontMaxRange;

        // Sujuva siirtymä (tangentti) etusektorin ja sivusektorin etäisyyksien välillä
        const t = (abs - missileConfig.frontConeAngle) / (missileConfig.maxTargetAngle - missileConfig.frontConeAngle);
        const smooth = (1 - Math.cos(t * Math.PI)) / 2;
        return missileConfig.frontMaxRange + (missileConfig.sideMaxRange - missileConfig.frontMaxRange) * smooth;
    }

    // Etsi paras kohde pisteytyksen perusteella (lähempi + keskemmällä = parempi)
    findBestTarget(targets) {
        const adjustedAngle = (this.angle - 90) * Math.PI / 180;
        let bestTarget = null;
        let bestScore = -Infinity;

        for (const target of targets) {
            if (target.health <= 0) continue;

            const dx = (target.x + 20) - this.x;
            const dy = (target.y + 20) - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) continue;

            // Laske kulmaero ohjuksen kulkusuuntaan
            const targetAngle = Math.atan2(dy, dx);
            const angleDiff = Math.atan2(
                Math.sin(targetAngle - adjustedAngle),
                Math.cos(targetAngle - adjustedAngle)
            );
            const angleDiffDeg = Math.abs(angleDiff) * 180 / Math.PI;

            // Hae maksimi etäisyys tälle kulmalle
            const maxRange = this.getMaxRangeAtAngle(angleDiffDeg);
            if (maxRange <= 0 || dist > maxRange) continue;

            // Pisteytys: suosi lähempiä ja keskemmällä etusektoria olevia kohteita
            const distanceScore = 1 - (dist / maxRange);
            const angleScore = Math.cos(angleDiff); // 1 keskellä, 0 reunalla
            const score = distanceScore * 0.6 + angleScore * 0.4;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        }

        return bestTarget;
    }

    update(dt, targets) {
        this.age += dt;
        this.speedMultiplier = 1.0; // Nollataan joka ruudussa (nebula voi muokata)

        // ArmingTime: lentää vain suoraan eteenpäin, ei hakeudu
        if (this.age < missileConfig.armingTime) {
            this.target = null;
        } else {
            // Etsi paras kohde joka ruudussa
            this.target = this.findBestTarget(targets);
        }

        // Kiihdy kohti maksiminopeutta (sekä armingTimen aikana että hakeutuessa)
        if (this.target || this.age < missileConfig.armingTime) {
            this.currentSpeed += missileConfig.acceleration * dt;
            if (this.currentSpeed > this.speed) {
                this.currentSpeed = this.speed;
            }
        }

        if (this.target) {
            const targetX = this.target.x + 20;
            const targetY = this.target.y + 20;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

            // Laske kulmaero
            let angleDiff = targetAngle - this.angle;
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;

            // Käänny asteittain kohti kohdetta
            const maxTurn = this.turnSpeed * dt;
            if (Math.abs(angleDiff) <= maxTurn) {
                this.angle = targetAngle;
            } else {
                this.angle += Math.sign(angleDiff) * maxTurn;
            }
        }

        // Erota painovoiman vaikutus (ulkoiset voimat jotka muuttivat vx/vy edellisellä framella)
        const gravDx = this.vx - this.thrustVx;
        const gravDy = this.vy - this.thrustVy;

        // Päivitä nopeus kulman perusteella (huomioi hidastuskerroin)
        const effectiveSpeed = this.currentSpeed * this.speedMultiplier;
        const adjustedAngle = (this.angle - 90) * Math.PI / 180;
        this.thrustVx = Math.cos(adjustedAngle) * effectiveSpeed;
        this.thrustVy = Math.sin(adjustedAngle) * effectiveSpeed;

        // Yhdistä työntövoima + painovoiman kertymä
        this.vx = this.thrustVx + gravDx;
        this.vy = this.thrustVy + gravDy;

        // Päivitä sijainti
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Päivitä liekin näkyvyys (näkyy laukaistaessa, armingTimen aikana ja hakeutuessa)
        if (this.target || this.age < missileConfig.armingTime) {
            this.flameElement.classList.add('active');
        } else {
            this.flameElement.classList.remove('active');
        }

        this.render();
    }

    // Ota vahinkoa (1 HP = mikä tahansa vahinko tuhoaa)
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            return true;
        }
        return false;
    }

    render() {
        this.element.style.left = (this.x - missileConfig.width / 2) + 'px';
        this.element.style.top = (this.y - missileConfig.height / 2) + 'px';
        this.element.style.transform = `rotate(${this.angle}deg)`;
    }

    destroy() {
        this.element.remove();
    }

    isOffscreen() {
        return this.x < -20 || this.x > gameConfig.screenWidth + 20 ||
               this.y < -20 || this.y > gameConfig.screenHeight + 20;
    }
}
