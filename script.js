// Delta time tracking for frame-rate independent movement
let lastFrameTime = performance.now();
let deltaTime = 0;

// Pelaajan alus
let player = new Player();

// DOM elements
const spaceship = document.getElementById('spaceship');
const positionDisplay = document.getElementById('position');
const gameContainer = document.querySelector('.game-container');

// Game objects arrays
let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let meteors = [];
let planets = [];
let nebulaClouds = [];

// Enemy spawning configuration
const enemySpawnConfigs = [
    { type: Enemy, timerMin: 3000, timerMax: 8000, maxCount: 3, label: 'regular' },
    { type: EliteEnemy, timerMin: 10000, timerMax: 20000, maxCount: 2, label: 'elite' },
    { type: AggressiveEnemy, timerMin: 12000, timerMax: 25000, maxCount: 2, label: 'aggressive' }
];

const enemySpawners = enemySpawnConfigs.map(config => ({
    ...config,
    timer: 0,
    nextSpawnTime: Math.random() * (config.timerMax - config.timerMin) + config.timerMin
}));

// Meteor spawning
let meteorSpawnTimer = 0;
const meteorSpawnInterval = Math.random() * 5000 + 5000; // 5-10 seconds in ms

// Planet spawning
let planetSpawnTimer = 0;
const planetSpawnIntervalMin = 15000; // 15 seconds
const planetSpawnIntervalMax = 25000; // 25 seconds
let nextPlanetSpawnTime = Math.random() * (planetSpawnIntervalMax - planetSpawnIntervalMin) + planetSpawnIntervalMin;

// Nebula cloud spawning
let nebulaCloudSpawnTimer = 0;
const nebulaCloudSpawnInterval = Math.random() * 8000 + 12000; // 12-20 seconds in ms

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

// Collision detection
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function checkCollisions() {
    // Check enemy bullets hitting player
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (distance(player.x + 20, player.y + 20, bullet.x, bullet.y) < 30) {
            endGame();
            return;
        }
    }

    // Check player colliding with enemies (all types)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (distance(player.x + 20, player.y + 20, enemy.x + 20, enemy.y + 20) < 40) {
            endGame();
            return;
        }
    }

    // Check player colliding with planets
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        if (distance(player.x + 20, player.y + 20, planet.x, planet.y) < planet.radius + 20) {
            endGame();
            return;
        }
    }

    // Check player colliding with meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        if (distance(player.x + 20, player.y + 20, meteor.x, meteor.y) < meteor.radius + 20) {
            endGame();
            return;
        }
    }

    // Check meteors colliding with each other
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor1 = meteors[i];
        for (let j = i - 1; j >= 0; j--) {
            const meteor2 = meteors[j];
            if (distance(meteor1.x, meteor1.y, meteor2.x, meteor2.y) < meteor1.radius + meteor2.radius) {
                // Calculate collision normal
                const dx = meteor2.x - meteor1.x;
                const dy = meteor2.y - meteor1.y;
                const normalLength = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / normalLength;
                const ny = dy / normalLength;

                // Reflect both meteorites
                // Meteor 1 reflection
                const dotProduct1 = meteor1.vx * nx + meteor1.vy * ny;
                meteor1.vx = meteor1.vx - 2 * dotProduct1 * nx;
                meteor1.vy = meteor1.vy - 2 * dotProduct1 * ny;

                // Meteor 2 reflection (opposite direction)
                const dotProduct2 = meteor2.vx * nx + meteor2.vy * ny;
                meteor2.vx = meteor2.vx - 2 * dotProduct2 * nx;
                meteor2.vy = meteor2.vy - 2 * dotProduct2 * ny;

                // Push meteors apart to prevent overlap
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

    // Check enemies colliding with meteors (all types)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            if (distance(enemy.x + 20, enemy.y + 20, meteor.x, meteor.y) < meteor.radius + 20) {
                enemy.destroy();
                enemies.splice(i, 1);
                break;
            }
        }
    }

    // Check enemies colliding with planets (all types)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = planets.length - 1; j >= 0; j--) {
            const planet = planets[j];
            if (distance(enemy.x + 20, enemy.y + 20, planet.x, planet.y) < planet.radius + 20) {
                enemy.destroy();
                enemies.splice(i, 1);
                break;
            }
        }
    }

    // Check meteors colliding with planets (bounce back)
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        for (let j = planets.length - 1; j >= 0; j--) {
            const planet = planets[j];
            if (distance(meteor.x, meteor.y, planet.x, planet.y) < meteor.radius + planet.radius) {
                // Calculate bounce angle based on collision normal
                const dx = meteor.x - planet.x;
                const dy = meteor.y - planet.y;
                const normalLength = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / normalLength;
                const ny = dy / normalLength;

                // Calculate reflected velocity: v - 2(v·n)n
                const dotProduct = meteor.vx * nx + meteor.vy * ny;
                let reflectedVx = (meteor.vx - 2 * dotProduct * nx);
                let reflectedVy = (meteor.vy - 2 * dotProduct * ny);

                // Ensure meteor speed is high enough to escape gravity
                // Planet gravity strength is 0.3, so we need speed that overcomes this
                const speed = Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy);
                const minEscapeSpeed = planet.gravityStrength * 2.5; // 2.5x stronger than gravity pull
                
                if (speed < minEscapeSpeed) {
                    // Boost the velocity to escape speed
                    const speedMultiplier = minEscapeSpeed / speed;
                    reflectedVx *= speedMultiplier;
                    reflectedVy *= speedMultiplier;
                }

                meteor.vx = reflectedVx;
                meteor.vy = reflectedVy;

                // Push meteor away from planet to prevent overlap
                const overlap = meteor.radius + planet.radius - normalLength;
                meteor.x += nx * (overlap + 2);
                meteor.y += ny * (overlap + 2);
                break;
            }
        }
    }

    // Check player bullets hitting meteors (bounce back)
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        let hitMeteor = false;
        
        // Check collision with meteors
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            if (distance(bullet.x, bullet.y, meteor.x, meteor.y) < meteor.radius + 3) {
                // Calculate bounce angle based on collision normal
                const dx = bullet.x - meteor.x;
                const dy = bullet.y - meteor.y;
                const normalLength = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / normalLength;
                const ny = dy / normalLength;

                // Calculate reflected velocity: v - 2(v·n)n
                const dotProduct = bullet.vx * nx + bullet.vy * ny;
                bullet.vx = (bullet.vx - 2 * dotProduct * nx);
                bullet.vy = (bullet.vy - 2 * dotProduct * ny);
                hitMeteor = true;
                break;
            }
        }

        // Check collision with planets
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
    }

    // Check enemy bullets hitting meteors (bounce back)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        let hitMeteor = false;
        
        // Check collision with meteors
        for (let j = meteors.length - 1; j >= 0; j--) {
            const meteor = meteors[j];
            if (distance(bullet.x, bullet.y, meteor.x, meteor.y) < meteor.radius + 3) {
                // Calculate bounce angle based on collision normal
                const dx = bullet.x - meteor.x;
                const dy = bullet.y - meteor.y;
                const normalLength = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / normalLength;
                const ny = dy / normalLength;

                // Calculate reflected velocity: v - 2(v·n)n
                const dotProduct = bullet.vx * nx + bullet.vy * ny;
                bullet.vx = (bullet.vx - 2 * dotProduct * nx);
                bullet.vy = (bullet.vy - 2 * dotProduct * ny);
                hitMeteor = true;
                break;
            }
        }

        // Check collision with planets
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
    }

    // Check player bullets hitting enemies (all types)
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (distance(enemy.x + 20, enemy.y + 20, bullet.x, bullet.y) < 40) {
                // Determine score based on enemy type
                const scoreMap = {
                    'Enemy': 10,
                    'EliteEnemy': 25,
                    'AggressiveEnemy': 30
                };
                player.score += scoreMap[enemy.constructor.name] || 10;
                enemy.destroy();
                enemies.splice(j, 1);
                bullet.destroy();
                playerBullets.splice(i, 1);
                break;
            }
        }
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
        nextPlanetSpawnTime = Math.random() * (planetSpawnIntervalMax - planetSpawnIntervalMin) + planetSpawnIntervalMin;
    }
}

function spawnNebulaCloud() {
    const tier = getCurrentGameplayTier(player.score);
    if (nebulaClouds.length < tier.maxNebulaClouds) {
        nebulaClouds.push(new NebulaCloud(gameContainer));
        nebulaCloudSpawnTimer = 0;
    }
}

// Render spaceship and UI
function render() {
    spaceship.style.left = player.x + 'px';
    spaceship.style.top = player.y + 'px';
    spaceship.style.transform = `rotate(${player.angle}deg)`;
    positionDisplay.textContent = `Score: ${player.score}`;
}

// Game loop
function gameLoop(currentTime) {
    if (player.gameOver) return;

    // Calculate delta time in seconds
    deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    
    // Cap delta time to prevent huge jumps (if frame drops spike)
    const dt = Math.min(deltaTime, 0.032); // Max 32ms (~30fps equivalent)

    updatePosition(dt);

    // Update difficulty based on score
    updateEnemySpawnerLimits(player.score);
    updateMeteorSpawnerLimit(player.score);
    updatePlanetSpawnerLimit(player.score);
    updateNebulaCloudSpawnerLimit(player.score);

    // Update enemy spawn timers for all enemy types
    for (const spawner of enemySpawners) {
        spawner.timer += dt * 1000; // Convert dt to ms
        if (spawner.timer >= spawner.nextSpawnTime) {
            spawnEnemy(spawner);
            spawner.timer = 0;
            spawner.nextSpawnTime = Math.random() * (spawner.timerMax - spawner.timerMin) + spawner.timerMin;
        }
    }

    // Update meteor spawn timer
    meteorSpawnTimer += dt * 1000; // Convert dt to ms
    if (meteorSpawnTimer >= meteorSpawnInterval) {
        spawnMeteor();
        meteorSpawnTimer = 0;
    }

    // Update planet spawn timer
    planetSpawnTimer += dt * 1000;
    if (planetSpawnTimer >= nextPlanetSpawnTime) {
        spawnPlanet();
        planetSpawnTimer = 0;
    }

    // Update nebula cloud spawn timer
    nebulaCloudSpawnTimer += dt * 1000;
    if (nebulaCloudSpawnTimer >= nebulaCloudSpawnInterval) {
        spawnNebulaCloud();
        nebulaCloudSpawnTimer = 0;
    }

    // Update enemies (all types in single array)
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update(enemyBullets, player.x, player.y, dt);
    }

    // Update planets
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        planet.update(dt);
        
        // Apply gravity to player
        planet.applyGravity(player, dt);
        
        // Apply gravity to all enemies
        for (let j = 0; j < enemies.length; j++) {
            planet.applyGravity(enemies[j], dt);
        }
        
        // Apply gravity to player bullets
        for (let j = 0; j < playerBullets.length; j++) {
            planet.applyGravity(playerBullets[j], dt);
        }
        
        // Apply gravity to enemy bullets
        for (let j = 0; j < enemyBullets.length; j++) {
            planet.applyGravity(enemyBullets[j], dt);
        }
        
        // Apply gravity to meteors
        for (let j = 0; j < meteors.length; j++) {
            planet.applyGravity(meteors[j], dt);
        }

        if (planet.isOffscreen()) {
            planet.destroy();
            planets.splice(i, 1);
        }
    }

    // Update nebula clouds
    for (let i = nebulaClouds.length - 1; i >= 0; i--) {
        const nebulaCloud = nebulaClouds[i];
        nebulaCloud.update(dt);
        
        // Apply slowdown to player if inside nebula cloud
        if (nebulaCloudConfig.affectsPlayer && nebulaCloud.isObjectInside(player)) {
            nebulaCloud.applySlowdown(player, false, playerConfig.minVelocityInNebula);
        }
        
        // Apply slowdown to all enemies if inside nebula cloud
        if (nebulaCloudConfig.affectsEnemies) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (nebulaCloud.isObjectInside(enemies[j])) {
                    nebulaCloud.applySlowdown(enemies[j], false, enemyConfig.minVelocityInNebula);
                }
            }
        }
        
        // Apply slowdown to player bullets if inside nebula cloud
        if (nebulaCloudConfig.affectsBullets) {
            for (let j = playerBullets.length - 1; j >= 0; j--) {
                if (nebulaCloud.isObjectInside(playerBullets[j])) {
                    nebulaCloud.applySlowdown(playerBullets[j], true, bulletConfig.playerBullet.minVelocityInNebula);
                }
            }
        }
        
        // Apply slowdown to enemy bullets if inside nebula cloud
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

    // Update meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
        meteors[i].update(dt);
        if (meteors[i].isOffscreen()) {
            meteors[i].destroy();
            meteors.splice(i, 1);
        }
    }

    // Update player bullets
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        playerBullets[i].update(dt);
        if (playerBullets[i].isOffscreen()) {
            playerBullets[i].destroy();
            playerBullets.splice(i, 1);
        }
    }

    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].update(dt);
        if (enemyBullets[i].isOffscreen()) {
            enemyBullets[i].destroy();
            enemyBullets.splice(i, 1);
        }
    }

    checkCollisions();
    render();
    requestAnimationFrame(gameLoop);
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

    // Reset game state
    player.x = 580;
    player.y = 430;
    player.score = 0;
    player.gameOver = false;
    player.angle = 0;
    player.vx = 0;
    player.vy = 0;

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
    
    // Reset spawn timers
    for (const spawner of enemySpawners) {
        spawner.timer = 0;
        spawner.nextSpawnTime = Math.random() * (spawner.timerMax - spawner.timerMin) + spawner.timerMin;
    }
    meteorSpawnTimer = 0;
    planetSpawnTimer = 0;
    nextPlanetSpawnTime = Math.random() * (planetSpawnIntervalMax - planetSpawnIntervalMin) + planetSpawnIntervalMin;
    nebulaCloudSpawnTimer = 0;

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
