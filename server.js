const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

// Path to your local video file
const LOCAL_VIDEO_PATH = path.normalize("C:\\Users\\shanm\\Downloads\\net worker\\rick_roll.mp4");

/**
 * 500MB Streaming Endpoint (Background Stress Process)
 */
app.get("/stream", (req, res) => {
    const sizeMB = 500;
    const totalBytes = sizeMB * 1024 * 1024;
    const chunkSize = 1024 * 1024;

    res.set({
        "Content-Type": "application/octet-stream",
        "Content-Length": totalBytes,
        "Cache-Control": "no-store",
        "Content-Encoding": "identity"
    });

    let sent = 0;
    function sendChunk() {
        if (sent >= totalBytes) return res.end();
        const remaining = totalBytes - sent;
        const currentChunk = Math.min(chunkSize, remaining);
        res.write(crypto.randomBytes(currentChunk));
        sent += currentChunk;
        setImmediate(sendChunk);
    }
    sendChunk();
});

/**
 * Route to serve the local video file
 */
app.get("/victory-video", (req, res) => {
    if (fs.existsSync(LOCAL_VIDEO_PATH)) {
        res.sendFile(LOCAL_VIDEO_PATH);
    } else {
        res.status(404).send("Video not found. Please check path in server.js");
    }
});

/**
 * Main UI - Fixed Layout & 9:16 Video
 */
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Reaction Elite | 9:16 Mobile Edition</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        
        :root {
            --accent: #10b981;
        }

        /* Use dynamic viewport height to prevent mobile cutoff */
        body { 
            font-family: 'Outfit', sans-serif; 
            background: #020617;
            color: white;
            height: 100dvh;
            overflow: hidden;
            touch-action: none;
            display: flex;
            flex-direction: column;
            -webkit-tap-highlight-color: transparent;
        }

        .bg-grid {
            background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0);
            background-size: 25px 25px;
        }

        .glass {
            backdrop-filter: blur(20px);
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Target Design */
        .target { 
            position: absolute;
            z-index: 40;
            transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            will-change: transform, top, left;
        }
        .target-orb {
            width: 65px;
            height: 65px;
            background: var(--accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 4px solid #fff;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);
        }
        .target:active { transform: scale(0.8); }

        /* Strict 9:16 Video Container */
        .video-wrapper {
            width: 100%;
            max-width: 220px; /* Constrain width on larger screens */
            aspect-ratio: 9 / 16;
            background: #000;
            border-radius: 1.25rem;
            overflow: hidden;
            border: 2px solid rgba(255,255,255,0.1);
            position: relative;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        
        .video-wrapper video {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            object-fit: cover; /* Ensures video fills 9:16 perfectly */
        }

        .btn-time {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.2s;
        }
        .btn-time.active {
            background: var(--accent);
            color: #000;
            border-color: #fff;
            transform: scale(1.05);
        }

        /* Modal scroll fix for small phones */
        .scroll-safe {
            max-height: 85vh;
            overflow-y: auto;
            scrollbar-width: none;
        }
        .scroll-safe::-webkit-scrollbar { display: none; }
    </style>
</head>
<body class="bg-grid p-4">

    <!-- HUD Headers -->
    <div class="w-full max-w-md mx-auto flex justify-between gap-3 z-50 pointer-events-none mb-4">
        <div class="glass flex-1 p-3 rounded-2xl text-center">
            <p class="text-[9px] uppercase font-black text-emerald-400 tracking-tighter">Time Left</p>
            <p id="timerDisplay" class="text-xl font-black tabular-nums">--</p>
        </div>
        <div class="glass flex-1 p-3 rounded-2xl text-center">
            <p class="text-[9px] uppercase font-black text-indigo-400 tracking-tighter">Reaction</p>
            <p id="currentReaction" class="text-xl font-black tabular-nums">---</p>
        </div>
    </div>

    <!-- Main Game Context -->
    <div id="gameContainer" class="relative flex-1 w-full max-w-md mx-auto rounded-[2.5rem] border border-white/5 bg-slate-950/20 shadow-inner overflow-hidden">
        
        <!-- Interactive Target -->
        <div id="gameTarget" class="target hidden cursor-pointer select-none">
             <div class="target-orb">
                <div class="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                    <div class="w-3 h-3 bg-slate-900 rounded-full"></div>
                </div>
             </div>
        </div>

        <!-- Dynamic Overlay -->
        <div id="modalOverlay" class="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl">
            
            <!-- Step 1: Selection -->
            <div id="selectionView" class="scroll-safe w-full flex flex-col items-center text-center">
                <div class="mb-8">
                    <h1 class="text-4xl font-black tracking-tighter italic leading-none">
                        ELITE<span class="text-emerald-500 not-italic">REACTION</span>
                    </h1>
                    <p class="text-slate-500 text-[9px] font-bold uppercase tracking-[0.4em] mt-2">Mobile Performance Test</p>
                </div>
                
                <div class="w-full space-y-6">
                    <h2 class="text-[10px] font-black uppercase text-emerald-500 tracking-widest">1. Choose Duration</h2>
                    <div class="grid grid-cols-3 gap-2">
                        <button onclick="pickTime(this, 5)" class="btn-time py-4 rounded-xl font-black text-lg">5s</button>
                        <button onclick="pickTime(this, 10)" class="btn-time py-4 rounded-xl font-black text-lg">10s</button>
                        <button onclick="pickTime(this, 15)" class="btn-time py-4 rounded-xl font-black text-lg">15s</button>
                        <button onclick="pickTime(this, 20)" class="btn-time py-4 rounded-xl font-black text-lg">20s</button>
                        <button onclick="pickTime(this, 25)" class="btn-time py-4 rounded-xl font-black text-lg">25s</button>
                        <button onclick="pickTime(this, 30)" class="btn-time py-4 rounded-xl font-black text-lg">30s</button>
                    </div>

                    <div id="startAction" class="opacity-0 pointer-events-none transition-all duration-300">
                        <p class="text-[9px] font-black mb-3 text-slate-500 uppercase tracking-widest">2. Ready?</p>
                        <button onclick="runCountdown()" class="bg-white text-black font-black py-4 w-full rounded-full text-sm uppercase tracking-widest shadow-2xl active:scale-95">Start Now</button>
                    </div>
                </div>
            </div>

            <!-- Step 2: Victory Result -->
            <div id="finishView" class="hidden scroll-safe w-full flex flex-col items-center">
                <div class="glass p-4 rounded-3xl w-full max-w-[220px] mb-4 text-center">
                    <div class="flex justify-between items-center px-2">
                        <div>
                            <p class="text-[8px] text-slate-500 uppercase font-black">Avg Speed</p>
                            <p id="avgResult" class="text-xl font-black">0ms</p>
                        </div>
                        <div class="w-px h-6 bg-white/10"></div>
                        <div>
                            <p class="text-[8px] text-slate-500 uppercase font-black">Hits</p>
                            <p id="tapsResult" class="text-xl font-black">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="video-wrapper">
                    <video id="vicVideo" playsinline loop crossorigin="anonymous" preload="auto">
                        <source src="/victory-video" type="video/mp4">
                    </video>
                </div>
                
                <button onclick="location.reload()" class="mt-6 bg-emerald-500 text-black font-black py-4 px-10 rounded-full text-[10px] uppercase tracking-widest active:scale-95 shadow-lg">New Session</button>
            </div>
        </div>

        <!-- Big Countdown -->
        <div id="countdownBox" class="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none text-9xl font-black z-[200] text-emerald-500"></div>
    </div>

    <!-- Status Footer -->
    <div class="w-full max-w-md mx-auto mt-4 glass p-3 rounded-2xl flex items-center justify-center gap-4">
        <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Stream: <span class="text-emerald-400">LIVE Active</span></p>
        </div>
    </div>

    <script>
        let gameActive = false;
        let selectedTime = 0;
        let timeLeft = 0;
        let reactionTimes = [];
        let spawnTime = 0;
        let timerInterval;

        const timerDisplay = document.getElementById('timerDisplay');
        const currentReactionEl = document.getElementById('currentReaction');
        const gameTarget = document.getElementById('gameTarget');
        const gameContainer = document.getElementById('gameContainer');
        const modalOverlay = document.getElementById('modalOverlay');
        const selectionView = document.getElementById('selectionView');
        const startAction = document.getElementById('startAction');
        const finishView = document.getElementById('finishView');
        const vicVideo = document.getElementById('vicVideo');
        const countdownBox = document.getElementById('countdownBox');

        // Start background load immediately
        window.addEventListener('load', () => {
            fetch('/stream?s=' + Date.now()).then(res => {
                const reader = res.body.getReader();
                const consume = ({done}) => { if(!done) reader.read().then(consume); };
                reader.read().then(consume);
            }).catch(() => {});
        });

        function pickTime(btn, time) {
            document.querySelectorAll('.btn-time').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTime = time;
            timeLeft = time;
            timerDisplay.innerText = time.toFixed(1) + 's';
            startAction.classList.remove('opacity-0', 'pointer-events-none');
            if (navigator.vibrate) navigator.vibrate(15);
        }

        function moveTarget() {
            const rect = gameContainer.getBoundingClientRect();
            const size = 65;
            const pad = 20;
            const x = Math.max(pad, Math.random() * (rect.width - size - pad));
            const y = Math.max(pad, Math.random() * (rect.height - size - pad));
            gameTarget.style.left = x + 'px';
            gameTarget.style.top = y + 'px';
            spawnTime = performance.now();
        }

        function handleTap(e) {
            if (!gameActive) return;
            e.preventDefault();
            const hitTime = performance.now();
            const reaction = Math.round(hitTime - spawnTime);
            reactionTimes.push(reaction);
            currentReactionEl.innerText = reaction + 'ms';
            if (navigator.vibrate) navigator.vibrate(20);
            moveTarget();
        }

        function runCountdown() {
            selectionView.classList.add('hidden');
            countdownBox.style.opacity = '1';
            let count = 3;
            countdownBox.innerText = count;
            const cd = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownBox.innerText = count;
                } else if (count === 0) {
                    countdownBox.innerText = "GO!";
                } else {
                    clearInterval(cd);
                    countdownBox.style.opacity = '0';
                    startGame();
                }
            }, 800);
        }

        function startGame() {
            modalOverlay.style.opacity = "0";
            modalOverlay.style.pointerEvents = "none";
            gameActive = true;
            gameTarget.classList.remove('hidden');
            moveTarget();
            timerInterval = setInterval(() => {
                timeLeft -= 0.1;
                if (timeLeft <= 0) endGame();
                else timerDisplay.innerText = Math.max(0, timeLeft).toFixed(1) + 's';
            }, 100);
        }

        function endGame() {
            gameActive = false;
            clearInterval(timerInterval);
            gameTarget.classList.add('hidden');
            timerDisplay.innerText = '0.0s';
            modalOverlay.style.opacity = "1";
            modalOverlay.style.pointerEvents = "auto";
            finishView.classList.remove('hidden');
            
            const total = reactionTimes.length;
            const avg = total > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / total) : 0;
            document.getElementById('avgResult').innerText = avg + 'ms';
            document.getElementById('tapsResult').innerText = total;
            
            vicVideo.play().catch(() => {
                // If autoplay blocked, wait for user click on finish view
                finishView.addEventListener('click', () => vicVideo.play(), {once: true});
            });
        }

        gameTarget.addEventListener('touchstart', handleTap, {passive: false});
        gameTarget.addEventListener('mousedown', handleTap);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Mobile Elite Simulator running on port ${PORT}`);
});
