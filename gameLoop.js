// Pelin pääsilmukka - päivittää kaiken pelin logiikan joka ruudussa
function gameLoop(currentTime) {
    if (player.gameOver) return;

    // Laske delta-aika sekunteina
    deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    // Rajaa delta-aika estääkseen suuret hypyt (jos ruudunpäivitys pudottaa äkillisesti)
    const dt = Math.min(deltaTime, 0.032); // Max 32ms (~30fps vastaava)

    updatePosition(dt);

    // Päivitä pelaajan kutistuminen
    if (player.isShrinking) {
        player.shrinkProgress += dt / player.shrinkDuration;
        if (player.shrinkProgress >= 1.0) {
            player.health = 0;
            endGame();
            return;
        }
    }

    // Päivitä vaikeustaso pisteiden perusteella
    updateEnemySpawnerLimits(player.score);
    updateMeteorSpawnerLimit(player.score);
    updatePlanetSpawnerLimit(player.score);
    updateNebulaCloudSpawnerLimit(player.score);
    updateBlackHoleSpawnerLimit(player.score);

    // Päivitä vihollisten spawn-ajastimet kaikille vihollistyypeille
    for (const spawner of enemySpawners) {
        spawner.timer += dt * 1000; // Muunna dt millisekunteiksi
        if (spawner.timer >= spawner.nextSpawnTime) {
            spawnEnemy(spawner);
            spawner.timer = 0;
            spawner.nextSpawnTime = Math.random() * (spawner.spawnIntervalMax - spawner.spawnIntervalMin) + spawner.spawnIntervalMin;
        }
    }

    // Päivitä meteoriitin spawn-ajastin
    meteorSpawnTimer += dt * 1000; // Muunna dt millisekunteiksi
    if (meteorSpawnTimer >= meteorSpawnInterval) {
        spawnMeteor();
        meteorSpawnTimer = 0;
    }

    // Päivitä planeetan spawn-ajastin
    planetSpawnTimer += dt * 1000;
    if (planetSpawnTimer >= nextPlanetSpawnTime) {
        spawnPlanet();
        planetSpawnTimer = 0;
    }

    // Päivitä tähtisumun spawn-ajastin
    nebulaCloudSpawnTimer += dt * 1000;
    if (nebulaCloudSpawnTimer >= nebulaCloudSpawnInterval) {
        spawnNebulaCloud();
        nebulaCloudSpawnTimer = 0;
    }

    // Päivitä mustan aukon spawn-ajastin
    blackHoleSpawnTimer += dt * 1000;
    if (blackHoleSpawnTimer >= nextBlackHoleSpawnTime) {
        spawnBlackHole();
        blackHoleSpawnTimer = 0;
    }

    // Päivitä viholliset (kaikki tyypit yhdessä taulukossa)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Päivitä kutistuminen
        if (enemy.isShrinking) {
            enemy.shrinkProgress += dt / enemy.shrinkDuration;
            if (enemy.shrinkProgress >= 1.0) {
                enemy.destroy();
                enemies.splice(i, 1);
                continue;
            }
        }

        enemy.update(enemyBullets, player.x, player.y, dt);
    }

    // Päivitä planeetat
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        planet.update(dt);

        // Käytä painovoimaa pelaajaan
        planet.applyGravity(player, dt);

        // Käytä painovoimaa kaikkiin vihollisiin
        for (let j = 0; j < enemies.length; j++) {
            planet.applyGravity(enemies[j], dt);
        }

        // Käytä painovoimaa pelaajan ammuksiin
        for (let j = 0; j < playerBullets.length; j++) {
            planet.applyGravity(playerBullets[j], dt);
        }

        // Käytä painovoimaa vihollisten ammuksiin
        for (let j = 0; j < enemyBullets.length; j++) {
            planet.applyGravity(enemyBullets[j], dt);
        }

        // Käytä painovoimaa meteoriitteihin
        for (let j = 0; j < meteors.length; j++) {
            planet.applyGravity(meteors[j], dt);
        }

        if (planet.isOffscreen()) {
            planet.destroy();
            planets.splice(i, 1);
        }
    }

    // Päivitä mustat aukot
    for (let i = blackHoles.length - 1; i >= 0; i--) {
        const blackHole = blackHoles[i];
        blackHole.update(dt);

        // Käytä painovoimaa pelaajaan
        blackHole.applyGravity(player, dt);

        // Käytä painovoimaa kaikkiin vihollisiin
        for (let j = 0; j < enemies.length; j++) {
            blackHole.applyGravity(enemies[j], dt);
        }

        // Käytä painovoimaa pelaajan ammuksiin
        for (let j = 0; j < playerBullets.length; j++) {
            blackHole.applyGravity(playerBullets[j], dt);
        }

        // Käytä painovoimaa vihollisten ammuksiin
        for (let j = 0; j < enemyBullets.length; j++) {
            blackHole.applyGravity(enemyBullets[j], dt);
        }

        // Käytä painovoimaa meteoriitteihin
        for (let j = 0; j < meteors.length; j++) {
            blackHole.applyGravity(meteors[j], dt);
        }

        if (blackHole.isOffscreen()) {
            blackHole.destroy();
            blackHoles.splice(i, 1);
        }
    }

    // Päivitä tähtisumut
    for (let i = nebulaClouds.length - 1; i >= 0; i--) {
        const nebulaCloud = nebulaClouds[i];
        nebulaCloud.update(dt);

        // Käytä hidastusta pelaajaan jos tähtisumun sisällä
        if (nebulaCloudConfig.affectsPlayer && nebulaCloud.isObjectInside(player)) {
            nebulaCloud.applySlowdown(player, false, playerConfig.minVelocityInNebula);
        }

        // Käytä hidastusta kaikkiin vihollisiin jos tähtisumun sisällä
        if (nebulaCloudConfig.affectsEnemies) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (nebulaCloud.isObjectInside(enemies[j])) {
                    nebulaCloud.applySlowdown(enemies[j], false, enemyConfig.minVelocityInNebula);
                }
            }
        }

        // Käytä hidastusta pelaajan ammuksiin jos tähtisumun sisällä
        if (nebulaCloudConfig.affectsBullets) {
            for (let j = playerBullets.length - 1; j >= 0; j--) {
                if (nebulaCloud.isObjectInside(playerBullets[j])) {
                    nebulaCloud.applySlowdown(playerBullets[j], true, bulletConfig.playerBullet.minVelocityInNebula);
                }
            }
        }

        // Käytä hidastusta vihollisten ammuksiin jos tähtisumun sisällä
        if (nebulaCloudConfig.affectsBullets) {
            for (let j = enemyBullets.length - 1; j >= 0; j--) {
                if (nebulaCloud.isObjectInside(enemyBullets[j])) {
                    nebulaCloud.applySlowdown(enemyBullets[j], true, bulletConfig.enemyBullet.minVelocityInNebula);
                }
            }
        }

        if (nebulaCloud.isOffscreen()) {
            nebulaCloud.destroy();
            nebulaClouds.splice(i, 1);
        }
    }

    // Päivitä meteoriitit
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];

        // Päivitä kutistuminen
        if (meteor.isShrinking) {
            meteor.shrinkProgress += dt / meteor.shrinkDuration;
            if (meteor.shrinkProgress >= 1.0) {
                meteor.destroy();
                meteors.splice(i, 1);
                continue;
            }
        }

        meteor.update(dt);
        if (meteor.isOffscreen()) {
            meteor.destroy();
            meteors.splice(i, 1);
        }
    }

    // Päivitä pelaajan ammukset
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        playerBullets[i].update(dt);
        if (playerBullets[i].isOffscreen()) {
            playerBullets[i].destroy();
            playerBullets.splice(i, 1);
        }
    }

    // Päivitä vihollisten ammukset
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].update(dt);
        if (enemyBullets[i].isOffscreen()) {
            enemyBullets[i].destroy();
            enemyBullets.splice(i, 1);
        }
    }

    // Päivitä terveyspallot
    for (let i = healthOrbs.length - 1; i >= 0; i--) {
        const expired = healthOrbs[i].update(dt);
        if (expired) {
            healthOrbs[i].destroy();
            healthOrbs.splice(i, 1);
        }
    }

    // Päivitä räjähdykset
    for (let i = explosions.length - 1; i >= 0; i--) {
        const completed = explosions[i].update(dt);
        if (completed) {
            explosions[i].destroy();
            explosions.splice(i, 1);
        }
    }

    checkCollisions();
    render();
    requestAnimationFrame(gameLoop);
}
