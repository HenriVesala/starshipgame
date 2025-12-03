// Gameplay progression rules
// Defines how the game difficulty scales with score

const gameplayProgression = {
    // Score: 0 points
    // 1 basic enemy max, no meteors, 1 planet, no nebula clouds, 1 black hole
    tier0: {
        minScore: 0,
        maxBasicEnemies: 1,
        maxEliteEnemies: 0,
        maxAggressiveEnemies: 0,
        maxTotalEnemies: 1,
        maxMeteors: 0,
        maxPlanets: 1,
        maxNebulaClouds: 1,
        maxBlackHoles: 1,
        description: "Starting tier - 1 basic enemy, 1 planet, 1 black hole"
    },

    // Score: 30 points
    // 1 meteor starts appearing
    tier1: {
        minScore: 30,
        maxBasicEnemies: 1,
        maxEliteEnemies: 0,
        maxAggressiveEnemies: 0,
        maxTotalEnemies: 1,
        maxMeteors: 1,
        maxPlanets: 1,
        maxNebulaClouds: 1,
        maxBlackHoles: 1,
        description: "30 points - 1 meteor spawns"
    },

    // Score: 50 points
    // 2 basic enemies max
    tier2: {
        minScore: 50,
        maxBasicEnemies: 2,
        maxEliteEnemies: 0,
        maxAggressiveEnemies: 0,
        maxTotalEnemies: 2,
        maxMeteors: 1,
        maxPlanets: 1,
        maxNebulaClouds: 1,
        maxBlackHoles: 1,
        description: "50 points - 2 basic enemies allowed"
    },

    // Score: 80 points
    // 2 basic + 1 elite max
    tier3: {
        minScore: 80,
        maxBasicEnemies: 2,
        maxEliteEnemies: 1,
        maxAggressiveEnemies: 0,
        maxTotalEnemies: 3,
        maxMeteors: 1,
        maxPlanets: 1,
        maxNebulaClouds: 1,
        maxBlackHoles: 1,
        description: "80 points - elite enemies appear"
    },

    // Score: 100 points
    // 3 total enemies (mix of basic and elite)
    tier4: {
        minScore: 100,
        maxBasicEnemies: 2,
        maxEliteEnemies: 1,
        maxAggressiveEnemies: 0,
        maxTotalEnemies: 3,
        maxMeteors: 1,
        maxPlanets: 1,
        maxNebulaClouds: 1,
        maxBlackHoles: 1,
        description: "100 points - up to 3 enemies"
    },

    // Score: 120 points
    // 3 total + aggressive enemies allowed
    tier5: {
        minScore: 120,
        maxBasicEnemies: 2,
        maxEliteEnemies: 1,
        maxAggressiveEnemies: 1,
        maxTotalEnemies: 4,
        maxMeteors: 1,
        maxPlanets: 1,
        maxNebulaClouds: 1,
        maxBlackHoles: 1,
        description: "120 points - aggressive enemies appear"
    },

    // Score: 130 points
    // 2 meteors max, 1 nebula cloud appears
    tier6: {
        minScore: 130,
        maxBasicEnemies: 2,
        maxEliteEnemies: 1,
        maxAggressiveEnemies: 1,
        maxTotalEnemies: 4,
        maxMeteors: 2,
        maxPlanets: 1,
        maxNebulaClouds: 1,
        maxBlackHoles: 1,
        description: "130 points - 2 meteors spawn, nebula clouds appear"
    },

    // Score: 200+ points
    // No limits on enemies or meteors
    tier7: {
        minScore: 200,
        maxBasicEnemies: 10,
        maxEliteEnemies: 5,
        maxAggressiveEnemies: 5,
        maxTotalEnemies: 10,
        maxMeteors: 3,
        maxPlanets: 1,
        maxNebulaClouds: 1,
        maxBlackHoles: 1,
        description: "200+ points - no limits"
    }
};

/**
 * Get the current gameplay tier based on score
 * @param {number} score - Current game score
 * @returns {object} The appropriate tier configuration
 */
function getCurrentGameplayTier(score) {
    if (score >= 200) return gameplayProgression.tier7;
    if (score >= 130) return gameplayProgression.tier6;
    if (score >= 120) return gameplayProgression.tier5;
    if (score >= 100) return gameplayProgression.tier4;
    if (score >= 80) return gameplayProgression.tier3;
    if (score >= 50) return gameplayProgression.tier2;
    if (score >= 30) return gameplayProgression.tier1;
    return gameplayProgression.tier0;
}

/**
 * Update enemy spawn limits based on current score
 * Called from gameLoop to adjust difficulty
 * @param {number} currentScore - Current game score
 */
function updateEnemySpawnerLimits(currentScore) {
    const tier = getCurrentGameplayTier(currentScore);
    
    // Find and update spawners with new limits
    for (const spawner of enemySpawners) {
        switch(spawner.label) {
            case 'regular':
                spawner.maxCount = tier.maxBasicEnemies;
                break;
            case 'elite':
                spawner.maxCount = tier.maxEliteEnemies;
                break;
            case 'aggressive':
                spawner.maxCount = tier.maxAggressiveEnemies;
                break;
        }
    }
}

/**
 * Update meteor spawn limit based on current score
 * Called from gameLoop to adjust meteor difficulty
 * @param {number} currentScore - Current game score
 */
function updateMeteorSpawnerLimit(currentScore) {
    const tier = getCurrentGameplayTier(currentScore);
    
    // If we exceed max meteor count, remove extra meteors
    if (meteors.length > tier.maxMeteors) {
        while (meteors.length > tier.maxMeteors) {
            const meteor = meteors.pop();
            meteor.destroy();
        }
    }
}

/**
 * Update planet spawn limit based on current score
 * Called from gameLoop to adjust planet difficulty
 * @param {number} currentScore - Current game score
 */
function updatePlanetSpawnerLimit(currentScore) {
    const tier = getCurrentGameplayTier(currentScore);
    
    // If we exceed max planet count, remove extra planets
    if (planets.length > tier.maxPlanets) {
        while (planets.length > tier.maxPlanets) {
            const planet = planets.pop();
            planet.destroy();
        }
    }
}

/**
 * Update nebula cloud spawn limit based on current score
 * Called from gameLoop to adjust nebula cloud difficulty
 * @param {number} currentScore - Current game score
 */
function updateNebulaCloudSpawnerLimit(currentScore) {
    const tier = getCurrentGameplayTier(currentScore);

    // If we exceed max nebula cloud count, remove extra clouds
    if (nebulaClouds.length > tier.maxNebulaClouds) {
        while (nebulaClouds.length > tier.maxNebulaClouds) {
            const nebulaCloud = nebulaClouds.pop();
            nebulaCloud.destroy();
        }
    }
}

/**
 * Update black hole spawn limit based on current score
 * Called from gameLoop to adjust black hole difficulty
 * @param {number} currentScore - Current game score
 */
function updateBlackHoleSpawnerLimit(currentScore) {
    const tier = getCurrentGameplayTier(currentScore);

    // If we exceed max black hole count, remove extra black holes
    if (blackHoles.length > tier.maxBlackHoles) {
        while (blackHoles.length > tier.maxBlackHoles) {
            const blackHole = blackHoles.pop();
            blackHole.destroy();
        }
    }
}
