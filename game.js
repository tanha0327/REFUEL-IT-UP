/**
 * REFUEL IT UP - Main Game Logic
 * Ver01.24.18.37.21s
 */

// --- Constants & Config ---
const CONFIG = {
    BPM: 100, // Default BPM
    FPS: 60,
    LOOKAHEAD: 25.0, // ms
    SCHEDULE_AHEAD_TIME: 0.1, // seconds
    INPUT_TOLERANCE: 0.15, // beats (Tolerance for "Perfect" timing)
};

const STATE = {
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER',
    SHOP: 'SHOP'
};

// --- Vehicle Configs ---
const VEHICLE_TYPES = {
    LIGHT_TRUCK: { name: 'TRUCK', color: '#ffeb3b', beatsToFill: 3, speed: 1.0 },
    SPORTS_CAR: { name: 'SPORTS', color: '#f44336', beatsToFill: 2, speed: 1.5 },
    BUS: { name: 'BUS', color: '#2196f3', beatsToFill: 8, speed: 0.8 },
    UFO: { name: 'UFO', color: '#9c27b0', beatsToFill: 4, speed: 1.2 } // Special rhythm later
};

// --- Game Logic Classes ---

class Vehicle {
    constructor(type, spawnBeat) {
        this.type = type;
        this.spawnBeat = spawnBeat; // The beat this car is scheduled to Arrive at pump
        this.state = 'APPROACHING'; // APPROACHING, ARRIVED, FILLING, FILLED, LEAVING, MISSED

        // Progress
        this.fillProgress = 0; // 0 to 1
        this.fillStartTime = 0;
    }

    /* 
       Beat Lifecycle:
       spawnBeat - 4: Spawns offscreen
       spawnBeat: Arrives at pump (Player must CLICK)
       spawnBeat + beatsToFill: Fuel full (Player must RELEASE)
    */

    update(currentBeat) {
        // Logic handled by Manager for now
    }
}

class VehicleManager {
    constructor(game) {
        this.game = game;
        this.vehicles = [];
        this.activeVehicle = null;
        this.nextSpawnBeat = 4; // Start spawning at beat 4
    }

    update(beat) {
        // Spawn logic: Simple interval for now
        if (beat >= this.nextSpawnBeat - 4) { // Spawn 4 beats ahead visually
            // Check if we already spawned for this beat
            const alreadySpawned = this.vehicles.some(v => v.spawnBeat === this.nextSpawnBeat);
            if (!alreadySpawned) {
                this.spawnVehicle(this.nextSpawnBeat);
                this.nextSpawnBeat += 8; // Every 8 beats for testing
            }
        }

        // Cleanup
        this.vehicles = this.vehicles.filter(v => v.state !== 'DONE');
    }

    spawnVehicle(beat) {
        // Random type
        const keys = Object.keys(VEHICLE_TYPES);
        const typeKey = keys[Math.floor(Math.random() * keys.length)];
        const car = new Vehicle(VEHICLE_TYPES[typeKey], beat);
        this.vehicles.push(car);
        console.log("Spawned", car.type.name, "for beat", beat);
    }

    getClosestVehicle(currentBeat) {
        // Find vehicle closest to "Arriving" (spawnBeat)
        return this.vehicles.find(v => Math.abs(v.spawnBeat - currentBeat) < 2 && v.state === 'APPROACHING');
    }
}


class Conductor {
    constructor() {
        this.audioContext = null;
        this.isRunning = false;
        this.isPlaying = false;
        this.bpm = CONFIG.BPM;
        this.beatDuration = 60 / this.bpm;

        // Timing tracking
        this.startTime = 0; // Context time when playback started
        this.currentBeat = 0;
        this.lastBeat = 0;

        // Event listeners for rhythm events
        this.onBeat = null; // Callback function
    }

    init() {
        // Initialize AudioContext on user interaction
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        console.log("AudioContext Initialized");
    }

    start() {
        if (!this.audioContext) this.init();
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isRunning = true;
        this.startTime = this.audioContext.currentTime;
        this.lastBeat = 0;
        this.currentBeat = 0;

        // Metronome / Music would start here
        console.log("Conductor Started at BPM: " + this.bpm);
    }

    playTone(freq, time, duration) {
        if (!this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.value = freq;

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(time);
        
        // Envelope
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.3, time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

        oscillator.stop(time + duration + 0.1);
    }

    playStartupSequence() {
        if (!this.audioContext) return;
        const now = this.audioContext.currentTime;
        // C5, E5, G5, C6 "Pi-Po-Po-Po"
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        const step = 0.12; // Fast sequence

        notes.forEach((freq, i) => {
            this.playTone(freq, now + (i * step), 0.2);
        });
    }

    stop() {
        this.isRunning = false;
    }

    update() {
        if (!this.isRunning || !this.audioContext) return;

        // Calculate current beat based on elapsed time
        const elapsedTime = this.audioContext.currentTime - this.startTime;
        this.currentBeat = elapsedTime / this.beatDuration;

        // Check for integer beat crossings
        if (Math.floor(this.currentBeat) > this.lastBeat) {
            this.lastBeat = Math.floor(this.currentBeat);
            // Trigger beat event
            if (this.onBeat) this.onBeat(this.lastBeat);
        }
    }
}

class InputHandler {
    constructor(game) {
        this.game = game;
        this.isHolding = false;

        // Bind methods
        this.handleStart = this.handleStart.bind(this);
        this.handleEnd = this.handleEnd.bind(this);

        // Attach listeners to the whole document for now
        document.addEventListener('mousedown', this.handleStart);
        document.addEventListener('touchstart', this.handleStart, { passive: false });

        document.addEventListener('mouseup', this.handleEnd);
        document.addEventListener('touchend', this.handleEnd);
    }

    handleStart(e) {
        if (e.type === 'touchstart') e.preventDefault(); // Prevent scroll/zoom

        if (this.game.state === STATE.TITLE) {
            this.game.startGame();
            return;
        }

        if (this.game.state === STATE.PLAYING) {
            this.isHolding = true;
            this.game.handleInput('PRESS');
        }
    }

    handleEnd(e) {
        if (this.game.state === STATE.PLAYING && this.isHolding) {
            this.isHolding = false;
            this.game.handleInput('RELEASE');
        }
    }
}

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        // Internal "Virtual" Resolution for Pixel Art
        this.virtualWidth = 180;
        this.virtualHeight = 320;

        // Helper to center the content if aspect ratio differs
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // We set the canvas INTENAL resolution to low-res
        this.canvas.width = this.virtualWidth;
        this.canvas.height = this.virtualHeight;

        // The CSS will scale it up. 
        // We don't need to scale context because we want to draw in low-res coordinates (0-180, 0-320)
        this.width = this.virtualWidth;
        this.height = this.virtualHeight;

        this.ctx.imageSmoothingEnabled = false; // Critical for pixel art
    }

    clear() {
        this.ctx.fillStyle = '#1a1a2e'; // Solid bg for now
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    draw(state, conductor, vehicleManager) {
        this.clear();

        if (state === STATE.PLAYING) {
            this.drawTrack(conductor);
            if (vehicleManager) {
                vehicleManager.vehicles.forEach(v => this.drawVehicle(v, conductor));
            }
            this.drawDebugVisuals(conductor);
            this.drawNozzle(conductor, vehicleManager);
        }
    }

    drawTrack(conductor) {
        // Draw the "Beat Line" or Pump Station
        const centerX = this.width / 2;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(centerX - 2, 0, 4, this.height);

        // Draw Pump Station
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(centerX - 60, this.height / 2 - 60, 120, 120);
        this.ctx.fillStyle = '#FF0055';
        this.ctx.font = '20px Outfit';
        this.ctx.fillText("PUMP", centerX, this.height / 2 - 70);
    }

    drawVehicle(vehicle, conductor) {
        const beat = conductor.currentBeat;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Position Logic
        let offsetX = (vehicle.spawnBeat - beat) * 300; // 300px per beat speed

        if (vehicle.state === 'FILLING') {
            offsetX = 0; // Lock to center
        } else if (vehicle.state === 'LEAVING') {
            const finishedBeat = vehicle.spawnBeat + vehicle.type.beatsToFill;
            offsetX = (finishedBeat - beat) * 500; // Faster exit
        } else if (vehicle.state === 'MISSED') {
            offsetX = (vehicle.spawnBeat - beat) * 800 + 100; // Fly away
        }

        const x = centerX + offsetX;

        // Draw Car
        this.ctx.fillStyle = vehicle.type.color;
        this.ctx.beginPath();
        this.ctx.roundRect(x - 50, centerY - 30, 100, 60, 10);
        this.ctx.fill();

        // Text
        this.ctx.fillStyle = 'black';
        this.ctx.font = '14px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(vehicle.type.name, x, centerY);

        // Filling Bar
        if (vehicle.state === 'FILLING') {
            const progress = (beat - vehicle.fillStartTime) / vehicle.type.beatsToFill;
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(x - 40, centerY - 40, 80 * Math.min(progress, 1), 5);
        }
    }

    drawNozzle(conductor, vehicleMgr) {
        // Visual placeholder
    }

    drawDebugVisuals(conductor) {
        // Draw a pulsing circle to the beat
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Calculate pulse based on beat fraction
        const beatFraction = conductor.currentBeat % 1;
        const pulse = 1 - Math.pow(beatFraction, 3);

        const radius = 20 + (pulse * 5); // Smaller radius for low res

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 0, 85, ${0.3 + pulse * 0.5})`;
        this.ctx.fill();
        this.ctx.closePath();

        // Draw Beat Counter
        this.ctx.fillStyle = 'white';
        // Use generic monospace as fallback or pixel font
        this.ctx.font = '10px "Press Start 2P", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`BEAT:${Math.floor(conductor.currentBeat)}`, centerX, centerY - 50);
    }
}

class Game {
    constructor() {
        this.state = STATE.TITLE;
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.conductor = new Conductor();
        this.vehicleManager = new VehicleManager(this);
        this.inputHandler = new InputHandler(this);

        // Game Entities
        this.score = 0;
        this.combo = 0;

        // UI References
        this.ui = {
            start: document.getElementById('start-screen'),
            hud: document.getElementById('hud'),
            result: document.getElementById('result-screen'),
            score: document.getElementById('score-display'),
            combo: document.getElementById('combo-display')
        };

        // Bind main loop
        this.loop = this.loop.bind(this);

        // Helper
        this.conductor.onBeat = (beat) => {
            console.log("BEAT!", beat);
            // Will spawn cars here later
        };

        // Start Loop
        requestAnimationFrame(this.loop);
    }

    startGame() {
        if (this.state === STATE.PLAYING) return;

        console.log("Game Starting...");
        this.state = STATE.PLAYING;

        // UI Updates
        this.ui.start.classList.add('hidden');
        this.ui.start.classList.remove('active');
        this.ui.hud.classList.remove('hidden');
        this.ui.hud.classList.add('active');

        // Audio Start
        this.conductor.start();
        this.conductor.playStartupSequence();
    }

    handleInput(type) {
        const beat = this.conductor.currentBeat;
        console.log("Input:", type, "Beat:", beat);

        if (type === 'PRESS') {
            // 1. Check if a car is at the pump
            const vehicle = this.vehicleManager.vehicles.find(v => v.state === 'APPROACHING' || v.state === 'ARRIVED');

            if (vehicle) {
                // Check Timing
                const diff = beat - vehicle.spawnBeat;

                if (Math.abs(diff) <= CONFIG.INPUT_TOLERANCE) {
                    // PERFECT HIT
                    console.log("PERFECT START!");
                    vehicle.state = 'FILLING';
                    vehicle.fillStartTime = beat;
                    this.vehicleManager.activeVehicle = vehicle;
                    this.score += 100;
                    this.combo++;
                    this.updateUI();
                } else {
                    console.log("MISS (Timing)", diff);
                    // Penalty logic here
                }
            }
        } else if (type === 'RELEASE') {
            const vehicle = this.vehicleManager.activeVehicle;
            if (vehicle && vehicle.state === 'FILLING') {
                // Calculate target release beat
                const targetBeat = vehicle.spawnBeat + vehicle.type.beatsToFill;
                const diff = beat - targetBeat;

                if (Math.abs(diff) <= CONFIG.INPUT_TOLERANCE) {
                    console.log("PERFECT FINISH!");
                    vehicle.state = 'LEAVING';
                    this.score += 500;
                    this.updateUI();
                } else {
                    console.log("MISS (Released Too Early/Late)", diff);
                    vehicle.state = 'MISSED';
                    this.combo = 0;
                    this.updateUI();
                    setTimeout(() => vehicle.state = 'LEAVING', 500);
                }
                this.vehicleManager.activeVehicle = null;
            }
        }
    }

    updateUI() {
        this.ui.score.innerText = this.score.toString().padStart(6, '0');
        this.ui.combo.innerText = this.combo;
        this.ui.combo.parentElement.classList.toggle('active', this.combo > 1);
    }

    update() {
        this.conductor.update();
        if (this.state === STATE.PLAYING) {
            this.vehicleManager.update(this.conductor.currentBeat);

            // Check for missed starts
            this.vehicleManager.vehicles.forEach(v => {
                if (v.state === 'APPROACHING' && this.conductor.currentBeat > v.spawnBeat + CONFIG.INPUT_TOLERANCE) {
                    v.state = 'MISSED';
                    console.log("MISSED CAR (Ignored)");
                    this.combo = 0;
                    this.updateUI();
                    setTimeout(() => v.state = 'LEAVING', 500);
                }
            });
        }
    }

    draw() {
        this.renderer.draw(this.state, this.conductor, this.vehicleManager);
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

// --- Bootstrap ---
window.onload = () => {
    const game = new Game();
};
