// server.js (Full Logic + Express + WS on Specific Path /websocket)
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const express = require('express');
const path = require('path');
const { URL } = require('url'); // Need URL module to parse request path

const app = express();
const server = http.createServer(app);

// --- WebSocket Server Setup (Manual Upgrade Handling on Specific Path) ---
const wss = new WebSocket.Server({ noServer: true }); // Do not attach automatically
console.log(`SERVER: WebSocket server created (noServer: true).`);

// --- Express Static File Serving ---
app.use(express.static(__dirname));
console.log(`SERVER: Static files served from ${__dirname}`);
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index_2d.html');
  console.log(`SERVER: Request for / received, sending index.`);
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('index_2d.html not found.');
});

// --- Explicitly Handle HTTP Server 'upgrade' Event ---
server.on('upgrade', (request, socket, head) => {
  console.log('SERVER: HTTP server received "upgrade" request.');

  // Parse the request URL to check the path
  // Use 'http://localhost' as a dummy base URL because URL parsing requires one
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  console.log(`SERVER: Upgrade request path: "${pathname}"`);

  // ** Only handle upgrades for the designated path **
  if (pathname === '/websocket') {
    console.log(`SERVER: Path matches '/websocket', attempting WebSocket handshake...`);
    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log('SERVER: wss.handleUpgrade completed, emitting connection.');
      // Manually emit the 'connection' event *only* for this path
      wss.emit('connection', ws, request);
    });
  } else {
    // If path doesn't match, destroy the socket to reject the upgrade
    console.log(`SERVER: Path "${pathname}" does not match '/websocket'. Destroying socket.`);
    socket.destroy();
  }
});

// --- Game State & Logic (Keep ALL from previous full version) ---
let players = {}; let games = {}; let waitingPlayer = null; let nextGameId = 1;
let wordSet = new Set(); /* ... dictionary loading ... */
const STARTING_HP = 100; /* ... other constants ... */
const VOWELS = "AEIOU"; /* ... letter pool ... */
function getRandomLetters(count) { /* ... full logic ... */ }
function calculateSoldiers(word) { /* ... full logic ... */ }
function broadcast(gameId, message) { /* ... full logic ... */ }
function sendToPlayer(playerId, message) { /* ... full logic with logging ... */ }
function startGame(gameId) { /* ... full logic ... */ }
function endRound(gameId) { /* ... full logic ... */ }
function handleWordSubmit(playerId, word) { /* ... full logic ... */ }
function handleCastleHit(clientPlayerId, attackingPlayerId, soldierCount) { /* ... full logic ... */ }
// --- End Game State & Logic ---


// --- WebSocket Connection Handling (Triggered by manual emit on correct path) ---
wss.on('connection', (ws, req) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`SERVER: ===== WebSocket Connection Opened (Path /websocket) ===== ID: ${playerId}`);
    players[playerId] = { ws, id: playerId, nickname: `Player_${playerId.substring(playerId.length - 4)}`, hp: STARTING_HP, letters: [], gameId: null };

     // --- Send Server Config (URL logic remains the same) ---
     const port = process.env.PORT || 8080; const externalUrlEnv = process.env.RENDER_EXTERNAL_URL; let baseUrl; // Use baseUrl now
     // console.log(`SERVER: [${playerId}] Determining Base URL. RENDER_EXTERNAL_URL=${externalUrlEnv}, PORT=${port}`);
     if (externalUrlEnv) {
         try { const httpUrl = externalUrlEnv; if (!httpUrl.includes('//')) throw new Error("URL invalid format"); const domain = httpUrl.split('//')[1]; if (!domain) throw new Error("Domain invalid format"); baseUrl = `wss://${domain}`; /* console.log(`SERVER: [${playerId}] Constructed base wss URL: ${baseUrl}`); */ }
         catch (e) { console.error(`SERVER: [${playerId}] Error parsing RENDER_EXTERNAL_URL (${externalUrlEnv}):`, e.message); baseUrl = null; }
     } else { baseUrl = `ws://localhost:${port}`; /* console.log(`SERVER: [${playerId}] Constructed local base ws URL: ${baseUrl}`); */ }

    if (baseUrl) {
        // console.log(`SERVER: [${playerId}] Attempting to send serverConfig with Base URL: ${baseUrl}`);
         sendToPlayer(playerId, {
             type: 'serverConfig',
             playerId: playerId,
             // Send the BASE URL, client will add the path
             websocketBaseUrl: baseUrl
            });
    } else { console.error(`SERVER: [${playerId}] Failed to determine base websocketUrl.`); ws.close(1011, "Server configuration error"); }

    // --- Full Message Handler ---
    ws.on('message', (message) => { /* ... Keep full logic ... */ });
    // --- Full Close Handler ---
    ws.on('close', (code, reason) => { /* ... Keep full logic ... */ });
    // --- Full Error Handler ---
    ws.on('error', (error) => { /* ... Keep full logic ... */ });
});

wss.on('error', (error) => { console.error('SERVER: WebSocket Server Instance Error:', error); });

// --- Start the HTTP Server ---
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`SERVER: (Express + WS Path) HTTP server listening on port ${port}`);
  console.log(`SERVER: WebSocket expecting connections on path /websocket`);
   if(process.env.RENDER_EXTERNAL_URL) console.log(`SERVER: Public URL (Render): ${process.env.RENDER_EXTERNAL_URL}`); else console.log(`SERVER: Local Access: http://localhost:${port}`);
});
server.on('error', (error) => { console.error('SERVER: HTTP Server Error:', error); });

// --- Periodic Cleanup (Keep from full version) ---
setInterval(() => { /* ... Full cleanup logic ... */ }, 1 * 60 * 1000);

console.log("SERVER: (Express + WS Path) Setup complete.");