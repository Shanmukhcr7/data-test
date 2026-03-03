const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

// Pre-allocate a 1MB buffer to ensure the CPU isn't the bottleneck during high-speed tests.
const CHUNK_SIZE = 1024 * 1024; 
const streamBuffer = crypto.randomBytes(CHUNK_SIZE);

/**
 * High-Performance Streaming API
 * query params: 
 * - size: MB (number) or "unlimited"
 */
app.get("/api/stream", (req, res) => {
    const sizeParam = req.query.size;
    const isUnlimited = sizeParam === "unlimited";
    
    let sizeMB = isUnlimited ? 0 : parseInt(sizeParam) || 100;
    
    // Safety cap for fixed-size requests (1GB)
    if (!isUnlimited && sizeMB > 1024) sizeMB = 1024;

    const totalBytes = sizeMB * 1024 * 1024;
    let bytesSent = 0;

    res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Connection": "keep-alive"
    });

    if (!isUnlimited) {
        res.setHeader("Content-Length", totalBytes);
    }

    /**
     * Efficiently flood the pipe while respecting Node.js backpressure.
     */
    function flow() {
        // Condition: either we haven't reached the limit, or we are in unlimited mode
        while (isUnlimited || bytesSent < totalBytes) {
            let currentChunkSize = CHUNK_SIZE;
            
            // Adjust final chunk size for fixed-limit requests
            if (!isUnlimited && (bytesSent + CHUNK_SIZE > totalBytes)) {
                currentChunkSize = totalBytes - bytesSent;
            }

            const chunk = currentChunkSize === CHUNK_SIZE ? streamBuffer : streamBuffer.slice(0, currentChunkSize);
            
            bytesSent += currentChunkSize;
            
            // Push to kernel buffer. returns false if the pipe is saturated.
            const canContinue = res.write(chunk);
            
            if (!canContinue) {
                // Buffer full: wait for 'drain' event to resume flooding
                res.once('drain', flow);
                return;
            }
        }
        res.end();
    }

    flow();

    // Clean shutdown if client disconnects
    req.on("close", () => {
        bytesSent = isUnlimited ? 0 : totalBytes; 
    });
});

/**
 * Main UI Dashboard
 */
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NetSaturation Pro | Unlimited Bandwidth Tester</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Outfit:wght@300;400;600;800&display=swap');
        body { font-family: 'Outfit', sans-serif; background: #0f172a; color: #f8fafc; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.05); }
        
        @keyframes indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .progress-unlimited {
            animation: indeterminate 1.5s infinite linear;
            width: 50%;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col p-4 md:p-10">

    <main class="max-w-4xl mx-auto w-full space-y-6">
        <!-- Header -->
        <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
            <div>
                <h1 class="text-3xl font-extrabold tracking-tight">NETSPEED<span class="text-emerald-500 italic">PRO</span></h1>
                <p class="text-slate-400 text-xs uppercase tracking-widest font-bold">Industrial Saturation Benchmark</p>
            </div>
            <div id="statusIndicator" class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-white/5 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                <span id="statusDot" class="w-2.5 h-2.5 rounded-full bg-slate-500"></span> 
                <span id="statusText">System Idle</span>
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Settings Panel -->
            <div class="lg:col-span-1 space-y-4">
                <div class="glass rounded-3xl p-6 space-y-6">
                    <div>
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">Payload Size</label>
                        <select id="sizeSelect" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                            <option value="100">100 Megabytes</option>
                            <option value="500" selected>500 Megabytes</option>
                            <option value="1024">1.0 Gigabyte</option>
                            <option value="unlimited" class="text-emerald-400 font-bold">Unlimited (Manual Stop)</option>
                        </select>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-3">
                            <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Parallel Workers</label>
                            <span id="parallelVal" class="mono text-emerald-500 text-sm font-bold">4</span>
                        </div>
                        <input type="range" id="parallelRange" min="1" max="10" value="4" class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500">
                        <p class="text-[9px] text-slate-500 mt-3 italic leading-relaxed">Spawn multiple fetch instances to overcome browser/latency caps.</p>
                    </div>

                    <button id="mainBtn" class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/10 transition-all active:scale-95 uppercase tracking-widest text-sm">
                        Start Saturation
                    </button>
                </div>

                <div class="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
                    <p class="text-[10px] text-indigo-400 leading-relaxed">
                        <strong>Protocol:</strong> Testing via HTTP/1.1 Stream. Supports backpressure to prevent server-side memory overflow.
                    </p>
                </div>
            </div>

            <!-- Metrics Panel -->
            <div class="lg:col-span-2 space-y-6">
                <div class="glass rounded-[2.5rem] p-8 h-full flex flex-col justify-between">
                    
                    <div class="flex flex-col items-center justify-center flex-1 py-6 text-center">
                        <p class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Throughput</p>
                        <div class="flex items-baseline gap-3">
                            <span id="speedDisplay" class="text-8xl md:text-9xl font-black text-white tabular-nums tracking-tighter">0</span>
                            <span class="text-emerald-500 font-black text-xl uppercase italic">Mbps</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mt-4">
                        <div class="bg-slate-900/50 p-5 rounded-2xl border border-white/5 border-l-4 border-l-emerald-500">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Downloaded</p>
                            <p id="totalDataDisplay" class="mono text-2xl font-bold">0.0 MB</p>
                        </div>
                        <div class="bg-slate-900/50 p-5 rounded-2xl border border-white/5 border-l-4 border-l-indigo-500">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Peak Rate</p>
                            <p id="peakDisplay" class="mono text-2xl font-bold text-white">0 Mbps</p>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mt-8">
                        <div class="flex justify-between items-end mb-3">
                            <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Stream Status</p>
                            <p id="percentDisplay" class="mono text-xs font-bold text-emerald-500">IDLE</p>
                        </div>
                        <div id="progressTrack" class="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-white/5 relative">
                            <div id="progressBar" class="h-full bg-emerald-500 w-0 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        const state = {
            isRunning: false,
            receivedBytes: 0,
            targetBytes: 0,
            startTime: 0,
            peakMbps: 0,
            controller: null,
            isUnlimited: false
        };

        const els = {
            mainBtn: document.getElementById('mainBtn'),
            sizeSelect: document.getElementById('sizeSelect'),
            parallelRange: document.getElementById('parallelRange'),
            parallelVal: document.getElementById('parallelVal'),
            speedDisplay: document.getElementById('speedDisplay'),
            totalDataDisplay: document.getElementById('totalDataDisplay'),
            peakDisplay: document.getElementById('peakDisplay'),
            progressBar: document.getElementById('progressBar'),
            percentDisplay: document.getElementById('percentDisplay'),
            statusText: document.getElementById('statusText'),
            statusDot: document.getElementById('statusDot'),
            progressTrack: document.getElementById('progressTrack')
        };

        els.parallelRange.oninput = (e) => els.parallelVal.innerText = e.target.value;

        async function toggleTest() {
            if (state.isRunning) {
                terminateTest("Test Stopped");
                return;
            }

            const selection = els.sizeSelect.value;
            state.isUnlimited = selection === "unlimited";
            state.isRunning = true;
            state.receivedBytes = 0;
            state.peakMbps = 0;
            state.startTime = Date.now();
            state.controller = new AbortController();

            const targetMB = state.isUnlimited ? 0 : parseInt(selection);
            state.targetBytes = targetMB * 1024 * 1024;
            const concurrency = parseInt(els.parallelRange.value);

            // UI Feedback
            els.mainBtn.innerText = "Terminate Stream";
            els.mainBtn.classList.replace('bg-emerald-500', 'bg-red-500');
            els.statusText.innerText = state.isUnlimited ? "Unlimited Flooding..." : "Benchmarking...";
            els.statusDot.classList.replace('bg-slate-500', 'bg-emerald-500');
            els.statusDot.classList.add('animate-pulse');

            if (state.isUnlimited) {
                els.progressBar.classList.add('progress-unlimited');
                els.progressBar.style.width = '50%';
                els.percentDisplay.innerText = "CONTINUOUS";
            } else {
                els.progressBar.classList.remove('progress-unlimited');
                els.progressBar.style.width = '0%';
            }

            // Spawn Parallel Workers
            const workers = [];
            for (let i = 0; i < concurrency; i++) {
                // If unlimited, size doesn't matter much per request as it loops
                const requestSize = state.isUnlimited ? "unlimited" : Math.floor(targetMB / concurrency);
                workers.push(fetchWorker(requestSize));
            }

            // Update Loop
            const telemetryInterval = setInterval(() => {
                if (!state.isRunning) {
                    clearInterval(telemetryInterval);
                    return;
                }

                const elapsed = (Date.now() - state.startTime) / 1000;
                if (elapsed <= 0) return;

                const mbps = ((state.receivedBytes * 8) / (1024 * 1024)) / elapsed;
                if (mbps > state.peakMbps) state.peakMbps = mbps;

                els.speedDisplay.innerText = Math.round(mbps);
                els.totalDataDisplay.innerText = (state.receivedBytes / (1024 * 1024)).toFixed(1) + " MB";
                els.peakDisplay.innerText = Math.round(state.peakMbps) + " Mbps";
                
                if (!state.isUnlimited) {
                    const progress = (state.receivedBytes / state.targetBytes) * 100;
                    els.progressBar.style.width = Math.min(100, progress) + "%";
                    els.percentDisplay.innerText = Math.round(progress) + "%";
                    
                    if (state.receivedBytes >= state.targetBytes) {
                        terminateTest("Test Complete");
                    }
                }
            }, 250);

            try {
                await Promise.all(workers);
            } catch (err) {
                if (err.name !== 'AbortError') console.error("Worker Disconnected:", err);
            }
        }

        async function fetchWorker(size) {
            try {
                const response = await fetch(\`/api/stream?size=\${size}&nocache=\${Date.now()}\`, {
                    signal: state.controller.signal
                });

                const reader = response.body.getReader();
                while (state.isRunning) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    state.receivedBytes += value.length;
                }
            } catch (err) {
                if (err.name !== 'AbortError') throw err;
            }
        }

        function terminateTest(finalStatus) {
            state.isRunning = false;
            if (state.controller) state.controller.abort();

            els.mainBtn.innerText = "Start Saturation";
            els.mainBtn.classList.replace('bg-red-500', 'bg-emerald-500');
            els.statusText.innerText = finalStatus;
            els.statusDot.classList.replace('bg-emerald-500', 'bg-slate-500');
            els.statusDot.classList.remove('animate-pulse');
            els.progressBar.classList.remove('progress-unlimited');
            
            if (finalStatus === "Test Complete") {
                els.progressBar.style.width = '100%';
            }
        }

        els.mainBtn.onclick = toggleTest;
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`
    ==================================================
    NETSATURATION PRO ACTIVE
    Port: ${PORT}
    Unlimited Mode: Enabled
    Backpressure: Active
    ==================================================
    `);
});
