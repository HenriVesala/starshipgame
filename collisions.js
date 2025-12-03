// Törmäystunnistuslogiikka

// Apufunktio: laske etäisyys kahden pisteen välillä
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// Tarkista kaikki törmäykset pelissä
function checkCollisions() {
    // Tarkista vihollisten ammukset osumassa pelaajaan
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (distance(player.x + 20, player.y + 20, bullet.x, bullet.y) < 30) {
            const destroyed = player.takeDamage(bullet.damage);
            bullet.destroy();
            enemyBullets.splice(i, 1);
            if (destroyed) {
                // Luo iso räjähdys pelaajan sijainnissa
                explosions.push(new Explosion(player.x + 20, player.y + 20, 'large', gameContainer));
                endGame();
                return;
            }
        }
    }

    // Tarkista pelaaja törmäämässä vihollisiin
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (distance(player.x + 20, player.y + 20, enemy.x + 20, enemy.y + 20) < 40) {
            // Molemmat ottavat vahinkoa
            const playerDestroyed = player.takeDamage(enemyConfig.collisionDamage, true);
            const enemyDestroyed = enemy.takeDamage(playerConfig.collisionDamage);

            // Laske kimmoke - törmäysnormaali pelaajasta viholliseen
            const dx = (enemy.x + 20) - (player.x + 20);
            const dy = (enemy.y + 20) - (player.y + 20);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;

                // Laske suhteellinen nopeus
                const relVx = player.vx - enemy.vx;
                const relVy = player.vy - enemy.vy;
                const dotProduct = relVx * nx + relVy * ny;

                // Kimpoa vain jos objektit liikkuvat toisiaan kohti
                if (dotProduct > 0) {
                    // Käytä kimmoketta (elastinen törmäys saman massan kanssa)
                    const bounceStrength = dotProduct;
                    player.vx -= bounceStrength * nx;
                    player.vy -= bounceStrength * ny;
                    enemy.vx += bounceStrength * nx;
                    enemy.vy += bounceStrength * ny;

                    // Työnnä objektit erilleen päällekkäisyyden estämiseksi
                    const overlap = 40 - dist;
                    const pushDistance = overlap / 2 + 2;
                    player.x -= nx * pushDistance;
                    player.y -= ny * pushDistance;
                    enemy.x += nx * pushDistance;
                    enemy.y += ny * pushDistance;
                }
            }

            if (enemyDestroyed) {
                // Luo räjähdys vihollisen sijainnissa (koko riippuu tyypistä)
                const explosionSizeMap = {
                    'WeakEnemy': 'small',
                    'EliteEnemy': 'medium',
                    'AggressiveEnemy': 'medium'
                };
                const explosionSize = explosionSizeMap[enemy.constructor.name] || 'small';
                explosions.push(new Explosion(enemy.x + 20, enemy.y + 20, explosionSize, gameContainer));

                // Spawna terveyspallo
                spawnHealthOrb(enemy);

                enemy.destroy();
                enemies.splice(i, 1);
            }

            if (playerDestroyed) {
                // Luo iso räjähdys pelaajan sijainnissa
                explosions.push(new Explosion(player.x + 20, player.y + 20, 'large', gameContainer));
                endGame();
                return;
            }
        }
    }

    // Tarkista pelaaja törmäämässä planeettoihin
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        if (distance(player.x + 20, player.y + 20, planet.x, planet.y) < planet.radius + 20) {
            const destroyed = player.takeDamage(planet.damage, true);
            if (destroyed) {
                // Luo iso räjähdys pelaajan sijainnissa
                explosions.push(new Explosion(player.x + 20, player.y + 20, 'large', gameContainer));
                endGame();
                return;
            }
        }
    }

    // Tarkista pelaaja törmäämässä meteoriitteihin
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        const collisionDist = meteor.radius + 20;
        if (distance(player.x + 20, player.y + 20, meteor.x, meteor.y) < collisionDist) {
            const destroyed = player.takeDamage(meteor.damage, true);

            // Laske kimmoke - törmäysnormaali pelaajasta meteoriittiin
            const dx = meteor.x - (player.x + 20);
            const dy = meteor.y - (player.y + 20);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;

                // Laske suhteellinen nopeus
                const relVx = player.vx - meteor.vx;
                const relVy = player.vy - meteor.vy;
                const dotProduct = relVx * nx + relVy * ny;

                // Kimpoa vain jos objektit liikkuvat toisiaan kohti
                if (dotProduct > 0) {
                    // Käytä kimmoketta (elastinen törmäys)
                    const bounceStrength = dotProduct * 1.2; // Hieman vahvempi kimmoke meteoriiteille
                    player.vx -= bounceStrength * nx;
                    player.vy -= bounceStrength * ny;
                    meteor.vx += bounceStrength * nx * 0.5; // Meteoriitti kimpoaa vähemmän (enemmän massaa)
                    meteor.vy += bounceStrength * ny * 0.5;

                    // Työnnä objektit erilleen päällekkäisyyden estämiseksi
                    const overlap = collisionDist - dist;
                    const pushDistance = overlap + 2;
                    player.x -= nx * pushDistance * 0.8;
                    player.y -= ny * pushDistance * 0.8;
                    meteor.x += nx * pushDistance * 0.2;
                    meteor.y += ny * pushDistance * 0.2;
                }
            }

            if (destroyed) {
                // Luo iso räjähdys pelaajan sijainnissa
                explosions.push(new Explosion(player.x + 20, player.y + 20, 'large', gameContainer));
                endGame();
                return;
            }
        }
    }

    // Tarkista pelaaja törmäämässä mustiin aukkoihin (kutistuu olemattomiin)
    for (let i = blackHoles.length - 1; i >= 0; i--) {
        const blackHole = blackHoles[i];
        if (distance(player.x + 20, player.y + 20, blackHole.x, blackHole.y) < blackHole.radius + 20) {
            if (!player.isShrinking) {
                player.isShrinking = true;
                player.shrinkProgress = 0;
                player.shrinkDuration = 0.5; // 0.5 sekuntia kutistumiseen

                // Musta aukko kasvaa 1% aluksen nielaistessa
                blackHole.radius *= 1.01;
                blackHole.gravityRadius = blackHole.radius * blackHoleConfig.gravityRadiusMultiplier;
                blackHole.distortionRadius *= 1.01;

                // Päivitä visuaaliset elementit
                blackHole.element.style.width = (blackHole.radius * 2) + 'px';
                blackHole.element.style.height = (blackHole.radius * 2) + 'px';
                blackHole.distortionField.style.width = (blackHole.distortionRadius * 2) + 'px';
                blackHole.distortionField.style.height = (blackHole.distortionRadius * 2) + 'px';
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

                enemy.destroy();
                enemies.splice(i, 1);
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
                }
                break;
            }
        }
    }

    // Tarkista mustat aukot törmäämässä planeettoihin (musta aukko nielaisee planeetan)
    for (let i = blackHoles.length - 1; i >= 0; i--) {
        const blackHole = blackHoles[i];
        for (let j = planets.length - 1; j >= 0; j--) {
            const planet = planets[j];
            if (distance(blackHole.x, blackHole.y, planet.x, planet.y) < blackHole.radius + planet.radius) {
                // Musta aukko nielaisee planeetan - tapahtumahorisontti kasvaa 50%
                blackHole.radius *= 1.5;
                blackHole.gravityRadius = blackHole.radius * blackHoleConfig.gravityRadiusMultiplier;
                blackHole.distortionRadius *= 1.5; // Kasvata myös vääristymäkenttää

                // Päivitä visuaaliset elementit
                blackHole.element.style.width = (blackHole.radius * 2) + 'px';
                blackHole.element.style.height = (blackHole.radius * 2) + 'px';
                blackHole.distortionField.style.width = (blackHole.distortionRadius * 2) + 'px';
                blackHole.distortionField.style.height = (blackHole.distortionRadius * 2) + 'px';

                // Poista planeetta
                planet.destroy();
                planets.splice(j, 1);
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
            if (distance(bullet.x, bullet.y, meteor.x, meteor.y) < meteor.radius + 3) {
                // Laske kimmokkulma törmäysnormaalin perusteella
                const dx = bullet.x - meteor.x;
                const dy = bullet.y - meteor.y;
                const normalLength = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / normalLength;
                const ny = dy / normalLength;

                // Laske heijastunut nopeus: v - 2(v·n)n
                const dotProduct = bullet.vx * nx + bullet.vy * ny;
                bullet.vx = (bullet.vx - 2 * dotProduct * nx);
                bullet.vy = (bullet.vy - 2 * dotProduct * ny);
                hitMeteor = true;
                break;
            }
        }

        // Tarkista törmäys planeettoihin
        if (!hitMeteor) {
            for (let j = planets.length - 1; j >= 0; j--) {
                const planet = planets[j];
                if (distance(bullet.x, bullet.y, planet.x, planet.y) < planet.radius + 3) {
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

    // Tarkista vihollisten ammukset osumassa meteoriitteihin (kimmoa takaisin)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        let hitMeteor = false;

        // Tarkista törmäys meteoriitteihin
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            if (distance(bullet.x, bullet.y, meteor.x, meteor.y) < meteor.radius + 3) {
                // Laske kimmokkulma törmäysnormaalin perusteella
                const dx = bullet.x - meteor.x;
                const dy = bullet.y - meteor.y;
                const normalLength = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / normalLength;
                const ny = dy / normalLength;

                // Laske heijastunut nopeus: v - 2(v·n)n
                const dotProduct = bullet.vx * nx + bullet.vy * ny;
                bullet.vx = (bullet.vx - 2 * dotProduct * nx);
                bullet.vy = (bullet.vy - 2 * dotProduct * ny);
                hitMeteor = true;
                break;
            }
        }

        // Tarkista törmäys planeettoihin
        if (!hitMeteor) {
            for (let j = planets.length - 1; j >= 0; j--) {
                const planet = planets[j];
                if (distance(bullet.x, bullet.y, planet.x, planet.y) < planet.radius + 3) {
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
                const destroyed = enemy.takeDamage(bullet.damage);
                bullet.destroy();
                playerBullets.splice(i, 1);

                if (destroyed) {
                    // Määrittele pisteet vihollisen tyypin perusteella
                    const scoreMap = {
                        'WeakEnemy': 10,
                        'EliteEnemy': 25,
                        'AggressiveEnemy': 30
                    };
                    player.score += scoreMap[enemy.constructor.name] || 10;

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

                    enemy.destroy();
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }

    // Tarkista pelaaja keräämässä terveyspaloja
    for (let i = healthOrbs.length - 1; i >= 0; i--) {
        const orb = healthOrbs[i];
        if (orb.checkCollision(player)) {
            // Palauta terveyttä (ei ylitä maksimia)
            player.health = Math.min(player.health + orb.healthValue, player.maxHealth);

            // Poista pallo
            orb.destroy();
            healthOrbs.splice(i, 1);
        }
    }
}
