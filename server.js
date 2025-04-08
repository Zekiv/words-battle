// server.js (Clean - Full Logic + Render Ready + Enhanced Send Logging)
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ server });
console.log(`SERVER: WebSocket server attached to HTTP server.`);

let players = {}; // { id: { ws, nickname, hp, letters, gameId } }
let games = {};   // { gameId: { player1Id, player2Id, turnTime, status, turnTimer, endedTimestamp?, createdTimestamp? } }
let waitingPlayer = null;
let nextGameId = 1;

// --- Word Dictionary Loading ---
let wordSet = new Set();
const dictionaryPath = path.join(__dirname, 'words.txt');
try {
    if (fs.existsSync(dictionaryPath)) {
        const wordData = fs.readFileSync(dictionaryPath, 'utf8');
        wordData.split(/\r?\n/).forEach(word => {
            const trimmedWord = word.trim().toLowerCase();
            if (trimmedWord.length > 1) { wordSet.add(trimmedWord); }
        });
        console.log(`SERVER: Loaded ${wordSet.size} words from ${dictionaryPath}.`);
    } else {
        console.error(`SERVER: Error - words.txt not found at ${dictionaryPath}. Using default list.`);
        wordSet.add("cat").add("dog").add("go").add("run").add("word").add("game").add("play").add("win").add("hit").add("castle").add("battle");
    }
} catch (err) {
    console.error(`SERVER: Error reading word list at ${dictionaryPath}:`, err);
}

// --- Game Constants ---
const STARTING_HP = 100;
const LETTERS_PER_PLAYER = 7;
const ROUND_TIME_MS = 30000;

// --- Letter Distribution ---
const VOWELS = "AEIOU";
const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ";
const LETTER_POOL = (CONSONANTS.repeat(2) + VOWELS.repeat(3)).split('');

function getRandomLetters(count) {
    let letters = []; let currentPool = [...LETTER_POOL];
    if (count > currentPool.length) {
        console.warn("SERVER: Requested more letters than available in pool, drawing with replacement.");
        for (let i = 0; i < count; i++) letters.push(LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]);
        return letters;
    }
    for (let i = 0; i < count; i++) { if (currentPool.length === 0) break; const idx = Math.floor(Math.random() * currentPool.length); letters.push(currentPool.splice(idx, 1)[0]); }
    return letters;
}

// --- Game Logic Helpers ---
function calculateSoldiers(word) { const l = word.length; if (l >= 8) return 7; if (l >= 6) return 5; if (l >= 5) return 3; if (l >= 3) return 1; return 0; }

function broadcast(gameId, message) { /* ... Keep previous version ... */ } // Assumed correct

// --- Updated sendToPlayer with Internal Logging ---
function sendToPlayer(playerId, message) {
     const player = players[playerId];
     // console.log(`DEBUG: Attempting sendToPlayer for ${playerId}, Type: ${message?.type}`); // Optional verbose log
     if (player?.ws?.readyState === WebSocket.OPEN) {
         try {
             const messageString = JSON.stringify(message);
             // console.log(`DEBUG: [${playerId}] Sending message string: ${messageString.substring(0, 100)}...`); // Log before sending
             player.ws.send(messageString, (err) => { // Use callback for send errors
                 if (err) {
                     console.error(`SERVER: ws.send callback error for Player (${playerId}):`, err);
                 } else {
                     // Optionally log success, might be too noisy: console.log(`DEBUG: [${playerId}] ws.send successful for type ${message?.type}.`);
                 }
             });
         } catch (stringifyError) {
             console.error(`SERVER: Error stringifying message for Player (${playerId}):`, stringifyError);
             console.error(`SERVER: Message object was:`, message); // Log the object that failed
         }
     } else {
          // Log only if we expected player to be connected
          // console.log(`SERVER: Cannot send direct msg to Player (${playerId}), WS state is: ${player?.ws?.readyState}`);
     }
}
// --- End Updated sendToPlayer ---

function startGame(gameId) { /* ... Keep previous version ... */ }
function endRound(gameId) { /* ... Keep previous version ... */ }
function handleWordSubmit(playerId, word) { /* ... Keep previous version ... */ }
function handleCastleHit(clientPlayerId, attackingPlayerId, soldierCount) { /* ... Keep previous version ... */ }

// --- Express Static File Serving ---
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index_2d.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('index_2d.html not found.');
});

// --- WebSocket Connection Handling ---
wss.on('connection', (ws, req) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`SERVER: Client connected: ${playerId}.`); // Log 1: Connection opened
    players[playerId] = { ws, id: playerId, nickname: `Player_${playerId.substring(playerId.length - 4)}`, hp: STARTING_HP, letters: [], gameId: null };

     // --- Send Server Config ---
     const port = process.env.PORT || 8080; const externalUrlEnv = process.env.RENDER_EXTERNAL_URL; let wsUrl;
     console.log(`SERVER: [${playerId}] Determining WS URL. RENDER_EXTERNAL_URL=${externalUrlEnv}, PORT=${port}`); // Log 2

     if (externalUrlEnv) {
         try { const httpUrl = externalUrlEnv; if (!httpUrl.includes('//')) throw new Error("URL invalid format"); const domain = httpUrl.split('//')[1]; if (!domain) throw new Error("Domain invalid format"); wsUrl = `wss://${domain}`; console.log(`SERVER: [${playerId}] Constructed wss URL: ${wsUrl}`); } // Log 3
         catch (e) { console.error(`SERVER: [${playerId}] Error parsing RENDER_EXTERNAL_URL (${externalUrlEnv}):`, e.message); wsUrl = null; } // Log 4
     } else { wsUrl = `ws://localhost:${port}`; console.log(`SERVER: [${playerId}] Constructed local ws URL: ${wsUrl}`); } // Log 5

    if (wsUrl) {
         console.log(`SERVER: [${playerId}] Attempting to send serverConfig with URL: ${wsUrl}`); // Log 6
         // Call sendToPlayer - relies on its internal logging now
         sendToPlayer(playerId, { type: 'serverConfig', playerId: playerId, websocketUrl: wsUrl });
         // Log 7 removed, handled inside sendToPlayer (callback) or potential errors logged there
    } else {
        console.error(`SERVER: [${playerId}] Failed to determine websocketUrl. Cannot send serverConfig. Closing connection.`); // Log 9
        ws.close(1011, "Server configuration error");
    }

    ws.on('message', (message) => { /* ... Keep previous version ... */ });
    ws.on('close', (code, reason) => { /* ... Keep previous version ... */ });
    ws.on('error', (error) => { /* ... Keep previous version ... */ });
});

// --- Start HTTP Server ---
const port = process.env.PORT || 8080;
server.listen(port, () => { /* ... Keep previous version ... */ });

// --- Periodic Cleanup ---
setInterval(() => { /* ... Keep previous version ... */ }, 1 * 60 * 1000);

console.log("SERVER: Setup complete. Waiting for connections...");