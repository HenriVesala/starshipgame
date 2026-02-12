// Game States
const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

let currentGameState = GameState.MENU;

// Delta time tracking for frame-rate independent movement
let lastFrameTime = performance.now();
let deltaTime = 0;

// Pelaajan alus
let player = null;

// DOM elements
const spaceship = document.getElementById('spaceship');
const positionDisplay = document.getElementById('position');
const gameContainer = document.querySelector('.game-container');
const healthBar = document.getElementById('healthBar');
const healthText = document.getElementById('healthText');

// Pelaajan liekki-elementit
const playerFlameMain = spaceship.querySelector('.ship-flame-main');
const playerFlameLeft = spaceship.querySelector('.ship-flame-left');
const playerFlameRight = spaceship.querySelector('.ship-flame-right');

// Game objects arrays
let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let meteors = [];
let planets = [];
let nebulaClouds = [];
let blackHoles = [];
let healthOrbs = [];
let rateOfFireBoosts = [];
let explosions = [];
let playerMissiles = [];
let enemyMissiles = [];

// Enemy spawning configuration
const enemySpawnConfigs = [
    { type: WeakEnemy, spawnIntervalMin: weakEnemyConfig.spawnIntervalMin, spawnIntervalMax: weakEnemyConfig.spawnIntervalMax, maxCount: weakEnemyConfig.maxCount, label: 'regular' },
    { type: EliteEnemy, spawnIntervalMin: eliteEnemyConfig.spawnIntervalMin, spawnIntervalMax: eliteEnemyConfig.spawnIntervalMax, maxCount: eliteEnemyConfig.maxCount, label: 'elite' },
    { type: AggressiveEnemy, spawnIntervalMin: aggressiveEnemyConfig.spawnIntervalMin, spawnIntervalMax: aggressiveEnemyConfig.spawnIntervalMax, maxCount: aggressiveEnemyConfig.maxCount, label: 'aggressive' },
    { type: MissileEnemy, spawnIntervalMin: missileEnemyConfig.spawnIntervalMin, spawnIntervalMax: missileEnemyConfig.spawnIntervalMax, maxCount: missileEnemyConfig.maxCount, label: 'missile' }
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
    // Don't update if player doesn't exist or game is not playing
    if (!player || currentGameState !== GameState.PLAYING) {
        return;
    }

    // Jos pelaaja kutistuu, älä anna liikkua tai ampua
    if (player.isShrinking) {
        player.thrustState = 'none';
        return;
    }

    // Päivitä immuniteetti-ajastin
    if (player.isInvulnerable) {
        player.invulnerabilityTimer -= dt;
        if (player.invulnerabilityTimer <= 0) {
            player.isInvulnerable = false;
            player.invulnerabilityTimer = 0;
        }
    }

    // Päivitä ampumisen cooldown-ajastin
    if (player.shootCooldownTimer > 0) {
        player.shootCooldownTimer -= dt;
        if (player.shootCooldownTimer < 0) {
            player.shootCooldownTimer = 0;
        }
    }

    // Päivitä vahinkoválähdys-ajastin
    player.updateDamageFlash(dt);

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
    const nebulaAccelMult = player.inNebula ? 0.5 : 1.0;
    if (keys.ArrowUp) {
        player.vx += dirX * playerConfig.accelerationForward * nebulaAccelMult * dt;
        player.vy += dirY * playerConfig.accelerationForward * nebulaAccelMult * dt;
    }
    if (keys.ArrowDown) {
        player.vx -= dirX * playerConfig.accelerationReverse * nebulaAccelMult * dt;
        player.vy -= dirY * playerConfig.accelerationReverse * nebulaAccelMult * dt;
    }

    // Aseta kiihtyvyystila liekkejä varten
    if (keys.ArrowUp && !keys.ArrowDown) {
        player.thrustState = 'forward';
    } else if (keys.ArrowDown && !keys.ArrowUp) {
        player.thrustState = 'reverse';
    } else {
        player.thrustState = 'none';
    }
    
    // Rajoita maksiminopeus
    player.capSpeed();
    
    // Update position based on velocity
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Boundary wrapping
    if (player.x < -playerConfig.width) player.x = gameConfig.screenWidth;
    if (player.x > gameConfig.screenWidth) player.x = -playerConfig.width;
    if (player.y < -playerConfig.height) player.y = gameConfig.screenHeight;
    if (player.y > gameConfig.screenHeight) player.y = -playerConfig.height;

    if (keys.Space && player.canShoot()) {
        // Laske ammuksen/ohjuksen aloituspaikka aluksen keskipisteestä
        const halfShipSize = playerConfig.width / 2;

        // Laske offset eteenpäin aluksen suunnan mukaan
        const adjustedAngle = player.angle - 90;
        const radians = (adjustedAngle * Math.PI) / 180;
        const forwardOffset = 20; // Kuinka kaukana keskipisteestä eteen
        const spawnX = player.x + halfShipSize + Math.cos(radians) * forwardOffset;
        const spawnY = player.y + halfShipSize + Math.sin(radians) * forwardOffset;

        if (player.weapon === 'missile') {
            playerMissiles.push(new Missile(gameContainer, spawnX, spawnY, player.angle, 'player', player.vx, player.vy));
        } else {
            // 'bullet' tai muu oletusase
            playerBullets.push(new Bullet(gameContainer, spawnX, spawnY, player.angle, 'player', player.vx, player.vy));
        }
        player.setShootCooldown();
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
    // Don't render if player doesn't exist
    if (!player) {
        return;
    }

    spaceship.style.left = player.x + 'px';
    spaceship.style.top = player.y + 'px';

    // Lisää kutistumisanimaatio
    if (player.isShrinking) {
        const scale = 1 - player.shrinkProgress;
        spaceship.style.transform = `rotate(${player.angle}deg) scale(${scale})`;
    } else {
        spaceship.style.transform = `rotate(${player.angle}deg)`;
    }

    positionDisplay.textContent = `Score: ${player.score}`;

    // Update invulnerability visual effect
    if (player.isInvulnerable) {
        spaceship.classList.add('invulnerable');
    } else {
        spaceship.classList.remove('invulnerable');
    }

    // Update damage flash visual effect
    if (player.damageFlashTimer > 0) {
        spaceship.classList.add('damage-flash');
    } else {
        spaceship.classList.remove('damage-flash');
    }

    // Päivitä kiihtyvyysliekit
    if (player.thrustState === 'forward') {
        playerFlameMain.classList.add('active');
        playerFlameLeft.classList.remove('active');
        playerFlameRight.classList.remove('active');
    } else if (player.thrustState === 'reverse') {
        playerFlameMain.classList.remove('active');
        playerFlameLeft.classList.add('active');
        playerFlameRight.classList.add('active');
    } else {
        playerFlameMain.classList.remove('active');
        playerFlameLeft.classList.remove('active');
        playerFlameRight.classList.remove('active');
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
    currentGameState = GameState.GAME_OVER;
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
    rateOfFireBoosts.forEach(boost => boost.destroy());
    nebulaClouds.forEach(cloud => cloud.destroy());
    explosions.forEach(explosion => explosion.destroy());
    playerMissiles.forEach(m => m.destroy());
    enemyMissiles.forEach(m => m.destroy());

    // Start the game from the beginning
    startGame();
}

// Start game function - transitions from MENU to PLAYING state
function startGame() {
    currentGameState = GameState.PLAYING;

    // Hide menu
    const menuScreen = document.getElementById('menuScreen');
    menuScreen.classList.add('hidden');

    // Initialize player
    player = new Player();

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

    // Clear all arrays
    playerBullets = [];
    enemyBullets = [];
    enemies = [];
    meteors = [];
    planets = [];
    nebulaClouds = [];
    blackHoles = [];
    healthOrbs = [];
    rateOfFireBoosts = [];
    explosions = [];
    playerMissiles = [];
    enemyMissiles = [];

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

    // Spawn initial enemies
    for (let i = 0; i < 1; i++) {
        spawnEnemy(enemySpawners[0]);
    }
}

// Menu button event listener
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', startGame);
});

// Initialize lastFrameTime and start game loop
lastFrameTime = performance.now();
requestAnimationFrame(gameLoop);
