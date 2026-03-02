const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

// Portable Video Path
const LOCAL_VIDEO_PATH = path.join(__dirname, "public", "rick_roll.mp4");

// Global state for bandwidth sharing
let isThrottled = false;

/**
 * 500MB Streaming Endpoint with Dynamic Throttling
 * If isThrottled is true, it introduces a delay between chunks
 * to "divide" the bandwidth with the video player.
 */
app.get("/stream", (req, res) => {
    const sizeMB = 500;
    const totalBytes = sizeMB * 1024 * 1024;
    const chunkSize = 64 * 1024; // 64KB Chunks

    res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": totalBytes,
        "Cache-Control": "no-store",
    });

    let sent = 0;

    function sendChunk() {
        if (sent >= totalBytes || res.writableEnded) {
            return res.end();
        }

        const currentChunk = Math.min(chunkSize, totalBytes - sent);
        const buffer = crypto.randomBytes(currentChunk);
        
        sent += currentChunk;
        const canContinue = res.write(buffer);

        // Calculate next tick delay based on throttle state
        // Throttled: ~500ms delay per 64KB (~128KB/s)
        // Normal: immediate next tick
        const delay = isThrottled ? 500 : 0;

        if (canContinue) {
            if (delay > 0) {
                setTimeout(sendChunk, delay);
            } else {
                setImmediate(sendChunk);
            }
        } else {
            res.once('drain', sendChunk);
        }
    }

    sendChunk();
    req.on("close", () => { sent = totalBytes; });
});

/**
 * Control Endpoints for Throttling
 */
app.get("/throttle/on", (req, res) => {
    isThrottled = true;
    res.sendStatus(200);
});

app.get("/throttle/off", (req, res) => {
    isThrottled = false;
    res.sendStatus(200);
});

/**
 * Serve Local Video
 */
app.get("/victory-video", (req, res) => {
    if (fs.existsSync(LOCAL_VIDEO_PATH)) {
        res.sendFile(LOCAL_VIDEO_PATH);
    } else {
        res.status(404).send("Video file missing in public folder.");
    }
});

/**
 * UI Route
 */
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Reaction Elite | Governor Mode</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        :root { --accent: #10b981; }
        body { font-family: 'Outfit', sans-serif; background: #020617; color: white; height: 100dvh; overflow: hidden; display: flex; flex-direction: column; -webkit-tap-highlight-color: transparent; }
        .bg-grid { background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0); background-size: 30px 30px; }
        .target { position: absolute; z-index: 40; transition: transform 0.05s cubic-bezier(0.175, 0.885, 0.32, 1.275); will-change: transform, top, left; }
        .target-orb { width: 75px; height: 75px; background: var(--accent); border: 4px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
        .target-core { width: 15px; height: 15px; background: #000; border-radius: 50%; border: 2px solid #fff; }
        
        .video-9-16 { 
            width: 100%; 
            max-width: 240px; 
            aspect-ratio: 9 / 16; 
            background: #000; 
            border-radius: 1.5rem; 
            overflow: hidden; 
            border: 2px solid rgba(255,255,255,0.1); 
            position: relative; 
        }
        .video-9-16 video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        
        .glass { backdrop-filter: blur(20px); background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.1); }
        .btn-time { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s; }
        .btn-time.active { background: var(--accent); color: #000; border-color: #fff; transform: scale(1.05); }
    </style>
</head>
<body class="bg-grid">
    <div class="w-full max-w-md mx-auto flex justify-between gap-4 p-4 z-[110] relative">
        <div class="glass flex-1 p-3 rounded-3xl text-center">
            <p class="text-[9px] uppercase font-black text-emerald-400">Time Left</p>
            <p id="timerDisplay" class="text-xl font-black">--</p>
        </div>
        <div class="glass flex-1 p-3 rounded-3xl text-center">
            <p class="text-[9px] uppercase font-black text-indigo-400">Reaction</p>
            <p id="currentReaction" class="text-xl font-black">---</p>
        </div>
    </div>

    <div id="gameContainer" class="relative flex-1 w-full max-w-md mx-auto rounded-[3rem] border border-white/5 bg-slate-950/20 shadow-2xl overflow-hidden mb-4">
        <div id="gameTarget" class="target hidden cursor-pointer select-none"><div class="target-orb"><div class="target-core"></div></div></div>
        
        <div id="modalOverlay" class="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl">
            <!-- Phase 1: Menu -->
            <div id="selectionView" class="w-full flex flex-col items-center px-4">
                <h1 class="text-4xl font-black tracking-tighter italic mb-8">ELITE<span class="text-emerald-500 not-italic">REACTION</span></h1>
                <div class="glass w-full rounded-[2.5rem] p-8 border-white/10 text-center">
                    <h2 class="text-[10px] font-black uppercase text-emerald-400 mb-6 tracking-widest">Select Test Time</h2>
                    <div class="grid grid-cols-3 gap-3 mb-10">
                        <button onclick="pickTime(this, 5)" class="btn-time py-4 rounded-2xl font-black text-xl">5s</button>
                        <button onclick="pickTime(this, 10)" class="btn-time py-4 rounded-2xl font-black text-xl">10s</button>
                        <button onclick="pickTime(this, 15)" class="btn-time py-4 rounded-2xl font-black text-xl">15s</button>
                        <button onclick="pickTime(this, 20)" class="btn-time py-4 rounded-2xl font-black text-xl">20s</button>
                        <button onclick="pickTime(this, 25)" class="btn-time py-4 rounded-2xl font-black text-xl">25s</button>
                        <button onclick="pickTime(this, 30)" class="btn-time py-4 rounded-2xl font-black text-xl">30s</button>
                    </div>
                    <div id="startAction" class="opacity-0 pointer-events-none transition-all duration-300">
                        <button onclick="runCountdown()" class="bg-white text-black font-black py-5 w-full rounded-full text-sm uppercase shadow-2xl active:scale-95">Start Now</button>
                    </div>
                </div>
            </div>

            <!-- Phase 2: Results -->
            <div id="finishView" class="hidden w-full h-full flex flex-col items-center justify-center p-4">
                <div class="glass p-5 rounded-[2.5rem] w-full max-w-[280px] mb-6 text-center shadow-xl">
                    <div class="flex justify-around items-center">
                        <div><p class="text-[9px] uppercase font-black text-slate-500">Avg reaction</p><p id="avgResult" class="text-2xl font-black">0ms</p></div>
                        <div class="w-px h-8 bg-white/10"></div>
                        <div><p class="text-[9px] uppercase font-black text-slate-500">Hits</p><p id="tapsResult" class="text-2xl font-black">0</p></div>
                    </div>
                </div>
                
                <div class="video-9-16 shadow-2xl mb-8">
                    <video id="vicVideo" playsinline preload="auto">
                        <source src="/victory-video" type="video/mp4">
                    </video>
                </div>
                
                <div id="restartContainer" class="hidden">
                    <button onclick="restartFull()" class="bg-emerald-500 text-black font-black py-4 px-12 rounded-full text-[11px] uppercase shadow-lg">New Session</button>
                </div>
            </div>
        </div>
        <div id="countdownBox" class="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none text-[10rem] font-black z-[200] text-emerald-500 italic"></div>
    </div>

    <div class="w-full max-w-md mx-auto mb-6 glass p-4 rounded-3xl flex items-center justify-center gap-4">
        <div class="flex items-center gap-2">
            <span id="loadIndicator" class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p id="loadText" class="text-[9px] font-black uppercase tracking-widest text-slate-400">Stress: <span class="text-emerald-400">FULL POWER</span></p>
        </div>
    </div>

    <script>
        let gameActive = false, selectedTime = 0, timeLeft = 0, reactionTimes = [], spawnTime = 0, timerInterval;
        const timerDisplay = document.getElementById('timerDisplay'), currentReactionEl = document.getElementById('currentReaction'), gameTarget = document.getElementById('gameTarget'), gameContainer = document.getElementById('gameContainer'), modalOverlay = document.getElementById('modalOverlay'), selectionView = document.getElementById('selectionView'), startAction = document.getElementById('startAction'), finishView = document.getElementById('finishView'), vicVideo = document.getElementById('vicVideo'), countdownBox = document.getElementById('countdownBox');

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
            selectedTime = time; timeLeft = time;
            timerDisplay.innerText = time.toFixed(1) + 's';
            startAction.classList.remove('opacity-0', 'pointer-events-none');
            startAction.classList.add('opacity-100', 'scale-100');
        }

        function moveTarget() {
            const rect = gameContainer.getBoundingClientRect(), size = 75, pad = 30;
            gameTarget.style.left = Math.max(pad, Math.random() * (rect.width - size - pad)) + 'px';
            gameTarget.style.top = Math.max(pad, Math.random() * (rect.height - size - pad)) + 'px';
            spawnTime = performance.now();
        }

        function handleTap(e) {
            if (!gameActive) return;
            e.preventDefault();
            reactionTimes.push(Math.round(performance.now() - spawnTime));
            currentReactionEl.innerText = reactionTimes[reactionTimes.length-1] + 'ms';
            if (navigator.vibrate) navigator.vibrate(20);
            moveTarget();
        }

        function runCountdown() {
            selectionView.classList.add('hidden'); countdownBox.style.opacity = '1';
            let count = 3; countdownBox.innerText = count;
            const cd = setInterval(() => {
                count--;
                if (count > 0) countdownBox.innerText = count;
                else if (count === 0) countdownBox.innerText = "GO!";
                else { clearInterval(cd); countdownBox.style.opacity = '0'; startGame(); }
            }, 800);
        }

        function startGame() {
            modalOverlay.style.opacity = "0"; modalOverlay.style.pointerEvents = "none";
            gameActive = true; gameTarget.classList.remove('hidden'); moveTarget();
            timerInterval = setInterval(() => {
                timeLeft -= 0.1;
                if (timeLeft <= 0) endGame();
                else timerDisplay.innerText = Math.max(0, timeLeft).toFixed(1) + 's';
            }, 100);
        }

        async function endGame() {
            gameActive = false;
            clearInterval(timerInterval);
            gameTarget.classList.add('hidden');
            timerDisplay.innerText = '0.0s';
            modalOverlay.style.opacity = "1"; modalOverlay.style.pointerEvents = "auto";
            finishView.classList.remove('hidden');
            
            const total = reactionTimes.length;
            const avg = total > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / total) : 0;
            document.getElementById('avgResult').innerText = avg + 'ms';
            document.getElementById('tapsResult').innerText = total;

            // 1. Signal server to throttle background stress
            await fetch('/throttle/on');
            document.getElementById('loadText').innerHTML = 'Stress: <span class="text-orange-400">SHARED BANDWIDTH</span>';
            
            // 2. Play video once
            vicVideo.play().catch(() => {
                modalOverlay.addEventListener('click', () => vicVideo.play(), {once: true});
            });
        }

        // Logic for when video finishes
        vicVideo.onended = async () => {
            // Show the restart button
            document.getElementById('restartContainer').classList.remove('hidden');
            
            // 3. Restore full bandwidth to the stress test
            await fetch('/throttle/off');
            document.getElementById('loadText').innerHTML = 'Stress: <span class="text-emerald-400">FULL POWER</span>';
        };

        function restartFull() {
            location.reload(); // Full reload to refresh stress stream session
        }

        gameTarget.addEventListener('touchstart', handleTap, {passive: false});
        gameTarget.addEventListener('mousedown', handleTap);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Bandwidth Governor live on port ${PORT}`);
});
