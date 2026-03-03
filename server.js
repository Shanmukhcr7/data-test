const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

// Pre-allocate a 1MB buffer to maximize throughput without CPU bottlenecking
const CHUNK_SIZE = 1024 * 1024; 
const streamBuffer = crypto.randomBytes(CHUNK_SIZE);

/**
 * High-Speed Streaming Endpoint
 * Enforces a strict 1GB limit per request to prevent runaway cloud costs.
 */
app.get("/api/stream", (req, res) => {
    let sizeMB = parseInt(req.query.size) || 100;
    
    // Safety Guard: Maximum 1024MB per request
    if (sizeMB > 1024) sizeMB = 1024;
    if (sizeMB < 1) sizeMB = 1;

    const totalBytes = sizeMB * 1024 * 1024;
    let bytesSent = 0;

    res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": totalBytes,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="test_${sizeMB}MB.bin"`
    });

    /**
     * Efficiently writes chunks while respecting backpressure
     */
    function pushData() {
        while (bytesSent < totalBytes) {
            const remaining = totalBytes - bytesSent;
            const currentChunkSize = Math.min(CHUNK_SIZE, remaining);
            
            // Slice the pre-allocated buffer for the final chunk if necessary
            const chunk = currentChunkSize === CHUNK_SIZE ? streamBuffer : streamBuffer.slice(0, currentChunkSize);
            
            bytesSent += currentChunkSize;
            
            // res.write returns false if the kernel buffer is full
            const canContinue = res.write(chunk);
            
            if (!canContinue) {
                // If full, wait for the 'drain' event before pushing more data
                res.once('drain', pushData);
                return;
            }
        }
        res.end();
    }

    pushData();

    // Clean up if the client aborts or loses connection
    req.on("close", () => {
        bytesSent = totalBytes; // Terminates the push loop
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
    <title>NetSpeed Pro | Throughput Diagnostic</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Outfit:wght@300;400;600;800&display=swap');
        body { font-family: 'Outfit', sans-serif; background: #0f172a; color: #f8fafc; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .stat-card { border-left: 4px solid #10b981; }
    </style>
</head>
<body class="min-h-screen flex flex-col p-4 md:p-10">

    <main class="max-w-4xl mx-auto w-full space-y-6">
        <!-- Header -->
        <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
            <div>
                <h1 class="text-3xl font-extrabold tracking-tight">NETSPEED<span class="text-emerald-500">PRO</span></h1>
                <p class="text-slate-400 text-xs uppercase tracking-widest font-bold">Professional Bandwidth Saturation Tool</p>
            </div>
            <div id="statusIndicator" class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-white/5 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                <span class="w-2 h-2 rounded-full bg-slate-500"></span> System Idle
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Settings Panel -->
            <div class="lg:col-span-1 space-y-4">
                <div class="glass rounded-3xl p-6 space-y-6">
                    <div>
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">Target Payload</label>
                        <select id="sizeSelect" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                            <option value="100">100 Megabytes</option>
                            <option value="250">250 Megabytes</option>
                            <option value="500" selected>500 Megabytes</option>
                            <option value="1024">1.0 Gigabyte (MAX)</option>
                        </select>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-3">
                            <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Parallel Workers</label>
                            <span id="parallelVal" class="mono text-emerald-500 text-sm font-bold">4</span>
                        </div>
                        <input type="range" id="parallelRange" min="1" max="10" value="4" class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500">
                        <p class="text-[9px] text-slate-500 mt-3 italic leading-relaxed">Increase workers to saturate high-speed 5G or Gigabit lines.</p>
                    </div>

                    <button id="mainBtn" class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/10 transition-all active:scale-95 uppercase tracking-widest text-sm">
                        Start Benchmark
                    </button>
                </div>

                <div class="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
                    <p class="text-[10px] text-blue-400 leading-relaxed">
                        <strong>Cloud Safe:</strong> This test respects server-side backpressure and automatically terminates all requests upon completion or manual abort.
                    </p>
                </div>
            </div>

            <!-- Metrics Panel -->
            <div class="lg:col-span-2 space-y-6">
                <div class="glass rounded-[2.5rem] p-8 h-full flex flex-col justify-between">
                    
                    <div class="flex flex-col items-center justify-center flex-1 py-6">
                        <p class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Current Throughput</p>
                        <div class="flex items-baseline gap-3">
                            <span id="speedDisplay" class="text-8xl md:text-9xl font-black text-white tabular-nums tracking-tighter">0</span>
                            <span class="text-emerald-500 font-black text-xl uppercase italic">Mbps</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mt-4">
                        <div class="stat-card bg-slate-900/50 p-5 rounded-2xl border border-white/5">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Data</p>
                            <p id="totalDataDisplay" class="mono text-2xl font-bold">0.0 MB</p>
                        </div>
                        <div class="stat-card bg-slate-900/50 p-5 rounded-2xl border border-white/5">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Peak Speed</p>
                            <p id="peakDisplay" class="mono text-2xl font-bold text-emerald-400">0 Mbps</p>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mt-8">
                        <div class="flex justify-between items-end mb-3">
                            <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Saturation Progress</p>
                            <p id="percentDisplay" class="mono text-xs font-bold text-emerald-500">0%</p>
                        </div>
                        <div class="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-white/5">
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
            controller: null
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
            statusIndicator: document.getElementById('statusIndicator')
        };

        els.parallelRange.oninput = (e) => els.parallelVal.innerText = e.target.value;

        async function toggleTest() {
            if (state.isRunning) {
                abortTest("Test Cancelled");
                return;
            }

            // Init State
            state.isRunning = true;
            state.receivedBytes = 0;
            state.peakMbps = 0;
            state.startTime = Date.now();
            state.controller = new AbortController();

            const targetMB = parseInt(els.sizeSelect.value);
            state.targetBytes = targetMB * 1024 * 1024;
            const concurrency = parseInt(els.parallelRange.value);

            // Update UI
            els.mainBtn.innerText = "Abort Benchmark";
            els.mainBtn.classList.replace('bg-emerald-500', 'bg-red-500');
            els.statusIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Benchmarking...';
            els.statusIndicator.classList.replace('text-slate-400', 'text-emerald-400');

            const mbPerWorker = Math.floor(targetMB / concurrency);
            const workers = [];

            // Spawn parallel fetch workers
            for (let i = 0; i < concurrency; i++) {
                const workerMB = (i === concurrency - 1) 
                    ? targetMB - (mbPerWorker * (concurrency - 1)) 
                    : mbPerWorker;
                
                workers.push(fetchWorker(workerMB));
            }

            // High-frequency telemetry loop (200ms)
            const telemetry = setInterval(() => {
                if (!state.isRunning) {
                    clearInterval(telemetry);
                    return;
                }

                const elapsedSec = (Date.now() - state.startTime) / 1000;
                if (elapsedSec <= 0) return;

                const mbps = ((state.receivedBytes * 8) / (1024 * 1024)) / elapsedSec;
                if (mbps > state.peakMbps) state.peakMbps = mbps;

                // Update metrics
                els.speedDisplay.innerText = Math.round(mbps);
                els.totalDataDisplay.innerText = (state.receivedBytes / (1024 * 1024)).toFixed(1) + " MB";
                els.peakDisplay.innerText = Math.round(state.peakMbps) + " Mbps";
                
                const progress = (state.receivedBytes / state.targetBytes) * 100;
                els.progressBar.style.width = Math.min(100, progress) + "%";
                els.percentDisplay.innerText = Math.round(progress) + "%";

                if (state.receivedBytes >= state.targetBytes) {
                    abortTest("Benchmark Complete");
                }
            }, 200);

            try {
                await Promise.all(workers);
            } catch (err) {
                if (err.name !== 'AbortError') console.error("Worker Crash:", err);
            }
        }

        async function fetchWorker(mb) {
            try {
                const response = await fetch(\`/api/stream?size=\${mb}&cache=\${Date.now()}\`, {
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

        function abortTest(statusText) {
            state.isRunning = false;
            if (state.controller) state.controller.abort();

            els.mainBtn.innerText = "Start Benchmark";
            els.mainBtn.classList.replace('bg-red-500', 'bg-emerald-500');
            els.statusIndicator.innerHTML = \`<span class="w-2 h-2 rounded-full bg-slate-500"></span> \${statusText}\`;
            els.statusIndicator.classList.replace('text-emerald-400', 'text-slate-400');
        }

        els.mainBtn.onclick = toggleTest;
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`
    ---------------------------------------------------
    NETSPEED PRO: ACTIVE
    Endpoint: http://localhost:${PORT}
    Security Cap: 1.0 GB per session
    ---------------------------------------------------
    `);
});
