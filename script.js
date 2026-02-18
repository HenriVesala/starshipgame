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

// Yhteispisteet
let gameScore = 0;

// Friendly fire
let friendlyFire = false;

// ======== Pelaajat ========
// players[]-taulukko: jokainen elementti on pelaajan konteksti (pCtx)
let players = [];

// DOM elements
const gameContainer = document.querySelector('.game-container');
const positionDisplay = document.getElementById('position');

// Apufunktio: luo DOM-overlay-elementti
function createOverlay(parent) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    parent.appendChild(el);
    return el;
}

// Luo pelaajan konteksti DOM-elementeistä
function createPlayerContext(id, config, spaceshipId, laserIds, barIds, hudId) {
    const ship = document.getElementById(spaceshipId);
    const body = ship.querySelector('.ship-body');
    return {
        id: id,
        config: config,
        player: null,
        joined: false,
        alive: false,
        dom: {
            spaceship: ship,
            shipBody: body,
            pulseOverlay: createOverlay(body),
            fireFlashOverlay: (() => { const el = createOverlay(body); el.style.opacity = '0'; return el; })(),
            flameMain: ship.querySelector('.ship-flame-main'),
            flameLeft: ship.querySelector('.ship-flame-left'),
            flameRight: ship.querySelector('.ship-flame-right'),
            healthBar: document.getElementById(barIds.healthBar),
            healthText: document.getElementById(barIds.healthText),
            energyBar: document.getElementById(barIds.energyBar),
            energyText: document.getElementById(barIds.energyText),
            healthBarContainer: barIds.healthBarContainer ? document.getElementById(barIds.healthBarContainer) : null,
            energyBarContainer: barIds.energyBarContainer ? document.getElementById(barIds.energyBarContainer) : null,
            weaponHud: document.getElementById(hudId.hud),
            weaponHudName1: document.getElementById(hudId.name1),
            weaponHudName2: document.getElementById(hudId.name2)
        },
        lasers: [new Laser(document.getElementById(laserIds[0])), new Laser(document.getElementById(laserIds[1]))],
        keyMap: null, // Asetetaan alla
        selectedWeapons: ['bullet', 'missile'],
        menuWeaponIndex: [0, 1],
        menuCursorIndex: 0,
        menuJoined: false
    };
}

// P1 näppäimet
const p1KeyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire1: 'KeyN', fire2: 'KeyM' };
// P2 näppäimet
const p2KeyMap = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire1: 'ControlLeft', fire2: 'ShiftLeft' };

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
let muzzleFlashes = [];
let playerMissiles = [];
let enemyMissiles = [];
let damageNumbers = [];

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

// ======== Input tracking ========
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyN: false, KeyM: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    ControlLeft: false, ShiftLeft: false
};

// Näppäin → keys-objektin avain -kartoitus
function keyEventToKeyName(e) {
    if (e.key === ' ') return 'Space';
    if (e.key === 'Enter') return 'Enter';
    if (e.code === 'ControlLeft') return 'ControlLeft';
    if (e.key === 'Shift' && e.code === 'ShiftLeft') return 'ShiftLeft';
    if (e.key === 'Shift') return 'ShiftLeft'; // Käytetään vasenta shiftiä oletuksena
    const lower = e.key.toLowerCase();
    if (lower === 'n') return 'KeyN';
    if (lower === 'm') return 'KeyM';
    if (lower === 'w') return 'KeyW';
    if (lower === 's') return 'KeyS';
    if (lower === 'a') return 'KeyA';
    if (lower === 'd') return 'KeyD';
    if (e.key === 'ArrowUp') return 'ArrowUp';
    if (e.key === 'ArrowDown') return 'ArrowDown';
    if (e.key === 'ArrowLeft') return 'ArrowLeft';
    if (e.key === 'ArrowRight') return 'ArrowRight';
    return null;
}

// ======== Valikko: asevalinta ========
const weaponTypes = ['bullet', 'missile', 'laser', 'railgun'];

function menuJoinPlayer(pCtx, prefix) {
    if (pCtx.menuJoined) return;
    pCtx.menuJoined = true;
    document.getElementById(`${prefix}JoinPrompt`).style.display = 'none';
    document.getElementById(`${prefix}Weapons`).style.display = '';
    document.getElementById(`${prefix}MenuHint`).style.display = '';
    updateMenuSelectionForPlayer(pCtx, prefix);
}

function menuUnjoinPlayer(pCtx, prefix) {
    pCtx.menuJoined = false;
    document.getElementById(`${prefix}JoinPrompt`).style.display = '';
    document.getElementById(`${prefix}Weapons`).style.display = 'none';
    document.getElementById(`${prefix}MenuHint`).style.display = 'none';
}

const slotKeyLabels = {
    p1: ['N', 'M'],
    p2: ['Ctrl', 'Shift']
};

function updateMenuSelectionForPlayer(pCtx, slotPrefix) {
    const cards = document.querySelectorAll(`#${slotPrefix}Weapons .weapon-card`);
    const labels = slotKeyLabels[slotPrefix];

    cards.forEach((c, i) => {
        // Kursorin korostus
        c.classList.toggle('selected', i === pCtx.menuCursorIndex);

        // Valitun aseen reunus
        const weapon = weaponTypes[i];
        const isAssigned = pCtx.selectedWeapons[0] === weapon || pCtx.selectedWeapons[1] === weapon;
        c.classList.toggle(`assigned-${slotPrefix}`, isAssigned);

        // Päivitä badget — näytä mihin slotteihin tämä ase on valittu
        const badgeContainer = c.querySelector('.weapon-card-badges');
        let badges = '';
        if (pCtx.selectedWeapons[0] === weapon) badges += `<span class="weapon-slot-badge">${labels[0]}</span>`;
        if (pCtx.selectedWeapons[1] === weapon) badges += `<span class="weapon-slot-badge">${labels[1]}</span>`;
        badgeContainer.innerHTML = badges;
    });
}

// ======== Input Events ========
document.addEventListener('keydown', (e) => {
    const keyName = keyEventToKeyName(e);

    // Valikko-tila
    if (currentGameState === GameState.MENU) {
        e.preventDefault();
        // P1: N/M liittää ensin, sitten valitsee aseen
        if (keyName === 'KeyN') {
            if (!players[0].menuJoined) { menuJoinPlayer(players[0], 'p1'); }
            else {
                players[0].selectedWeapons[0] = weaponTypes[players[0].menuCursorIndex];
                players[0].menuWeaponIndex[0] = players[0].menuCursorIndex;
                updateMenuSelectionForPlayer(players[0], 'p1');
            }
        } else if (keyName === 'KeyM') {
            if (!players[0].menuJoined) { menuJoinPlayer(players[0], 'p1'); }
            else {
                players[0].selectedWeapons[1] = weaponTypes[players[0].menuCursorIndex];
                players[0].menuWeaponIndex[1] = players[0].menuCursorIndex;
                updateMenuSelectionForPlayer(players[0], 'p1');
            }
        }
        // P1 navigoi nuolilla (vain jos liittynyt)
        else if (e.key === 'ArrowLeft' && players[0].menuJoined) {
            players[0].menuCursorIndex = (players[0].menuCursorIndex - 1 + 4) % 4;
            updateMenuSelectionForPlayer(players[0], 'p1');
        } else if (e.key === 'ArrowRight' && players[0].menuJoined) {
            players[0].menuCursorIndex = (players[0].menuCursorIndex + 1) % 4;
            updateMenuSelectionForPlayer(players[0], 'p1');
        }
        // P2: Ctrl/Shift liittää ensin, sitten valitsee aseen
        else if (keyName === 'ControlLeft') {
            if (!players[1].menuJoined) { menuJoinPlayer(players[1], 'p2'); }
            else {
                players[1].selectedWeapons[0] = weaponTypes[players[1].menuCursorIndex];
                players[1].menuWeaponIndex[0] = players[1].menuCursorIndex;
                updateMenuSelectionForPlayer(players[1], 'p2');
            }
        } else if (keyName === 'ShiftLeft') {
            if (!players[1].menuJoined) { menuJoinPlayer(players[1], 'p2'); }
            else {
                players[1].selectedWeapons[1] = weaponTypes[players[1].menuCursorIndex];
                players[1].menuWeaponIndex[1] = players[1].menuCursorIndex;
                updateMenuSelectionForPlayer(players[1], 'p2');
            }
        }
        // P2 navigoi A/D:llä (vain jos liittynyt)
        else if (keyName === 'KeyA' && players[1].menuJoined) {
            players[1].menuCursorIndex = (players[1].menuCursorIndex - 1 + 4) % 4;
            updateMenuSelectionForPlayer(players[1], 'p2');
        } else if (keyName === 'KeyD' && players[1].menuJoined) {
            players[1].menuCursorIndex = (players[1].menuCursorIndex + 1) % 4;
            updateMenuSelectionForPlayer(players[1], 'p2');
        }
        // Toggle friendly fire
        else if (e.key.toLowerCase() === 'f') {
            toggleFriendlyFire();
        }
        // Aloita peli (vähintään yksi pelaaja pitää olla liittynyt)
        else if (keyName === 'Space' || keyName === 'Enter') {
            if (players.some(p => p.menuJoined)) startGame();
        }
        return;
    }

    // Game over -restart
    if (currentGameState === GameState.GAME_OVER && keyName === 'Space') {
        e.preventDefault();
        restartGame();
        return;
    }

    // Pelitila: päivitä keys
    if (keyName && keys.hasOwnProperty(keyName)) {
        keys[keyName] = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    const keyName = keyEventToKeyName(e);
    if (keyName && keys.hasOwnProperty(keyName)) {
        keys[keyName] = false;
        e.preventDefault();
    }
});

// ======== Friendly Fire toggle ========
function toggleFriendlyFire() {
    friendlyFire = !friendlyFire;
    const valueEl = document.getElementById('friendlyFireValue');
    valueEl.textContent = friendlyFire ? 'ON' : 'OFF';
    valueEl.classList.toggle('active', friendlyFire);
}

// ======== Apufunktiot ========

function getAlivePlayers() {
    return players.filter(p => p.joined && p.alive);
}

function getAlivePlayerInstances() {
    return getAlivePlayers().map(p => p.player);
}

function getNearestAlivePlayer(x, y) {
    let nearest = null, minDist = Infinity;
    for (const pCtx of getAlivePlayers()) {
        const d = distance(x, y, pCtx.player.x + 20, pCtx.player.y + 20);
        if (d < minDist) { minDist = d; nearest = pCtx; }
    }
    return nearest;
}

// Tarkista onko target joku pelaajista
function findPlayerCtxByInstance(playerInstance) {
    return players.find(p => p.player === playerInstance);
}

// ======== Pelaajan liittyminen peliin ========
function joinPlayer(pCtx) {
    if (pCtx.joined) return;
    pCtx.joined = true;
    pCtx.alive = true;
    pCtx.player = new Player(pCtx.config);
    pCtx.player.weaponSlots[0].type = pCtx.selectedWeapons[0];
    pCtx.player.weaponSlots[1].type = pCtx.selectedWeapons[1];
    pCtx.player.x = pCtx.config.startX;
    pCtx.player.y = pCtx.config.startY;
    pCtx.player.angle = 0;
    pCtx.player.vx = 0;
    pCtx.player.vy = 0;
    pCtx.player.resetHealth();

    // Näytä DOM-elementit
    pCtx.dom.spaceship.style.display = '';
    pCtx.dom.spaceship.style.left = pCtx.player.x + 'px';
    pCtx.dom.spaceship.style.top = pCtx.player.y + 'px';
    if (pCtx.dom.healthBarContainer) pCtx.dom.healthBarContainer.style.display = '';
    if (pCtx.dom.energyBarContainer) pCtx.dom.energyBarContainer.style.display = '';
    if (pCtx.dom.weaponHud) pCtx.dom.weaponHud.style.display = '';

    // Päivitä HUD
    pCtx.dom.weaponHudName1.textContent = pCtx.player.weaponSlots[0].type;
    pCtx.dom.weaponHudName2.textContent = pCtx.player.weaponSlots[1].type;
}

// ======== Per-pelaaja update ========
function updatePlayer(pCtx, dt) {
    const p = pCtx.player;
    const km = pCtx.keyMap;
    const cfg = pCtx.config;

    if (p.isShrinking) {
        p.thrustState = 'none';
        return;
    }

    // Immuniteetti
    if (p.isInvulnerable) {
        p.invulnerabilityTimer -= dt;
        if (p.invulnerabilityTimer <= 0) {
            p.isInvulnerable = false;
            p.invulnerabilityTimer = 0;
        }
    }

    // Cooldown-ajastimet
    p.updateCooldowns(dt);

    // Visuaalit
    p.updateDamageFlash(dt);
    p.updateFireFlash(dt);

    // Kääntö
    if (keys[km.left]) p.angle -= cfg.rotationSpeed * dt;
    if (keys[km.right]) p.angle += cfg.rotationSpeed * dt;

    // Liike
    const rad = (p.angle - 90) * Math.PI / 180;
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);
    const nebulaAccelMult = p.inNebula ? 0.5 : 1.0;

    if (keys[km.up]) {
        p.vx += dirX * cfg.accelerationForward * nebulaAccelMult * dt;
        p.vy += dirY * cfg.accelerationForward * nebulaAccelMult * dt;
    }
    if (keys[km.down]) {
        p.vx -= dirX * cfg.accelerationReverse * nebulaAccelMult * dt;
        p.vy -= dirY * cfg.accelerationReverse * nebulaAccelMult * dt;
    }

    // Kiihtyvyystila
    if (keys[km.up] && !keys[km.down]) p.thrustState = 'forward';
    else if (keys[km.down] && !keys[km.up]) p.thrustState = 'reverse';
    else p.thrustState = 'none';

    // Energia
    const energyRegenMult = (keys[km.up] || keys[km.down]) ? 0.5 : 1.0;
    p.energy = Math.min(p.maxEnergy, p.energy + cfg.energyRegenRate * energyRegenMult * dt);

    p.capSpeed();
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Ruudun reunat (wrap)
    if (p.x < -cfg.width) p.x = gameConfig.screenWidth;
    if (p.x > gameConfig.screenWidth) p.x = -cfg.width;
    if (p.y < -cfg.height) p.y = gameConfig.screenHeight;
    if (p.y > gameConfig.screenHeight) p.y = -cfg.height;

    // Ammu
    fireWeaponSlot(pCtx, 0, keys[km.fire1], dt);
    fireWeaponSlot(pCtx, 1, keys[km.fire2], dt);

    // Railgun-visuaalit
    const chargingSlot = p.weaponSlots.find(s => s.isChargingRailgun);
    if (chargingSlot) {
        pCtx.dom.spaceship.classList.add('charging-railgun');
        const t = performance.now() / 1000;
        const phase = (t % p.weaponConfigs.railgun.chargePulseInterval) / p.weaponConfigs.railgun.chargePulseInterval;
        pCtx.dom.pulseOverlay.style.background = `linear-gradient(to bottom, ${p.weaponConfigs.railgun.chargePulseTipColor}, ${p.weaponConfigs.railgun.chargePulseMidColor} 50%, ${p.weaponConfigs.railgun.chargePulseColor})`;
        pCtx.dom.pulseOverlay.style.opacity = (0.5 + 0.5 * Math.cos(phase * 2 * Math.PI)).toFixed(2);
    } else {
        pCtx.dom.spaceship.classList.remove('charging-railgun');
        pCtx.dom.pulseOverlay.style.background = '';
        pCtx.dom.pulseOverlay.style.opacity = '';
    }
}

// ======== Per-pelaaja ampuminen ========
function fireWeaponSlot(pCtx, slotIndex, keyPressed, dt) {
    const p = pCtx.player;
    const slot = p.weaponSlots[slotIndex];
    const weaponType = slot.type;
    const laser = pCtx.lasers[slotIndex];
    const cfg = pCtx.config;
    const km = pCtx.keyMap;
    const fireKeyName = slotIndex === 0 ? km.fire1 : km.fire2;

    if (weaponType === 'laser') {
        const laserEnergyCost = p.weaponConfigs.laser.energyCostPerSecond * dt;
        if (keyPressed && p.energy >= laserEnergyCost) {
            p.triggerFireFlash(p.weaponConfigs.laser.fireFlash);
            p.consumeEnergy(laserEnergyCost);

            const halfShip = cfg.width / 2;
            const rad = (p.angle - 90) * Math.PI / 180;
            const startX = p.x + halfShip + Math.cos(rad) * 20;
            const startY = p.y + halfShip + Math.sin(rad) * 20;

            // FF: laserin kohteet sisältävät muut pelaajat kun friendly fire on päällä
            const laserPlayerTargets = friendlyFire
                ? getAlivePlayerInstances()
                : [];
            const laserTargets = {
                enemies: enemies,
                planets: planets,
                meteors: meteors,
                blackHoles: blackHoles,
                nebulaClouds: nebulaClouds,
                players: laserPlayerTargets,
                missiles: [...enemyMissiles, ...playerMissiles]
            };

            laser.setConfig(p.weaponConfigs.laser);
            const hit = laser.trace(startX, startY, p.angle, 'player', laserTargets);
            laser.active = true;

            if (hit.target) {
                const intensity = laser.getIntensity(hit.distance) * (hit.mul || 1);
                handleLaserHit(hit.target, p.weaponConfigs.laser.damagePerSecond * dt * intensity, 'player');
            }

            p.vx -= Math.cos(rad) * p.weaponConfigs.laser.recoilPerSecond * dt;
            p.vy -= Math.sin(rad) * p.weaponConfigs.laser.recoilPerSecond * dt;
        } else {
            laser.active = false;
        }

    } else if (weaponType === 'railgun') {
        laser.active = false;

        if (keyPressed && p.energy > 0) {
            if (slot.railgunCharge >= p.weaponConfigs.railgun.maxCharge) {
                const maintenanceCost = p.weaponConfigs.railgun.maintenanceEnergyPerSecond * dt;
                p.consumeEnergy(Math.min(maintenanceCost, p.energy));
            } else {
                const energyCost = p.weaponConfigs.railgun.chargeEnergyPerSecond * dt;
                const actualCost = Math.min(energyCost, p.energy);
                p.consumeEnergy(actualCost);
                slot.railgunCharge += actualCost;
                if (slot.railgunCharge > p.weaponConfigs.railgun.maxCharge) {
                    slot.railgunCharge = p.weaponConfigs.railgun.maxCharge;
                }
            }
            slot.isChargingRailgun = true;

        } else if (slot.isChargingRailgun) {
            if (slot.railgunCharge >= p.weaponConfigs.railgun.minCharge) {
                const chargePercent = slot.railgunCharge / p.weaponConfigs.railgun.maxCharge;
                const speed = p.weaponConfigs.railgun.minSpeed + chargePercent * (p.weaponConfigs.railgun.maxSpeed - p.weaponConfigs.railgun.minSpeed);

                const halfShip = cfg.width / 2;
                const rad = (p.angle - 90) * Math.PI / 180;
                const spawnX = p.x + halfShip + Math.cos(rad) * 20;
                const spawnY = p.y + halfShip + Math.sin(rad) * 20;

                const rgProj = new RailgunProjectile(
                    gameContainer, spawnX, spawnY, p.angle,
                    'player', speed, p.vx, p.vy, p.weaponConfigs.railgun
                );
                rgProj.firedByPlayer = p;
                playerBullets.push(rgProj);

                const recoilAmount = p.weaponConfigs.railgun.recoilPerCharge * slot.railgunCharge;
                p.vx -= Math.cos(rad) * recoilAmount;
                p.vy -= Math.sin(rad) * recoilAmount;

                p.triggerFireFlash(p.weaponConfigs.railgun.fireFlash);
            }
            slot.isChargingRailgun = false;
            slot.railgunCharge = 0;
        }

    } else {
        laser.active = false;
        const shootEnergyCost = p.weaponConfigs[weaponType].energyCost;

        if (keyPressed && p.canShoot(slotIndex) && p.hasEnergy(shootEnergyCost)) {
            const halfShipSize = cfg.width / 2;
            const adjustedAngle = p.angle - 90;
            const radians = (adjustedAngle * Math.PI) / 180;
            const forwardOffset = 20;
            const spawnX = p.x + halfShipSize + Math.cos(radians) * forwardOffset;
            const spawnY = p.y + halfShipSize + Math.sin(radians) * forwardOffset;

            if (weaponType === 'missile') {
                const mis = new Missile(gameContainer, spawnX, spawnY, p.angle, 'player', p.vx, p.vy, p.weaponConfigs.missile);
                mis.firedByPlayer = p;
                playerMissiles.push(mis);
                p.vx -= Math.cos(radians) * p.weaponConfigs.missile.recoil;
                p.vy -= Math.sin(radians) * p.weaponConfigs.missile.recoil;
                p.triggerFireFlash(p.weaponConfigs.missile.fireFlash);
            } else {
                const bul = new Bullet(gameContainer, spawnX, spawnY, p.angle, 'player', p.vx, p.vy, p.weaponConfigs.bullet);
                bul.firedByPlayer = p;
                playerBullets.push(bul);
                p.vx -= Math.cos(radians) * p.weaponConfigs.bullet.recoil;
                p.vy -= Math.sin(radians) * p.weaponConfigs.bullet.recoil;
                p.triggerFireFlash(p.weaponConfigs.bullet.fireFlash);
            }
            p.consumeEnergy(shootEnergyCost);
            p.setShootCooldown(slotIndex);
            keys[fireKeyName] = false;
        }
    }
}

// ======== Update kaikki pelaajat ========
function updatePosition(dt) {
    if (currentGameState !== GameState.PLAYING) return;

    for (const pCtx of players) {
        if (pCtx.joined && pCtx.alive) {
            updatePlayer(pCtx, dt);
        }
    }
}

// ======== Spawn-funktiot ========
function spawnEnemy(spawner) {
    const typeCount = enemies.filter(e => e.constructor.name === spawner.type.name).length;
    if (typeCount < spawner.maxCount) {
        enemies.push(new spawner.type(gameContainer));
    }
}

function spawnMeteor() {
    const tier = getCurrentGameplayTier(gameScore);
    if (meteors.length < tier.maxMeteors) {
        meteors.push(new Meteor(gameContainer));
        meteorSpawnTimer = 0;
    }
}

function spawnPlanet() {
    const tier = getCurrentGameplayTier(gameScore);
    if (planets.length < tier.maxPlanets) {
        planets.push(new Planet(gameContainer));
        planetSpawnTimer = 0;
        nextPlanetSpawnTime = Math.random() * (planetConfig.spawnIntervalMax - planetConfig.spawnIntervalMin) + planetConfig.spawnIntervalMin;
    }
}

function spawnNebulaCloud() {
    const tier = getCurrentGameplayTier(gameScore);
    if (nebulaClouds.length < tier.maxNebulaClouds) {
        nebulaClouds.push(new NebulaCloud(gameContainer));
        nebulaCloudSpawnTimer = 0;
    }
}

function spawnBlackHole() {
    const tier = getCurrentGameplayTier(gameScore);
    if (blackHoles.length < tier.maxBlackHoles) {
        blackHoles.push(new BlackHole(gameContainer));
        blackHoleSpawnTimer = 0;
        nextBlackHoleSpawnTime = Math.random() * (blackHoleConfig.spawnIntervalMax - blackHoleConfig.spawnIntervalMin) + blackHoleConfig.spawnIntervalMin;
    }
}

// ======== UI Updates ========
function updateHealthBarFor(p, barEl, textEl) {
    const healthPercent = (p.health / p.maxHealth) * 100;
    barEl.style.width = healthPercent + '%';
    textEl.textContent = `${Math.ceil(p.health)}/${p.maxHealth}`;
    barEl.classList.remove('low', 'critical');
    if (healthPercent <= 33) barEl.classList.add('critical');
    else if (healthPercent <= 66) barEl.classList.add('low');
}

function updateEnergyBarFor(p, barEl, textEl) {
    const energyPercent = (p.energy / p.maxEnergy) * 100;
    barEl.style.width = energyPercent + '%';
    textEl.textContent = `${Math.ceil(p.energy)}/${p.maxEnergy}`;
    barEl.classList.remove('low', 'critical');
    if (energyPercent <= 15) barEl.classList.add('critical');
    else if (energyPercent <= 33) barEl.classList.add('low');
}

// ======== Render per pelaaja ========
function renderPlayer(pCtx) {
    const p = pCtx.player;
    const dom = pCtx.dom;

    dom.spaceship.style.left = p.x + 'px';
    dom.spaceship.style.top = p.y + 'px';

    if (p.isShrinking) {
        const scale = 1 - p.shrinkProgress;
        dom.spaceship.style.transform = `rotate(${p.angle}deg) scale(${scale})`;
    } else {
        dom.spaceship.style.transform = `rotate(${p.angle}deg)`;
    }

    // Immuniteetti
    dom.spaceship.classList.toggle('invulnerable', p.isInvulnerable);

    // Vahinkovälähdys
    dom.spaceship.classList.toggle('damage-flash', p.damageFlashTimer > 0);

    // Liekit
    if (p.thrustState === 'forward') {
        dom.flameMain.classList.add('active');
        dom.flameLeft.classList.remove('active');
        dom.flameRight.classList.remove('active');
    } else if (p.thrustState === 'reverse') {
        dom.flameMain.classList.remove('active');
        dom.flameLeft.classList.add('active');
        dom.flameRight.classList.add('active');
    } else {
        dom.flameMain.classList.remove('active');
        dom.flameLeft.classList.remove('active');
        dom.flameRight.classList.remove('active');
    }

    // Laukaisuvälähdys
    if (p.fireFlashTimer > 0) {
        const progress = p.fireFlashTimer / p.fireFlashDuration;
        dom.fireFlashOverlay.style.background = p.fireFlashColor;
        dom.fireFlashOverlay.style.opacity = progress.toFixed(2);
    } else {
        dom.fireFlashOverlay.style.opacity = '0';
    }

    updateHealthBarFor(p, dom.healthBar, dom.healthText);
    updateEnergyBarFor(p, dom.energyBar, dom.energyText);
    pCtx.lasers[0].render();
    pCtx.lasers[1].render();
}

// ======== Render ========
function render() {
    for (const pCtx of players) {
        if (pCtx.joined && pCtx.alive) {
            renderPlayer(pCtx);
        }
    }
    positionDisplay.textContent = `Score: ${gameScore}`;
}

// ======== Laserin osumankäsittely ========
function handleLaserHit(target, damage, owner) {
    // Tarkista onko target joku pelaajista
    const targetPCtx = findPlayerCtxByInstance(target);
    if (targetPCtx && targetPCtx.alive) {
        const destroyed = target.takeDamage(damage);
        if (destroyed) {
            explosions.push(new Explosion(target.x + 20, target.y + 20, 'large', gameContainer));
            playerDied(targetPCtx);
        }
    } else if (enemies.includes(target)) {
        const destroyed = target.takeDamage(damage);
        if (destroyed) {
            const scoreMap = { 'WeakEnemy': 10, 'EliteEnemy': 25, 'AggressiveEnemy': 30, 'MissileEnemy': 20 };
            if (owner === 'player') gameScore += scoreMap[target.constructor.name] || 10;

            const sizeMap = { 'WeakEnemy': 'small', 'EliteEnemy': 'medium', 'AggressiveEnemy': 'medium', 'MissileEnemy': 'medium' };
            explosions.push(new Explosion(target.x + 20, target.y + 20, sizeMap[target.constructor.name] || 'small', gameContainer));
            spawnHealthOrb(target);
            spawnRateOfFireBoost(target);
            target.destroy();
            const idx = enemies.indexOf(target);
            if (idx !== -1) enemies.splice(idx, 1);
        }
    } else {
        // Ohjus — laser tuhoaa ohjuksen välittömästi
        let idx = playerMissiles.indexOf(target);
        if (idx !== -1) {
            explosions.push(new Explosion(target.x, target.y, 'small', gameContainer));
            target.destroy();
            playerMissiles.splice(idx, 1);
            return;
        }
        idx = enemyMissiles.indexOf(target);
        if (idx !== -1) {
            explosions.push(new Explosion(target.x, target.y, 'small', gameContainer));
            target.destroy();
            enemyMissiles.splice(idx, 1);
        }
    }
}

// ======== Pelaajan kuolema ========
function playerDied(pCtx) {
    pCtx.alive = false;
    pCtx.dom.spaceship.style.display = 'none';
    pCtx.lasers[0].clear();
    pCtx.lasers[1].clear();
    pCtx.dom.pulseOverlay.style.background = '';
    pCtx.dom.pulseOverlay.style.opacity = '';
    if (pCtx.dom.healthBarContainer) pCtx.dom.healthBarContainer.style.display = 'none';
    if (pCtx.dom.energyBarContainer) pCtx.dom.energyBarContainer.style.display = 'none';
    if (pCtx.dom.weaponHud) pCtx.dom.weaponHud.style.display = 'none';

    // Tarkista onko kaikki liittyneet pelaajat kuolleet
    const anyAlive = players.some(p => p.joined && p.alive);
    if (!anyAlive) {
        endGame();
    }
}

function endGame() {
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over';
    gameOverDiv.innerHTML = `GAME OVER<br>Final Score: ${gameScore}<br><br><span style="font-size: 18px;">Press SPACE to continue</span>`;
    gameContainer.appendChild(gameOverDiv);
    currentGameState = GameState.GAME_OVER;
}

function restartGame() {
    const gameOverScreen = document.querySelector('.game-over');
    if (gameOverScreen) gameOverScreen.remove();

    // Tyhjenä kaikki
    playerBullets.forEach(b => b.destroy());
    enemyBullets.forEach(b => b.destroy());
    enemies.forEach(e => e.destroy());
    meteors.forEach(m => m.destroy());
    planets.forEach(p => p.destroy());
    blackHoles.forEach(b => b.destroy());
    healthOrbs.forEach(o => o.destroy());
    rateOfFireBoosts.forEach(b => b.destroy());
    nebulaClouds.forEach(c => c.destroy());
    explosions.forEach(e => e.destroy());
    muzzleFlashes.forEach(m => m.destroy());
    playerMissiles.forEach(m => m.destroy());
    enemyMissiles.forEach(m => m.destroy());
    damageNumbers.forEach(d => d.destroy());

    for (const pCtx of players) {
        pCtx.lasers[0].clear();
        pCtx.lasers[1].clear();
        pCtx.dom.spaceship.classList.remove('charging-railgun');
        pCtx.dom.pulseOverlay.style.background = '';
        pCtx.dom.pulseOverlay.style.opacity = '';
        pCtx.dom.fireFlashOverlay.style.background = '';
        pCtx.dom.fireFlashOverlay.style.opacity = '0';
        pCtx.dom.spaceship.style.display = 'none';
        if (pCtx.dom.healthBarContainer) pCtx.dom.healthBarContainer.style.display = 'none';
        if (pCtx.dom.energyBarContainer) pCtx.dom.energyBarContainer.style.display = 'none';
        if (pCtx.dom.weaponHud) pCtx.dom.weaponHud.style.display = 'none';
    }

    // Palaa menuun — säilytä aiemmat valinnat ja join-tila
    const prefixes = ['p1', 'p2'];
    for (let i = 0; i < players.length; i++) {
        const pCtx = players[i];
        const prefix = prefixes[i];
        if (pCtx.menuJoined) {
            // Näytä asevalikko suoraan
            document.getElementById(`${prefix}JoinPrompt`).style.display = 'none';
            document.getElementById(`${prefix}Weapons`).style.display = '';
            document.getElementById(`${prefix}MenuHint`).style.display = '';
            updateMenuSelectionForPlayer(pCtx, prefix);
        }
    }

    const menuScreen = document.getElementById('menuScreen');
    menuScreen.classList.remove('hidden');
    currentGameState = GameState.MENU;
}

// ======== Start Game ========
function startGame() {
    currentGameState = GameState.PLAYING;

    const menuScreen = document.getElementById('menuScreen');
    menuScreen.classList.add('hidden');

    gameScore = 0;

    // Nollaa keys
    for (const k in keys) keys[k] = false;

    // Nollaa taulukot
    playerBullets = []; enemyBullets = []; enemies = []; meteors = [];
    planets = []; nebulaClouds = []; blackHoles = []; healthOrbs = [];
    rateOfFireBoosts = []; explosions = []; muzzleFlashes = [];
    playerMissiles = []; enemyMissiles = []; damageNumbers = [];

    // Nollaa spawn-ajastimet
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

    // Nollaa pelaajien tila
    for (const pCtx of players) {
        pCtx.joined = false;
        pCtx.alive = false;
        pCtx.player = null;
        pCtx.dom.spaceship.style.display = 'none';
        if (pCtx.dom.healthBarContainer) pCtx.dom.healthBarContainer.style.display = 'none';
        if (pCtx.dom.energyBarContainer) pCtx.dom.energyBarContainer.style.display = 'none';
        if (pCtx.dom.weaponHud) pCtx.dom.weaponHud.style.display = 'none';
    }

    // Liitä kaikki valikossa mukaan tulleet pelaajat
    for (const pCtx of players) {
        if (pCtx.menuJoined) joinPlayer(pCtx);
    }

    positionDisplay.textContent = `Score: 0`;

    // Spawn ensimmäinen vihollinen
    spawnEnemy(enemySpawners[0]);
}

// ======== DOMContentLoaded — alusta kaikki ========
document.addEventListener('DOMContentLoaded', () => {
    // Luo pelaajien kontekstit
    players[0] = createPlayerContext(0, playerConfig, 'spaceship',
        ['laserCanvas1', 'laserCanvas2'],
        { healthBar: 'healthBar', healthText: 'healthText', energyBar: 'energyBar', energyText: 'energyText', healthBarContainer: 'healthBarContainer', energyBarContainer: 'energyBarContainer' },
        { hud: 'weaponHud', name1: 'weaponHudName1', name2: 'weaponHudName2' }
    );
    players[0].keyMap = p1KeyMap;

    players[1] = createPlayerContext(1, player2Config, 'spaceship2',
        ['laserCanvas3', 'laserCanvas4'],
        { healthBar: 'healthBar2', healthText: 'healthText2', energyBar: 'energyBar2', energyText: 'energyText2',
          healthBarContainer: 'healthBarContainer2', energyBarContainer: 'energyBarContainer2' },
        { hud: 'weaponHud2', name1: 'weaponHudName3', name2: 'weaponHudName4' }
    );
    players[1].keyMap = p2KeyMap;

    // Valikko: hiiriklikkaus P1
    document.querySelectorAll('#p1Weapons .weapon-card').forEach((card, i) => {
        card.addEventListener('click', () => {
            players[0].menuCursorIndex = i;
            updateMenuSelectionForPlayer(players[0], 'p1');
        });
    });

    // Valikko: hiiriklikkaus P2
    document.querySelectorAll('#p2Weapons .weapon-card').forEach((card, i) => {
        card.addEventListener('click', () => {
            players[1].menuCursorIndex = i;
            updateMenuSelectionForPlayer(players[1], 'p2');
        });
    });

    // Alkukorostukset
    updateMenuSelectionForPlayer(players[0], 'p1');
    updateMenuSelectionForPlayer(players[1], 'p2');

    // Friendly fire toggle klikkaus
    document.getElementById('friendlyFireToggle').addEventListener('click', toggleFriendlyFire);

    // Start-nappi
    document.getElementById('startButton').addEventListener('click', () => {
        if (players.some(p => p.menuJoined)) startGame();
    });
});

// Initialize lastFrameTime and start game loop
lastFrameTime = performance.now();
requestAnimationFrame(gameLoop);
