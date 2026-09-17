/* ==========================================
   STARDREAM CHRONICLE - COMPLETE SCRIPT
   ========================================== */

const TILE_SIZE = 32;
const MAP_WIDTH = 50;
const MAP_HEIGHT = 40;

// Game State & Engines
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.state = 'TITLE'; // TITLE, CREATION, PLAYING, CUTSCENE, SUMMARY
        this.running = false;
        
        // Core Systems
        this.player = null;
        this.world = null;
        this.camera = null;
        this.timeSystem = new TimeSystem();
        this.weatherSystem = new WeatherSystem();
        this.seasonSystem = new SeasonSystem();
        this.inventory = new Inventory();
        this.questSystem = new QuestSystem();
        this.dialogueSystem = new DialogueSystem();
        this.cutsceneEngine = new CutsceneEngine();
        this.audioSystem = new AudioSystem();
        this.combatSystem = new CombatSystem();
        
        this.npcs = [];
        this.animals = [];
        this.monsters = [];
        this.projectiles = [];
        this.particles = [];
        
        this.storyFlags = {
            metMayor: false,
            enteredMine: false,
            receivedFarm: false
        };
        this.chapter = 1;

        this.keys = {};
        this.touch = { up: false, down: false, left: false, right: false };

        this.initEventListeners();
        this.checkSaveGame();
    }

    initEventListeners() {
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        });

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (['e', 'i', 'm', 'q', '1','2','3','4','5','6','7','8','9','0'].includes(e.key.toLowerCase())) {
                this.handleHotkeys(e.key.toLowerCase());
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // UI Buttons
        document.getElementById('btn-newgame').addEventListener('click', () => {
            document.getElementById('title-screen').style.display = 'none';
            document.getElementById('char-creation-screen').style.display = 'flex';
        });

        document.getElementById('btn-continue').addEventListener('click', () => {
            document.getElementById('title-screen').style.display = 'none';
            this.loadGame();
            this.startPlaying();
        });

        document.getElementById('btn-start-game').addEventListener('click', () => {
            document.getElementById('char-creation-screen').style.display = 'none';
            this.createNewGame();
            this.startPlaying();
        });

        document.getElementById('btn-inventory-open').addEventListener('click', () => toggleModal('inventory-modal', true));
        document.getElementById('btn-map-open').addEventListener('click', () => { toggleModal('map-modal', true); renderWorldMap(); });
        document.getElementById('btn-quest-open').addEventListener('click', () => { toggleModal('quest-modal', true); renderQuestList(); });
        document.getElementById('btn-skills-open').addEventListener('click', () => { toggleModal('skills-modal', true); renderSkillsList(); });
        document.getElementById('btn-social-open').addEventListener('click', () => { toggleModal('social-modal', true); renderSocialList(); });
        document.getElementById('btn-settings-open').addEventListener('click', () => toggleModal('settings-modal', true));
        
        document.getElementById('btn-save-game').addEventListener('click', () => { this.saveGame(); alert('Game Saved Successfully!'); });
        document.getElementById('btn-next-day').addEventListener('click', () => { this.timeSystem.advanceToNextDay(); toggleModal('summary-modal', false); });

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Touch Control Bindings
        const bindTouch = (id, keyName) => {
            const el = document.getElementById(id);
            if(!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch[keyName] = true; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.touch[keyName] = false; });
        };
        bindTouch('btn-up', 'up');
        bindTouch('btn-down', 'down');
        bindTouch('btn-left', 'left');
        bindTouch('btn-right', 'right');
    }

    handleHotkeys(key) {
        if (this.state !== 'PLAYING') return;
        if (key === 'i') toggleModal('inventory-modal');
        if (key === 'q') toggleModal('quest-modal');
        if (key === 'm') toggleModal('map-modal');
        if (!isNaN(key)) {
            let idx = parseInt(key);
            if (idx === 0) idx = 10;
            else idx -= 1;
            this.inventory.selectedHotbar = idx;
            this.inventory.renderHotbar();
        }
        if (key === 'e') {
            this.player.interact();
        }
    }

    checkSaveGame() {
        if (localStorage.getItem('stardream_save')) {
            document.getElementById('btn-continue').style.display = 'block';
        }
    }

    createNewGame() {
        const name = document.getElementById('char-name').value || 'Aria';
        const config = {
            name,
            gender: document.getElementById('char-gender').value,
            skin: document.getElementById('char-skin').value,
            hairStyle: document.getElementById('char-hair-style').value,
            hairColor: document.getElementById('char-hair-color').value,
            shirt: document.getElementById('char-shirt').value,
            pants: document.getElementById('char-pants').value,
            shoes: document.getElementById('char-shoes').value
        };

        this.player = new Player(15 * TILE_SIZE, 12 * TILE_SIZE, config);
        this.world = new World();
        this.camera = new Camera(this.player, this.width, this.height);
        
        // Initial Items
        this.inventory.addItem('Hoe', 1, 'Tool');
        this.inventory.addItem('Watering Can', 1, 'Tool');
        this.inventory.addItem('Wheat Seed', 5, 'Seed');
        this.inventory.addItem('Sword', 1, 'Weapon');

        this.initNPCs();
        this.state = 'PLAYING';
        document.getElementById('hud').style.display = 'block';
        if('ontouchstart' in window) document.getElementById('touch-controls').style.display = 'flex';

        // Start Opening Cutscene Chapter 1
        this.cutsceneEngine.playOpeningCutscene();
    }

    startPlaying() {
        this.state = 'PLAYING';
        document.getElementById('title-screen').style.display = 'none';
        document.getElementById('char-creation-screen').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        if('ontouchstart' in window || window.innerWidth < 800) document.getElementById('touch-controls').style.display = 'flex';
        if (!this.running) {
            this.running = true;
            requestAnimationFrame(() => this.loop());
        }
    }

    initNPCs() {
        this.npcs = [
            new NPC('Mayor Silas', 12 * TILE_SIZE, 10 * TILE_SIZE, '#e74c3c'),
            new NPC('Merchant Lina', 20 * TILE_SIZE, 14 * TILE_SIZE, '#9b59b6'),
            new NPC('Blacksmith Garret', 8 * TILE_SIZE, 22 * TILE_SIZE, '#e67e22')
        ];
    }

    saveGame() {
        const data = {
            player: this.player.serialize(),
            time: this.timeSystem.serialize(),
            inventory: this.inventory.serialize(),
            world: this.world.serialize(),
            storyFlags: this.storyFlags,
            chapter: this.chapter
        };
        localStorage.setItem('stardream_save', JSON.stringify(data));
    }

    loadGame() {
        const raw = localStorage.getItem('stardream_save');
        if (!raw) return;
        const data = JSON.parse(raw);
        
        this.player = Player.deserialize(data.player);
        this.world = new World();
        this.world.deserialize(data.world);
        this.timeSystem.deserialize(data.time);
        this.inventory.deserialize(data.inventory);
        this.storyFlags = data.storyFlags;
        this.chapter = data.chapter;
        this.camera = new Camera(this.player, this.width, this.height);
        this.initNPCs();
    }

    loop() {
        this.update();
        this.render();
        if (this.running) {
            requestAnimationFrame(() => this.loop());
        }
    }

    update() {
        if (this.state === 'PLAYING') {
            this.player.update(this);
            this.npcs.forEach(n => n.update(this));
            this.world.update(this);
            this.timeSystem.update(this);
            this.camera.update();
        } else if (this.state === 'CUTSCENE') {
            this.cutsceneEngine.update(this);
            this.camera.update();
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.ctx.save();
        this.camera.apply(this.ctx);

        this.world.render(this.ctx, this.camera);
        this.npcs.forEach(n => n.render(this.ctx));
        this.player.render(this.ctx);

        this.ctx.restore();

        // UI Overlays
        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('stat-hp').innerText = this.player.hp;
        document.getElementById('stat-max-hp').innerText = this.player.maxHp;
        document.getElementById('stat-energy').innerText = this.player.energy;
        document.getElementById('stat-max-energy').innerText = this.player.maxEnergy;
        document.getElementById('stat-gold').innerText = this.player.gold;
        
        document.getElementById('time-display').innerText = this.timeSystem.getTimeString();
        document.getElementById('date-display').innerText = `${this.timeSystem.season} ${this.timeSystem.day}, Year ${this.timeSystem.year}`;
        document.getElementById('weather-display').innerText = this.weatherSystem.getIcon() + ' ' + this.weatherSystem.current;
    }
}

// CAMERA
class Camera {
    constructor(target, width, height) {
        this.target = target;
        this.width = width;
        this.height = height;
        this.x = 0;
        this.y = 0;
        this.zoom = 1.5;
    }

    update() {
        if (!this.target) return;
        this.x = this.target.x - (this.width / 2) / this.zoom;
        this.y = this.target.y - (this.height / 2) / this.zoom;

        // Clamp bounds
        this.x = Math.max(0, Math.min(this.x, MAP_WIDTH * TILE_SIZE - this.width / this.zoom));
        this.y = Math.max(0, Math.min(this.y, MAP_HEIGHT * TILE_SIZE - this.height / this.zoom));
    }

    apply(ctx) {
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }
}

// PLAYER
class Player {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 28;
        this.speed = 2.5;
        this.config = config;
        this.hp = 100;
        this.maxHp = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.gold = 500;
        this.dir = 'down';
        this.isMoving = false;
    }

    update(game) {
        let dx = 0;
        let dy = 0;

        if (game.keys['w'] || game.keys['arrowup'] || game.touch.up) { dy = -1; this.dir = 'up'; }
        else if (game.keys['s'] || game.keys['arrowdown'] || game.touch.down) { dy = 1; this.dir = 'down'; }
        
        if (game.keys['a'] || game.keys['arrowleft'] || game.touch.left) { dx = -1; this.dir = 'left'; }
        else if (game.keys['d'] || game.keys['arrowright'] || game.touch.right) { dx = 1; this.dir = 'right'; }

        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        let newX = this.x + dx * this.speed;
        let newY = this.y + dy * this.speed;

        if (!game.world.checkCollision(newX, newY, this.width, this.height)) {
            this.x = newX;
            this.y = newY;
            this.isMoving = (dx !== 0 || dy !== 0);
        } else {
            this.isMoving = false;
        }
    }

    interact() {
        // Check front tile interaction
        let tx = Math.floor((this.x + this.width / 2) / TILE_SIZE);
        let ty = Math.floor((this.y + this.height / 2) / TILE_SIZE);
        if (this.dir === 'up') ty--;
        if (this.dir === 'down') ty++;
        if (this.dir === 'left') tx--;
        if (this.dir === 'right') tx++;

        window.game.world.interactTile(tx, ty);
    }

    render(ctx) {
        // Pixel Art Player Placeholder Render
        ctx.fillStyle = this.config.skin;
        ctx.fillRect(this.x + 6, this.y + 4, 12, 12); // Head

        ctx.fillStyle = this.config.hairColor;
        ctx.fillRect(this.x + 5, this.y + 2, 14, 6); // Hair

        ctx.fillStyle = this.config.shirt;
        ctx.fillRect(this.x + 4, this.y + 16, 16, 8); // Shirt

        ctx.fillStyle = this.config.pants;
        ctx.fillRect(this.x + 6, this.y + 24, 5, 4); // Legs
        ctx.fillRect(this.x + 13, this.y + 24, 5, 4);
    }

    serialize() {
        return { x: this.x, y: this.y, config: this.config, hp: this.hp, energy: this.energy, gold: this.gold };
    }

    static deserialize(data) {
        const p = new Player(data.x, data.y, data.config);
        p.hp = data.hp;
        p.energy = data.energy;
        p.gold = data.gold;
        return p;
    }
}

// NPC
class NPC {
    constructor(name, x, y, color) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.color = color;
        this.friendship = 0;
    }

    update(game) {
        // Simple idle behavior or schedule
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 4, this.y + 4, 20, 24);
        ctx.fillStyle = '#fff';
        ctx.font = '8px Courier New';
        ctx.fillText(this.name, this.x - 4, this.y - 2);
    }
}

// WORLD MAP & TILE ENGINE
class World {
    constructor() {
        this.tiles = [];
        this.farms = {}; // Key: "x,y", Value: {tilled, watered, crop, stage}
        this.generateMap();
    }

    generateMap() {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            let row = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                // 0: Grass, 1: Water, 2: Wall/Tree, 3: Farmland
                let type = 0;
                if (x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1) type = 2;
                else if (x > 20 && x < 25 && y > 15 && y < 18) type = 1; // Pond
                row.push(type);
            }
            this.tiles.push(row);
        }
    }

    checkCollision(x, y, w, h) {
        let left = Math.floor(x / TILE_SIZE);
        let right = Math.floor((x + w) / TILE_SIZE);
        let top = Math.floor(y / TILE_SIZE);
        let bottom = Math.floor((y + h) / TILE_SIZE);

        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
                if (this.tiles[ty][tx] === 1 || this.tiles[ty][tx] === 2) return true;
            }
        }
        return false;
    }

    interactTile(tx, ty) {
        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return;
        let key = `${tx},${ty}`;
        let activeItem = window.game.inventory.getActiveItem();

        if (activeItem && activeItem.name === 'Hoe') {
            this.farms[key] = this.farms[key] || { tilled: true, watered: false, crop: null, stage: 0 };
            window.game.audioSystem.playSFX('tool');
        } else if (activeItem && activeItem.name === 'Watering Can' && this.farms[key]) {
            this.farms[key].watered = true;
            window.game.audioSystem.playSFX('water');
        } else if (activeItem && activeItem.category === 'Seed' && this.farms[key] && !this.farms[key].crop) {
            this.farms[key].crop = activeItem.name.replace(' Seed', '');
            this.farms[key].stage = 1;
            window.game.inventory.removeItem(activeItem.name, 1);
        } else if (this.farms[key] && this.farms[key].stage >= 3) {
            // Harvest
            window.game.inventory.addItem(this.farms[key].crop, 1, 'Crop');
            this.farms[key].crop = null;
            this.farms[key].stage = 0;
            this.farms[key].tilled = false;
        }
    }

    update(game) {}

    render(ctx, camera) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                let t = this.tiles[y][x];
                let key = `${x},${y}`;
                
                if (t === 0) ctx.fillStyle = '#2ecc71'; // Grass
                else if (t === 1) ctx.fillStyle = '#3498db'; // Water
                else if (t === 2) ctx.fillStyle = '#27ae60'; // Tree/Wall

                if (this.farms[key] && this.farms[key].tilled) {
                    ctx.fillStyle = this.farms[key].watered ? '#795548' : '#8d6e63';
                }

                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = 'rgba(0,0,0,0.05)';
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Render Crop if exists
                if (this.farms[key] && this.farms[key].crop) {
                    ctx.fillStyle = '#f1c40f';
                    ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 8, 16, 16);
                }
            }
        }
    }

    serialize() {
        return { tiles: this.tiles, farms: this.farms };
    }

    deserialize(data) {
        this.tiles = data.tiles;
        this.farms = data.farms;
    }
}

// TIME & WEATHER SYSTEMS
class TimeSystem {
    constructor() {
        this.hour = 6;
        this.minute = 0;
        this.day = 1;
        this.season = 'Spring';
        this.year = 1;
        this.minuteCounter = 0;
    }

    update(game) {
        this.minuteCounter++;
        if (this.minuteCounter >= 60) { // Real-time scaling
            this.minuteCounter = 0;
            this.minute += 10;
            if (this.minute >= 60) {
                this.minute = 0;
                this.hour++;
                if (this.hour >= 26) { // Sleep at 2 AM
                    this.hour = 6;
                    this.advanceToNextDay();
                }
            }
        }
    }

    advanceToNextDay() {
        this.day++;
        if (this.day > 28) {
            this.day = 1;
            const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
            let idx = seasons.indexOf(this.season);
            this.season = seasons[(idx + 1) % 4];
            if (this.season === 'Spring') this.year++;
        }
        toggleModal('summary-modal', true);
    }

    getTimeString() {
        let h = this.hour % 24;
        let ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        let m = String(this.minute).padStart(2, '0');
        return `${h}:${m} ${ampm}`;
    }

    serialize() { return { hour: this.hour, minute: this.minute, day: this.day, season: this.season, year: this.year }; }
    deserialize(data) { Object.assign(this, data); }
}

class WeatherSystem {
    constructor() {
        this.current = 'Sunny';
    }
    getIcon() {
        if (this.current === 'Sunny') return '☀️';
        if (this.current === 'Rain') return '🌧️';
        if (this.current === 'Snow') return '❄️';
        return '⛅';
    }
}

class SeasonSystem {}

// INVENTORY & HOTBAR
class Inventory {
    constructor() {
        this.items = [];
        this.maxSlots = 20;
        this.selectedHotbar = 0;
        this.initHotbarUI();
    }

    addItem(name, qty, category) {
        let existing = this.items.find(i => i.name === name);
        if (existing) {
            existing.qty += qty;
        } else if (this.items.length < this.maxSlots) {
            this.items.push({ name, qty, category });
        }
        this.renderHotbar();
    }

    removeItem(name, qty) {
        let item = this.items.find(i => i.name === name);
        if (item) {
            item.qty -= qty;
            if (item.qty <= 0) {
                this.items = this.items.filter(i => i.name !== name);
            }
        }
        this.renderHotbar();
    }

    getActiveItem() {
        return this.items[this.selectedHotbar] || null;
    }

    initHotbarUI() {
        const hb = document.getElementById('hotbar');
        hb.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            let slot = document.createElement('div');
            slot.className = `hotbar-slot ${i === 0 ? 'active' : ''}`;
            slot.innerHTML = `<span class="slot-num">${i === 9 ? 0 : i + 1}</span><span class="slot-count" id="hb-count-${i}"></span>`;
            slot.id = `hb-slot-${i}`;
            hb.appendChild(slot);
        }
        this.renderHotbar();
    }

    renderHotbar() {
        for (let i = 0; i < 10; i++) {
            let slotEl = document.getElementById(`hb-slot-${i}`);
            let countEl = document.getElementById(`hb-count-${i}`);
            let item = this.items[i];
            if (item) {
                slotEl.innerHTML = `<span class="slot-num">${i === 9 ? 0 : i + 1}</span><span style="font-size:0.7rem">${item.name.substring(0,6)}</span><span class="slot-count">${item.qty}</span>`;
            } else {
                slotEl.innerHTML = `<span class="slot-num">${i === 9 ? 0 : i + 1}</span><span class="slot-count"></span>`;
            }
            if (i === this.selectedHotbar) slotEl.classList.add('active');
            else slotEl.classList.remove('active');
        }
    }

    serialize() { return { items: this.items }; }
    deserialize(data) { this.items = data.items; this.renderHotbar(); }
}

// QUEST & SKILLS & SOCIAL
class QuestSystem {
    constructor() {
        this.quests = [
            { title: 'Welcome to Town', desc: 'Meet Mayor Silas.', progress: 0, target: 1, reward: '100 Gold', completed: false }
        ];
    }
}

class CombatSystem {}

// DIALOGUE & CUTSCENE ENGINES
class DialogueSystem {
    constructor() {
        this.active = false;
    }
    show(speaker, text, options = []) {
        window.game.state = 'CUTSCENE';
        document.getElementById('dialogue-box').style.display = 'flex';
        document.getElementById('dialogue-speaker').innerText = speaker;
        document.getElementById('dialogue-text').innerText = text;
        const optContainer = document.getElementById('dialogue-options');
        optContainer.innerHTML = '';
        options.forEach(opt => {
            let btn = document.createElement('button');
            btn.className = 'dialogue-opt-btn';
            btn.innerText = opt.text;
            btn.onclick = () => { opt.callback(); window.game.dialogueSystem.hide(); };
            optContainer.appendChild(btn);
        });
    }
    hide() {
        document.getElementById('dialogue-box').style.display = 'none';
        window.game.state = 'PLAYING';
    }
}

class CutsceneEngine {
    playOpeningCutscene() {
        setTimeout(() => {
            window.game.dialogueSystem.show('Mayor Silas', 'Welcome to Stardream Valley! I am the Mayor. Here are your starter tools to build your new life.', [
                { text: 'Thank you, Mayor!', callback: () => {} }
            ]);
        }, 500);
    }
    update(game) {}
}

class AudioSystem {
    playSFX(name) { /* Audio Synth Placeholder */ }
}

// UI Helpers
function toggleModal(id, forceState) {
    const el = document.getElementById(id);
    if (!el) return;
    let show = forceState !== undefined ? forceState : el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    if (show && id === 'inventory-modal') renderInventoryModal();
}

function renderInventoryModal() {
    const grid = document.getElementById('inventory-grid-container');
    grid.innerHTML = '';
    window.game.inventory.items.forEach(item => {
        let slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.innerHTML = `<span style="font-size:0.7rem">${item.name}</span><span class="slot-count">${item.qty}</span>`;
        grid.appendChild(slot);
    });
}

function renderWorldMap() {
    const canvas = document.getElementById('worldMapCanvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2e4a28';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc((window.game.player.x / (MAP_WIDTH * TILE_SIZE)) * canvas.width, (window.game.player.y / (MAP_HEIGHT * TILE_SIZE)) * canvas.height, 4, 0, Math.PI*2);
    ctx.fill();
}

function renderQuestList() {
    const container = document.getElementById('quest-list-container');
    container.innerHTML = '';
    window.game.questSystem.quests.forEach(q => {
        let div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<strong>${q.title}</strong><br>${q.desc}<br>Reward: ${q.reward}`;
        container.appendChild(div);
    });
}

function renderSkillsList() {
    const container = document.getElementById('skills-list-container');
    container.innerHTML = `
        <div class="list-item">🌾 Farming: Level 1</div>
        <div class="list-item">⛏️ Mining: Level 1</div>
        <div class="list-item">🎣 Fishing: Level 1</div>
        <div class="list-item">⚔️ Combat: Level 1</div>
        <div class="list-item">🌿 Foraging: Level 1</div>
    `;
}

function renderSocialList() {
    const container = document.getElementById('social-list-container');
    container.innerHTML = '';
    window.game.npcs.forEach(n => {
        let div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<strong>${n.name}</strong> - ❤️ Friendship: ${n.friendship}/10`;
        container.appendChild(div);
    });
}

// Initialize Game on Load
window.addEventListener('load', () => {
    window.game = new Game();
});
