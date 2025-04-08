// server.js (Updated for Express static serving and Render deployment)
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http'); // Use http module
const express = require('express'); // Use express
const path = require('path'); // To handle file paths

const app = express(); // Create an Express app
const server = http.createServer(app); // Create an HTTP server from the app

// --- WebSocket Server Setup (Attach to the HTTP server) ---
// Render scales horizontally, so we might have multiple instances.
// Simple scaling might need a more robust solution (like Redis for state),
// but for basic setup, attaching to the HTTP server is standard.
const wss = new WebSocket.Server({ server });
console.log(`WebSocket server attached to HTTP server.`);

let players = {}; // { id: { ws, nickname, hp, letters, gameId } }
let games = {};   // { gameId: { player1Id, player2Id, turnTime, status, turnTimer, endedTimestamp?, createdTimestamp? } }
let waitingPlayer = null;
let nextGameId = 1;

// --- Word Dictionary Loading ---
let wordSet = new Set();
const dictionaryPath = path.join(__dirname, 'words.txt'); // Ensure correct path
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
        // Consider adding a default small word list if file not found?
        // wordSet.add("test").add("game").add("word");
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
    let currentPool = [...LETTER_POOL];
    if (count > currentPool.length) {
        console.warn("SERVER: Requested more letters than available in pool.");
        // Draw with replacement if pool too small (less ideal)
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * LETTER_POOL.length);
            letters.push(LETTER_POOL[randomIndex]);
        }
        return letters;
    }
    for (let i = 0; i < count; i++) {
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

function broadcast(gameId, message) {
    const game = games[gameId];
    if (!game) return;
    const player1 = players[game.player1Id];
    const player2 = players[game.player2Id];
    const messageString = JSON.stringify(message);

    if (player1?.ws?.readyState === WebSocket.OPEN) {
        player1.ws.send(messageString, (err) => {
           if (err) console.error(`SERVER: Error sending to P1 (${player1.id}):`, err);
        });
    }
    if (player2?.ws?.readyState === WebSocket.OPEN) {
        player2.ws.send(messageString, (err) => {
            if (err) console.error(`SERVER: Error sending to P2 (${player2.id}):`, err);
         });
    }
}

function sendToPlayer(playerId, message) {
     const player = players[playerId];
     if (player?.ws?.readyState === WebSocket.OPEN) {
         player.ws.send(JSON.stringify(message), (err) => {
            if (err) console.error(`SERVER: Error sending to Player (${playerId}):`, err);
         });
     }
}


function startGame(gameId) {
    const game = games[gameId];
    if (!game || game.status !== 'waiting') return;

    game.status = 'playing';
    const player1 = players[game.player1Id];
    const player2 = players[game.player2Id];

    if (!player1 || !player2) {
        console.error(`SERVER: Cannot start game ${gameId}, one or both players missing.`);
        game.status = 'aborted';
        if(game.turnTimer) clearTimeout(game.turnTimer);
        return;
    }

    player1.hp = STARTING_HP;
    player2.hp = STARTING_HP;
    player1.letters = getRandomLetters(LETTERS_PER_PLAYER);
    player2.letters = getRandomLetters(LETTERS_PER_PLAYER);
    game.createdTimestamp = Date.now(); // Mark start time

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

    // Start the round timer
    if(game.turnTimer) clearTimeout(game.turnTimer); // Clear any old timer
    game.turnTimer = setTimeout(() => endRound(gameId), ROUND_TIME_MS);
}

function endRound(gameId) {
    const game = games[gameId];
    if (!game || game.status !== 'playing') {
        console.log(`SERVER: Round timer ended for game ${gameId}, but status is ${game?.status}. No new round.`);
        return;
    }

    clearTimeout(game.turnTimer);
    game.turnTimer = null; // Nullify timer handle

    const player1 = players[game.player1Id];
    const player2 = players[game.player2Id];

    if (!player1 || !player2) {
         console.log(`SERVER: Cannot start new round for game ${gameId}, players missing.`);
         // Game might already be aborted by disconnect logic, but double-check
         if(game.status === 'playing') game.status = 'aborted';
         return;
    }

    player1.letters = getRandomLetters(LETTERS_PER_PLAYER);
    player2.letters = getRandomLetters(LETTERS_PER_PLAYER);

    console.log(`SERVER: Game ${gameId} - New round starting.`);

    // Send new letters and timer reset specifically to each player
    sendToPlayer(player1.id, { type: 'newRound', letters: player1.letters, timer: ROUND_TIME_MS });
    sendToPlayer(player2.id, { type: 'newRound', letters: player2.letters, timer: ROUND_TIME_MS });

    // Start next round timer
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
        if (index === -1) {
            validLetters = false; break;
        }
        tempLetters.splice(index, 1);
    }

    const lowerCaseWord = normalizedWord.toLowerCase();
    const isValidWord = wordSet.has(lowerCaseWord);
    const isValidLength = normalizedWord.length >= 3;

    if (validLetters && isValidWord && isValidLength) {
        const soldierCount = calculateSoldiers(lowerCaseWord);
        // console.log(`SERVER: Word valid! ${player.nickname} spawns ${soldierCount} soldiers.`);
        player.letters = getRandomLetters(LETTERS_PER_PLAYER);

        sendToPlayer(playerId, {
            type: 'wordValidated', playerId: playerId, word: normalizedWord,
            isValid: true, soldierCount: soldierCount, newLetters: player.letters
        });

        const opponentId = (playerId === game.player1Id) ? game.player2Id : game.player1Id;
        sendToPlayer(opponentId, {
             type: 'wordValidated', playerId: playerId, word: normalizedWord,
             isValid: true, soldierCount: soldierCount // Opponent gets notified
         });
    } else {
        // console.log(`SERVER: Word invalid: "${normalizedWord}" (Letters: ${validLetters}, Dict: ${isValidWord}, Len: ${isValidLength})`);
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

    if (targetPlayer && targetPlayer.hp > 0) { // Check HP > 0 before processing
        const damage = soldierCount;
        const oldHp = targetPlayer.hp;
        targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);

        console.log(`SERVER: Game ${game.gameId}: Player ${targetPlayer.nickname} HP ${oldHp} -> ${targetPlayer.hp} by ${attacker.nickname} (Hits: ${soldierCount})`);

        broadcast(game.gameId, {
            type: 'updateHP', playerId: targetPlayerId, hp: targetPlayer.hp, attackerId: attackingPlayerId
        });

        if (targetPlayer.hp <= 0) {
            game.status = 'ended';
            game.endedTimestamp = Date.now(); // Mark end time
            if(game.turnTimer) clearTimeout(game.turnTimer);
            game.turnTimer = null;
            console.log(`SERVER: Game ${game.gameId} ended. Winner: ${attacker.nickname}`);
            broadcast(game.gameId, {
                type: 'gameOver', winnerId: attackingPlayerId, loserId: targetPlayerId
            });
        }
    }
}

// --- Express Static File Serving ---
// Serve files from the root directory where server.js is located
app.use(express.static(__dirname)); // Serve files like index, css, js

// Specific Route for the Game HTML (ensures '/' serves the game)
app.get('/', (req, res) => {
  // Check if index_2d.html exists, otherwise send a simple message or error
  const indexPath = path.join(__dirname, 'index_2d.html');
  if (fs.existsSync(indexPath)) {
     res.sendFile(indexPath);
  } else {
     res.status(404).send('Game file (index_2d.html) not found.');
  }
});


// --- WebSocket Connection Handling ---
wss.on('connection', (ws, req) => { // req can be useful for getting origin/IP if needed
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    // console.log(`SERVER: Client connected: ${playerId}`); // Less verbose logging
    players[playerId] = {
        ws, id: playerId, nickname: `Player_${playerId.substring(playerId.length - 4)}`,
        hp: STARTING_HP, letters: [], gameId: null
     };

     // --- Send Server Config ---
     // Determine the correct WebSocket URL
     // Render provides the public HTTPS URL via RENDER_EXTERNAL_URL
     // For local dev, use localhost and the correct port
     const port = process.env.PORT || 8080; // Get the actual port being used
     let wsUrl;
     if (process.env.RENDER_EXTERNAL_URL) {
         // Construct wss:// URL from https:// URL provided by Render
         const httpUrl = process.env.RENDER_EXTERNAL_URL;
         const domain = httpUrl.split('//')[1]; // Get domain part (e.g., your-app.onrender.com)
         wsUrl = `wss://${domain}`; // Use wss for deployed apps
     } else {
         // For local development
         // Use ws://localhost:PORT
         // Important: If running client/server on different ports locally, adjust accordingly.
         // Assuming client connects to the same port the server listens on here.
         wsUrl = `ws://localhost:${port}`;
     }

     sendToPlayer(playerId, {
         type: 'serverConfig',
         playerId: playerId,
         websocketUrl: wsUrl // Send the determined URL
     });


    ws.on('message', (message) => {
         let data;
         try {
             data = JSON.parse(message);
             // Maybe log only type for less noise: console.log(`Msg from ${players[playerId]?.nickname}: ${data.type}`);
             switch (data.type) {
                 case 'join':
                     const player = players[playerId];
                     if (player) {
                         player.nickname = data.nickname?.substring(0, 12).trim() || `Anon_${playerId.substring(playerId.length-4)}`;
                         console.log(`SERVER: Player ${playerId} joined as ${player.nickname}`);
                         // Removed assignId send here, included in serverConfig

                         if (waitingPlayer && waitingPlayer.id !== playerId && players[waitingPlayer.id]?.ws?.readyState === WebSocket.OPEN) {
                             const player1 = waitingPlayer;
                             const player2 = player;
                             const gameId = nextGameId++;
                             player1.gameId = gameId;
                             player2.gameId = gameId;
                             games[gameId] = { gameId: gameId, player1Id: player1.id, player2Id: player2.id, status: 'waiting', turnTimer: null };
                             console.log(`SERVER: Match found! Game ${gameId} created for ${player1.nickname} & ${player2.nickname}.`);
                             waitingPlayer = null;
                             startGame(gameId);
                         } else {
                             if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN) {
                                  console.log(`SERVER: Waiting player ${waitingPlayer.id} seems disconnected. ${player.nickname} now waiting.`);
                             } else if (waitingPlayer && waitingPlayer.id === playerId) {
                                  // Player already waiting, maybe resend waiting message?
                             }
                             waitingPlayer = player;
                             sendToPlayer(playerId, { type: 'waiting', message: 'Waiting for another player...' });
                             console.log(`SERVER: Player ${player.nickname} (${playerId}) is now waiting.`);
                         }
                     }
                     break;
                 case 'submitWord':
                     if (data.word) handleWordSubmit(playerId, data.word);
                     break;
                 case 'castleHit':
                      if (players[playerId]?.gameId && data.attackingPlayerId && typeof data.soldierCount === 'number' && data.soldierCount > 0) {
                         handleCastleHit(playerId, data.attackingPlayerId, data.soldierCount);
                     }
                     break;
                 default:
                     console.log(`SERVER: Unhandled message type "${data.type}" from ${playerId}`);
             }
         } catch (error) {
             console.error(`SERVER: Failed processing msg from ${playerId}. Error: ${error.message}. Msg:`, message);
         }
    });

    ws.on('close', (code, reason) => {
        const player = players[playerId];
        if (!player) return; // Player already cleaned up?
        const nickname = player.nickname || playerId;
        // console.log(`SERVER: Client disconnected: ${nickname} (Code: ${code})`); // Less verbose

        const gameId = player.gameId;
        if (gameId && games[gameId]) {
             const game = games[gameId];
             if (game.status === 'playing' || game.status === 'waiting') {
                console.log(`SERVER: Player ${nickname} disconnected during game ${gameId}.`);
                if(game.turnTimer) clearTimeout(game.turnTimer);
                game.status = 'aborted';
                game.endedTimestamp = Date.now();

                const opponentId = (playerId === game.player1Id) ? game.player2Id : game.player1Id;
                const opponent = players[opponentId];

                if(opponent?.ws?.readyState === WebSocket.OPEN) {
                    console.log(`SERVER: Notifying opponent ${opponent.nickname}.`);
                    opponent.gameId = null; // Mark opponent as out of this game too
                    sendToPlayer(opponentId, { type: 'opponentLeft', message: `${player.nickname || 'Opponent'} has disconnected.` });
                    sendToPlayer(opponentId, { type: 'gameOver', winnerId: opponentId, loserId: playerId, reason: 'disconnect' });
                    console.log(`SERVER: Game ${gameId} aborted. Winner by disconnect: ${opponent.nickname}`);
                } else {
                     console.log(`SERVER: Game ${gameId} aborted, opponent ${opponentId} not available.`);
                }
                // Don't delete game immediately, let cleanup handle it or keep for history
             }
        }
        if (waitingPlayer && waitingPlayer.id === playerId) {
            waitingPlayer = null;
            console.log(`SERVER: Waiting player ${nickname} disconnected.`);
        }
        delete players[playerId];
        // console.log(`SERVER: Remaining players: ${Object.keys(players).length}`);
    });

    ws.on('error', (error) => {
        const nickname = players[playerId]?.nickname || playerId;
        console.error(`SERVER: WebSocket error for player ${nickname}: ${error.message}`);
        if (ws.readyState !== WebSocket.CLOSED) { ws.terminate(); }
        // Cleanup happens in 'close' event handler
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
             if (now - game.endedTimestamp > gameTimeout) {
                 shouldDelete = true;
             }
         } else if (game.status === 'waiting') {
              if (!game.createdTimestamp) game.createdTimestamp = now; // Mark creation time
              if (now - game.createdTimestamp > waitingTimeout) {
                   console.log(`SERVER: Cleaning up game ${gameId} stuck in waiting state.`);
                   // Notify waiting player? Maybe not necessary if they disconnected.
                   shouldDelete = true;
              }
         }

        if (shouldDelete) {
            if(game.turnTimer) clearTimeout(game.turnTimer);
            // Ensure players involved are marked as out of game if they still exist
            if(players[game.player1Id]) players[game.player1Id].gameId = null;
            if(players[game.player2Id]) players[game.player2Id].gameId = null;
            delete games[gameId];
            cleanedGames++;
        }
    }
    // if (cleanedGames > 0) console.log(`SERVER: Auto-cleaned ${cleanedGames} old/stale games.`); // Less verbose

    // Also check if waitingPlayer has disconnected without triggering 'close' somehow
    if (waitingPlayer && players[waitingPlayer.id]?.ws?.readyState !== WebSocket.OPEN) {
        console.log(`SERVER: Cleaning up waiting player ${waitingPlayer.id} who seems disconnected.`);
        waitingPlayer = null;
    }

}, 1 * 60 * 1000); // Run every minute

console.log("SERVER: Setup complete. Waiting for connections...");