// server.js (Full Game Logic + Render Ready + Logging)
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ server });
console.log(`WebSocket server attached to HTTP server.`);

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
        console.log the two fully updated files, `server.js` and `script_2d.js`.

These files contain the **full game logic** but include the critical changes we identified from the debugging steps:
*   **Server:** Sends the correct WebSocket URL (`wss://...` on Render) via `serverConfig` and includes extra logging around this process.
*   **Client:** Waits for the `serverConfig` message before attempting the WebSocket connection and wraps initialization in `DOMContentLoaded`.

Copy the entire content of each block below into the corresponding file in your project.

---

**File 1: `server.js` (Full Game Logic + Connection Debug Logging)**

```javascript
// server.js (Full Game Logic + Render Deployment + Connection Debug Logging)
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ server });
console.log(`WebSocket server attached to HTTP server.`);

let players = {}; // { id: { ws, nickname, hp, letters, gameId } }
let games = {};   // { gameId: { player1Id,(`SERVER: Loaded ${wordSet.size} words from ${dictionaryPath}.`);
    } else {
        console.error(`SERVER: Error - words.txt not found at ${dictionaryPath}. Using default list.`);
        wordSet.add("cat").add("dog").add("go").add("run").add("word").add("game").add("play").add("win").add("hit").add("castle").add("battle");
    }
} catch (err) {
    console.error(`SERVER: Error reading player2Id, turnTime, status, turnTimer, endedTimestamp?, createdTimestamp? } }
let waitingPlayer = null;
let nextGameId = 1;

// --- Word Dictionary Loading ---
let wordSet = new Set();
const dictionaryPath = path.join(__dirname, 'words.txt');
try {
     word list at ${dictionaryPath}:`, err);
}

// --- Game Constants ---
const STARTING_HP = 100;
const LETTERS_PER_PLAYER = 7;
const ROUND_TIME_MSif (fs.existsSync(dictionaryPath)) {
        const wordData = fs.readFileSync(dictionaryPath, 'utf8');
        wordData.split(/\r?\n/).forEach(word => {
            const trimmedWord = 30000;

// --- Letter Distribution ---
const = word.trim().toLowerCase();
            if (trimmedWord.length > VOWELS = "AEIOU";
const CONSONANTS = " 1) {
                wordSet.add(trimmedWord);
            }
        });
        console.log(`SERVER: Loaded ${wordSetBCDFGHJKLMNPQRSTVWXYZ";
const LETTER_POOL = (CONSONANTS.repeat(2) + VOWELS.repeat(.size} words from ${dictionaryPath}.`);
    } else {
3)).split('');

function getRandomLetters(count) {
    let letters        console.error(`SERVER: Error - words.txt not found at ${ = [];
    let currentPool = [...LETTER_POOL];
    ifdictionaryPath}`);
        console.log("SERVER: Using minimal default word list (count > currentPool.length) {
        console.warn("SERVER: Requested more letters than in pool, drawing with replacement.");
        for (let i = 0; i < count; i++) letters.push(LETTER_POOL[Math.");
        wordSet.add("cat").add("dog").add(".floor(Math.random() * LETTER_POOL.length)]);
        return letters;
    }
    for (let i = 0;go").add("run").add("word").add("game").add("play").add("win").add("hit").add("castle").add("soldier").add("attack");
    }
} catch (err) {
    console.error(`SERVER: Error reading word list at ${dictionaryPath}:`, i < count; i++) {
        if (currentPool.length === err);
}

// --- Game Constants ---
const STARTING_HP 0) break;
        const randomIndex = Math.floor(Math. = 100;
const LETTERS_PER_PLAYER = 7random() * currentPool.length);
        letters.push(currentPool;
const ROUND_TIME_MS = 30000;

// --- Letter Distribution ---
const VOWELS = "AEIOU.splice(randomIndex, 1)[0]);
    }
    return";
const CONSONANTS = "BCDFGHJKLMNPQRSTVW letters;
}

// --- Game Logic Helpers ---
function calculateSoldiersXYZ";
const LETTER_POOL = (CONSONANTS.repeat(2) + VOWELS.repeat(3)).split('');

function getRandomLetters(word) {
    const length = word.length;
    if(count) {
    let letters = [];
    let currentPool = [...LETTER_POOL];
    if (count > currentPool.length) (length >= 8) return 7; if (length >= 6) return  {
        console.warn("SERVER: Requested more letters than available in pool, drawing with replacement.");
        for (let i = 0; i5;
    if (length >= 5) return 3; if (length >= < count; i++) {
            const randomIndex = Math.floor(Math.random() * LETTER_POOL.length);
            letters.push( 3) return 1;
    return 0;
}

function broadcast(gameId, message) {
    const game = games[LETTER_POOL[randomIndex]);
        }
        return letters;
    gameId]; if (!game) return;
    const player1 = players}
    for (let i = 0; i < count; i[game.player1Id]; const player2 = players[game.player2Id];
    const messageString = JSON.stringify(message);
++) {
        if (currentPool.length === 0) break;    if (player1?.ws?.readyState === WebSocket.OPEN) player1.ws.send(messageString, (err) => { if (err) console.
        const randomIndex = Math.floor(Math.random() * currentPoolerror(`SERVER: BCast P1 Err:`, err); });
    if (player.length);
        letters.push(currentPool.splice(randomIndex, 1)[0]);
    }
    return letters;
}

2?.ws?.readyState === WebSocket.OPEN) player2.ws.send// --- Game Logic Helpers ---
function calculateSoldiers(word) {
    const length = word.length;
    if (length >= 8(messageString, (err) => { if (err) console.error(`SERVER: BCast P2 Err:`, err); });
}

) return 7;
    if (length >= 6) return function sendToPlayer(playerId, message) {
     const player = players5;
    if (length >= 5) return 3;
    if (length >= 3) return 1;
    return [playerId];
     if (player?.ws?.readyState === WebSocket.OPEN0;
}

function broadcast(gameId, message) {
    ) player.ws.send(JSON.stringify(message), (err) => { if (err) console.error(`SERVER: SendTo ${playerId} Err:const game = games[gameId];
    if (!game) return;
    const player1 = players[game.player1Id];
    `, err); });
}

function startGame(gameId) {
    const gameconst player2 = players[game.player2Id];
    const messageString = JSON.stringify(message);

    if (player1?.ws?.readyState === WebSocket.OPEN) {
        player1.ws.send = games[gameId]; if (!game || game.status !== 'waiting') return;(messageString, (err) => { if (err) console.error(`SERVER: Error sending broadcast to P1 (${player1.id}):`, err); });
    game.status = 'playing';
    const player1 = players[game.player1Id]; const player2 = players[game.player
    }
    if (player2?.ws?.readyState === WebSocket.2Id];
    if (!player1 || !player2) { consoleOPEN) {
        player2.ws.send(messageString, (.error(`SERVER: Start ${gameId} fail, players missing.`); gameerr) => { if (err) console.error(`SERVER: Error sending broadcast to P2 (${player2.id}):`, err); });
    .status = 'aborted'; if(game.turnTimer) clearTimeout(game.turnTimer); return; }
    player1.hp = START}
}

function sendToPlayer(playerId, message) {
     ING_HP; player2.hp = STARTING_HP;
    const player = players[playerId];
     if (player?.ws?.readyState === WebSocket.OPEN) {
         player.ws.send(JSON.player1.letters = getRandomLetters(LETTERS_PER_PLAYER); playerstringify(message), (err) => { if (err) console.error2.letters = getRandomLetters(LETTERS_PER_PLAYER);
    (`SERVER: Error sending direct msg to Player (${playerId}):`, err); });
     }
}

function startGame(gameId) {
    const game = games[gameId];
    if (!game || game.status !== 'waitinggame.createdTimestamp = Date.now();
    console.log(`SERVER: Game ${gameId} starting: ${player1.nickname} vs ${player2.') return;

    game.status = 'playing';
    const player1 = players[game.player1Id];
    const player2 =nickname}`);
    broadcast(gameId, { type: 'gameStart', gameId: gameId, player1: { id: player1.id, players[game.player2Id];

    if (!player1 || ! nickname: player1.nickname, hp: player1.hp }, player2player2) {
        console.error(`SERVER: Cannot start game ${: { id: player2.id, nickname: player2.nickname,gameId}, P1 or P2 missing from 'players' object.`);
        game. hp: player2.hp }, timer: ROUND_TIME_MS });
status = 'aborted';
        if(game.turnTimer) clearTimeout(game.turnTimer);
        return;
    }

    player1.hp    sendToPlayer(player1.id, { type: 'initialLetters = STARTING_HP;
    player2.hp = STARTING_', letters: player1.letters });
    sendToPlayer(player2HP;
    player1.letters = getRandomLetters(LETTERS_PER.id, { type: 'initialLetters', letters: player2.letters_PLAYER);
    player2.letters = getRandomLetters(LETTERS_ });
    if(game.turnTimer) clearTimeout(game.turnTimerPER_PLAYER);
    game.createdTimestamp = Date.now();

); game.turnTimer = setTimeout(() => endRound(gameId), ROUND    console.log(`SERVER: Game ${gameId} starting between ${player_TIME_MS);
}

function endRound(gameId) {1.nickname} and ${player2.nickname}`);

    broadcast(game
    const game = games[gameId]; if (!game || game.Id, {
        type: 'gameStart', gameId: gameIdstatus !== 'playing') return;
    clearTimeout(game.turnTimer,
        player1: { id: player1.id, nickname: player1.nickname, hp: player1.hp },
        player2: {); game.turnTimer = null;
    const player1 = players[game.player1Id]; const player2 = players[game.player2 id: player2.id, nickname: player2.nickname, hp: player2.hp },
        timer: ROUND_TIME_MS
    Id];
    if (!player1 || !player2) { console.});

    sendToPlayer(player1.id, { type: 'log(`SERVER: EndRound ${gameId} fail, players missing.`); if(gameinitialLetters', letters: player1.letters });
    sendToPlayer(player2.id, { type: 'initialLetters', letters: player2.status === 'playing') game.status = 'aborted'; return;.letters });

    if(game.turnTimer) clearTimeout(game. }
    player1.letters = getRandomLetters(LETTERS_PER_turnTimer);
    game.turnTimer = setTimeout(() => endRound(PLAYER); player2.letters = getRandomLetters(LETTERS_PER_PLAYERgameId), ROUND_TIME_MS);
}

function endRound();
    console.log(`SERVER: Game ${gameId} - NewgameId) {
    const game = games[gameId];
     round.`);
    sendToPlayer(player1.id, { type: 'newRound', letters: player1.letters, timer: ROUND_TIMEif (!game || game.status !== 'playing') return;

    clearTimeout(_MS });
    sendToPlayer(player2.id, { type: 'newRound', letters: player2.letters, timer: ROUND_game.turnTimer);
    game.turnTimer = null;

    TIME_MS });
    game.turnTimer = setTimeout(() => endRound(gameId), ROUND_TIME_MS);
}

function handleWordconst player1 = players[game.player1Id];
    const playerSubmit(playerId, word) {
    const player = players[playerId]; if (!player?.gameId) return;
    const game = games[player.gameId]; if (!game || game.status !== 'playing')2 = players[game.player2Id];

    if (!player1 || !player2) {
         console.log(`SERVER: Cannot start return;
    const normalizedWord = word.trim().toUpperCase();
     new round for game ${gameId}, players missing.`);
         if(gamelet tempLetters = [...player.letters]; let validLetters = true;
.status === 'playing') game.status = 'aborted';
         return;
    }

    player1.letters = getRandomLetters(LET    if (!normalizedWord) validLetters = false;
    for (const char of normalizedTERS_PER_PLAYER);
    player2.letters = getRandomLetters(Word) { const index = tempLetters.indexOf(char); if (indexLETTERS_PER_PLAYER);

    console.log(`SERVER: Game ${gameId} - New round starting.`);

    sendToPlayer(player1.id, { type: 'newRound', letters: player1. === -1) { validLetters = false; break; } tempLetters.splice(index, 1); }
    const lowerCaseWord = normalizedletters, timer: ROUND_TIME_MS });
    sendToPlayer(Word.toLowerCase();
    const isValidWord = wordSet.has(lowerCaseplayer2.id, { type: 'newRound', letters: player2Word); const isValidLength = normalizedWord.length >= 3;
    .letters, timer: ROUND_TIME_MS });

    game.turnif (validLetters && isValidWord && isValidLength) {
        const soldierTimer = setTimeout(() => endRound(gameId), ROUND_TIME_MSCount = calculateSoldiers(lowerCaseWord); player.letters = getRandomLetters(LETTERS);
}

function handleWordSubmit(playerId, word) {
    _PER_PLAYER);
        sendToPlayer(playerId, { type: 'wordValidated', playerId: playerId, word: normalizedWord, isValid: true, soldierconst player = players[playerId];
    if (!player?.gameId) return;

    const game = games[player.gameId];
    if (!gameCount: soldierCount, newLetters: player.letters });
        const opponentId = ( || game.status !== 'playing') return;

    const normalizedWord =playerId === game.player1Id) ? game.player2Id : game.player1Id;
        sendToPlayer(opponentId, { type: 'wordValidated', playerId: playerId, word: normalizedWord, isValid: true, word.trim().toUpperCase();

    let tempLetters = [...player.letters];
     soldierCount: soldierCount });
    } else {
        sendToPlayerlet validLetters = true;
    if (!normalizedWord) validLetters =(playerId, { type: 'wordValidated', playerId: playerId, word: false;

    for (const char of normalizedWord) {
        const normalizedWord, isValid: false });
    }
}

function handleCastle index = tempLetters.indexOf(char);
        if (index === -Hit(clientPlayerId, attackingPlayerId, soldierCount) {
    const attacker =1) { validLetters = false; break; }
        tempLetters. players[attackingPlayerId]; if (!attacker?.gameId) return;
splice(index, 1);
    }

    const lowerCaseWord    const game = games[attacker.gameId]; if (!game || game.status !== 'playing') return;
    let targetPlayerId = null = normalizedWord.toLowerCase();
    const isValidWord = wordSet.has;
    if (attackingPlayerId === game.player1Id) targetPlayerId(lowerCaseWord);
    const isValidLength = normalizedWord.length >= = game.player2Id;
    else if (attackingPlayerId === 3;

    if (validLetters && isValidWord && isValidLength) game.player2Id) targetPlayerId = game.player1Id; {
        const soldierCount = calculateSoldiers(lowerCaseWord);

    else { console.error(`SERVER: Attacker ID ${attackingPlayer        player.letters = getRandomLetters(LETTERS_PER_PLAYER);
Id} not in game ${attacker.gameId}`); return; }
            sendToPlayer(playerId, {
            type: 'wordValidated',const targetPlayer = players[targetPlayerId];
    if (targetPlayer playerId: playerId, word: normalizedWord,
            isValid: true, soldier && targetPlayer.hp > 0) {
        const damage = soldierCount; const oldHp = targetPlayer.hp; targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);
        consoleCount: soldierCount, newLetters: player.letters
        });
        .log(`SERVER: Game ${game.gameId}: Player ${targetPlayer.const opponentId = (playerId === game.player1Id) ? game.nickname} HP ${oldHp} -> ${targetPlayer.hp} by ${attacker.nicknameplayer2Id : game.player1Id;
        sendToPlayer(} (Hits: ${soldierCount})`);
        broadcast(game.opponentId, {
             type: 'wordValidated', playerId: playerId,gameId, { type: 'updateHP', playerId: targetPlayerId, word: normalizedWord,
             isValid: true, soldierCount: soldierCount hp: targetPlayer.hp, attackerId: attackingPlayerId });
        
         });
    } else {
        sendToPlayer(playerId,if (targetPlayer.hp <= 0) {
            game.status {
            type: 'wordValidated', playerId: playerId, word: normalizedWord, isValid: false
        });
    }
}

function handleCastleHit( = 'ended'; game.endedTimestamp = Date.now(); if(game.turnclientPlayerId, attackingPlayerId, soldierCount) {
    const attackerTimer) clearTimeout(game.turnTimer); game.turnTimer = null; = players[attackingPlayerId];
    if (!attacker?.gameId)
            console.log(`SERVER: Game ${game.gameId} ended return;

    const game = games[attacker.gameId];
    . Winner: ${attacker.nickname}`);
            broadcast(game.gameIdif (!game || game.status !== 'playing') return;

    let, { type: 'gameOver', winnerId: attackingPlayerId, loserId: targetPlayerId });
        }
    }
}

// --- targetPlayerId = null;
    if (attackingPlayerId === game. Express Static File Serving ---
app.use(express.static(__dirname));player1Id) targetPlayerId = game.player2Id;
    
app.get('/', (req, res) => {
  const indexPathelse if (attackingPlayerId === game.player2Id) targetPlayerId = path.join(__dirname, 'index_2d.html');
 = game.player1Id;
    else { console.error(`SERVER  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
: Attacker ID ${attackingPlayerId} not in game ${attacker.game  else res.status(404).send('index_2dId}`); return; }

    const targetPlayer = players[targetPlayerId];

    if (targetPlayer && targetPlayer.hp > 0).html not found.');
});

// --- WebSocket Connection Handling ---
wss.on {
        const damage = soldierCount;
        const oldHp = targetPlayer.hp;
        targetPlayer.hp = Math.max(0('connection', (ws, req) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36, targetPlayer.hp - damage);
        console.log(`SERVER:).substring(2, 7)}`;
    console.log(`SERVER: Game ${game.gameId}: Player ${targetPlayer.nickname} HP ${oldHp} -> ${targetPlayer.hp} by ${attacker.nickname} Client connected: ${playerId}. Setting up player object.`); // Log connection
    players[ (Hits: ${soldierCount})`);
        broadcast(game.gameplayerId] = { ws, id: playerId, nickname: `Player_${playerId.Id, {
            type: 'updateHP', playerId: targetPlayerIdsubstring(playerId.length - 4)}`, hp: STARTING_HP, hp: targetPlayer.hp, attackerId: attackingPlayerId
        , letters: [], gameId: null };

     // --- Send Server Config ---
     });

        if (targetPlayer.hp <= 0) {
            const port = process.env.PORT || 8080; constgame.status = 'ended';
            game.endedTimestamp = Date. externalUrlEnv = process.env.RENDER_EXTERNAL_URL; let wsUrl;
now();
            if(game.turnTimer) clearTimeout(game.turn     console.log(`SERVER: [${playerId}] Determining WS URL. RENDER_Timer); game.turnTimer = null;
            console.log(`SERVEREXTERNAL_URL=${externalUrlEnv}, PORT=${port}`); // LOGGING
     if: Game ${game.gameId} ended. Winner: ${attacker.nickname (externalUrlEnv) {
         try { const httpUrl = externalUrlEnv; if (!httpUrl.includes('//')) throw new Error("URL doesn't}`);
            broadcast(game.gameId, {
                type: ' contain '//'"); const domain = httpUrl.split('//')[1]; if (!domain) throw new Error("Domain could not be extracted"); wsUrl =gameOver', winnerId: attackingPlayerId, loserId: targetPlayerId
            });
        }
    }
}

// --- Express Static File Serving ---
 `wss://${domain}`; console.log(`SERVER: [${playerId}] Constructedapp.use(express.static(__dirname));
app.get('/', (req, res wss URL: ${wsUrl}`); } // LOGGING
         catch (e) { console.error(`SERVER: [${playerId}] Error parsing RENDER_) => {
  const indexPath = path.join(__dirname, 'indexEXTERNAL_URL (${externalUrlEnv}):`, e.message); wsUrl = null; }_2d.html');
  if (fs.existsSync(indexPath))
     } else { wsUrl = `ws://localhost:${port}`; console.log { res.sendFile(indexPath); }
  else { res.status(404).send('index_2d.html not found.'); }(`SERVER: [${playerId}] Constructed local ws URL: ${wsUrl}`);
});


// --- WebSocket Connection Handling ---
wss.on('connection', (ws, } // LOGGING

    if (wsUrl) {
         console.log(` req) => {
    const playerId = `player_${Date.now()SERVER: [${playerId}] Attempting to send serverConfig with URL: ${}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`SERVER: Client connected: ${playerId}. Setting up playerwsUrl}`); // LOGGING
         if (typeof sendToPlayer === 'function') {
             sendToPlayer(playerId, { type: 'server object.`); // Log connection

    players[playerId] = {
        ws, id:Config', playerId: playerId, websocketUrl: wsUrl });
             console. playerId, nickname: `Player_${playerId.substring(playerId.length - log(`SERVER: [${playerId}] serverConfig message send attempt finished.`); //4)}`,
        hp: STARTING_HP, letters: [], game LOGGING
         } else { console.error(`SERVER: [${playerIdId: null
     };

     // --- Send Server Config ---
     const port = process.env.PORT || 8080;
     const externalUrlEnv = process.env.RENDER_EXTERNAL_URL;}] FATAL - sendToPlayer function is not defined!`); ws.close
     let wsUrl;

     // *** Logging for URL Construction ***
     (1011, "Server setup error"); }
    } else { console.error(`SERVER: [${playerId}] Failed to determine websocketUrl. Cannotconsole.log(`SERVER: [${playerId}] Determining WS URL. RENDER send serverConfig. Closing connection.`); ws.close(1011, "Server configuration error"); }

    ws.on('message', (message_EXTERNAL_URL=${externalUrlEnv}, PORT=${port}`);

     if (externalUrlEnv) {
         try {
             const httpUrl =) => {
         let data;
         try { data = JSON.parse(message); const player = players[playerId]; // console.log(`SERVER: Msg from externalUrlEnv;
             if (!httpUrl.includes('//')) throw ${player?.nickname}: ${data.type}`);
             switch (data.type) { new Error("URL doesn't contain '//'");
             const domain = http
                 case 'join':
                     if (player) {
                         player.nickname = data.nickname?.substring(0, 12).trim() ||Url.split('//')[1];
             if (!domain) throw new `Anon_${playerId.substring(playerId.length-4)}`; console.log(`SERVER: Player ${playerId} joined as ${player.nickname}`);
                         if ( Error("Domain could not be extracted");
             wsUrl = `wss://${domain}`; // Use wss for Render
             console.log(`SERVER:waitingPlayer && waitingPlayer.id !== playerId && players[waitingPlayer.id]?.ws?.readyState === WebSocket.OPEN) {
                             const p1 = waitingPlayer [${playerId}] Constructed wss URL: ${wsUrl}`);
         }; const p2 = player; const gid = nextGameId++; p1.gameId = gid; p2.gameId = gid; games[gid catch (e) {
             console.error(`SERVER: [${playerId] = { gameId: gid, player1Id: p1.id,}] Error parsing RENDER_EXTERNAL_URL (${externalUrlEnv}):`, e player2Id: p2.id, status: 'waiting', turnTimer: null }; console.log(`SERVER: Match! Game ${gid} created.message);
             wsUrl = null; // Indicate failure
         } for ${p1.nickname} & ${p2.nickname}.`); waitingPlayer = null; startGame(gid);
                         } else { if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN
     } else {
         // Fallback for local testing
         wsUrl) console.log(`SERVER: Waiting player ${waitingPlayer.id} d = `ws://localhost:${port}`;
         console.log(`SERVER:/c? ${player.nickname} now waiting.`); waitingPlayer = player; send [${playerId}] Constructed local ws URL: ${wsUrl}`);
     }ToPlayer(playerId, { type: 'waiting', message: 'Waiting for

    // *** Send Config Message (with logging) ***
    if ( another player...' }); /* console.log(`SERVER: Player ${player.nickname}wsUrl) {
         console.log(`SERVER: [${playerId}] Attempting to send serverConfig with URL: ${wsUrl}`);
         if (typeof (${playerId}) is now waiting.`); */ }
                     } break;
                 case 'submitWord': if (data.word) handleWordSubmit(playerId, data sendToPlayer === 'function') {
             sendToPlayer(playerId,.word); else console.log(`SERVER: Empty submitWord from ${playerId}`); break;
                 case 'castleHit': if (players[playerId]?. {
                 type: 'serverConfig',
                 playerId: playerId,
gameId && data.attackingPlayerId && typeof data.soldierCount === 'number                 websocketUrl: wsUrl
             });
             console.log(`SERVER: [${' && data.soldierCount > 0) handleCastleHit(playerIdplayerId}] serverConfig message send attempt finished.`);
         } else {
              , data.attackingPlayerId, data.soldierCount); else console.console.error(`SERVER: [${playerId}] FATAL - sendToPlayerlog(`SERVER: Invalid castleHit from ${playerId}:`, data); break; function is not defined!`);
              ws.close(1011
                 default: console.log(`SERVER: Unhandled msg type "${data.type}", "Server setup error");
         }
    } else {
        console.error from ${playerId}`);
             }
         } catch (error) { console(`SERVER: [${playerId}] Failed to determine websocketUrl. Cannot send server.error(`SERVER: Failed processing msg from ${playerId}. Error: ${errorConfig. Closing connection.`);
        ws.close(1011,.message}. Msg:`, message); }
    });

    ws.on('close "Server configuration error");
    }


    ws.on('message', (message)', (code, reason) => {
        const player = players[playerId => {
         let data;
         try {
             data = JSON.parse(message);
             const player = players[playerId];
             ]; if (!player) return; const nickname = player.nickname || playerId;// console.log(`SERVER: Msg from ${player?.nickname}: ${data /* console.log(`SERVER: Client disconnected: ${nickname} (Code: ${.type}`); // Verbose log type

             switch (data.type) {code})`); */
        const gameId = player.gameId; if (gameId
                 case 'join':
                     if (player) {
                         player.nickname = data.nickname?.substring(0, 12).trim && games[gameId]) { const game = games[gameId]; if() || `Anon_${playerId.substring(playerId.length-4)}`;
 (game.status === 'playing' || game.status === 'waiting')                         console.log(`SERVER: Player ${playerId} joined as ${player. { if(game.turnTimer) clearTimeout(game.turnTimer); game.turnTimer = null; game.status = 'aborted'; game.endedTimestampnickname}`);

                         if (waitingPlayer && waitingPlayer.id !== playerId && = Date.now(); const opponentId = (playerId === game.player1 players[waitingPlayer.id]?.ws?.readyState === WebSocket.OPEN) {Id) ? game.player2Id : game.player1Id; const
                             const player1 = waitingPlayer; const player2 = player; const opponent = players[opponentId]; if(opponent?.ws?.readyState === WebSocket. gameId = nextGameId++;
                             player1.gameId = gameOPEN) { opponent.gameId = null; sendToPlayer(opponentIdId; player2.gameId = gameId;
                             games[game, { type: 'opponentLeft', message: `${player.nickname || 'Id] = { gameId: gameId, player1Id: player1Opponent'} disconnected.` }); sendToPlayer(opponentId, { type: 'gameOver', winnerId: opponentId, loserId: playerId, reason:.id, player2Id: player2.id, status: 'waiting 'disconnect' }); } } }
        if (waitingPlayer && waitingPlayer.id', turnTimer: null };
                             console.log(`SERVER: Match! === playerId) waitingPlayer = null; delete players[playerId]; /* console.log(` Game ${gameId} created for ${player1.nickname} & ${playerSERVER: Remaining players: ${Object.keys(players).length}`); */
    });

    ws.on('error', (error) => { const2.nickname}.`);
                             waitingPlayer = null; startGame(gameId nickname = players[playerId]?.nickname || playerId; console.error(`SERVER:);
                         } else {
                             if (waitingPlayer && players[waiting WebSocket error for ${nickname}: ${error.message}`); if (ws.readyState !== WebSocket.Player.id]?.ws?.readyState !== WebSocket.OPEN) {
                                  console.log(`SERVER: Waiting player ${waitingPlayer.id} d/CLOSED) ws.terminate(); });
});

// --- Start HTTP Server ---
const port = process.env.PORT || 8080;
serverc? ${player.nickname} now waiting.`);
                             }
                             waiting.listen(port, () => {
  console.log(`SERVER:Player = player;
                             sendToPlayer(playerId, { type: ' HTTP server listening on port ${port}`); console.log(`SERVER: WebSocket endpoint viawaiting', message: 'Waiting for another player...' });
                             console.log upgrade.`);
   if(process.env.RENDER_EXTERNAL_URL) console(`SERVER: Player ${player.nickname} (${playerId}) is now waiting.`);.log(`SERVER: Public URL (Render): ${process.env.RENDER
                         }
                     }
                     break;
                 case 'submitWord':
                     _EXTERNAL_URL}`); else console.log(`SERVER: Local Access: http://localhostif (data.word) handleWordSubmit(playerId, data.word);:${port}`);
});

// --- Periodic Cleanup ---
setInterval(() => {
                     else console.log(`SERVER: Empty submitWord from ${playerId}`);
    let cleanedGames = 0; const now = Date.now();
                     break;
                 case 'castleHit':
                      if (players const gameTimeout = 30 * 60 * 100[playerId]?.gameId && data.attackingPlayerId && typeof data.soldierCount === 'number' && data.soldierCount > 0)0; const waitingTimeout = 5 * 60 * 10 {
                         handleCastleHit(playerId, data.attackingPlayerId, data.soldierCount);
                     }
                     else { console.log(`00;
    for (const gameId in games) { const game = games[SERVER: Invalid castleHit from ${playerId}:`, data); }
                     breakgameId]; let shouldDelete = false; if ((game.status === ';
                 default:
                     console.log(`SERVER: Unhandled msgended' || game.status === 'aborted')) { if (!game.endedTimestamp) type "${data.type}" from ${playerId}`);
             }
         } catch (error) {
             console.error(`SERVER: Failed processing msg from ${ game.endedTimestamp = now; if (now - game.endedTimestamp >playerId}. Error: ${error.message}. Msg:`, message);
          gameTimeout) shouldDelete = true; } else if (game.status ===}
    });

    ws.on('close', (code, reason 'waiting') { if (!game.createdTimestamp) game.createdTimestamp =) => {
        const player = players[playerId];
        if (! now; if (now - game.createdTimestamp > waitingTimeout) { console.log(`player) return;
        const nickname = player.nickname || playerId;
SERVER: Cleaning up game ${gameId} stuck waiting.`); shouldDelete = true; } }        console.log(`SERVER: Client disconnected: ${nickname} (Code: ${code if (shouldDelete) { if(game.turnTimer) clearTimeout(game})`);

        const gameId = player.gameId;
        if.turnTimer); if(players[game.player1Id]) players[ (gameId && games[gameId]) {
             const game = gamesgame.player1Id].gameId = null; if(players[game[gameId];
             if (game.status === 'playing' ||.player2Id]) players[game.player2Id].gameId = game.status === 'waiting') {
                if(game.turnTimer) clearTimeout( null; delete games[gameId]; cleanedGames++; } }
    if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN) waitingPlayer = null;
    // if (cleanedGames > 0game.turnTimer); game.turnTimer = null;
                game.status = 'aborted'; game.endedTimestamp = Date.now();
                const opponent) console.log(`SERVER: Auto-cleaned ${cleanedGames} old/Id = (playerId === game.player1Id) ? game.player2Id : game.player1Id;
                const opponent = players[opponentstale games.`);
}, 1 * 60 * 10Id];
                if(opponent?.ws?.readyState === WebSocket.OPEN) {
                    opponent.gameId = null;
                    sendToPlayer(00);

console.log("SERVER: Setup complete. Waiting for connectionsopponentId, { type: 'opponentLeft', message: `${player.nickname || 'Opponent'} disconnected.` });
                    sendToPlayer(opponentId...");