// Spawn health orb when enemy is destroyed
function spawnHealthOrb(enemy) {
    // Determine health value based on enemy type
    const healthValueMap = {
        'WeakEnemy': 10,
        'EliteEnemy': 20,
        'AggressiveEnemy': 50,
        'MissileEnemy': 30
    };
    const healthValue = healthValueMap[enemy.constructor.name] || 10;

    // Create health orb at enemy's position
    const orb = new HealthOrb(enemy.x + 20, enemy.y + 20, healthValue, gameContainer);
    healthOrbs.push(orb);
}

// Spawn rate of fire boost when enemy is destroyed (based on probability)
function spawnRateOfFireBoost(enemy) {
    // Get enemy config to check drop chance
    const configMap = {
        'WeakEnemy': weakEnemyConfig,
        'EliteEnemy': eliteEnemyConfig,
        'AggressiveEnemy': aggressiveEnemyConfig,
        'MissileEnemy': missileEnemyConfig
    };
    const config = configMap[enemy.constructor.name];

    if (!config) return;

    // Check if rate of fire boost should drop based on probability
    if (Math.random() < config.rateOfFireBoostDropChance) {
        // Create rate of fire boost at enemy's position
        const boost = new RateOfFireBoost(enemy.x + 20, enemy.y + 20, gameContainer);
        rateOfFireBoosts.push(boost);
    }
}
