const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

// Path to your local video file
const LOCAL_VIDEO_PATH = path.normalize("C:\\Users\\shanm\\Downloads\\net worker\\rick_roll.mp4");

/**
 * 500MB Streaming Endpoint
 * UPDATED: Uses backpressure handling to prevent 502 Bad Gateway errors.
 * It waits for the 'drain' event before sending more data.
 */
app.get("/stream", (req, res) => {
    const sizeMB = 500;
    const totalBytes = sizeMB * 1024 * 1024;
    const chunkSize = 64 * 1024; // Smaller chunks for better stability

    res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": totalBytes,
        "Cache-Control": "no-store",
    });

    let sent = 0;

    function send() {
        while (sent < totalBytes) {
            const remaining = totalBytes - sent;
            const currentChunk = Math.min(chunkSize, remaining);
            const buffer = crypto.randomBytes(currentChunk);
            
            sent += currentChunk;
            const canContinue = res.write(buffer);
            
            if (!canContinue) {
                // If buffer is full, wait for it to drain
                res.once('drain', send);
                return;
            }
        }
        res.end();
    }

    send();

    req.on("close", () => {
        // Stop process if client disconnects
        sent = totalBytes;
    });
});

/**
 * Route to serve the local video file
 */
app.get("/victory-video", (req, res) => {
    if (fs.existsSync(LOCAL_VIDEO_PATH)) {
        res.sendFile(LOCAL_VIDEO_PATH);
    } else {
        res.status(404).send("Local video file not found.");
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
    <title>Reaction Elite | Fixed UI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        
        :root {
            --accent: #10b981;
        }

        /* Dynamic Viewport Height (dvh) prevents cutoffs by mobile UI bars */
        body { 
            font-family: 'Outfit', sans-serif; 
            background: #020617;
            color: white;
            height: 100dvh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            -webkit-tap-highlight-color: transparent;
        }

        .bg-grid {
            background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0);
            background-size: 30px 30px;
        }

        /* High-Contrast Tactical Target */
        .target { 
            position: absolute;
            z-index: 40;
            transition: transform 0.05s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            will-change: transform, top, left;
        }
        .target-orb {
            width: 75px;
            height: 75px;
            background: var(--accent);
            border: 4px solid #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
        }
        .target-core {
            width: 15px;
            height: 15px;
            background: #000;
            border-radius: 50%;
            border: 2px solid #fff;
        }

        /* Strict 9:16 Vertical Container */
        .video-9-16 {
            width: 100%;
            max-width: min(70vw, 240px);
            aspect-ratio: 9 / 16;
            background: #000;
            border-radius: 1.5rem;
            overflow: hidden;
            border: 2px solid rgba(255,255,255,0.1);
            position: relative;
        }
        .video-9-16 video {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            object-fit: cover;
        }

        .glass {
            backdrop-filter: blur(20px);
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1);
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
            box-shadow: 0 0 20px var(--accent);
        }

        #modalOverlay {
            padding: env(safe-area-inset-top) 1.5rem env(safe-area-inset-bottom);
        }
    </style>
</head>
<body class="bg-grid">

    <!-- Top HUD - Pushed to absolute top -->
    <div class="w-full max-w-md mx-auto flex justify-between gap-4 p-4 z-[110] relative pointer-events-none">
        <div class="glass flex-1 p-3 rounded-3xl text-center">
            <p class="text-[9px] uppercase font-black text-emerald-400">Timer</p>
            <p id="timerDisplay" class="text-xl font-black">--</p>
        </div>
        <div class="glass flex-1 p-3 rounded-3xl text-center text-right">
            <p class="text-[9px] uppercase font-black text-indigo-400">Reaction</p>
            <p id="currentReaction" class="text-xl font-black">---</p>
        </div>
    </div>

    <!-- Central Interactive Area -->
    <div id="gameContainer" class="relative flex-1 w-full max-w-md mx-auto rounded-[3rem] border border-white/5 bg-slate-950/20 shadow-2xl overflow-hidden mb-4">
        
        <!-- The Target -->
        <div id="gameTarget" class="target hidden cursor-pointer select-none">
             <div class="target-orb">
                <div class="target-core"></div>
             </div>
        </div>

        <!-- Dynamic Overlay (Selection / Results) -->
        <div id="modalOverlay" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-3xl transition-opacity duration-500">
            
            <!-- Step 1: Duration Selection -->
            <div id="selectionView" class="w-full flex flex-col items-center px-4">
                <div class="mb-10 text-center">
                    <h1 class="text-4xl font-black tracking-tighter italic italic">
                        ELITE<span class="text-emerald-500 not-italic">REACTION</span>
                    </h1>
                    <p class="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Mobile Performance Test</p>
                </div>
                
                <div class="glass w-full rounded-[2.5rem] p-8 border-white/10 text-center">
                    <h2 class="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-6 italic">1. Select Endurance</h2>
                    <div class="grid grid-cols-3 gap-3 mb-10">
                        <button onclick="pickTime(this, 5)" class="btn-time py-4 rounded-2xl font-black text-xl">5s</button>
                        <button onclick="pickTime(this, 10)" class="btn-time py-4 rounded-2xl font-black text-xl">10s</button>
                        <button onclick="pickTime(this, 15)" class="btn-time py-4 rounded-2xl font-black text-xl">15s</button>
                        <button onclick="pickTime(this, 20)" class="btn-time py-4 rounded-2xl font-black text-xl">20s</button>
                        <button onclick="pickTime(this, 25)" class="btn-time py-4 rounded-2xl font-black text-xl">25s</button>
                        <button onclick="pickTime(this, 30)" class="btn-time py-4 rounded-2xl font-black text-xl">30s</button>
                    </div>

                    <div id="startAction" class="opacity-0 pointer-events-none transition-all duration-300 transform scale-90">
                        <button onclick="runCountdown()" class="bg-white text-black font-black py-5 w-full rounded-full text-sm uppercase tracking-widest shadow-2xl active:scale-95">Initiate Start</button>
                    </div>
                </div>
            </div>

            <!-- Step 2: Victory Result -->
            <div id="finishView" class="hidden w-full h-full flex flex-col items-center justify-center p-4">
                <div class="glass p-6 rounded-[2.5rem] w-full max-w-[280px] mb-6 text-center shadow-xl border-emerald-500/20">
                    <div class="flex justify-around items-center">
                        <div>
                            <p class="text-[9px] text-slate-500 uppercase font-black">Average</p>
                            <p id="avgResult" class="text-2xl font-black">0ms</p>
                        </div>
                        <div class="w-px h-8 bg-white/10"></div>
                        <div>
                            <p class="text-[9px] text-slate-500 uppercase font-black">Hits</p>
                            <p id="tapsResult" class="text-2xl font-black">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="video-9-16 shadow-2xl mb-8">
                    <video id="vicVideo" playsinline loop crossorigin="anonymous">
                        <source src="/victory-video" type="video/mp4">
                    </video>
                </div>
                
                <button onclick="location.reload()" class="bg-emerald-500 text-black font-black py-4 px-12 rounded-full text-[11px] uppercase tracking-widest shadow-lg active:scale-95">Restart Session</button>
            </div>
        </div>

        <!-- Big Center Countdown -->
        <div id="countdownBox" class="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none text-[10rem] font-black z-[200] text-emerald-500 italic"></div>
    </div>

    <!-- Status Footer -->
    <div class="w-full max-w-md mx-auto mb-6 glass p-4 rounded-3xl flex items-center justify-center gap-6">
        <div class="flex items-center gap-3">
            <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p class="text-[9px] font-black uppercase tracking-widest text-slate-500">Network: <span class="text-emerald-400">500MB Streaming</span></p>
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

        // Automatic Background Load
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
            startAction.classList.add('opacity-100', 'scale-100');
            if (navigator.vibrate) navigator.vibrate(15);
        }

        function moveTarget() {
            const rect = gameContainer.getBoundingClientRect();
            const size = 75;
            const pad = 30;
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
                // Autoplay guard
                modalOverlay.addEventListener('click', () => vicVideo.play(), {once: true});
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
    console.log(`Server live on port ${PORT}`);
});
