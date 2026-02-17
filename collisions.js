// Törmäystunnistuslogiikka

// Apufunktio: hae ammuksen törmäyskäyttäytyminen ympäristökappaleelle configista
function getCollisionBehavior(projectile, envType) {
    return projectile.interactions?.[envType]?.collision ?? 'destroy';
}

// Apufunktio: railgun-ammuksen läpäisy — hidasta ja taita lentorataa
function handleRailgunPenetration(bullet, targetHealth, impactDamage) {
    // Laske jäljellä oleva energiaosuus (KE ∝ v²)
    const remainingFraction = Math.max(0, (impactDamage - targetHealth) / impactDamage);

    // Uusi nopeus: v_new = v * sqrt(jäljellä oleva osuus)
    const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
    const newSpeed = speed * Math.sqrt(remainingFraction);

    // Suunnanmuutos: vähemmän liike-energiaa = enemmän taittumaa
    const maxDeflectionDeg = railgunConfig.penetrationMaxDeflection;
    const deflectionScale = 1 / (1 + newSpeed / railgunConfig.penetrationDeflectionFalloff);
    const deflectionRad = (Math.random() - 0.5) * 2 * maxDeflectionDeg * deflectionScale * Math.PI / 180;

    // Laske nykyinen suunta ja lisää taittuma
    const currentAngle = Math.atan2(bullet.vy, bullet.vx);
    const newAngle = currentAngle + deflectionRad;

    bullet.vx = Math.cos(newAngle) * newSpeed;
    bullet.vy = Math.sin(newAngle) * newSpeed;

    // Päivitä visuaalinen kulma
    bullet.angle = newAngle * 180 / Math.PI + 90;
    // Vahinko päivittyy automaattisesti seuraavassa update()-kutsussa nopeuden perusteella
}

// Apufunktio: laske etäisyys kahden pisteen välillä
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// Apufunktio: halkaise meteori kahdeksi puolikkaaksi
function splitMeteor(meteor, bulletVx, bulletVy) {
    const newRadius = meteor.radius / 2;

    // Suunta kohtisuoraan ammuksen lentorataan nähden
    const bulletAngle = Math.atan2(bulletVy, bulletVx);
    const perpAngle = bulletAngle + Math.PI / 2;
    const cosPerp = Math.cos(perpAngle);
    const sinPerp = Math.sin(perpAngle);
    const offset = newRadius + 5;
    const meteorSpeed = Math.sqrt(meteor.vx * meteor.vx + meteor.vy * meteor.vy);
    const splitSpeed = Math.max(meteorSpeed, 50) * 0.5;

    // Luo ensimmäinen lapsi (kohtisuoraan + suuntaan)
    const child1 = new Meteor(meteor.gameContainer, {
        x: meteor.x + cosPerp * offset,
        y: meteor.y + sinPerp * offset,
        radius: newRadius,
        vx: meteor.vx + cosPerp * splitSpeed,
        vy: meteor.vy + sinPerp * splitSpeed,
        brightness: meteor.brightness
    });
    child1.immunityTimer = meteorConfig.splitImmunityTime;
    meteors.push(child1);

    // Luo toinen lapsi (kohtisuoraan - suuntaan)
    const child2 = new Meteor(meteor.gameContainer, {
        x: meteor.x - cosPerp * offset,
        y: meteor.y - sinPerp * offset,
        radius: newRadius,
        vx: meteor.vx - cosPerp * splitSpeed,
        vy: meteor.vy - sinPerp * splitSpeed,
        brightness: meteor.brightness
    });
    child2.immunityTimer = meteorConfig.splitImmunityTime;
    meteors.push(child2);
}

// Tarkista kaikki törmäykset pelissä
function checkCollisions() {
    // Tarkista vihollisten ammukset osumassa pelaajiin
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        let bulletHitPlayer = false;
        for (const pCtx of getAlivePlayers()) {
            const p = pCtx.player;
            if (distance(p.x + 20, p.y + 20, bullet.x, bullet.y) < 30) {
                const impactDamage = bullet.getImpactDamage
                    ? bullet.getImpactDamage(p.vx, p.vy)
                    : bullet.damage;
                const targetHealth = p.health;
                const destroyed = p.takeDamage(impactDamage);

                if (bullet.penetrating && impactDamage > targetHealth) {
                    handleRailgunPenetration(bullet, targetHealth, impactDamage);
                    if (destroyed) {
                        explosions.push(new Explosion(p.x + 20, p.y + 20, 'large', gameContainer));
                        playerDied(pCtx);
                    }
                } else {
                    bullet.destroy();
                    enemyBullets.splice(i, 1);
                    if (destroyed) {
                        explosions.push(new Explosion(p.x + 20, p.y + 20, 'large', gameContainer));
                        playerDied(pCtx);
                    }
                }
                bulletHitPlayer = true;
                break;
            }
        }
        if (bulletHitPlayer && currentGameState !== GameState.PLAYING) return;
    }

    // Tarkista vihollisten ammukset osumassa vihollisiin (friendly fire)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            // Ohita vihollinen joka ampui tämän ammuksen
            if (bullet.firedBy === enemy) continue;
            if (distance(enemy.x + 20, enemy.y + 20, bullet.x, bullet.y) < 40) {
                // Railgunille vahinko törmäysnopeuden perusteella
                const impactDamage = bullet.getImpactDamage
                    ? bullet.getImpactDamage(enemy.vx, enemy.vy)
                    : bullet.damage;
                const targetHealth = enemy.health;
                const destroyed = enemy.takeDamage(impactDamage);

                if (bullet.penetrating && impactDamage > targetHealth) {
                    // Läpäisy: ammus jatkaa matkaa hidastuneena
                    handleRailgunPenetration(bullet, targetHealth, impactDamage);

                    if (destroyed) {
                        const explosionSizeMap = {
                            'WeakEnemy': 'small',
                            'EliteEnemy': 'medium',
                            'AggressiveEnemy': 'medium',
                            'MissileEnemy': 'medium'
                        };
                        const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                        explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                        spawnHealthOrb(enemy);
                        spawnRateOfFireBoost(enemy);

                        enemy.destroy();
                        enemies.splice(j, 1);
                    }
                    break;
                } else {
                    // Normaali osuma: tuhoa ammus
                    bullet.destroy();
                    enemyBullets.splice(i, 1);

                    if (destroyed) {
                        const explosionSizeMap = {
                            'WeakEnemy': 'small',
                            'EliteEnemy': 'medium',
                            'AggressiveEnemy': 'medium',
                            'MissileEnemy': 'medium'
                        };
                        const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                        explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                        spawnHealthOrb(enemy);
                        spawnRateOfFireBoost(enemy);

                        enemy.destroy();
                        enemies.splice(j, 1);
                    }
                    break;
                }
            }
        }
    }

    // Tarkista pelaajat törmäämässä vihollisiin
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (const pCtx of getAlivePlayers()) {
            const p = pCtx.player;
            if (distance(p.x + 20, p.y + 20, enemy.x + 20, enemy.y + 20) < 40) {
                const playerDestroyed = p.takeDamage(enemyConfig.collisionDamage, true);
                const enemyDestroyed = enemy.takeDamage(pCtx.config.collisionDamage);

                const dx = (enemy.x + 20) - (p.x + 20);
                const dy = (enemy.y + 20) - (p.y + 20);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const relVx = p.vx - enemy.vx;
                    const relVy = p.vy - enemy.vy;
                    const dotProduct = relVx * nx + relVy * ny;

                    if (dotProduct > 0) {
                        const bounceStrength = dotProduct;
                        p.vx -= bounceStrength * nx;
                        p.vy -= bounceStrength * ny;
                        enemy.vx += bounceStrength * nx;
                        enemy.vy += bounceStrength * ny;

                        const overlap = 40 - dist;
                        const pushDistance = overlap / 2 + 2;
                        p.x -= nx * pushDistance;
                        p.y -= ny * pushDistance;
                        enemy.x += nx * pushDistance;
                        enemy.y += ny * pushDistance;
                    }
                }

                if (enemyDestroyed) {
                    const explosionSizeMap = {
                        'WeakEnemy': 'small', 'EliteEnemy': 'medium',
                        'AggressiveEnemy': 'medium', 'MissileEnemy': 'medium'
                    };
                    explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSizeMap[enemy.constructor.name] || 'small', gameContainer));
                    spawnHealthOrb(enemy);
                    spawnRateOfFireBoost(enemy);
                    enemy.destroy();
                    enemies.splice(i, 1);
                }

                if (playerDestroyed) {
                    explosions.push(new Explosion(p.x + 20, p.y + 20, 'large', gameContainer));
                    playerDied(pCtx);
                    if (currentGameState !== GameState.PLAYING) return;
                }
                break; // Yksi vihollinen voi osua vain yhteen pelaajaan per frame
            }
        }
    }

    // Tarkista pelaajat törmäämässä planeettoihin
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        for (const pCtx of getAlivePlayers()) {
            const p = pCtx.player;
            if (distance(p.x + 20, p.y + 20, planet.x, planet.y) < planet.radius + 20) {
                const destroyed = p.takeDamage(planet.damage, true);

                const dx = (p.x + 20) - planet.x;
                const dy = (p.y + 20) - planet.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const dotProduct = p.vx * nx + p.vy * ny;

                    if (dotProduct < 0) {
                        let reflectedVx = p.vx - 2 * dotProduct * nx;
                        let reflectedVy = p.vy - 2 * dotProduct * ny;

                        const speed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
                        const minEscapeSpeed = planet.gravityStrength * 2.5;
                        if (speed < minEscapeSpeed) {
                            const speedMultiplier = minEscapeSpeed / speed;
                            reflectedVx *= speedMultiplier;
                            reflectedVy *= speedMultiplier;
                        }

                        p.vx = reflectedVx;
                        p.vy = reflectedVy;

                        const collisionDist = planet.radius + 20;
                        const overlap = collisionDist - dist;
                        p.x += nx * (overlap + 2);
                        p.y += ny * (overlap + 2);
                    }
                }

                if (destroyed) {
                    explosions.push(new Explosion(p.x + 20, p.y + 20, 'large', gameContainer));
                    playerDied(pCtx);
                    if (currentGameState !== GameState.PLAYING) return;
                }
            }
        }
    }

    // Tarkista pelaajat törmäämässä meteoriitteihin
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        const collisionDist = meteor.radius + 20;
        for (const pCtx of getAlivePlayers()) {
            const p = pCtx.player;
            if (distance(p.x + 20, p.y + 20, meteor.x, meteor.y) < collisionDist) {
                const destroyed = p.takeDamage(meteor.damage, true);

                const dx = meteor.x - (p.x + 20);
                const dy = meteor.y - (p.y + 20);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const relVx = p.vx - meteor.vx;
                    const relVy = p.vy - meteor.vy;
                    const dotProduct = relVx * nx + relVy * ny;

                    if (dotProduct > 0) {
                        const bounceStrength = dotProduct * 1.2;
                        p.vx -= bounceStrength * nx;
                        p.vy -= bounceStrength * ny;
                        meteor.vx += bounceStrength * nx * 0.5;
                        meteor.vy += bounceStrength * ny * 0.5;

                        const overlap = collisionDist - dist;
                        const pushDistance = overlap + 2;
                        p.x -= nx * pushDistance * 0.8;
                        p.y -= ny * pushDistance * 0.8;
                        meteor.x += nx * pushDistance * 0.2;
                        meteor.y += ny * pushDistance * 0.2;
                    }
                }

                if (destroyed) {
                    explosions.push(new Explosion(p.x + 20, p.y + 20, 'large', gameContainer));
                    playerDied(pCtx);
                    if (currentGameState !== GameState.PLAYING) return;
                }
                break;
            }
        }
    }

    // Tarkista pelaajat törmäämässä mustiin aukkoihin (kutistuu olemattomiin)
    for (let i = blackHoles.length - 1; i >= 0; i--) {
        const blackHole = blackHoles[i];
        for (const pCtx of getAlivePlayers()) {
            const p = pCtx.player;
            if (distance(p.x + 20, p.y + 20, blackHole.x, blackHole.y) < blackHole.radius + 20) {
                if (!p.isShrinking) {
                    p.isShrinking = true;
                    p.shrinkProgress = 0;
                    p.shrinkDuration = 0.5;

                    blackHole.radius *= 1.01;
                    blackHole.gravityRadius = blackHole.radius * blackHoleConfig.gravityRadiusMultiplier;
                    blackHole.distortionRadius *= 1.01;

                    blackHole.element.style.width = (blackHole.radius * 2) + 'px';
                    blackHole.element.style.height = (blackHole.radius * 2) + 'px';
                    blackHole.distortionField.style.width = (blackHole.distortionRadius * 2) + 'px';
                    blackHole.distortionField.style.height = (blackHole.distortionRadius * 2) + 'px';
                }
            }
        }
    }

    // Tarkista meteoriitit törmäämässä toisiinsa
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor1 = meteors[i];
        for (let j = i - 1; j >= 0; j--) {
            const meteor2 = meteors[j];
            if (distance(meteor1.x, meteor1.y, meteor2.x, meteor2.y) < meteor1.radius + meteor2.radius) {
                // Laske törmäysnormaali
                const dx = meteor2.x - meteor1.x;
                const dy = meteor2.y - meteor1.y;
                const normalLength = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / normalLength;
                const ny = dy / normalLength;

                // Heijasta molemmat meteoriitit
                // Meteoriitti 1 heijastus
                const dotProduct1 = meteor1.vx * nx + meteor1.vy * ny;
                meteor1.vx = meteor1.vx - 2 * dotProduct1 * nx;
                meteor1.vy = meteor1.vy - 2 * dotProduct1 * ny;

                // Meteoriitti 2 heijastus (vastakkaiseen suuntaan)
                const dotProduct2 = meteor2.vx * nx + meteor2.vy * ny;
                meteor2.vx = meteor2.vx - 2 * dotProduct2 * nx;
                meteor2.vy = meteor2.vy - 2 * dotProduct2 * ny;

                // Työnnä meteoriitit erilleen päällekkäisyyden estämiseksi
                const overlap = meteor1.radius + meteor2.radius - normalLength;
                const pushDistance = (overlap / 2) + 1;
                meteor1.x -= nx * pushDistance;
                meteor1.y -= ny * pushDistance;
                meteor2.x += nx * pushDistance;
                meteor2.y += ny * pushDistance;
                break;
            }
        }
    }

    // Tarkista viholliset törmäämässä meteoriitteihin
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            const collisionDist = meteor.radius + 20;
            if (distance(enemy.x + 20, enemy.y + 20, meteor.x, meteor.y) < collisionDist) {
                // Vihollinen ottaa vahinkoa meteoriittitörmäyksestä
                const destroyed = enemy.takeDamage(meteor.damage);

                // Laske kimmoke - törmäysnormaali vihollisesta meteoriittiin
                const dx = meteor.x - (enemy.x + 20);
                const dy = meteor.y - (enemy.y + 20);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Laske suhteellinen nopeus
                    const relVx = enemy.vx - meteor.vx;
                    const relVy = enemy.vy - meteor.vy;
                    const dotProduct = relVx * nx + relVy * ny;

                    // Kimpoa vain jos objektit liikkuvat toisiaan kohti
                    if (dotProduct > 0) {
                        // Käytä kimmoketta (elastinen törmäys)
                        const bounceStrength = dotProduct * 1.2;
                        enemy.vx -= bounceStrength * nx;
                        enemy.vy -= bounceStrength * ny;
                        meteor.vx += bounceStrength * nx * 0.5; // Meteoriitti kimpoaa vähemmän (enemmän massaa)
                        meteor.vy += bounceStrength * ny * 0.5;

                        // Työnnä objektit erilleen päällekkäisyyden estämiseksi
                        const overlap = collisionDist - dist;
                        const pushDistance = overlap + 2;
                        enemy.x -= nx * pushDistance * 0.8;
                        enemy.y -= ny * pushDistance * 0.8;
                        meteor.x += nx * pushDistance * 0.2;
                        meteor.y += ny * pushDistance * 0.2;
                    }
                }

                if (destroyed) {
                    // Luo räjähdys vihollisen sijainnissa
                    const explosionSizeMap = {
                        'WeakEnemy': 'small',
                        'EliteEnemy': 'medium',
                        'AggressiveEnemy': 'medium'
                    };
                    const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                    explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                    // Spawna terveyspallo
                    spawnHealthOrb(enemy);

                    // Spawna ampumisnopeusboosti (todennäköisyyspohjainen)
                    spawnRateOfFireBoost(enemy);

                    enemy.destroy();
                    enemies.splice(i, 1);
                }
                break;
            }
        }
    }

    // Tarkista viholliset törmäämässä toisiinsa
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy1 = enemies[i];
        for (let j = i - 1; j >= 0; j--) {
            const enemy2 = enemies[j];
            if (distance(enemy1.x + 20, enemy1.y + 20, enemy2.x + 20, enemy2.y + 20) < 40) {
                // Laske kimmoke - törmäysnormaali vihollisesta 1 viholliseen 2
                const dx = (enemy2.x + 20) - (enemy1.x + 20);
                const dy = (enemy2.y + 20) - (enemy1.y + 20);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Laske suhteellinen nopeus
                    const relVx = enemy1.vx - enemy2.vx;
                    const relVy = enemy1.vy - enemy2.vy;
                    const dotProduct = relVx * nx + relVy * ny;

                    // Kimpoa vain jos objektit liikkuvat toisiaan kohti
                    if (dotProduct > 0) {
                        // Käytä kimmoketta (elastinen törmäys saman massan kanssa)
                        const bounceStrength = dotProduct;
                        enemy1.vx -= bounceStrength * nx;
                        enemy1.vy -= bounceStrength * ny;
                        enemy2.vx += bounceStrength * nx;
                        enemy2.vy += bounceStrength * ny;

                        // Työnnä objektit erilleen päällekkäisyyden estämiseksi
                        const overlap = 40 - dist;
                        const pushDistance = overlap / 2 + 2;
                        enemy1.x -= nx * pushDistance;
                        enemy1.y -= ny * pushDistance;
                        enemy2.x += nx * pushDistance;
                        enemy2.y += ny * pushDistance;
                    }
                }
            }
        }
    }

    // Tarkista viholliset törmäämässä planeettoihin
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = planets.length - 1; j >= 0; j--) {
            const planet = planets[j];
            if (distance(enemy.x + 20, enemy.y + 20, planet.x, planet.y) < planet.radius + 20) {
                const destroyed = enemy.takeDamage(planet.damage);

                // Kimmoke - planeetta on liikkumaton ja massiivinen
                const dx = (enemy.x + 20) - planet.x;
                const dy = (enemy.y + 20) - planet.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Heijasta nopeus planeetan pinnasta
                    const dotProduct = enemy.vx * nx + enemy.vy * ny;

                    if (dotProduct < 0) {
                        let reflectedVx = enemy.vx - 2 * dotProduct * nx;
                        let reflectedVy = enemy.vy - 2 * dotProduct * ny;

                        // Varmista riittävä pakonopeus painovoimasta
                        const speed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
                        const minEscapeSpeed = planet.gravityStrength * 2.5;

                        if (speed < minEscapeSpeed) {
                            const speedMultiplier = minEscapeSpeed / speed;
                            reflectedVx *= speedMultiplier;
                            reflectedVy *= speedMultiplier;
                        }

                        enemy.vx = reflectedVx;
                        enemy.vy = reflectedVy;

                        // Työnnä vihollinen pois planeetalta
                        const collisionDist = planet.radius + 20;
                        const overlap = collisionDist - dist;
                        enemy.x += nx * (overlap + 2);
                        enemy.y += ny * (overlap + 2);
                    }
                }

                if (destroyed) {
                    const explosionSizeMap = {
                        'WeakEnemy': 'small',
                        'EliteEnemy': 'medium',
                        'AggressiveEnemy': 'medium',
                        'MissileEnemy': 'medium'
                    };
                    const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                    explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                    spawnHealthOrb(enemy);
                    spawnRateOfFireBoost(enemy);

                    enemy.destroy();
                    enemies.splice(i, 1);
                }
                break;
            }
        }
    }

    // Tarkista viholliset törmäämässä mustiin aukkoihin (kutistuvat olemattomiin)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = blackHoles.length - 1; j >= 0; j--) {
            const blackHole = blackHoles[j];
            if (distance(enemy.x + 20, enemy.y + 20, blackHole.x, blackHole.y) < blackHole.radius + 20) {
                if (!enemy.isShrinking) {
                    enemy.isShrinking = true;
                    enemy.shrinkProgress = 0;
                    enemy.shrinkDuration = 0.5; // 0.5 sekuntia kutistumiseen

                    // Musta aukko kasvaa 1% aluksen nielaistessa
                    blackHole.radius *= 1.01;
                    blackHole.gravityRadius = blackHole.radius * blackHoleConfig.gravityRadiusMultiplier;
                    blackHole.distortionRadius *= 1.01;

                    // Päivitä visuaaliset elementit
                    blackHole.element.style.width = (blackHole.radius * 2) + 'px';
                    blackHole.element.style.height = (blackHole.radius * 2) + 'px';
                    blackHole.distortionField.style.width = (blackHole.distortionRadius * 2) + 'px';
                    blackHole.distortionField.style.height = (blackHole.distortionRadius * 2) + 'px';

                    // Spawna terveyspallo ennen kutistumista
                    spawnHealthOrb(enemy);

                    // Spawna ampumisnopeusboosti (todennäköisyyspohjainen)
                    spawnRateOfFireBoost(enemy);
                }
                break;
            }
        }
    }

    // Tarkista mustat aukot törmäämässä planeettoihin (kutistuu olemattomiin)
    for (let i = blackHoles.length - 1; i >= 0; i--) {
        const blackHole = blackHoles[i];
        for (let j = planets.length - 1; j >= 0; j--) {
            const planet = planets[j];
            if (distance(blackHole.x, blackHole.y, planet.x, planet.y) < blackHole.radius + planet.radius) {
                if (!planet.isShrinking) {
                    planet.isShrinking = true;
                    planet.shrinkProgress = 0;

                    // Musta aukko kasvaa 50% planeetan nielaistessa
                    blackHole.radius *= 1.5;
                    blackHole.gravityRadius = blackHole.radius * blackHoleConfig.gravityRadiusMultiplier;
                    blackHole.distortionRadius *= 1.5;

                    // Päivitä visuaaliset elementit
                    blackHole.element.style.width = (blackHole.radius * 2) + 'px';
                    blackHole.element.style.height = (blackHole.radius * 2) + 'px';
                    blackHole.distortionField.style.width = (blackHole.distortionRadius * 2) + 'px';
                    blackHole.distortionField.style.height = (blackHole.distortionRadius * 2) + 'px';
                }
                break;
            }
        }
    }

    // Tarkista meteoriitit törmäämässä planeettoihin (kimmoa takaisin)
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        for (let j = planets.length - 1; j >= 0; j--) {
            const planet = planets[j];
            if (distance(meteor.x, meteor.y, planet.x, planet.y) < meteor.radius + planet.radius) {
                // Laske kimmokkulma törmäysnormaalin perusteella
                const dx = meteor.x - planet.x;
                const dy = meteor.y - planet.y;
                const normalLength = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / normalLength;
                const ny = dy / normalLength;

                // Laske heijastunut nopeus: v - 2(v·n)n
                const dotProduct = meteor.vx * nx + meteor.vy * ny;
                let reflectedVx = (meteor.vx - 2 * dotProduct * nx);
                let reflectedVy = (meteor.vy - 2 * dotProduct * ny);

                // Varmista että meteoriitin nopeus on tarpeeksi suuri pakoon painovoimasta
                const speed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
                const minEscapeSpeed = planet.gravityStrength * 2.5; // 2.5x vahvempi kuin painovoiman veto

                if (speed < minEscapeSpeed) {
                    // Lisää nopeus pakonopeuteen
                    const speedMultiplier = minEscapeSpeed / speed;
                    reflectedVx *= speedMultiplier;
                    reflectedVy *= speedMultiplier;
                }

                meteor.vx = reflectedVx;
                meteor.vy = reflectedVy;

                // Työnnä meteoriitti pois planeetalta päällekkäisyyden estämiseksi
                const overlap = meteor.radius + planet.radius - normalLength;
                meteor.x += nx * (overlap + 2);
                meteor.y += ny * (overlap + 2);
                break;
            }
        }
    }

    // Tarkista meteoriitit törmäämässä mustiin aukkoihin (kutistuvat olemattomiin)
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        for (let j = blackHoles.length - 1; j >= 0; j--) {
            const blackHole = blackHoles[j];
            if (distance(meteor.x, meteor.y, blackHole.x, blackHole.y) < meteor.radius + blackHole.radius) {
                if (!meteor.isShrinking) {
                    meteor.isShrinking = true;
                    meteor.shrinkProgress = 0;
                    meteor.shrinkDuration = 0.5; // 0.5 sekuntia kutistumiseen

                    // Musta aukko kasvaa 10% meteoriitin nielaistessa
                    blackHole.radius *= 1.10;
                    blackHole.gravityRadius = blackHole.radius * blackHoleConfig.gravityRadiusMultiplier;
                    blackHole.distortionRadius *= 1.10;

                    // Päivitä visuaaliset elementit
                    blackHole.element.style.width = (blackHole.radius * 2) + 'px';
                    blackHole.element.style.height = (blackHole.radius * 2) + 'px';
                    blackHole.distortionField.style.width = (blackHole.distortionRadius * 2) + 'px';
                    blackHole.distortionField.style.height = (blackHole.distortionRadius * 2) + 'px';
                }
                break;
            }
        }
    }

    // Tarkista pelaajan ammukset osumassa meteoriitteihin (kimmoa takaisin)
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        let hitMeteor = false;

        // Tarkista törmäys meteoriitteihin
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            if (meteor.immunityTimer > 0) continue; // Ohita immuunit meteorit (juuri haljenneita)
            if (distance(bullet.x, bullet.y, meteor.x, meteor.y) < meteor.radius + 3) {
                const behavior = getCollisionBehavior(bullet, 'meteor');
                if (behavior === 'penetrate') {
                    // Railgun: vahingoita meteoria ja läpäise
                    const impactDamage = bullet.getImpactDamage(meteor.vx, meteor.vy);
                    const meteorHealth = meteor.health;
                    const destroyed = meteor.takeDamage(impactDamage);

                    if (destroyed) {
                        if (meteor.radius >= meteorConfig.minSplitRadius) {
                            splitMeteor(meteor, bullet.vx, bullet.vy);
                        } else {
                            explosions.push(new Explosion(meteor.x, meteor.y, 'small', gameContainer));
                        }
                        meteor.destroy();
                        meteors.splice(j, 1);
                    }

                    handleRailgunPenetration(bullet, meteorHealth, impactDamage);
                } else if (behavior === 'bounce') {
                    // Kimmoke
                    const dx = bullet.x - meteor.x;
                    const dy = bullet.y - meteor.y;
                    const normalLength = Math.sqrt(dx * dx + dy * dy);
                    const nx = dx / normalLength;
                    const ny = dy / normalLength;

                    const dotProduct = bullet.vx * nx + bullet.vy * ny;
                    bullet.vx = (bullet.vx - 2 * dotProduct * nx);
                    bullet.vy = (bullet.vy - 2 * dotProduct * ny);
                } else if (behavior === 'explode') {
                    explosions.push(new Explosion(bullet.x, bullet.y, 'small', gameContainer));
                    bullet.destroy();
                    playerBullets.splice(i, 1);
                } else {
                    // 'destroy'
                    bullet.destroy();
                    playerBullets.splice(i, 1);
                }
                hitMeteor = true;
                break;
            }
        }

        // Tarkista törmäys planeettoihin
        if (!hitMeteor) {
            for (let j = planets.length - 1; j >= 0; j--) {
                const planet = planets[j];
                if (distance(bullet.x, bullet.y, planet.x, planet.y) < planet.radius + 3) {
                    const behavior = getCollisionBehavior(bullet, 'planet');
                    if (behavior === 'explode') {
                        explosions.push(new Explosion(bullet.x, bullet.y, 'small', gameContainer));
                    }
                    bullet.destroy();
                    playerBullets.splice(i, 1);
                    break;
                }
            }
        }

        // Tarkista törmäys mustiin aukkoihin
        if (!hitMeteor) {
            for (let j = blackHoles.length - 1; j >= 0; j--) {
                const blackHole = blackHoles[j];
                if (distance(bullet.x, bullet.y, blackHole.x, blackHole.y) < blackHole.radius + 3) {
                    bullet.destroy();
                    playerBullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    // Tarkista vihollisten ammukset osumassa meteoriitteihin
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        let hitMeteor = false;

        // Tarkista törmäys meteoriitteihin
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            if (meteor.immunityTimer > 0) continue;
            if (distance(bullet.x, bullet.y, meteor.x, meteor.y) < meteor.radius + 3) {
                const behavior = getCollisionBehavior(bullet, 'meteor');
                if (behavior === 'penetrate') {
                    const impactDamage = bullet.getImpactDamage(meteor.vx, meteor.vy);
                    const meteorHealth = meteor.health;
                    const destroyed = meteor.takeDamage(impactDamage);

                    if (destroyed) {
                        if (meteor.radius >= meteorConfig.minSplitRadius) {
                            splitMeteor(meteor, bullet.vx, bullet.vy);
                        } else {
                            explosions.push(new Explosion(meteor.x, meteor.y, 'small', gameContainer));
                        }
                        meteor.destroy();
                        meteors.splice(j, 1);
                    }

                    handleRailgunPenetration(bullet, meteorHealth, impactDamage);
                } else if (behavior === 'bounce') {
                    const dx = bullet.x - meteor.x;
                    const dy = bullet.y - meteor.y;
                    const normalLength = Math.sqrt(dx * dx + dy * dy);
                    const nx = dx / normalLength;
                    const ny = dy / normalLength;

                    const dotProduct = bullet.vx * nx + bullet.vy * ny;
                    bullet.vx = (bullet.vx - 2 * dotProduct * nx);
                    bullet.vy = (bullet.vy - 2 * dotProduct * ny);
                } else if (behavior === 'explode') {
                    explosions.push(new Explosion(bullet.x, bullet.y, 'small', gameContainer));
                    bullet.destroy();
                    enemyBullets.splice(i, 1);
                } else {
                    bullet.destroy();
                    enemyBullets.splice(i, 1);
                }
                hitMeteor = true;
                break;
            }
        }

        // Tarkista törmäys planeettoihin
        if (!hitMeteor) {
            for (let j = planets.length - 1; j >= 0; j--) {
                const planet = planets[j];
                if (distance(bullet.x, bullet.y, planet.x, planet.y) < planet.radius + 3) {
                    const behavior = getCollisionBehavior(bullet, 'planet');
                    if (behavior === 'explode') {
                        explosions.push(new Explosion(bullet.x, bullet.y, 'small', gameContainer));
                    }
                    bullet.destroy();
                    enemyBullets.splice(i, 1);
                    break;
                }
            }
        }

        // Tarkista törmäys mustiin aukkoihin
        if (!hitMeteor) {
            for (let j = blackHoles.length - 1; j >= 0; j--) {
                const blackHole = blackHoles[j];
                if (distance(bullet.x, bullet.y, blackHole.x, blackHole.y) < blackHole.radius + 3) {
                    bullet.destroy();
                    enemyBullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    // Tarkista pelaajan ammukset osumassa vihollisiin
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (distance(enemy.x + 20, enemy.y + 20, bullet.x, bullet.y) < 40) {
                // Railgunille vahinko törmäysnopeuden perusteella
                const impactDamage = bullet.getImpactDamage
                    ? bullet.getImpactDamage(enemy.vx, enemy.vy)
                    : bullet.damage;
                const targetHealth = enemy.health;
                const destroyed = enemy.takeDamage(impactDamage);

                if (bullet.penetrating && impactDamage > targetHealth) {
                    // Läpäisy: ammus jatkaa matkaa hidastuneena
                    handleRailgunPenetration(bullet, targetHealth, impactDamage);

                    if (destroyed) {
                        const scoreMap = {
                            'WeakEnemy': 10,
                            'EliteEnemy': 25,
                            'AggressiveEnemy': 30
                        };
                        gameScore += scoreMap[enemy.constructor.name] || 10;

                        const explosionSizeMap = {
                            'WeakEnemy': 'small',
                            'EliteEnemy': 'medium',
                            'AggressiveEnemy': 'medium'
                        };
                        const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                        explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                        spawnHealthOrb(enemy);
                        spawnRateOfFireBoost(enemy);

                        enemy.destroy();
                        enemies.splice(j, 1);
                    }
                    break; // Ei osuta tuplasti samalla framella
                } else {
                    // Normaali osuma: tuhoa ammus
                    bullet.destroy();
                    playerBullets.splice(i, 1);

                    if (destroyed) {
                        const scoreMap = {
                            'WeakEnemy': 10,
                            'EliteEnemy': 25,
                            'AggressiveEnemy': 30
                        };
                        gameScore += scoreMap[enemy.constructor.name] || 10;

                        const explosionSizeMap = {
                            'WeakEnemy': 'small',
                            'EliteEnemy': 'medium',
                            'AggressiveEnemy': 'medium'
                        };
                        const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                        explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                        spawnHealthOrb(enemy);
                        spawnRateOfFireBoost(enemy);

                        enemy.destroy();
                        enemies.splice(j, 1);
                    }
                    break;
                }
            }
        }
    }

    // Tarkista pelaajan ohjukset osumassa pelaajiin (vain kun friendly fire päällä)
    if (friendlyFire) {
        for (let i = playerMissiles.length - 1; i >= 0; i--) {
            const missile = playerMissiles[i];
            if (missile.age < missileConfig.armingTime) continue;
            for (const pCtx of getAlivePlayers()) {
                const p = pCtx.player;
                // Ohita ampuja vain lähietäisyydellä (estää välitön osuma spawnissa)
                if (missile.firedByPlayer === p && distance(p.x + 20, p.y + 20, missile.x, missile.y) < 50) continue;
                if (distance(p.x + 20, p.y + 20, missile.x, missile.y) < 20 + missileConfig.collisionRadius) {
                    const destroyed = p.takeDamage(missile.damage);

                    explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                    missile.destroy();
                    playerMissiles.splice(i, 1);

                    if (destroyed) {
                        explosions.push(new Explosion(p.x + 20, p.y + 20, 'large', gameContainer));
                        playerDied(pCtx);
                        if (currentGameState !== GameState.PLAYING) return;
                    }
                    break;
                }
            }
        }
    }

    // Tarkista pelaajan ammukset osumassa pelaajiin (vain kun friendly fire päällä)
    if (friendlyFire) {
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const bullet = playerBullets[i];
            let hitPlayer = false;
            for (const pCtx of getAlivePlayers()) {
                const p = pCtx.player;
                // Ohita ampuja vain lähietäisyydellä (estää välitön osuma spawnissa)
                if (bullet.firedByPlayer === p && distance(p.x + 20, p.y + 20, bullet.x, bullet.y) < 50) continue;
                if (distance(p.x + 20, p.y + 20, bullet.x, bullet.y) < 30) {
                    const impactDamage = bullet.getImpactDamage
                        ? bullet.getImpactDamage(p.vx, p.vy)
                        : bullet.damage;
                    const targetHealth = p.health;
                    const destroyed = p.takeDamage(impactDamage);

                    if (bullet.penetrating && impactDamage > targetHealth) {
                        handleRailgunPenetration(bullet, targetHealth, impactDamage);
                    } else {
                        bullet.destroy();
                        playerBullets.splice(i, 1);
                    }

                    if (destroyed) {
                        explosions.push(new Explosion(p.x + 20, p.y + 20, 'large', gameContainer));
                        playerDied(pCtx);
                        if (currentGameState !== GameState.PLAYING) return;
                    }
                    hitPlayer = true;
                    break;
                }
            }
        }
    }

    // Tarkista pelaajan ohjukset osumassa vihollisiin
    for (let i = playerMissiles.length - 1; i >= 0; i--) {
        const missile = playerMissiles[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (distance(enemy.x + 20, enemy.y + 20, missile.x, missile.y) < 20 + missileConfig.collisionRadius) {
                const destroyed = enemy.takeDamage(missile.damage);

                // Ohjus räjähtää aina osuessaan
                explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                missile.destroy();
                playerMissiles.splice(i, 1);

                if (destroyed) {
                    // Määrittele pisteet vihollisen tyypin perusteella
                    const scoreMap = {
                        'WeakEnemy': 10,
                        'EliteEnemy': 25,
                        'AggressiveEnemy': 30
                    };
                    gameScore += scoreMap[enemy.constructor.name] || 10;

                    // Luo räjähdys vihollisen sijainnissa
                    const explosionSizeMap = {
                        'WeakEnemy': 'small',
                        'EliteEnemy': 'medium',
                        'AggressiveEnemy': 'medium'
                    };
                    const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                    explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                    // Spawna terveyspallo
                    spawnHealthOrb(enemy);

                    // Spawna ampumisnopeusboosti (todennäköisyyspohjainen)
                    spawnRateOfFireBoost(enemy);

                    enemy.destroy();
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }

    // Tarkista vihollisten ammukset osumassa pelaajan ohjuksiin
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        for (let j = playerMissiles.length - 1; j >= 0; j--) {
            const missile = playerMissiles[j];
            if (distance(bullet.x, bullet.y, missile.x, missile.y) < 3 + missileConfig.collisionRadius) {
                explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                missile.destroy();
                playerMissiles.splice(j, 1);

                if (bullet.penetrating) {
                    handleRailgunPenetration(bullet, missileConfig.health, bullet.damage);
                } else {
                    bullet.destroy();
                    enemyBullets.splice(i, 1);
                }
                break;
            }
        }
    }

    // Tarkista pelaajan ohjukset osumassa meteoriitteihin
    for (let i = playerMissiles.length - 1; i >= 0; i--) {
        const missile = playerMissiles[i];
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            if (distance(missile.x, missile.y, meteor.x, meteor.y) < meteor.radius + missileConfig.collisionRadius) {
                const behavior = getCollisionBehavior(missile, 'meteor');
                // Ohjukset tukevat vain 'explode' ja 'destroy' -moodeja (ei bounce/penetrate)
                if (behavior === 'explode') {
                    explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                }
                missile.destroy();
                playerMissiles.splice(i, 1);
                break;
            }
        }
    }

    // Tarkista pelaajan ohjukset osumassa planeettoihin
    for (let i = playerMissiles.length - 1; i >= 0; i--) {
        const missile = playerMissiles[i];
        for (let j = planets.length - 1; j >= 0; j--) {
            const planet = planets[j];
            if (distance(missile.x, missile.y, planet.x, planet.y) < planet.radius + missileConfig.collisionRadius) {
                const behavior = getCollisionBehavior(missile, 'planet');
                if (behavior === 'explode') {
                    explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                }
                missile.destroy();
                playerMissiles.splice(i, 1);
                break;
            }
        }
    }

    // Tarkista pelaajan ohjukset osumassa mustiin aukkoihin
    for (let i = playerMissiles.length - 1; i >= 0; i--) {
        const missile = playerMissiles[i];
        for (let j = blackHoles.length - 1; j >= 0; j--) {
            const blackHole = blackHoles[j];
            if (distance(missile.x, missile.y, blackHole.x, blackHole.y) < blackHole.radius + missileConfig.collisionRadius) {
                missile.destroy();
                playerMissiles.splice(i, 1);
                break;
            }
        }
    }

    // Tarkista vihollisten ohjukset osumassa vihollisiin
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        const missile = enemyMissiles[i];
        if (missile.age < missileConfig.armingTime) continue;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (distance(enemy.x + 20, enemy.y + 20, missile.x, missile.y) < 20 + missileConfig.collisionRadius) {
                const destroyed = enemy.takeDamage(missile.damage);

                explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                missile.destroy();
                enemyMissiles.splice(i, 1);

                if (destroyed) {
                    const explosionSizeMap = {
                        'WeakEnemy': 'small',
                        'EliteEnemy': 'medium',
                        'AggressiveEnemy': 'medium'
                    };
                    const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                    explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                    spawnHealthOrb(enemy);
                    spawnRateOfFireBoost(enemy);

                    enemy.destroy();
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }

    // Tarkista vihollisten ohjukset osumassa pelaajiin
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        const missile = enemyMissiles[i];
        if (missile.age < missileConfig.armingTime) continue;
        let missileHit = false;
        for (const pCtx of getAlivePlayers()) {
            const p = pCtx.player;
            if (distance(p.x + 20, p.y + 20, missile.x, missile.y) < 20 + missileConfig.collisionRadius) {
                const destroyed = p.takeDamage(missile.damage);

                explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                missile.destroy();
                enemyMissiles.splice(i, 1);

                if (destroyed) {
                    explosions.push(new Explosion(p.x + 20, p.y + 20, 'large', gameContainer));
                    playerDied(pCtx);
                    if (currentGameState !== GameState.PLAYING) return;
                }
                missileHit = true;
                break;
            }
        }
    }

    // Tarkista pelaajan ammukset osumassa vihollisten ohjuksiin
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        for (let j = enemyMissiles.length - 1; j >= 0; j--) {
            const missile = enemyMissiles[j];
            if (distance(bullet.x, bullet.y, missile.x, missile.y) < 3 + missileConfig.collisionRadius) {
                explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                missile.destroy();
                enemyMissiles.splice(j, 1);

                if (bullet.penetrating) {
                    handleRailgunPenetration(bullet, missileConfig.health, bullet.damage);
                } else {
                    bullet.destroy();
                    playerBullets.splice(i, 1);
                }
                break;
            }
        }
    }

    // Tarkista pelaajan ohjukset osumassa vihollisten ohjuksiin
    for (let i = playerMissiles.length - 1; i >= 0; i--) {
        const pMissile = playerMissiles[i];
        for (let j = enemyMissiles.length - 1; j >= 0; j--) {
            const eMissile = enemyMissiles[j];
            if (distance(pMissile.x, pMissile.y, eMissile.x, eMissile.y) < missileConfig.collisionRadius * 2) {
                explosions.push(new Explosion(pMissile.x, pMissile.y, 'small', gameContainer));
                pMissile.destroy();
                playerMissiles.splice(i, 1);

                explosions.push(new Explosion(eMissile.x, eMissile.y, 'small', gameContainer));
                eMissile.destroy();
                enemyMissiles.splice(j, 1);
                break;
            }
        }
    }

    // Tarkista pelaajan ammukset osumassa pelaajan ohjuksiin
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        for (let j = playerMissiles.length - 1; j >= 0; j--) {
            const missile = playerMissiles[j];
            if (bullet.firedByPlayer === missile.firedByPlayer) continue;
            if (distance(bullet.x, bullet.y, missile.x, missile.y) < 3 + missileConfig.collisionRadius) {
                explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                missile.destroy();
                playerMissiles.splice(j, 1);

                if (bullet.penetrating) {
                    handleRailgunPenetration(bullet, missileConfig.health, bullet.damage);
                } else {
                    bullet.destroy();
                    playerBullets.splice(i, 1);
                }
                break;
            }
        }
    }

    // Tarkista vihollisten ammukset osumassa vihollisten ohjuksiin
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        for (let j = enemyMissiles.length - 1; j >= 0; j--) {
            const missile = enemyMissiles[j];
            if (distance(bullet.x, bullet.y, missile.x, missile.y) < 3 + missileConfig.collisionRadius) {
                explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                missile.destroy();
                enemyMissiles.splice(j, 1);

                if (bullet.penetrating) {
                    handleRailgunPenetration(bullet, missileConfig.health, bullet.damage);
                } else {
                    bullet.destroy();
                    enemyBullets.splice(i, 1);
                }
                break;
            }
        }
    }

    // Tarkista pelaajan ohjukset osumassa pelaajan ohjuksiin
    for (let i = playerMissiles.length - 2; i >= 0; i--) {
        const missileA = playerMissiles[i];
        for (let j = playerMissiles.length - 1; j > i; j--) {
            const missileB = playerMissiles[j];
            if (missileA.firedByPlayer === missileB.firedByPlayer) continue;
            if (distance(missileA.x, missileA.y, missileB.x, missileB.y) < missileConfig.collisionRadius * 2) {
                explosions.push(new Explosion(missileA.x, missileA.y, 'small', gameContainer));
                explosions.push(new Explosion(missileB.x, missileB.y, 'small', gameContainer));
                missileB.destroy();
                playerMissiles.splice(j, 1);
                missileA.destroy();
                playerMissiles.splice(i, 1);
                break;
            }
        }
    }

    // Tarkista vihollisten ohjukset osumassa vihollisten ohjuksiin
    for (let i = enemyMissiles.length - 2; i >= 0; i--) {
        const missileA = enemyMissiles[i];
        for (let j = enemyMissiles.length - 1; j > i; j--) {
            const missileB = enemyMissiles[j];
            if (distance(missileA.x, missileA.y, missileB.x, missileB.y) < missileConfig.collisionRadius * 2) {
                explosions.push(new Explosion(missileA.x, missileA.y, 'small', gameContainer));
                explosions.push(new Explosion(missileB.x, missileB.y, 'small', gameContainer));
                missileB.destroy();
                enemyMissiles.splice(j, 1);
                missileA.destroy();
                enemyMissiles.splice(i, 1);
                break;
            }
        }
    }

    // Tarkista vihollisten ohjukset osumassa meteoriitteihin
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        const missile = enemyMissiles[i];
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            if (distance(missile.x, missile.y, meteor.x, meteor.y) < meteor.radius + missileConfig.collisionRadius) {
                const behavior = getCollisionBehavior(missile, 'meteor');
                // Ohjukset tukevat vain 'explode' ja 'destroy' -moodeja (ei bounce/penetrate)
                if (behavior === 'explode') {
                    explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                }
                missile.destroy();
                enemyMissiles.splice(i, 1);
                break;
            }
        }
    }

    // Tarkista vihollisten ohjukset osumassa planeettoihin
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        const missile = enemyMissiles[i];
        for (let j = planets.length - 1; j >= 0; j--) {
            const planet = planets[j];
            if (distance(missile.x, missile.y, planet.x, planet.y) < planet.radius + missileConfig.collisionRadius) {
                const behavior = getCollisionBehavior(missile, 'planet');
                if (behavior === 'explode') {
                    explosions.push(new Explosion(missile.x, missile.y, 'small', gameContainer));
                }
                missile.destroy();
                enemyMissiles.splice(i, 1);
                break;
            }
        }
    }

    // Tarkista vihollisten ohjukset osumassa mustiin aukkoihin
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        const missile = enemyMissiles[i];
        for (let j = blackHoles.length - 1; j >= 0; j--) {
            const blackHole = blackHoles[j];
            if (distance(missile.x, missile.y, blackHole.x, blackHole.y) < blackHole.radius + missileConfig.collisionRadius) {
                missile.destroy();
                enemyMissiles.splice(i, 1);
                break;
            }
        }
    }

    // Tarkista pelaajat keräämässä terveyspaloja
    for (let i = healthOrbs.length - 1; i >= 0; i--) {
        const orb = healthOrbs[i];
        let collected = false;
        for (const pCtx of getAlivePlayers()) {
            const p = pCtx.player;
            if (orb.checkCollision(p)) {
                p.health = Math.min(p.health + orb.healthValue, p.maxHealth);
                orb.destroy();
                healthOrbs.splice(i, 1);
                collected = true;
                break;
            }
        }
    }

    // Tarkista pelaajat keräämässä ampumisnopeusboosteja
    for (let i = rateOfFireBoosts.length - 1; i >= 0; i--) {
        const boost = rateOfFireBoosts[i];
        let collected = false;
        for (const pCtx of getAlivePlayers()) {
            const p = pCtx.player;
            if (boost.checkCollision(p)) {
                p.applyRateOfFireBoost();
                boost.destroy();
                rateOfFireBoosts.splice(i, 1);
                collected = true;
                break;
            }
        }
    }
}
