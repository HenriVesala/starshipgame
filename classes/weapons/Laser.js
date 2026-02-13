// Laserin konfiguraatio
const laserConfig = {
    damagePerSecond: 500,       // Vahinko per sekunti osumassa (lähietäisyydellä)
    energyCostPerSecond: 50,    // Energiankulutus per sekunti
    stepSize: 5,                // Raymarching askelkoko (pikseliä)
    beamWidth: 3,               // Ytimen leveys (pikseliä) lähellä
    glowWidth: 8,               // Hehkun leveys (pikseliä) lähellä
    coreColor: '#ffffff',       // Ytimen väri
    glowColor: 'rgba(204, 50, 255, 0.6)', // Hehkun väri (punainen)
    hitRadius: 15,              // Osumansäde aluksille (pikseliä)
    nebulaDeflectionPerStep: 5,  // Nebula-taittuman max (astetta/askel)
    blackHoleBendStrength: 20,  // Mustan aukon taittuman voimakkuus
    recoilPerSecond: 0,         // Jatkuva rekyylivoima per sekunti
    decayPer100px: 0.10,        // Tehon heikkenemiskerroin per 100px (0.12 = 12% tehosta menetetään per 100px)
    minVisibleIntensity: 0.03,  // Säde lakkaa kun intensiteetti putoaa tämän alle
    maxBounces: 5,              // Heijastusten enimmäismäärä
    bounceOffset: 2             // Pikselimäärä jolla säde siirretään pinnan ulkopuolelle heijastuksessa
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
        this.hitDistance = 0;
        this.hitMul = 1;
        this.beamPoints = [];
    }

    // Laske intensiteettikerroin etäisyyden perusteella — eksponentiaalinen heikkeneminen
    getIntensity(distance) {
        return Math.pow(1.0 - laserConfig.decayPer100px, distance / 100);
    }

    // Raymarching-jäljitys: laske säteen polku, osumat ja heijastukset
    trace(startX, startY, angle, owner, targets) {
        this.beamPoints = [];
        this.hitTarget = null;

        // Muunna kulma radiaaneiksi (angle on "aluksen suunta", 0=ylös)
        let angleRad = (angle - 90) * Math.PI / 180;
        let currentX = startX;
        let currentY = startY;
        let totalDist = 0;
        let reflectivityMul = 1.0;
        let bounceCount = 0;

        this.beamPoints.push({ x: currentX, y: currentY, mul: reflectivityMul });

        while (this.getIntensity(totalDist) * reflectivityMul > laserConfig.minVisibleIntensity) {
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

            this.beamPoints.push({ x: currentX, y: currentY, mul: reflectivityMul });

            // 3. Tarkista osumat aluksiin (pysäyttää säteen)
            const halfShip = gameConfig.playerWidth / 2;

            if (targets.player) {
                const px = targets.player.x + halfShip;
                const py = targets.player.y + halfShip;
                const pdx = currentX - px;
                const pdy = currentY - py;
                if (pdx * pdx + pdy * pdy < laserConfig.hitRadius * laserConfig.hitRadius) {
                    this.hitTarget = targets.player;
                    this.hitX = currentX;
                    this.hitY = currentY;
                    this.hitDistance = totalDist;
                    this.hitMul = reflectivityMul;
                    return { hit: true, target: targets.player, x: currentX, y: currentY, distance: totalDist, mul: reflectivityMul };
                }
            }

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
                        this.hitDistance = totalDist;
                        this.hitMul = reflectivityMul;
                        return { hit: true, target: enemy, x: currentX, y: currentY, distance: totalDist, mul: reflectivityMul };
                    }
                }
            }

            // 4. Tarkista osuma planeettoihin — heijastus
            let reflected = false;
            if (targets.planets) {
                for (const planet of targets.planets) {
                    const pdx = currentX - planet.x;
                    const pdy = currentY - planet.y;
                    if (pdx * pdx + pdy * pdy < planet.radius * planet.radius) {
                        if (bounceCount >= laserConfig.maxBounces) {
                            this.hitX = currentX; this.hitY = currentY;
                            this.hitDistance = totalDist; this.hitMul = reflectivityMul;
                            return { hit: true, target: null, x: currentX, y: currentY, distance: totalDist, mul: reflectivityMul };
                        }
                        const dist = Math.sqrt(pdx * pdx + pdy * pdy);
                        const nx = pdx / dist;
                        const ny = pdy / dist;
                        const dirX = Math.cos(angleRad);
                        const dirY = Math.sin(angleRad);
                        const dot = dirX * nx + dirY * ny;
                        angleRad = Math.atan2(dirY - 2 * dot * ny, dirX - 2 * dot * nx);
                        reflectivityMul *= planet.planetType.reflectivity;
                        bounceCount++;
                        currentX = planet.x + nx * (planet.radius + laserConfig.bounceOffset);
                        currentY = planet.y + ny * (planet.radius + laserConfig.bounceOffset);
                        this.beamPoints[this.beamPoints.length - 1] = { x: currentX, y: currentY, mul: reflectivityMul };
                        reflected = true;
                        break;
                    }
                }
            }

            // 5. Tarkista osuma meteoriitteihin — heijastus
            if (!reflected && targets.meteors) {
                for (const meteor of targets.meteors) {
                    const mdx = currentX - meteor.x;
                    const mdy = currentY - meteor.y;
                    if (mdx * mdx + mdy * mdy < meteor.radius * meteor.radius) {
                        if (bounceCount >= laserConfig.maxBounces) {
                            this.hitX = currentX; this.hitY = currentY;
                            this.hitDistance = totalDist; this.hitMul = reflectivityMul;
                            return { hit: true, target: null, x: currentX, y: currentY, distance: totalDist, mul: reflectivityMul };
                        }
                        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
                        const nx = mdx / dist;
                        const ny = mdy / dist;
                        const dirX = Math.cos(angleRad);
                        const dirY = Math.sin(angleRad);
                        const dot = dirX * nx + dirY * ny;
                        angleRad = Math.atan2(dirY - 2 * dot * ny, dirX - 2 * dot * nx);
                        reflectivityMul *= meteor.reflectivity;
                        bounceCount++;
                        currentX = meteor.x + nx * (meteor.radius + laserConfig.bounceOffset);
                        currentY = meteor.y + ny * (meteor.radius + laserConfig.bounceOffset);
                        this.beamPoints[this.beamPoints.length - 1] = { x: currentX, y: currentY, mul: reflectivityMul };
                        reflected = true;
                        break;
                    }
                }
            }

            // 6. Tarkista osuma mustiin aukkoihin (tapahtumahorisontti pysäyttää)
            if (!reflected && targets.blackHoles) {
                for (const bh of targets.blackHoles) {
                    const bdx = currentX - bh.x;
                    const bdy = currentY - bh.y;
                    if (bdx * bdx + bdy * bdy < bh.radius * bh.radius) {
                        this.hitX = currentX;
                        this.hitY = currentY;
                        this.hitDistance = totalDist;
                        this.hitMul = reflectivityMul;
                        return { hit: true, target: null, x: currentX, y: currentY, distance: totalDist, mul: reflectivityMul };
                    }
                }
            }

            // 7. Tarkista ruudun rajat
            if (currentX < -20 || currentX > gameConfig.screenWidth + 20 ||
                currentY < -20 || currentY > gameConfig.screenHeight + 20) {
                break;
            }
        }

        // Ei osumaa — säde loppui intensiteettiin tai ruudun reunaan
        this.hitX = currentX;
        this.hitY = currentY;
        this.hitDistance = totalDist;
        this.hitMul = reflectivityMul;
        return { hit: false, target: null, x: currentX, y: currentY, distance: totalDist, mul: reflectivityMul };
    }

    // Piirrä lasersäde canvasille — leveys ja kirkkaus heikkenevät etäisyyden mukaan
    // Rakenna säteen reunapisteet (vasen ja oikea reuna) kapeneva polygoni
    _buildOutline(halfWidthFn) {
        const points = this.beamPoints;
        const step = laserConfig.stepSize;
        const left = [];
        const right = [];

        for (let i = 0; i < points.length; i++) {
            // Suuntavektori säteen kulkusuuntaan
            let dx, dy;
            if (i < points.length - 1) {
                dx = points[i + 1].x - points[i].x;
                dy = points[i + 1].y - points[i].y;
            } else {
                dx = points[i].x - points[i - 1].x;
                dy = points[i].y - points[i - 1].y;
            }
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) continue;

            // Kohtisuora vektori (normalisoitu)
            const px = -dy / len;
            const py = dx / len;

            const hw = halfWidthFn(i * step, points[i].mul || 1);
            left.push(points[i].x + px * hw, points[i].y + py * hw);
            right.push(points[i].x - px * hw, points[i].y - py * hw);
        }

        return { left, right };
    }

    // Piirrä polygoni reunapisteistä (vasen eteen, oikea taakse)
    _fillOutline(ctx, left, right) {
        if (left.length < 4) return;
        ctx.beginPath();
        ctx.moveTo(left[0], left[1]);
        for (let i = 2; i < left.length; i += 2) {
            ctx.lineTo(left[i], left[i + 1]);
        }
        for (let i = right.length - 2; i >= 0; i -= 2) {
            ctx.lineTo(right[i], right[i + 1]);
        }
        ctx.closePath();
        ctx.fill();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.active || this.beamPoints.length < 2) return;

        const ctx = this.ctx;

        // Ulompi hehku (leveämpi, himmeämpi)
        const outerGlow = this._buildOutline((d, mul) => laserConfig.glowWidth * this.getIntensity(d) * mul * 0.5);
        ctx.fillStyle = laserConfig.glowColor;
        ctx.globalAlpha = 0.3;
        this._fillOutline(ctx, outerGlow.left, outerGlow.right);

        // Sisempi hehku
        const innerGlow = this._buildOutline((d, mul) => laserConfig.glowWidth * this.getIntensity(d) * mul * 0.3);
        ctx.fillStyle = laserConfig.glowColor;
        ctx.globalAlpha = 0.5;
        this._fillOutline(ctx, innerGlow.left, innerGlow.right);

        // Ydin (core)
        const core = this._buildOutline((d, mul) => laserConfig.beamWidth * this.getIntensity(d) * mul * 0.5);
        ctx.fillStyle = laserConfig.coreColor;
        ctx.globalAlpha = 1.0;
        this._fillOutline(ctx, core.left, core.right);

        // Piirrä osumapiste (koko ja kirkkaus etäisyyden mukaan)
        if (this.hitTarget || this.beamPoints.length > 2) {
            const hitIntensity = this.getIntensity(this.hitDistance) * this.hitMul;

            ctx.beginPath();
            ctx.arc(this.hitX, this.hitY, 4 * hitIntensity, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.9 * hitIntensity;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(this.hitX, this.hitY, 8 * hitIntensity, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
            ctx.globalAlpha = 0.6 * hitIntensity;
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;
    }

    // Tyhjennä canvas ja sammuta laser
    clear() {
        this.active = false;
        this.beamPoints = [];
        this.hitTarget = null;
        this.hitMul = 1;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
