// server.js (Simplified for Connection Debugging)
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs'); // Keep fs for serving index.html

const app = express();
const server = http.createServer(app);

// --- Attach WebSocket Server ---
const wss = new WebSocket.Server({ server });
console.log("SERVER: Simplified - WebSocket server attached.");

// --- Serve Static HTML ---
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index_2d.html');
  if (fs.existsSync(indexPath)) {
     res.sendFile(indexPath);
  } else {
     res.status(404).send('index_2d.html not found.');
  }
});

// --- Handle WebSocket Connections ---
wss.on('connection', (ws, req) => {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 4)}`;
    console.log(`SERVER: ===== WebSocket Connection Opened ===== ID: ${connectionId}`);

    // Send a simple test message immediately after connection
    try {
        const testMessage = JSON.stringify({ type: 'serverHello', id: connectionId });
        console.log(`SERVER: [${connectionId}] Attempting to send: ${testMessage}`);
        ws.send(testMessage);
        console.log(`SERVER: [${connectionId}] Test message sent.`);
    } catch (e) {
        console.error(`SERVER: [${connectionId}] Error sending test message:`, e);
    }

    // Basic message handler (just logs received messages)
    ws.on('message', (message) => {
        try {
            console.log(`SERVER: [${connectionId}] Received message: ${message.toString()}`);
            // Optional: Echo back
             // ws.send(JSON.stringify({ type: 'echo', original: message.toString() }));
        } catch (e) {
             console.error(`SERVER: [${connectionId}] Error processing message:`, e);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`SERVER: [${connectionId}] WebSocket Connection Closed. Code: ${code}, Reason: ${reason.toString()}`);
    });

    ws.on('error', (error) => {
        console.error(`SERVER: [${connectionId}] WebSocket Error: ${error.message}`);
    });
});

// --- Start HTTP Server ---
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`SERVER: Simplified - HTTP server listening on port ${port}`);
  if(process.env.RENDER_EXTERNAL_URL) {
       console.log(`SERVER: Public URL: ${process.env.RENDER_EXTERNAL_URL}`);
   } else {
        console.log(`SERVER: Local Access: http://localhost:${port}`);
   }
});

console.log("SERVER: Simplified - Setup complete.");