const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

/*
  STREAM 500MB (or custom size)
  Example:
  /download?size=500
*/

app.get("/download", (req, res) => {
    const sizeMB = parseInt(req.query.size) || 500;
    const totalBytes = sizeMB * 1024 * 1024;
    const chunkSize = 1024 * 1024; // 1MB chunks

    res.set({
        "Content-Type": "application/octet-stream",
        "Content-Length": totalBytes,
        "Cache-Control": "no-store",
        "Content-Encoding": "identity"
    });

    let sent = 0;

    function sendChunk() {
        if (sent >= totalBytes) {
            return res.end();
        }

        const remaining = totalBytes - sent;
        const currentChunk = Math.min(chunkSize, remaining);

        const buffer = crypto.randomBytes(currentChunk);
        res.write(buffer);

        sent += currentChunk;
        setImmediate(sendChunk);
    }

    sendChunk();
});

/*
  Attractive UI Page
*/

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Performance Experience Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: white;
            text-align: center;
            padding-top: 80px;
        }

        .card {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            width: 400px;
            margin: auto;
            backdrop-filter: blur(10px);
        }

        .progress-bar {
            width: 100%;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            margin-top: 20px;
        }

        .progress {
            width: 0%;
            height: 20px;
            background: #00ffcc;
            border-radius: 10px;
        }

        button {
            padding: 10px 20px;
            margin-top: 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            background: #00ffcc;
            color: black;
            font-weight: bold;
        }
    </style>
</head>
<body>

    <div class="card">
        <h2>🚀 Performance Test Environment</h2>
        <p>This page demonstrates large-scale data streaming (500MB).</p>

        <button onclick="startDownload()">Start 500MB Test</button>

        <div class="progress-bar">
            <div class="progress" id="progress"></div>
        </div>

        <p id="status"></p>
    </div>

<script>
async function startDownload() {
    const progressBar = document.getElementById("progress");
    const status = document.getElementById("status");

    status.innerText = "Downloading 500MB...";

    const response = await fetch("/download?size=500&cache=" + Date.now());
    const reader = response.body.getReader();
    const contentLength = +response.headers.get("Content-Length");

    let received = 0;

    while(true) {
        const { done, value } = await reader.read();
        if (done) break;

        received += value.length;
        let percent = (received / contentLength) * 100;
        progressBar.style.width = percent + "%";
    }

    status.innerText = "Download Complete ✔";
}
</script>

</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
