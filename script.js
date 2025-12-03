// Delta time tracking for frame-rate independent movement
let lastFrameTime = performance.now();
let deltaTime = 0;

// Pelaajan alus
let player = new Player();

// DOM elements
const spaceship = document.getElementById('spaceship');
const positionDisplay = document.getElementById('position');
const gameContainer = document.querySelector('.game-container');
const healthBar = document.getElementById('healthBar');
const healthText = document.getElementById('healthText');

// Game objects arrays
let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let meteors = [];
let planets = [];
let nebulaClouds = [];
let blackHoles = [];
let healthOrbs = [];

// Enemy spawning configuration
const enemySpawnConfigs = [
    { type: Enemy, spawnIntervalMin: normalEnemyConfig.spawnIntervalMin, spawnIntervalMax: normalEnemyConfig.spawnIntervalMax, maxCount: normalEnemyConfig.maxCount, label: 'regular' },
    { type: EliteEnemy, spawnIntervalMin: eliteEnemyConfig.spawnIntervalMin, spawnIntervalMax: eliteEnemyConfig.spawnIntervalMax, maxCount: eliteEnemyConfig.maxCount, label: 'elite' },
    { type: AggressiveEnemy, spawnIntervalMin: aggressiveEnemyConfig.spawnIntervalMin, spawnIntervalMax: aggressiveEnemyConfig.spawnIntervalMax, maxCount: aggressiveEnemyConfig.maxCount, label: 'aggressive' }
];

const enemySpawners = enemySpawnConfigs.map(config => ({
    ...config,
    timer: 0,
    nextSpawnTime: Math.random() * (config.spawnIntervalMax - config.spawnIntervalMin) + config.spawnIntervalMin
}));

// Meteor spawning
let meteorSpawnTimer = 0;
const meteorSpawnInterval = Math.random() * (meteorConfig.spawnIntervalMax - meteorConfig.spawnIntervalMin) + meteorConfig.spawnIntervalMin;

// Planet spawning
let planetSpawnTimer = 0;
let nextPlanetSpawnTime = Math.random() * (planetConfig.spawnIntervalMax - planetConfig.spawnIntervalMin) + planetConfig.spawnIntervalMin;

// Nebula cloud spawning
let nebulaCloudSpawnTimer = 0;
const nebulaCloudSpawnInterval = Math.random() * (nebulaCloudConfig.spawnIntervalMax - nebulaCloudConfig.spawnIntervalMin) + nebulaCloudConfig.spawnIntervalMin;

// Black hole spawning
let blackHoleSpawnTimer = 0;
let nextBlackHoleSpawnTime = Math.random() * (blackHoleConfig.spawnIntervalMax - blackHoleConfig.spawnIntervalMin) + blackHoleConfig.spawnIntervalMin;

// Input tracking
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
        // Handle game over restart
        if (player.gameOver) {
            restartGame();
            return;
        }
        keys.Space = true;
    } else if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
        keys.Space = false;
        e.preventDefault();
    } else if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
        e.preventDefault();
    }
});

// Update position based on input
function updatePosition(dt) {
    // Päivitä immuniteetti-ajastin
    if (player.isInvulnerable) {
        player.invulnerabilityTimer -= dt;
        if (player.invulnerabilityTimer <= 0) {
            player.isInvulnerable = false;
            player.invulnerabilityTimer = 0;
        }
    }

    // Rotation (scaled by dt for frame-independent speed)
    if (keys.ArrowLeft) {
        player.angle -= playerConfig.rotationSpeed * dt;
    }
    if (keys.ArrowRight) {
        player.angle += playerConfig.rotationSpeed * dt;
    }

    // Movement in the direction the ship is facing with inertia
    // Subtract 90 degrees because clip-path points up, but cos/sin treats 0° as right
    const adjustedAngle = player.angle - 90;
    const radians = (adjustedAngle * Math.PI) / 180;
    const dirX = Math.cos(radians);
    const dirY = Math.sin(radians);
    
    // Acceleration based on input (no automatic deceleration)
    if (keys.ArrowUp) {
        player.vx += dirX * playerConfig.acceleration * dt;
        player.vy += dirY * playerConfig.acceleration * dt;
    }
    if (keys.ArrowDown) {
        player.vx -= dirX * playerConfig.acceleration * dt;
        player.vy -= dirY * playerConfig.acceleration * dt;
    }
    
    // Limit maximum speed
    const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    if (speed > playerConfig.maxSpeed) {
        const scale = playerConfig.maxSpeed / speed;
        player.vx *= scale;
        player.vy *= scale;
    }
    
    // Update position based on velocity
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Boundary wrapping
    if (player.x < -40) player.x = 1200;
    if (player.x > 1200) player.x = -40;
    if (player.y < -40) player.y = 900;
    if (player.y > 900) player.y = -40;

    if (keys.Space) {
        playerBullets.push(new Bullet(gameContainer, player.x, player.y, player.angle, 'player'));
        keys.Space = false;
    }
}

function spawnEnemy(spawner) {
    // Count existing enemies of this type
    const typeCount = enemies.filter(e => e.constructor.name === spawner.type.name).length;
    if (typeCount < spawner.maxCount) {
        enemies.push(new spawner.type(gameContainer));
    }
}

function spawnMeteor() {
    const tier = getCurrentGameplayTier(player.score);
    if (meteors.length < tier.maxMeteors) {
        meteors.push(new Meteor(gameContainer));
        meteorSpawnTimer = 0;
    }
}

function spawnPlanet() {
    const tier = getCurrentGameplayTier(player.score);
    if (planets.length < tier.maxPlanets) {
        planets.push(new Planet(gameContainer));
        planetSpawnTimer = 0;
        nextPlanetSpawnTime = Math.random() * (planetConfig.spawnIntervalMax - planetConfig.spawnIntervalMin) + planetConfig.spawnIntervalMin;
    }
}

function spawnNebulaCloud() {
    const tier = getCurrentGameplayTier(player.score);
    if (nebulaClouds.length < tier.maxNebulaClouds) {
        nebulaClouds.push(new NebulaCloud(gameContainer));
        nebulaCloudSpawnTimer = 0;
    }
}

function spawnBlackHole() {
    const tier = getCurrentGameplayTier(player.score);
    if (blackHoles.length < tier.maxBlackHoles) {
        blackHoles.push(new BlackHole(gameContainer));
        blackHoleSpawnTimer = 0;
        nextBlackHoleSpawnTime = Math.random() * (blackHoleConfig.spawnIntervalMax - blackHoleConfig.spawnIntervalMin) + blackHoleConfig.spawnIntervalMin;
    }
}

// Spawn health orb when enemy is destroyed
function spawnHealthOrb(enemy) {
    // Determine health value based on enemy type
    const healthValueMap = {
        'Enemy': 10,
        'EliteEnemy': 20,
        'AggressiveEnemy': 50
    };
    const healthValue = healthValueMap[enemy.constructor.name] || 10;

    // Create health orb at enemy's position
    const orb = new HealthOrb(enemy.x + 20, enemy.y + 20, healthValue, gameContainer);
    healthOrbs.push(orb);
}

// Update health bar display
function updateHealthBar() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthBar.style.width = healthPercent + '%';
    healthText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;

    // Update health bar color based on health percentage
    healthBar.classList.remove('low', 'critical');
    if (healthPercent <= 33) {
        healthBar.classList.add('critical');
    } else if (healthPercent <= 66) {
        healthBar.classList.add('low');
    }
}

// Render spaceship and UI
function render() {
    spaceship.style.left = player.x + 'px';
    spaceship.style.top = player.y + 'px';
    spaceship.style.transform = `rotate(${player.angle}deg)`;
    positionDisplay.textContent = `Score: ${player.score}`;

    // Update invulnerability visual effect
    if (player.isInvulnerable) {
        spaceship.classList.add('invulnerable');
    } else {
        spaceship.classList.remove('invulnerable');
    }

    updateHealthBar();
}

function endGame() {
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over';
    gameOverDiv.innerHTML = `GAME OVER<br>Final Score: ${player.score}<br><br><span style="font-size: 18px;">Press SPACE to play again</span>`;
    gameContainer.appendChild(gameOverDiv);
    // Stop the game loop by setting a flag
    player.gameOver = true;
}

function restartGame() {
    // Remove game over screen first
    const gameOverScreen = document.querySelector('.game-over');
    if (gameOverScreen) {
        gameOverScreen.remove();
    }

    // Clear all bullets and enemies from DOM
    playerBullets.forEach(bullet => bullet.destroy());
    enemyBullets.forEach(bullet => bullet.destroy());
    enemies.forEach(enemy => enemy.destroy());
    meteors.forEach(meteor => meteor.destroy());
    planets.forEach(planet => planet.destroy());
    blackHoles.forEach(blackHole => blackHole.destroy());
    healthOrbs.forEach(orb => orb.destroy());
    nebulaClouds.forEach(cloud => cloud.destroy());

    // Reset game state
    player.x = 580;
    player.y = 430;
    player.score = 0;
    player.gameOver = false;
    player.angle = 0;
    player.vx = 0;
    player.vy = 0;
    player.resetHealth();

    // Reset all keys
    keys.ArrowUp = false;
    keys.ArrowDown = false;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.Space = false;

    // Clear arrays
    playerBullets = [];
    enemyBullets = [];
    enemies = [];
    meteors = [];
    planets = [];
    nebulaClouds = [];
    blackHoles = [];
    healthOrbs = [];
    
    // Reset spawn timers
    for (const spawner of enemySpawners) {
        spawner.timer = 0;
        spawner.nextSpawnTime = Math.random() * (spawner.spawnIntervalMax - spawner.spawnIntervalMin) + spawner.spawnIntervalMin;
    }
    meteorSpawnTimer = 0;
    planetSpawnTimer = 0;
    nextPlanetSpawnTime = Math.random() * (planetConfig.spawnIntervalMax - planetConfig.spawnIntervalMin) + planetConfig.spawnIntervalMin;
    nebulaCloudSpawnTimer = 0;
    blackHoleSpawnTimer = 0;
    nextBlackHoleSpawnTime = Math.random() * (blackHoleConfig.spawnIntervalMax - blackHoleConfig.spawnIntervalMin) + blackHoleConfig.spawnIntervalMin;

    // Reset spaceship position and render
    spaceship.style.left = player.x + 'px';
    spaceship.style.top = player.y + 'px';
    spaceship.style.transform = `rotate(${player.angle}deg)`;
    positionDisplay.textContent = `Score: ${player.score}`;

    // Spawn new enemies
    for (let i = 0; i < 1; i++) {
        spawnEnemy(enemySpawners[0]); // Spawn regular enemies initially
    }

    // Restart game loop
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Start the game
for (let i = 0; i < 1; i++) {
    spawnEnemy(enemySpawners[0]); // Spawn regular enemies initially
}
// Initialize lastFrameTime before first gameLoop call
lastFrameTime = performance.now();
requestAnimationFrame(gameLoop);
