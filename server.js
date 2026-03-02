const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/100mb", (req, res) => {
    const sizeMB = parseInt(req.query.size) || 100;
    const totalBytes = sizeMB * 1024 * 1024;
    const chunkSize = 1024 * 1024; // 1MB chunks

    res.set({
        "Content-Type": "application/octet-stream",
        "Content-Length": totalBytes,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
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

app.get("/", (req, res) => {
    res.send(`
        <h2>Render Bandwidth Test</h2>
        <p>Downloading 100MB in background...</p>

        <script>
            fetch("/100mb?size=100&cache=" + Date.now())
                .then(res => res.arrayBuffer())
                .then(() => console.log("Download complete"));
        </script>
    `);
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});