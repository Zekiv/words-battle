// server.js (Updated with Gameplay Changes: 10 letters, 60s timer, V/C balance)
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

// --- Game State ---
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
const LETTERS_PER_PLAYER = 10; // <<< CHANGED
const ROUND_TIME_MS = 60000; // <<< CHANGED (60 seconds)

// --- Letter Distribution ---
const VOWELS = "AEIOU";
const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ";
// Adjust pool if needed based on new letter count, but current ratio might be fine
const LETTER_POOL = (CONSONANTS.repeat(2) + VOWELS.repeat(3)).split('');

// --- Enhanced getRandomLetters (Adjusted Defaults) ---
function getRandomLetters(count = LETTERS_PER_PLAYER, minVowels = 3, minConsonants = 3) { // <<< CHANGED DEFAULTS
    // Adjust minimums if count is not the standard 10
    if (count !== LETTERS_PER_PLAYER) {
         minVowels = Math.floor(count * 0.3); // ~30% vowels minimum
         minConsonants = Math.floor(count * 0.3); // ~30% consonants minimum
    }

    let attempts = 0;
    const maxAttempts = 25;

    while (attempts < maxAttempts) {
        attempts++; let letters = []; let currentPool = [...LETTER_POOL]; let v = 0; let c = 0;
        // Draw logic (remains the same)
        if (count > currentPool.length) { for (let i = 0; i < count; i++) { const idx=Math.floor(Math.random()*LETTER_POOL.length); const l=LETTER_POOL[idx]; letters.push(l); if(VOWELS.includes(l))v++; else c++; } }
        else { for (let i = 0; i < count; i++) { if(currentPool.length===0)break; const idx=Math.floor(Math.random()*currentPool.length); const l=currentPool.splice(idx,1)[0]; letters.push(l); if(VOWELS.includes(l))v++; else c++; } }

        // Check criteria with potentially adjusted minimums
        if (letters.length === count && v >= minVowels && c >= minConsonants) {
            return letters; // Return valid set
        }
    }

    console.warn(`SERVER: getRandomLetters - Max attempts reached. Returning last drawn (may be unbalanced).`);
    let fallback = []; let fbPool = [...LETTER_POOL]; // Fallback draw
    for (let i = 0; i < count; i++) { if (fbPool.length === 0) break; const idx = Math.floor(Math.random() * fbPool.length); fallback.push(fbPool.splice(idx, 1)[0]); }
    return fallback;
}
// --- End Enhanced getRandomLetters ---


// --- Game Logic Helpers ---
function calculateSoldiers(word) {
    const length = word.length;
    // Adjust soldier count based on word length - maybe scale more with 10 letters?
    if (length >= 9) return 10; // Longer words -> more soldiers
    if (length >= 7) return 7;
    if (length >= 6) return 5;
    if (length >= 5) return 3;
    if (length >= 3) return 1; // Keep minimum word length 3
    return 0;
}

function broadcast(gameId, message) { /* ... Keep exactly as before ... */ }
function sendToPlayer(playerId, message) { /* ... Keep exactly as before ... */ }
function startGame(gameId) { /* ... Keep exactly as before (uses updated constants/getRandomLetters) ... */ }
function endRound(gameId) { /* ... Keep exactly as before (uses updated constants/getRandomLetters) ... */ }
function handleWordSubmit(playerId, word) { /* ... Keep exactly as before (uses updated calculateSoldiers/getRandomLetters) ... */ }
function handleCastleHit(clientPlayerId, attackingPlayerId, soldierCount) { /* ... Keep exactly as before ... */ }

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
    console.log(`SERVER: ===== WebSocket Connection Opened ===== ID: ${playerId}`);
    players[playerId] = { ws, id: playerId, nickname: `Player_${playerId.substring(playerId.length - 4)}`, hp: STARTING_HP, letters: [], gameId: null };
    console.log(`SERVER: [${playerId}] Connection established. Waiting for client 'join' message.`);

    ws.on('message', (message) => {
         let data;
         try { data = JSON.parse(message); const player = players[playerId]; if (!player) return;
             switch (data.type) {
                 case 'join':
                     if (player) {
                         player.nickname = data.nickname?.substring(0, 12).trim() || `Anon_${playerId.substring(playerId.length-4)}`; console.log(`SERVER: Player ${playerId} sent 'join' as ${player.nickname}`);
                         sendToPlayer(playerId, { type: 'assignId', playerId: playerId }); console.log(`SERVER: Sent assignId to ${playerId}`);
                         if (waitingPlayer && waitingPlayer.id !== playerId && players[waitingPlayer.id]?.ws?.readyState === WebSocket.OPEN) { const p1 = waitingPlayer; const p2 = player; const gid = nextGameId++; p1.gameId = gid; p2.gameId = gid; games[gid] = { gameId: gid, player1Id: p1.id, player2Id: p2.id, status: 'waiting', turnTimer: null }; console.log(`SERVER: Match! Game ${gid} created for ${p1.nickname} & ${p2.nickname}.`); waitingPlayer = null; startGame(gid); }
                         else { if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN) console.log(`SERVER: Waiting player ${waitingPlayer.id} d/c? ${player.nickname} now waiting.`); waitingPlayer = player; sendToPlayer(playerId, { type: 'waiting', message: 'Waiting for another player...' }); console.log(`SERVER: Player ${player.nickname} (${playerId}) is now waiting.`); }
                     } break;
                 case 'submitWord': if (data.word) handleWordSubmit(playerId, data.word); break;
                 case 'castleHit': if (player.gameId && data.attackingPlayerId && typeof data.soldierCount === 'number' && data.soldierCount > 0) handleCastleHit(playerId, data.attackingPlayerId, data.soldierCount); break;
                 default: console.log(`SERVER: Unhandled msg type "${data.type}" from ${playerId}`);
             }
         } catch (error) { console.error(`SERVER: Failed processing msg from ${playerId}. Error: ${error.message}. Msg:`, message); }
    });

    ws.on('close', (code, reason) => { /* ... Keep exactly as before ... */ });
    ws.on('error', (error) => { /* ... Keep exactly as before ... */ });
});

wss.on('error', (error) => { console.error('SERVER: WebSocket Server Error:', error); });

// --- Start the HTTP Server ---
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`SERVER: (Express + Direct Connect) HTTP server listening on port ${port}`);
   if(process.env.RENDER_EXTERNAL_URL) console.log(`SERVER: Public URL (Render): ${process.env.RENDER_EXTERNAL_URL}`); else console.log(`SERVER: Local Access: http://localhost:${port}`);
});
server.on('error', (error) => { console.error('SERVER: HTTP Server Error:', error); if (error.code === 'EADDRINUSE') console.error(`SERVER: Port ${port} already in use.`); });

// --- Periodic Cleanup ---
setInterval(() => { /* ... Keep exactly as before ... */ }, 1 * 60 * 1000);

console.log("SERVER: (Express + Direct Connect) Setup complete.");