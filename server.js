const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

// 500MB Streaming Endpoint
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

// UI Page with Simple Game
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Interactive Demo</title>
<style>
body {
    margin: 0;
    background: #111;
    color: white;
    font-family: Arial;
    text-align: center;
}
canvas {
    background: #222;
    display: block;
    margin: 20px auto;
    border-radius: 10px;
}
#info {
    font-size: 14px;
    opacity: 0.7;
}
</style>
</head>
<body>

<h2>🎮 Click The Moving Ball</h2>
<p>Score as many points as you can!</p>

<canvas id="game" width="400" height="400"></canvas>
<div id="score">Score: 0</div>
<div id="info">Performance demo running...</div>

<script>
// --- Background 500MB fetch ---
fetch("/stream?cache=" + Date.now()).then(res => res.arrayBuffer());

// --- Simple Game ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let score = 0;

let ball = {
    x: 200,
    y: 200,
    radius: 20,
    dx: 3,
    dy: 3
};

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#00ffcc";
    ctx.fill();
    ctx.closePath();
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0)
        ball.dx *= -1;

    if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0)
        ball.dy *= -1;

    drawBall();
    requestAnimationFrame(update);
}

canvas.addEventListener("click", function(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const distance = Math.sqrt(
        (clickX - ball.x) ** 2 + (clickY - ball.y) ** 2
    );

    if (distance < ball.radius) {
        score++;
        document.getElementById("score").innerText = "Score: " + score;
    }
});

update();
</script>

</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
