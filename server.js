// server.js (Updated for Express static serving, Render deployment, and detailed logging)
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http'); // Use http module
const express = require('express'); // Use express
const path = require('path'); // To handle file paths

const app = express(); // Create an Express app
const server = http.createServer(app); // Create an HTTP server from the app

// --- WebSocket Server Setup (Attach to the HTTP server) ---
const wss = new WebSocket.Server({ server });
console.log(`WebSocket server attached to HTTP server.`);

let players = {}; // { id: { ws, nickname, hp, letters, gameId } }
let games = {};   // { gameId: { player1Id, player2Id, turnTime, status, turnTimer, endedTimestamp?, createdTimestamp? } }
let waitingPlayer = null;
let nextGameId = 1;

// --- Word Dictionary Loading ---
let wordSet = new Set();
const dictionaryPath = path.join(__dirname, 'words.txt'); // Ensure correct path relative to server.js
try {
    if (fs.existsSync(dictionaryPath)) {
        const wordData = fs.readFileSync(dictionaryPath, 'utf8');
        wordData.split(/\r?\n/).forEach(word => {
            const trimmedWord = word.trim().toLowerCase();
            if (trimmedWord.length > 1) {
                wordSet.add(trimmedWord);
            }
        });
        console.log(`SERVER: Loaded ${wordSet.size} words from ${dictionaryPath}.`);
    } else {
        console.error(`SERVER: Error - words.txt not found at ${dictionaryPath}`);
        // Add a few default words so the game is somewhat playable if dict fails
        console.log("SERVER: Using minimal default word list.");
        wordSet.add("cat").add("dog").add("go").add("run").add("word").add("game").add("play").add("win").add("hit");
    }
} catch (err) {
    console.error(`SERVER: Error reading word list at ${dictionaryPath}:`, err);
}

// --- Game Constants ---
const STARTING_HP = 100;
const LETTERS_PER_PLAYER = 7;
const ROUND_TIME_MS = 30000; // 30 seconds

// --- Letter Distribution ---
const VOWELS = "AEIOU";
const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ";
const LETTER_POOL = (CONSONANTS.repeat(2) + VOWELS.repeat(3)).split('');

function getRandomLetters(count) {
    let letters = [];
    let currentPool = [...LETTER_POOL]; // Use a copy for each generation
    if (count > currentPool.length) {
        console.warn("SERVER: Requested more letters than available in pool, drawing with replacement.");
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * LETTER_POOL.length);
            letters.push(LETTER_POOL[randomIndex]);
        }
        return letters;
    }
    // Draw without replacement
    for (let i = 0; i < count; i++) {
        if (currentPool.length === 0) break; // Should not happen with standard pool/count but safe check
        const randomIndex = Math.floor(Math.random() * currentPool.length);
        letters.push(currentPool.splice(randomIndex, 1)[0]);
    }
    return letters;
}

// --- Game Logic Helpers ---
function calculateSoldiers(word) {
    const length = word.length;
    if (length >= 8) return 7;
    if (length >= 6) return 5;
    if (length >= 5) return 3;
    if (length >= 3) return 1;
    return 0;
}

// Function to safely send message to multiple players in a game
function broadcast(gameId, message) {
    const game = games[gameId];
    if (!game) return;
    const player1 = players[game.player1Id];
    const player2 = players[game.player2Id];
    const messageString = JSON.stringify(message);

    if (player1?.ws?.readyState === WebSocket.OPEN) {
        player1.ws.send(messageString, (err) => {
           if (err) console.error(`SERVER: Error sending broadcast to P1 (${player1.id}):`, err);
        });
    } else if (game.player1Id) {
        // console.log(`SERVER: Cannot broadcast to P1 (${game.player1Id}), WS not open.`);
    }

    if (player2?.ws?.readyState === WebSocket.OPEN) {
        player2.ws.send(messageString, (err) => {
            if (err) console.error(`SERVER: Error sending broadcast to P2 (${player2.id}):`, err);
         });
    } else if (game.player2Id) {
        // console.log(`SERVER: Cannot broadcast to P2 (${game.player2Id}), WS not open.`);
    }
}

// Function to safely send message to a single player
function sendToPlayer(playerId, message) {
     const player = players[playerId];
     if (player?.ws?.readyState === WebSocket.OPEN) {
         player.ws.send(JSON.stringify(message), (err) => {
            if (err) console.error(`SERVER: Error sending direct msg to Player (${playerId}):`, err);
         });
     } else {
         // console.log(`SERVER: Cannot send direct msg to Player (${playerId}), WS not open or player gone.`);
     }
}


function startGame(gameId) {
    const game = games[gameId];
    if (!game || game.status !== 'waiting') return;

    game.status = 'playing';
    const player1 = players[game.player1Id];
    const player2 = players[game.player2Id];

    if (!player1 || !player2) {
        console.error(`SERVER: Cannot start game ${gameId}, P1 or P2 missing from 'players' object.`);
        game.status = 'aborted';
        if(game.turnTimer) clearTimeout(game.turnTimer);
        return;
    }

    player1.hp = STARTING_HP;
    player2.hp = STARTING_HP;
    player1.letters = getRandomLetters(LETTERS_PER_PLAYER);
    player2.letters = getRandomLetters(LETTERS_PER_PLAYER);
    game.createdTimestamp = Date.now();

    console.log(`SERVER: Game ${gameId} starting between ${player1.nickname} and ${player2.nickname}`);

    // Send game start info (players, initial HP, timer) to both
     broadcast(gameId, {
        type: 'gameStart',
        gameId: gameId,
        player1: { id: player1.id, nickname: player1.nickname, hp: player1.hp },
        player2: { id: player2.id, nickname: player2.nickname, hp: player2.hp },
        timer: ROUND_TIME_MS
    });

    // Send specific letters to each player
    sendToPlayer(player1.id, { type: 'initialLetters', letters: player1.letters });
    sendToPlayer(player2.id, { type: 'initialLetters', letters: player2.letters });

    if(game.turnTimer) clearTimeout(game.turnTimer);
    game.turnTimer = setTimeout(() => endRound(gameId), ROUND_TIME_MS);
}

function endRound(gameId) {
    const game = games[gameId];
    if (!game || game.status !== 'playing') {
        // console.log(`SERVER: Round timer ended for game ${gameId}, but status is ${game?.status}. No new round.`);
        return;
    }

    clearTimeout(game.turnTimer);
    game.turnTimer = null;

    const player1 = players[game.player1Id];
    const player2 = players[game.player2Id];

    if (!player1 || !player2) {
         console.log(`SERVER: Cannot start new round for game ${gameId}, players missing.`);
         if(game.status === 'playing') game.status = 'aborted';
         return;
    }

    player1.letters = getRandomLetters(LETTERS_PER_PLAYER);
    player2.letters = getRandomLetters(LETTERS_PER_PLAYER);

    console.log(`SERVER: Game ${gameId} - New round starting.`);

    sendToPlayer(player1.id, { type: 'newRound', letters: player1.letters, timer: ROUND_TIME_MS });
    sendToPlayer(player2.id, { type: 'newRound', letters: player2.letters, timer: ROUND_TIME_MS });

    game.turnTimer = setTimeout(() => endRound(gameId), ROUND_TIME_MS);
}

function handleWordSubmit(playerId, word) {
    const player = players[playerId];
    if (!player?.gameId) return;

    const game = games[player.gameId];
    if (!game || game.status !== 'playing') return;

    const normalizedWord = word.trim().toUpperCase();
    // console.log(`SERVER: Player ${player.nickname} submitted: ${normalizedWord}`);

    let tempLetters = [...player.letters];
    let validLetters = true;
    if (!normalizedWord) validLetters = false;

    for (const char of normalizedWord) {
        const index = tempLetters.indexOf(char);
        if (index === -1) { validLetters = false; break; }
        tempLetters.splice(index, 1);
    }

    const lowerCaseWord = normalizedWord.toLowerCase();
    const isValidWord = wordSet.has(lowerCaseWord);
    const isValidLength = normalizedWord.length >= 3;

    if (validLetters && isValidWord && isValidLength) {
        const soldierCount = calculateSoldiers(lowerCaseWord);
        player.letters = getRandomLetters(LETTERS_PER_PLAYER);
        sendToPlayer(playerId, {
            type: 'wordValidated', playerId: playerId, word: normalizedWord,
            isValid: true, soldierCount: soldierCount, newLetters: player.letters
        });
        const opponentId = (playerId === game.player1Id) ? game.player2Id : game.player1Id;
        sendToPlayer(opponentId, {
             type: 'wordValidated', playerId: playerId, word: normalizedWord,
             isValid: true, soldierCount: soldierCount
         });
    } else {
        // console.log(`SERVER: Word invalid: "${normalizedWord}" (L:${validLetters}, D:${isValidWord}, Len:${isValidLength})`);
        sendToPlayer(playerId, {
            type: 'wordValidated', playerId: playerId, word: normalizedWord, isValid: false
        });
    }
}

function handleCastleHit(clientPlayerId, attackingPlayerId, soldierCount) {
    const attacker = players[attackingPlayerId];
    if (!attacker?.gameId) return;

    const game = games[attacker.gameId];
    if (!game || game.status !== 'playing') return;

    let targetPlayerId = null;
    if (attackingPlayerId === game.player1Id) targetPlayerId = game.player2Id;
    else if (attackingPlayerId === game.player2Id) targetPlayerId = game.player1Id;
    else { console.error(`SERVER: Attacker ID ${attackingPlayerId} not in game ${attacker.gameId}`); return; }

    const targetPlayer = players[targetPlayerId];

    if (targetPlayer && targetPlayer.hp > 0) {
        const damage = soldierCount;
        const oldHp = targetPlayer.hp;
        targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);
        console.log(`SERVER: Game ${game.gameId}: Player ${targetPlayer.nickname} HP ${oldHp} -> ${targetPlayer.hp} by ${attacker.nickname} (Hits: ${soldierCount})`);
        broadcast(game.gameId, {
            type: 'updateHP', playerId: targetPlayerId, hp: targetPlayer.hp, attackerId: attackingPlayerId
        });

        if (targetPlayer.hp <= 0) {
            game.status = 'ended';
            game.endedTimestamp = Date.now();
            if(game.turnTimer) clearTimeout(game.turnTimer); game.turnTimer = null;
            console.log(`SERVER: Game ${game.gameId} ended. Winner: ${attacker.nickname}`);
            broadcast(game.gameId, {
                type: 'gameOver', winnerId: attackingPlayerId, loserId: targetPlayerId
            });
        }
    }
}

// --- Express Static File Serving ---
app.use(express.static(__dirname)); // Serve files like index, css, js from root

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index_2d.html');
  if (fs.existsSync(indexPath)) {
     res.sendFile(indexPath);
  } else {
     res.status(404).send('Game file (index_2d.html) not found.');
  }
});


// --- WebSocket Connection Handling ---
wss.on('connection', (ws, req) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`SERVER: Client connected: ${playerId}. Setting up player object.`); // Log connection

    players[playerId] = {
        ws, id: playerId, nickname: `Player_${playerId.substring(playerId.length - 4)}`,
        hp: STARTING_HP, letters: [], gameId: null
     };

     // --- Send Server Config ---
     const port = process.env.PORT || 8080;
     const externalUrlEnv = process.env.RENDER_EXTERNAL_URL;
     let wsUrl;

     // *** ADDED LOGGING ***
     console.log(`SERVER: [${playerId}] Determining WS URL. RENDER_EXTERNAL_URL=${externalUrlEnv}, PORT=${port}`);

     if (externalUrlEnv) {
         try {
             const httpUrl = externalUrlEnv;
             if (!httpUrl.includes('//')) throw new Error("URL doesn't contain '//'");
             const domain = httpUrl.split('//')[1];
             if (!domain) throw new Error("Domain could not be extracted");
             wsUrl = `wss://${domain}`;
             console.log(`SERVER: [${playerId}] Constructed wss URL: ${wsUrl}`);
         } catch (e) {
             console.error(`SERVER: [${playerId}] Error parsing RENDER_EXTERNAL_URL (${externalUrlEnv}):`, e.message);
             wsUrl = null; // Indicate failure
         }
     } else {
         wsUrl = `ws://localhost:${port}`;
         console.log(`SERVER: [${playerId}] Constructed local ws URL: ${wsUrl}`);
     }

    // *** ADDED LOGGING & CHECK ***
    if (wsUrl) {
         console.log(`SERVER: [${playerId}] Attempting to send serverConfig with URL: ${wsUrl}`);
         // Make sure sendToPlayer is defined and works
         if (typeof sendToPlayer === 'function') {
             sendToPlayer(playerId, {
                 type: 'serverConfig',
                 playerId: playerId,
                 websocketUrl: wsUrl // Send the determined URL
             });
             // *** ADDED LOGGING ***
             console.log(`SERVER: [${playerId}] serverConfig message send attempt finished.`);
         } else {
              console.error(`SERVER: [${playerId}] FATAL - sendToPlayer function is not defined!`);
              ws.close(1011, "Server setup error");
         }
    } else {
        console.error(`SERVER: [${playerId}] Failed to determine websocketUrl. Cannot send serverConfig. Closing connection.`);
        ws.close(1011, "Server configuration error"); // Internal server error code
    }


    ws.on('message', (message) => {
         let data;
         try {
             data = JSON.parse(message);
             const player = players[playerId]; // Get current player state
             // Log type for debugging: console.log(`SERVER: Msg from ${player?.nickname}: ${data.type}`);
             switch (data.type) {
                 case 'join':
                     if (player) {
                         player.nickname = data.nickname?.substring(0, 12).trim() || `Anon_${playerId.substring(playerId.length-4)}`;
                         console.log(`SERVER: Player ${playerId} joined as ${player.nickname}`);

                         if (waitingPlayer && waitingPlayer.id !== playerId && players[waitingPlayer.id]?.ws?.readyState === WebSocket.OPEN) {
                             const player1 = waitingPlayer; const player2 = player; const gameId = nextGameId++;
                             player1.gameId = gameId; player2.gameId = gameId;
                             games[gameId] = { gameId: gameId, player1Id: player1.id, player2Id: player2.id, status: 'waiting', turnTimer: null };
                             console.log(`SERVER: Match! Game ${gameId} created for ${player1.nickname} & ${player2.nickname}.`);
                             waitingPlayer = null; startGame(gameId);
                         } else {
                             if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN) {
                                  console.log(`SERVER: Waiting player ${waitingPlayer.id} d/c? ${player.nickname} now waiting.`);
                             }
                             waitingPlayer = player; // Assign current player object
                             sendToPlayer(playerId, { type: 'waiting', message: 'Waiting for another player...' });
                             console.log(`SERVER: Player ${player.nickname} (${playerId}) is now waiting.`);
                         }
                     }
                     break;
                 case 'submitWord':
                     if (data.word) handleWordSubmit(playerId, data.word);
                     else console.log(`SERVER: Empty submitWord from ${playerId}`);
                     break;
                 case 'castleHit':
                      if (players[playerId]?.gameId && data.attackingPlayerId && typeof data.soldierCount === 'number' && data.soldierCount > 0) {
                         handleCastleHit(playerId, data.attackingPlayerId, data.soldierCount);
                     }
                     else { console.log(`SERVER: Invalid castleHit from ${playerId}:`, data); }
                     break;
                 default:
                     console.log(`SERVER: Unhandled msg type "${data.type}" from ${playerId}`);
             }
         } catch (error) {
             console.error(`SERVER: Failed processing msg from ${playerId}. Error: ${error.message}. Msg:`, message);
         }
    });

    ws.on('close', (code, reason) => {
        const player = players[playerId];
        if (!player) return;
        const nickname = player.nickname || playerId;
        // console.log(`SERVER: Client disconnected: ${nickname} (Code: ${code})`);

        const gameId = player.gameId;
        if (gameId && games[gameId]) {
             const game = games[gameId];
             if (game.status === 'playing' || game.status === 'waiting') {
                // console.log(`SERVER: Player ${nickname} disconnected during game ${gameId}.`);
                if(game.turnTimer) clearTimeout(game.turnTimer); game.turnTimer = null;
                game.status = 'aborted'; game.endedTimestamp = Date.now();
                const opponentId = (playerId === game.player1Id) ? game.player2Id : game.player1Id;
                const opponent = players[opponentId];
                if(opponent?.ws?.readyState === WebSocket.OPEN) {
                    // console.log(`SERVER: Notifying opponent ${opponent.nickname}.`);
                    opponent.gameId = null;
                    sendToPlayer(opponentId, { type: 'opponentLeft', message: `${player.nickname || 'Opponent'} disconnected.` });
                    sendToPlayer(opponentId, { type: 'gameOver', winnerId: opponentId, loserId: playerId, reason: 'disconnect' });
                    // console.log(`SERVER: Game ${gameId} aborted. Winner by disconnect: ${opponent.nickname}`);
                } else {
                    // console.log(`SERVER: Game ${gameId} aborted, opponent ${opponentId} not available.`);
                }
             }
        }
        if (waitingPlayer && waitingPlayer.id === playerId) {
            waitingPlayer = null;
            // console.log(`SERVER: Waiting player ${nickname} disconnected.`);
        }
        delete players[playerId];
        // console.log(`SERVER: Remaining players: ${Object.keys(players).length}`);
    });

    ws.on('error', (error) => {
        const nickname = players[playerId]?.nickname || playerId;
        console.error(`SERVER: WebSocket error for ${nickname}: ${error.message}`);
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
             ws.terminate(); // Force close if error occurs and it's not already closed
        }
        // Cleanup happens in 'close' handler triggered by terminate/error
    });
});

// --- Start the HTTP Server ---
const port = process.env.PORT || 8080; // Use Render's port or 8080 for local
server.listen(port, () => {
  console.log(`SERVER: HTTP server listening on port ${port}`);
  console.log(`SERVER: WebSocket endpoint available via upgrade from HTTP server.`);
   if(process.env.RENDER_EXTERNAL_URL) {
       console.log(`SERVER: Public URL (Render): ${process.env.RENDER_EXTERNAL_URL}`);
   } else {
        console.log(`SERVER: Local Access: http://localhost:${port}`);
   }
});


// --- Periodic Cleanup ---
setInterval(() => {
    let cleanedGames = 0;
    const now = Date.now();
    const gameTimeout = 30 * 60 * 1000; // 30 minutes for ended/aborted games
    const waitingTimeout = 5 * 60 * 1000; // 5 minutes for games stuck in waiting

    for (const gameId in games) {
        const game = games[gameId];
         let shouldDelete = false;

         if ((game.status === 'ended' || game.status === 'aborted')) {
             if (!game.endedTimestamp) game.endedTimestamp = now; // Mark end time if missing
             if (now - game.endedTimestamp > gameTimeout) { shouldDelete = true; }
         } else if (game.status === 'waiting') {
              if (!game.createdTimestamp) game.createdTimestamp = now; // Mark creation time
              if (now - game.createdTimestamp > waitingTimeout) {
                   console.log(`SERVER: Cleaning up game ${gameId} stuck in waiting state.`);
                   shouldDelete = true;
              }
         }

        if (shouldDelete) {
            if(game.turnTimer) clearTimeout(game.turnTimer);
            if(players[game.player1Id]) players[game.player1Id].gameId = null;
            if(players[game.player2Id]) players[game.player2Id].gameId = null;
            delete games[gameId];
            cleanedGames++;
        }
    }
    // if (cleanedGames > 0) console.log(`SERVER: Auto-cleaned ${cleanedGames} old/stale games.`); // Less verbose

    if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN) {
        // console.log(`SERVER: Cleaning up waiting player ${waitingPlayer.id} who seems disconnected.`);
        waitingPlayer = null;
    }

}, 1 * 60 * 1000); // Run every minute

console.log("SERVER: Setup complete. Waiting for connections...");