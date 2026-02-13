// Laserin konfiguraatio
const laserConfig = {
    damagePerSecond: 400,       // Vahinko per sekunti osumassa
    energyCostPerSecond: 40,    // Energiankulutus per sekunti
    stepSize: 5,                // Raymarching askelkoko (pikseliä)
    maxRange: 1500,             // Säteen maksimikantama (pikseliä)
    beamWidth: 2,               // Ytimen leveys (pikseliä)
    glowWidth: 8,               // Hehkun leveys (pikseliä)
    coreColor: '#ffffff',       // Ytimen väri
    glowColor: 'rgba(204, 50, 255, 0.6)', // Hehkun väri (punainen)
    hitRadius: 15,              // Osumansäde aluksille (pikseliä)
    nebulaDeflectionPerStep: 5,  // Nebula-taittuman max (astetta/askel)
    blackHoleBendStrength: 20,  // Mustan aukon taittuman voimakkuus
    recoilPerSecond: 0          // Jatkuva rekyylivoima per sekunti
};

// Laser-luokka — raycast-ase joka piirretään canvasille
class Laser {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.active = false;
        this.hitTarget = null;
        this.hitX = 0;
        this.hitY = 0;
        this.beamPoints = [];
    }

    // Raymarching-jäljitys: laske säteen polku ja osumat
    trace(startX, startY, angle, owner, targets) {
        this.beamPoints = [];
        this.hitTarget = null;

        // Muunna kulma radiaaneiksi (angle on "aluksen suunta", 0=ylös)
        let angleRad = (angle - 90) * Math.PI / 180;
        let currentX = startX;
        let currentY = startY;
        let totalDist = 0;

        this.beamPoints.push({ x: currentX, y: currentY });

        while (totalDist < laserConfig.maxRange) {
            // 1. Nebula-deflektio
            if (targets.nebulaClouds) {
                for (const cloud of targets.nebulaClouds) {
                    let deflected = false;
                    for (const circle of cloud.circles) {
                        if (circle.destroyed) continue;
                        const cx = cloud.x + circle.offsetX;
                        const cy = cloud.y + circle.offsetY;
                        const ddx = currentX - cx;
                        const ddy = currentY - cy;
                        if (ddx * ddx + ddy * ddy < circle.radius * circle.radius) {
                            angleRad += (Math.random() - 0.5) * 2 * laserConfig.nebulaDeflectionPerStep * Math.PI / 180;
                            deflected = true;
                            break;
                        }
                    }
                    if (deflected) break;
                }
            }

            // 2. Mustan aukon taipuma
            if (targets.blackHoles) {
                for (const bh of targets.blackHoles) {
                    const bdx = bh.x - currentX;
                    const bdy = bh.y - currentY;
                    const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
                    if (bDist < bh.gravityRadius && bDist > 0) {
                        const bhAngle = Math.atan2(bdy, bdx);
                        let angleDiff = bhAngle - angleRad;
                        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                        const bendAmount = (laserConfig.blackHoleBendStrength * laserConfig.stepSize) / (bDist * bDist);
                        angleRad += Math.sign(angleDiff) * Math.min(bendAmount, Math.abs(angleDiff));
                    }
                }
            }

            // Etenee askeleen
            currentX += Math.cos(angleRad) * laserConfig.stepSize;
            currentY += Math.sin(angleRad) * laserConfig.stepSize;
            totalDist += laserConfig.stepSize;

            this.beamPoints.push({ x: currentX, y: currentY });

            // 3. Tarkista osumat aluksiin
            const halfShip = gameConfig.playerWidth / 2;

            // Tarkista osuma pelaajaan (vihollisen laser)
            if (targets.player) {
                const px = targets.player.x + halfShip;
                const py = targets.player.y + halfShip;
                const pdx = currentX - px;
                const pdy = currentY - py;
                if (pdx * pdx + pdy * pdy < laserConfig.hitRadius * laserConfig.hitRadius) {
                    this.hitTarget = targets.player;
                    this.hitX = currentX;
                    this.hitY = currentY;
                    return { hit: true, target: targets.player, x: currentX, y: currentY };
                }
            }

            // Tarkista osuma vihollisiin (pelaajan laser)
            if (targets.enemies) {
                for (const enemy of targets.enemies) {
                    if (enemy.isShrinking) continue;
                    const ex = enemy.x + halfShip;
                    const ey = enemy.y + halfShip;
                    const edx = currentX - ex;
                    const edy = currentY - ey;
                    if (edx * edx + edy * edy < laserConfig.hitRadius * laserConfig.hitRadius) {
                        this.hitTarget = enemy;
                        this.hitX = currentX;
                        this.hitY = currentY;
                        return { hit: true, target: enemy, x: currentX, y: currentY };
                    }
                }
            }

            // 4. Tarkista osuma planeettoihin
            if (targets.planets) {
                for (const planet of targets.planets) {
                    const pdx = currentX - planet.x;
                    const pdy = currentY - planet.y;
                    if (pdx * pdx + pdy * pdy < planet.radius * planet.radius) {
                        this.hitX = currentX;
                        this.hitY = currentY;
                        return { hit: true, target: null, x: currentX, y: currentY };
                    }
                }
            }

            // 5. Tarkista osuma meteoriitteihin
            if (targets.meteors) {
                for (const meteor of targets.meteors) {
                    const mdx = currentX - meteor.x;
                    const mdy = currentY - meteor.y;
                    if (mdx * mdx + mdy * mdy < meteor.radius * meteor.radius) {
                        this.hitX = currentX;
                        this.hitY = currentY;
                        return { hit: true, target: null, x: currentX, y: currentY };
                    }
                }
            }

            // 6. Tarkista osuma mustiin aukkoihin (tapahtumahorisontti pysäyttää)
            if (targets.blackHoles) {
                for (const bh of targets.blackHoles) {
                    const bdx = currentX - bh.x;
                    const bdy = currentY - bh.y;
                    if (bdx * bdx + bdy * bdy < bh.radius * bh.radius) {
                        this.hitX = currentX;
                        this.hitY = currentY;
                        return { hit: true, target: null, x: currentX, y: currentY };
                    }
                }
            }

            // 7. Tarkista ruudun rajat
            if (currentX < -20 || currentX > gameConfig.screenWidth + 20 ||
                currentY < -20 || currentY > gameConfig.screenHeight + 20) {
                break;
            }
        }

        // Ei osumaa — säde loppui kantamaan tai ruudun reunaan
        this.hitX = currentX;
        this.hitY = currentY;
        return { hit: false, target: null, x: currentX, y: currentY };
    }

    // Piirrä lasersäde canvasille
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.active || this.beamPoints.length < 2) return;

        // Piirrä hehku (glow)
        this.ctx.beginPath();
        this.ctx.moveTo(this.beamPoints[0].x, this.beamPoints[0].y);
        for (let i = 1; i < this.beamPoints.length; i++) {
            this.ctx.lineTo(this.beamPoints[i].x, this.beamPoints[i].y);
        }
        this.ctx.strokeStyle = laserConfig.glowColor;
        this.ctx.lineWidth = laserConfig.glowWidth;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.6;
        this.ctx.stroke();

        // Piirrä ydin (core)
        this.ctx.beginPath();
        this.ctx.moveTo(this.beamPoints[0].x, this.beamPoints[0].y);
        for (let i = 1; i < this.beamPoints.length; i++) {
            this.ctx.lineTo(this.beamPoints[i].x, this.beamPoints[i].y);
        }
        this.ctx.strokeStyle = laserConfig.coreColor;
        this.ctx.lineWidth = laserConfig.beamWidth;
        this.ctx.globalAlpha = 1.0;
        this.ctx.stroke();

        // Piirrä osumapiste
        if (this.hitTarget || this.beamPoints.length > 2) {
            this.ctx.beginPath();
            this.ctx.arc(this.hitX, this.hitY, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.globalAlpha = 0.9;
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(this.hitX, this.hitY, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
            this.ctx.globalAlpha = 0.6;
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1.0;
    }

    // Tyhjennä canvas ja sammuta laser
    clear() {
        this.active = false;
        this.beamPoints = [];
        this.hitTarget = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
