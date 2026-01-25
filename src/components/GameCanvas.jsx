import { useEffect, useRef } from 'react';

const CONFIG = {
    BPM: 100,
    LANE_Y: 0.5, // 50% down
    HIT_X: 100, // Pixel position of Hit Circle
    NOTE_SPEED: 300, // Pixels per beat
    TOLERANCE: 0.2 // Beat tolerance
};

const TYPES = {
    REGULAR: { color: '#ffeb3b' },
    PREMIUM: { color: '#f44336' },
    DIESEL: { color: '#2196f3' },
    ELECTRIC: { color: '#9c27b0' }
};

// Polyfill helper
function drawRoundedRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

export default function GameCanvas({ gameState, selectedFuel, onScore }) {
    const canvasRef = useRef(null);
    const fuelRef = useRef(selectedFuel);
    const gameRef = useRef({
        audioCtx: null,
        startTime: 0,
        vehicles: [],
        nextSpawn: 4,
        score: 0
    });

    useEffect(() => {
        fuelRef.current = selectedFuel;
    }, [selectedFuel]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrame;

        const drawStatic = (ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);

            // Draw Lane
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(0, h * 0.4, w, h * 0.2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, h * 0.5);
            ctx.lineTo(w, h * 0.5);
            ctx.stroke();

            // Draw Hit Zone (Left)
            ctx.beginPath();
            ctx.arc(CONFIG.HIT_X, h * 0.5, 40, 0, Math.PI * 2);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.font = '700 12px Outfit';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText("PUMP", CONFIG.HIT_X, h * 0.5 + 4);
        };

        const resize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            canvas.width = w * window.devicePixelRatio;
            canvas.height = h * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            // Initial draw
            drawStatic(ctx, w, h);
        };
        window.addEventListener('resize', resize);
        resize();

        const spawnVehicle = (beat) => {
            const types = Object.keys(TYPES);
            const type = types[Math.floor(Math.random() * types.length)];
            gameRef.current.vehicles.push({
                type,
                spawnBeat: beat,
                missed: false,
                hit: false
            });
        };

        const update = () => {
            if (gameState !== 'PLAYING') return;
            const state = gameRef.current;
            if (!state.audioCtx) return;

            const currentTime = state.audioCtx.currentTime - state.startTime;
            const currentBeat = currentTime * (CONFIG.BPM / 60);

            // Spawn
            if (currentBeat >= state.nextSpawn - 4) {
                // Schedule 4 beats ahead
                if (!state.vehicles.some(v => v.spawnBeat === state.nextSpawn)) {
                    spawnVehicle(state.nextSpawn);
                    state.nextSpawn += 2; // Every 2 beats
                }
            }

            // Cleanup
            state.vehicles = state.vehicles.filter(v => v.spawnBeat > currentBeat - 4);

            draw(ctx, currentBeat);
            animationFrame = requestAnimationFrame(update);
        };

        const draw = (ctx, beat) => {
            const w = window.innerWidth;
            const h = window.innerHeight;

            drawStatic(ctx, w, h);

            // Draw Vehicles
            const state = gameRef.current;
            state.vehicles.forEach(v => {
                if (v.hit) return; // Don't draw hit ones

                // Position: Car is at HIT_X at beat = spawnBeat
                // Before that: It's to the right. 
                // Dist = (spawnBeat - currentBeat) * Speed
                const dist = (v.spawnBeat - beat) * CONFIG.NOTE_SPEED;
                const x = CONFIG.HIT_X + dist;

                // Draw
                ctx.fillStyle = TYPES[v.type].color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = TYPES[v.type].color;
                ctx.beginPath();

                // Micro Car Size (Taiko Note style)
                drawRoundedRect(ctx, x - 20, h * 0.5 - 15, 40, 30, 8);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Label
                ctx.fillStyle = 'white'; // Contrast text
                ctx.font = '700 10px Outfit';
                ctx.fillText(v.type.substring(0, 3), x, h * 0.5 + 4);
            });
        };

        if (gameState === 'PLAYING') {
            // Start Audio
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            gameRef.current.audioCtx = ctx;
            gameRef.current.startTime = ctx.currentTime;
            ctx.resume();
            update();
        }

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', resize);
        };
    }, [gameState]);

    const handleTap = () => {
        if (gameState !== 'PLAYING') return;
        const state = gameRef.current;
        const beat = (state.audioCtx.currentTime - state.startTime) * (CONFIG.BPM / 60);

        // Check closest vehicle
        // Filter those not hit yet
        const candidates = state.vehicles.filter(v => !v.hit && !v.missed && Math.abs(v.spawnBeat - beat) < 0.5);
        if (candidates.length === 0) return;

        // Closest
        const target = candidates.reduce((prev, curr) =>
            Math.abs(curr.spawnBeat - beat) < Math.abs(prev.spawnBeat - beat) ? curr : prev
        );

        const diff = Math.abs(target.spawnBeat - beat);
        if (diff < CONFIG.TOLERANCE) {
            // HIt! Check Fuel
            if (target.type === fuelRef.current) {
                target.hit = true;
                onScore(100);
                // Play sound?
            } else {
                console.log("Wrong Fuel!");
                // Penalty?
            }
        }
    };

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            onTouchStart={handleTap}
            onMouseDown={handleTap}
        />
    );
}
