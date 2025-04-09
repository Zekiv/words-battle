// server.js (FINAL - Includes HP Fix Logging & Bloopers History)
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
let games = {};   // { gameId: { ..., status, turnTimer, playedWords: [{type, word, player, soldiers?}] } }
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
const LETTERS_PER_PLAYER = 10;
const ROUND_TIME_MS = 60000; // 60 seconds

// --- Letter Distribution ---
const VOWELS = "AEIOU";
const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ";
const LETTER_POOL = (CONSONANTS.repeat(2) + VOWELS.repeat(3)).split('');

// --- Enhanced getRandomLetters (Adjusted Defaults) ---
function getRandomLetters(count = LETTERS_PER_PLAYER, minVowels = 3, minConsonants = 3) {
    if (count !== LETTERS_PER_PLAYER) { minVowels = Math.floor(count * 0.3); minConsonants = Math.floor(count * 0.3); }
    let attempts = 0; const maxAttempts = 25;
    while (attempts < maxAttempts) {
        attempts++; let letters = []; let currentPool = [...LETTER_POOL]; let v = 0; let c = 0;
        if (count > currentPool.length) { for (let i = 0; i < count; i++) { const idx=Math.floor(Math.random()*LETTER_POOL.length); const l=LETTER_POOL[idx]; letters.push(l); if(VOWELS.includes(l))v++; else c++; } }
        else { for (let i = 0; i < count; i++) { if(currentPool.length===0)break; const idx=Math.floor(Math.random()*currentPool.length); const l=currentPool.splice(idx,1)[0]; letters.push(l); if(VOWELS.includes(l))v++; else c++; } }
        if (letters.length === count && v >= minVowels && c >= minConsonants) return letters;
    }
    console.warn(`SERVER: getRandomLetters - Max attempts reached.`); let fallback = []; let fbPool = [...LETTER_POOL];
    for (let i = 0; i < count; i++) { if (fbPool.length === 0) break; const idx = Math.floor(Math.random() * fbPool.length); fallback.push(fbPool.splice(idx, 1)[0]); }
    return fallback;
}

// --- Game Logic Helpers ---
function calculateSoldiers(word) { const l = word.length; if (l >= 9) return 10; if (l >= 7) return 7; if (l >= 6) return 5; if (l >= 5) return 3; if (l >= 3) return 1; return 0; }

function broadcast(gameId, message) {
    const game = games[gameId]; if (!game) return;
    const p1Id = game.player1Id; const p2Id = game.player2Id;
    if(p1Id) sendToPlayer(p1Id, message);
    if(p2Id) sendToPlayer(p2Id, message);
}

function sendToPlayer(playerId, message) {
     const player = players[playerId];
     if (player?.ws?.readyState === WebSocket.OPEN) {
         try { const msgStr = JSON.stringify(message); player.ws.send(msgStr, (err) => { if (err) console.error(`SERVER: ws.send CB Err P(${playerId}):`, err); }); }
         catch (stringifyError) { console.error(`SERVER: Strfy Err P(${playerId}):`, stringifyError, message); }
     }
}

function startGame(gameId) {
    const game = games[gameId]; if (!game || game.status !== 'waiting') return;
    game.status = 'playing'; const p1 = players[game.player1Id]; const p2 = players[game.player2Id];
    if (!p1 || !p2) { console.error(`SERVER: Start ${gameId} fail`); game.status = 'aborted'; return; }
    p1.hp = STARTING_HP; p2.hp = STARTING_HP; p1.letters = getRandomLetters(); p2.letters = getRandomLetters();
    game.createdTimestamp = Date.now(); game.playedWords = []; // Initialize playedWords
    console.log(`SERVER: Game ${gameId} starting: ${p1.nickname} vs ${p2.nickname}`);
    broadcast(gameId, { type: 'gameStart', gameId, player1: { id: p1.id, nickname: p1.nickname, hp: p1.hp }, player2: { id: p2.id, nickname: p2.nickname, hp: p2.hp }, timer: ROUND_TIME_MS });
    sendToPlayer(p1.id, { type: 'initialLetters', letters: p1.letters }); sendToPlayer(p2.id, { type: 'initialLetters', letters: p2.letters });
    if(game.turnTimer) clearTimeout(game.turnTimer); game.turnTimer = setTimeout(() => endRound(gameId), ROUND_TIME_MS);
}

function endRound(gameId) {
    const game = games[gameId]; if (!game || game.status !== 'playing') { if(game?.turnTimer) clearTimeout(game.turnTimer); if(game) game.turnTimer = null; return; }
    clearTimeout(game.turnTimer); game.turnTimer = null; const p1 = players[game.player1Id]; const p2 = players[game.player2Id];
    if (!p1 || !p2) { console.log(`SERVER: Abort new round ${gameId}, players missing.`); game.status = 'aborted'; return; }
    p1.letters = getRandomLetters(); p2.letters = getRandomLetters(); console.log(`SERVER: Game ${gameId} - New round.`);
    // Send history and timer in broadcast
    broadcast(gameId, { type: 'newRound', timer: ROUND_TIME_MS, playedWords: game.playedWords || [] });
    // Send specific letters
    sendToPlayer(p1.id, {type: 'updateLetters', letters: p1.letters}); sendToPlayer(p2.id, {type: 'updateLetters', letters: p2.letters});
    if (game.status === 'playing') game.turnTimer = setTimeout(() => endRound(gameId), ROUND_TIME_MS);
}

// --- CORRECTED handleWordSubmit with Blooper History ---
function handleWordSubmit(playerId, word) {
    const player = players[playerId]; if (!player?.gameId) return;
    const game = games[player.gameId]; if (!game || game.status !== 'playing') return;
    const normalizedWord = word.trim().toUpperCase();
    if (!game.playedWords) game.playedWords = []; // Ensure history array exists

    let tempLetters = [...player.letters]; // Make a copy
    let validLetters = true;
    if (!normalizedWord) {
        validLetters = false;
    } else {
        for (const char of normalizedWord) {
            const index = tempLetters.indexOf(char);
            if (index === -1) { validLetters = false; break; }
            tempLetters.splice(index, 1); // Consume the letter
        }
    }

    const lowerCaseWord = normalizedWord.toLowerCase();
    const isValidWord = wordSet.has(lowerCaseWord);
    const isValidLength = normalizedWord.length >= 3;
    const MAX_HISTORY = 20; // Define max history size

    if (validLetters && isValidWord && isValidLength) {
        // --- Valid Word Logic ---
        const soldierCount = calculateSoldiers(lowerCaseWord);
        console.log(`SERVER: ${player.nickname} valid word "${normalizedWord}" (${soldierCount} soldiers)`);
        player.letters = getRandomLetters(LETTERS_PER_PLAYER);
        // Add valid word to history
        game.playedWords.push({ type: 'valid', word: normalizedWord, player: player.nickname, soldiers: soldierCount });
        if (game.playedWords.length > MAX_HISTORY) game.playedWords = game.playedWords.slice(-MAX_HISTORY);
        // Send updates
        sendToPlayer(playerId, { type: 'wordValidated', playerId, word: normalizedWord, isValid: true, soldierCount, newLetters: player.letters });
        const opponentId = (playerId === game.player1Id) ? game.player2Id : game.player1Id;
        sendToPlayer(opponentId, { type: 'wordValidated', playerId, word: normalizedWord, isValid: true, soldierCount });
        broadcast(game.gameId, { type: 'updateWordHistory', playedWords: game.playedWords });

    } else {
        // --- Invalid Word Logic ---
        console.log(`SERVER: ${player.nickname} invalid word "${normalizedWord}" (L:${validLetters}, D:${isValidWord}, Len:${isValidLength})`);
        // Add invalid word ("blooper") to history - only if it was actually submitted (not empty)
        if (normalizedWord) {
             game.playedWords.push({ type: 'invalid', word: normalizedWord, player: player.nickname });
             if (game.playedWords.length > MAX_HISTORY) game.playedWords = game.playedWords.slice(-MAX_HISTORY);
             // Broadcast updated history including the blooper
             broadcast(game.gameId, { type: 'updateWordHistory', playedWords: game.playedWords });
        }
        // Only notify the submitting player that it was invalid
        sendToPlayer(playerId, { type: 'wordValidated', playerId, word: normalizedWord, isValid: false });
    }
}
// --- End CORRECTED handleWordSubmit ---


function handleCastleHit(clientPlayerId, attackingPlayerId, soldierCount) {
    console.log(`SERVER: Received castleHit from client ${clientPlayerId}. Attacker ID: ${attackingPlayerId}, Count: ${soldierCount}`); // LOGGING
    const attacker = players[attackingPlayerId]; if (!attacker?.gameId) { console.warn(`SERVER: Attacker ${attackingPlayerId} not found for castleHit.`); return; }
    const game = games[attacker.gameId]; if (!game || game.status !== 'playing') { console.warn(`SERVER: Game ${attacker.gameId} not active for castleHit.`); return; }
    let targetPlayerId = null; if (attackingPlayerId === game.player1Id) targetPlayerId = game.player2Id; else if (attackingPlayerId === game.player2Id) targetPlayerId = game.player1Id; else { console.error(`SERVER: Attacker ID mismatch`); return; }
    const targetPlayer = players[targetPlayerId]; console.log(`SERVER: Target player for hit is ${targetPlayerId} (${targetPlayer?.nickname})`); // LOGGING
    if (targetPlayer && targetPlayer.hp > 0) {
        const damage = soldierCount; const oldHp = targetPlayer.hp; targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);
        console.log(`SERVER: Game ${game.gameId}: Reducing ${targetPlayer.nickname} HP ${oldHp} -> ${targetPlayer.hp}`); // LOGGING
        const updatePayload = { type: 'updateHP', playerId: targetPlayerId, hp: targetPlayer.hp, attackerId };
        console.log(`SERVER: Broadcasting updateHP:`, updatePayload); // LOGGING
        broadcast(game.gameId, updatePayload);
        if (targetPlayer.hp <= 0) { game.status = 'ended'; game.endedTimestamp = Date.now(); if(game.turnTimer) clearTimeout(game.turnTimer); game.turnTimer = null; console.log(`SERVER: Game ${game.gameId} ended. Winner: ${attacker.nickname}`); broadcast(game.gameId, { type: 'gameOver', winnerId: attackingPlayerId, loserId: targetPlayerId }); }
    } else { console.log(`SERVER: Target player ${targetPlayerId} not found or already 0 HP.`); }
 }

// --- Express Static File Serving ---
app.use(express.static(__dirname));
app.get('/', (req, res) => { const idx=path.join(__dirname, 'index_2d.html'); if(fs.existsSync(idx)) res.sendFile(idx); else res.status(404).send('Not found.'); });

// --- WebSocket Connection Handling ---
wss.on('connection', (ws, req) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`SERVER: ===== WebSocket Connection Opened ===== ID: ${playerId}`);
    players[playerId] = { ws, id: playerId, nickname: `Player_${playerId.substring(playerId.length - 4)}`, hp: STARTING_HP, letters: [], gameId: null };
    console.log(`SERVER: [${playerId}] Waiting for 'join' message.`);

    ws.on('message', (message) => {
         let data;
         try { data = JSON.parse(message); const player = players[playerId]; if (!player) return;
             switch (data.type) {
                 case 'join':
                     if (player) {
                         player.nickname = data.nickname?.substring(0, 12).trim() || `Anon_${playerId.substring(playerId.length-4)}`; console.log(`SERVER: Player ${playerId} 'join' as ${player.nickname}`);
                         sendToPlayer(playerId, { type: 'assignId', playerId: playerId }); console.log(`SERVER: Sent assignId to ${playerId}`);
                         if (waitingPlayer && waitingPlayer.id !== playerId && players[waitingPlayer.id]?.ws?.readyState === WebSocket.OPEN) { const p1 = waitingPlayer; const p2 = player; const gid = nextGameId++; p1.gameId = gid; p2.gameId = gid; games[gid] = { gameId: gid, player1Id: p1.id, player2Id: p2.id, status: 'waiting', turnTimer: null }; console.log(`SERVER: Match! Game ${gid} for ${p1.nickname} & ${p2.nickname}.`); waitingPlayer = null; startGame(gid); }
                         else { if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN) console.log(`SERVER: Waiting player ${waitingPlayer.id} d/c? ${player.nickname} now waiting.`); waitingPlayer = player; sendToPlayer(playerId, { type: 'waiting', message: 'Waiting for another player...' }); console.log(`SERVER: Player ${player.nickname} (${playerId}) waiting.`); }
                     } break;
                 case 'submitWord': if (data.word) handleWordSubmit(playerId, data.word); break;
                 case 'castleHit': if (player.gameId && data.attackingPlayerId && typeof data.soldierCount === 'number' && data.soldierCount > 0) handleCastleHit(playerId, data.attackingPlayerId, data.soldierCount); break;
                 default: console.log(`SERVER: Unhandled msg type "${data.type}" from ${playerId}`);
             }
         } catch (error) { console.error(`SERVER: Failed processing msg from ${playerId}. Error: ${error.message}. Msg:`, message); }
    });

    ws.on('close', (code, reason) => {
        const player = players[playerId]; if (!player) return; const nickname = player.nickname || playerId; console.log(`SERVER: Client disconnected: ${nickname} (Code: ${code})`);
        const gameId = player.gameId; if (gameId && games[gameId]) { const game = games[gameId]; if (game.status === 'playing' || game.status === 'waiting') { if(game.turnTimer) clearTimeout(game.turnTimer); game.turnTimer = null; game.status = 'aborted'; game.endedTimestamp = Date.now(); const opponentId = (playerId === game.player1Id) ? game.player2Id : game.player1Id; const opponent = players[opponentId]; if(opponent?.ws?.readyState === WebSocket.OPEN) { opponent.gameId = null; sendToPlayer(opponentId, { type: 'opponentLeft', message: `${player.nickname || 'Opponent'} disconnected.` }); sendToPlayer(opponentId, { type: 'gameOver', winnerId: opponentId, loserId: playerId, reason: 'disconnect' }); } } }
        if (waitingPlayer && waitingPlayer.id === playerId) waitingPlayer = null; delete players[playerId]; console.log(`SERVER: Player ${playerId} removed. Players left: ${Object.keys(players).length}`);
    });
    ws.on('error', (error) => { const nickname = players[playerId]?.nickname || playerId; console.error(`SERVER: WebSocket error for ${nickname}: ${error.message}`); if (ws.readyState !== WebSocket.CLOSED) ws.terminate(); });
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
setInterval(() => {
    let cleanedGames = 0; const now = Date.now(); const gameTimeout = 30 * 60 * 1000; const waitingTimeout = 5 * 60 * 1000;
    for (const gameId in games) { const game = games[gameId]; let shouldDelete = false; if ((game.status === 'ended' || game.status === 'aborted')) { if (!game.endedTimestamp) game.endedTimestamp = now; if (now - game.endedTimestamp > gameTimeout) shouldDelete = true; } else if (game.status === 'waiting') { if (!game.createdTimestamp) game.createdTimestamp = now; if (now - game.createdTimestamp > waitingTimeout) { console.log(`SERVER: Cleaning up game ${gameId} stuck waiting.`); shouldDelete = true; } } if (shouldDelete) { if(game.turnTimer) clearTimeout(game.turnTimer); if(players[game.player1Id]) players[game.player1Id].gameId = null; if(players[game.player2Id]) players[game.player2Id].gameId = null; delete games[gameId]; cleanedGames++; } }
    if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN) waitingPlayer = null;
    // if (cleanedGames > 0) console.log(`SERVER: Auto-cleaned ${cleanedGames} old/stale games.`);
}, 1 * 60 * 1000);

console.log("SERVER: (Express + Direct Connect) Setup complete.");