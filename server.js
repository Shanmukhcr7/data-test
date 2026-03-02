const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

/**
 * 500MB Streaming Endpoint (Background Stress Process)
 * Keeps the browser's network and main thread busy while playing.
 */
app.get("/stream", (req, res) => {
    const sizeMB = 500;
    const totalBytes = sizeMB * 1024 * 1024;
    const chunkSize = 64 * 1024; 

    res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": totalBytes,
        "Cache-Control": "no-store",
    });

    let sent = 0;
    function send() {
        while (sent < totalBytes) {
            const currentChunk = Math.min(chunkSize, totalBytes - sent);
            const buffer = crypto.randomBytes(currentChunk);
            sent += currentChunk;
            if (!res.write(buffer)) {
                res.once('drain', send);
                return;
            }
        }
        res.end();
    }
    send();
    req.on("close", () => { sent = totalBytes; });
});

/**
 * Main UI - Optimized for Mobile & YouTube Integration
 */
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Reaction Elite | YouTube Edition</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        :root { --accent: #10b981; }
        
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

        .glass { 
            backdrop-filter: blur(20px); 
            background: rgba(15, 23, 42, 0.8); 
            border: 1px solid rgba(255, 255, 255, 0.1); 
        }

        /* Tactical Target Orb */
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
            box-shadow: 0 0 35px rgba(16, 185, 129, 0.6); 
        }
        .target:active { transform: scale(0.8); }

        /* Strict 9:16 Video Container */
        .yt-wrapper {
            width: 100%;
            max-width: 240px;
            aspect-ratio: 9 / 16;
            background: #000;
            border-radius: 1.5rem;
            overflow: hidden;
            border: 2px solid rgba(255,255,255,0.15);
            position: relative;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        }
        .yt-wrapper iframe {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
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

        #countdownBox {
            font-size: 10rem;
            text-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
        }
    </style>
</head>
<body class="bg-grid">

    <!-- HUD Headers -->
    <div class="w-full max-w-md mx-auto flex justify-between gap-4 p-4 z-50">
        <div class="glass flex-1 p-3 rounded-2xl text-center">
            <p class="text-[9px] uppercase font-black text-emerald-400 tracking-tighter">Timer</p>
            <p id="timerDisplay" class="text-xl font-black tabular-nums">--</p>
        </div>
        <div class="glass flex-1 p-3 rounded-2xl text-center">
            <p class="text-[9px] uppercase font-black text-indigo-400 tracking-tighter">Reaction</p>
            <p id="currentReaction" class="text-xl font-black tabular-nums">---</p>
        </div>
    </div>

    <!-- Gameplay Area -->
    <div id="gameContainer" class="relative flex-1 w-full max-w-md mx-auto rounded-[3rem] border border-white/5 bg-slate-950/20 shadow-inner overflow-hidden mb-4 mx-4">
        
        <div id="gameTarget" class="target hidden cursor-pointer select-none">
             <div class="target-orb">
                <div class="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                    <div class="w-3 h-3 bg-slate-900 rounded-full"></div>
                </div>
             </div>
        </div>

        <!-- Overlays -->
        <div id="modalOverlay" class="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl transition-opacity duration-500">
            
            <!-- Step 1: Selection -->
            <div id="selectionView" class="w-full flex flex-col items-center text-center">
                <div class="mb-8">
                    <h1 class="text-4xl font-black tracking-tighter italic">
                        ELITE<span class="text-emerald-500 not-italic">REACTION</span>
                    </h1>
                    <p class="text-slate-500 text-[9px] font-bold uppercase tracking-[0.4em] mt-2">Performance Stress Test</p>
                </div>
                
                <div class="glass w-full rounded-[2.5rem] p-8 border-white/10">
                    <h2 class="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-6">1. Choose Duration</h2>
                    <div class="grid grid-cols-3 gap-3 mb-10">
                        <button onclick="pickTime(this, 5)" class="btn-time py-4 rounded-xl font-black text-lg">5s</button>
                        <button onclick="pickTime(this, 10)" class="btn-time py-4 rounded-xl font-black text-lg">10s</button>
                        <button onclick="pickTime(this, 15)" class="btn-time py-4 rounded-xl font-black text-lg">15s</button>
                        <button onclick="pickTime(this, 20)" class="btn-time py-4 rounded-xl font-black text-lg">20s</button>
                        <button onclick="pickTime(this, 25)" class="btn-time py-4 rounded-xl font-black text-lg">25s</button>
                        <button onclick="pickTime(this, 30)" class="btn-time py-4 rounded-xl font-black text-lg">30s</button>
                    </div>

                    <div id="startAction" class="opacity-0 pointer-events-none transition-all duration-300 transform scale-90">
                        <p class="text-[9px] font-black mb-3 text-slate-500 uppercase tracking-widest">2. Ready?</p>
                        <button onclick="runCountdown()" class="bg-white text-black font-black py-4 w-full rounded-full text-sm uppercase tracking-widest shadow-2xl active:scale-95">Start Now</button>
                    </div>
                </div>
            </div>

            <!-- Step 2: Victory Screen -->
            <div id="finishView" class="hidden w-full flex flex-col items-center justify-center">
                <div class="glass p-5 rounded-[2.5rem] w-full max-w-[260px] mb-6 text-center shadow-xl border-emerald-500/20">
                    <div class="flex justify-around items-center">
                        <div class="text-center">
                            <p class="text-[9px] text-slate-500 uppercase font-black mb-1">Avg Score</p>
                            <p id="avgResult" class="text-2xl font-black">0ms</p>
                        </div>
                        <div class="w-px h-8 bg-white/10"></div>
                        <div class="text-center">
                            <p class="text-[9px] text-slate-500 uppercase font-black mb-1">Total Hits</p>
                            <p id="tapsResult" class="text-2xl font-black">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="yt-wrapper">
                    <iframe id="ytPlayer" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
                
                <button onclick="location.reload()" class="mt-8 bg-emerald-500 text-black font-black py-4 px-12 rounded-full text-[10px] uppercase tracking-widest shadow-lg active:scale-95">New Session</button>
            </div>
        </div>

        <!-- Big Countdown -->
        <div id="countdownBox" class="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none font-black z-[200] text-emerald-500 italic"></div>
    </div>

    <!-- Status Footer -->
    <div class="w-full max-w-md mx-auto mb-6 glass p-4 rounded-3xl flex items-center justify-center gap-4">
        <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Network Stress: <span class="text-emerald-400">500MB ACTIVE</span></p>
        </div>
    </div>

    <script>
        let gameActive = false, selectedTime = 0, timeLeft = 0, reactionTimes = [], spawnTime = 0, timerInterval;

        const timerDisplay = document.getElementById('timerDisplay'), currentReactionEl = document.getElementById('currentReaction'), gameTarget = document.getElementById('gameTarget'), gameContainer = document.getElementById('gameContainer'), modalOverlay = document.getElementById('modalOverlay'), selectionView = document.getElementById('selectionView'), startAction = document.getElementById('startAction'), finishView = document.getElementById('finishView'), ytPlayer = document.getElementById('ytPlayer'), countdownBox = document.getElementById('countdownBox');

        // Start background load immediately on window load
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
                    if (navigator.vibrate) navigator.vibrate(20);
                } else if (count === 0) {
                    countdownBox.innerText = "GO!";
                    if (navigator.vibrate) navigator.vibrate(60);
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
            
            // Set YouTube Embed URL
            ytPlayer.src = "https://www.youtube.com/embed/iik25wqIuFo?autoplay=1&controls=1&modestbranding=1&rel=0";
        }

        gameTarget.addEventListener('touchstart', handleTap, {passive: false});
        gameTarget.addEventListener('mousedown', handleTap);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Elite YouTube Tester running on http://localhost:${PORT}`);
});
