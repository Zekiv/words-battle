// script_2d.js

// --- Configuration (Constants for gameplay/drawing) ---
const PLAYER_1_COLOR = '#4CAF50';
const PLAYER_2_COLOR = '#F44336';
const CASTLE_BASE_COLOR = '#a1887f';
const CASTLE_TURRET_COLOR = '#795548';
const SOLDIER_SIZE = 12;
const CASTLE_WIDTH = 60;
const CASTLE_HEIGHT = 90;
const CASTLE_TURRET_HEIGHT = 25;
const CASTLE_FLAG_HEIGHT = 18;
const SOLDIER_SPEED = 2.0;
const COMBAT_DISTANCE_THRESHOLD_2D = SOLDIER_SIZE * 0.8;
const CASTLE_HIT_BOX_MARGIN = 2;

// --- Global Variables ---
let canvas, ctx;
let ws = null; // WebSocket connection object
let websocketUrl = null; // URL provided by server
let playerId = null;
let gameId = null;
let playerNumber = null;
let playerLetters = [];
let activeSoldiers = [];
let opponentNickname = 'Opponent';
let gameActive = false;
let animationFrameId = null;
let player1Castle = { x: 0, y: 0, width: 0, height: 0, ownerId: null };
let player2Castle = { x: 0, y: 0, width: 0, height: 0, ownerId: null };
let currentTimerInterval = null;
let groundLevel = 0;

// --- DOM Elements ---
const nicknamePrompt = document.getElementById('nickname-prompt');
const nicknameInput = document.getElementById('nickname-input');
const joinButton = document.getElementById('join-button');
const connectionStatus = document.getElementById('connection-status');
const gameUIOverlay = document.getElementById('ui-overlay');
const player1InfoBox = document.querySelector('.player1-info');
const player2InfoBox = document.querySelector('.player2-info');
const centerInfoBox = document.getElementById('center-info');
const playerControlsBox = document.getElementById('player-controls');
const player1Name = document.getElementById('player1-name');
const player1HpDisplay = document.getElementById('player1-hp');
const player1HpBar = document.getElementById('player1-hp-bar');
const player2Name = document.getElementById('player2-name');
const player2HpDisplay = document.getElementById('player2-hp');
const player2HpBar = document.getElementById('player2-hp-bar');
const timerDisplay = document.getElementById('timer');
const gameMessage = document.getElementById('game-message');
const lettersDisplay = document.getElementById('letters-display');
const wordInput = document.getElementById('word-input');
const submitWordButton = document.getElementById('submit-word-button');
const wordFeedback = document.getElementById('word-feedback');
const gameOverScreen = document.getElementById('game-over');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainButton = document.getElementById('play-again-button');
canvas = document.getElementById('game-canvas-2d');
ctx = canvas.getContext('2d');

// --- Initialization ---
function init() {
    if (!canvas || !ctx) {
        console.error("CLIENT: Canvas not found!");
        connectionStatus.textContent = "Error: Canvas element not found.";
        return;
    }
    calculateGroundLevel();
    // setupWebSocket(); // Connection now triggered by serverConfig message
    setupUIListeners();
    resetUI(); // Ensure UI is in initial state
    console.log("CLIENT: Initialization complete. Waiting for server config...");
}

function calculateGroundLevel() {
     groundLevel = canvas.height * 0.85;
}

function resetUI() {
    nicknamePrompt.style.display = 'block'; // Show nickname prompt initially
    gameOverScreen.style.display = 'none';
    player1InfoBox.style.display = 'none';
    player2InfoBox.style.display = 'none';
    centerInfoBox.style.display = 'none';
    playerControlsBox.style.display = 'none';
    lettersDisplay.innerHTML = '';
    wordInput.value = '';
    wordFeedback.textContent = '';
    wordInput.disabled = true;
    submitWordButton.disabled = true;
    connectionStatus.textContent = 'Connecting...'; // Initial status
    if(ctx) { // Clear canvas if initialized
        clearCanvas();
        drawBackground();
    }
}

// --- WebSocket Setup & Connection ---
function connectWebSocket(url) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log("CLIENT: WebSocket connection attempt ignored, already open or connecting.");
        return;
    }
    if (!url) {
        console.error("CLIENT: Cannot connect WebSocket, URL is missing.");
        connectionStatus.textContent = 'Server Config Error. Refresh?';
        return;
    }

    console.log(`CLIENT: Attempting WebSocket connection to: ${url}`);
    websocketUrl = url; // Store the URL
    connectionStatus.textContent = 'Connecting WebSocket...';

    // Make sure any old connection is closed before creating a new one
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
        console.log('CLIENT: WebSocket connection established.');
        connectionStatus.textContent = 'Connected! Enter nickname.';
        nicknamePrompt.style.display = 'block'; // Show nickname input
        // Other UI elements remain hidden until gameStart
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            // console.log('CLIENT: Message received:', message.type); // Less verbose log
            handleServerMessage(message);
        } catch (error) {
             console.error('CLIENT: Failed to parse server message:', event.data, error);
        }
    };

    ws.onerror = (error) => {
         console.error('CLIENT: WebSocket Error:', error);
         connectionStatus.textContent = 'Connection Error. Refresh?';
         // Only show game over if game was active, otherwise just show error
         if (gameActive) {
             displayGameMessage('Connection error!', 'error');
             showGameOver("Connection Error");
         }
    };

    ws.onclose = (event) => {
        console.log(`CLIENT: WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        const wasActive = gameActive;
        gameActive = false;
        stopGameLoop();
        clearInterval(currentTimerInterval);
        resetUI(); // Reset UI fully on close

        if (event.code !== 1000 && event.code !== 1005) { // 1000=Normal, 1005=No Status Rcvd
            connectionStatus.textContent = 'Disconnected. Refresh?';
            if (wasActive && gameOverScreen.style.display === 'none') {
                // Avoid showing generic "Connection Lost" if game over was already triggered
                 // displayGameMessage('Connection lost.', 'error');
                 // showGameOver("Connection Lost");
            }
        } else {
            connectionStatus.textContent = 'Disconnected.';
        }
         ws = null; // Clear WebSocket object
         playerId = null;
         gameId = null;
         playerNumber = null;
    };
}


// --- UI Listeners ---
function setupUIListeners() {
    joinButton.addEventListener('click', () => {
        const nick = nicknameInput.value.trim();
        if (nick && ws && ws.readyState === WebSocket.OPEN) {
            connectionStatus.textContent = 'Joining...';
            ws.send(JSON.stringify({ type: 'join', nickname: nick }));
            nicknamePrompt.style.display = 'none';
        } else if (!nick) {
             connectionStatus.textContent = 'Please enter a nickname.';
        } else {
            connectionStatus.textContent = 'Not connected. Refresh page.';
        }
    });

    submitWordButton.addEventListener('click', submitWord);
    wordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !submitWordButton.disabled) {
            submitWord();
        }
    });
     wordInput.addEventListener('input', () => {
        wordInput.value = wordInput.value.toUpperCase();
     });

    playAgainButton.addEventListener('click', () => {
       window.location.reload();
    });
}

// --- Canvas Drawing Functions (Unchanged) ---
function drawCastle(x, y, width, height, playerColor) { /* ... Keep exact code ... */ }
function drawSoldier(soldier) { /* ... Keep exact code ... */ }
function drawBackground() { /* ... Keep exact code ... */ }
function clearCanvas() { /* ... Keep exact code ... */ }


// --- Game Logic & State Updates (Unchanged) ---
function submitWord() { /* ... Keep exact code ... */ }
function updateLettersUI(letters) { /* ... Keep exact code ... */ }
function updateHpUI(targetPlayerId, hp, maxHp = 100) { /* ... Keep exact code ... */ }
function displayGameMessage(message, type = 'info') { /* ... Keep exact code ... */ }
function displayWordFeedback(message, type = 'info') { /* ... Keep exact code ... */ }
function startRoundTimer(durationMs) { /* ... Keep exact code ... */ }
function spawnSoldiers(ownerId, count) { /* ... Keep exact code ... */ }

// --- Animation Loop & Game Updates (2D) (Unchanged) ---
function gameLoop() { /* ... Keep exact code ... */ }
function startGameLoop() { /* ... Keep exact code ... */ }
function stopGameLoop() { /* ... Keep exact code ... */ }
function moveSoldiers() { /* ... Keep exact code ... */ }
function checkCombat() { /* ... Keep exact code ... */ }
function checkCastleHits() { /* ... Keep exact code ... */ }
function removeSoldiersByIds(idsToRemove) { /* ... Keep exact code ... */ }
function showGameOver(message) { /* ... Keep exact code (uses resetUI logic now via onclose) ... */ }


// --- Server Message Handler ---
function handleServerMessage(message) {
    switch (message.type) {
        case 'serverConfig': // *** NEW: Handles initial connection setup ***
            playerId = message.playerId;
            console.log(`CLIENT: Received server config. My ID: ${playerId}. WS URL: ${message.websocketUrl}`);
            // Connect WebSocket using the URL provided by the server
            // This replaces the previous setupWebSocket immediate connection
            connectWebSocket(message.websocketUrl);
            break;

        case 'waiting':
            displayGameMessage(message.message);
            connectionStatus.textContent = message.message;
            resetUI(); // Show only nickname prompt + status
            nicknamePrompt.style.display = 'none'; // Hide prompt as we are now waiting
            break;

        case 'gameStart':
            if (gameActive) { console.warn("CLIENT: Received gameStart while already active."); return; }
            gameActive = true;
            gameId = message.gameId;
            player1Castle.ownerId = message.player1.id;
            player2Castle.ownerId = message.player2.id;
            playerNumber = (message.player1.id === playerId) ? 1 : 2;
            opponentNickname = (playerNumber === 1) ? message.player2.nickname : message.player1.nickname;
            console.log(`CLIENT: Game ${gameId} Started. Player ${playerNumber}. Opponent: ${opponentNickname}`);

            // Show Game UI elements
            gameOverScreen.style.display = 'none';
            nicknamePrompt.style.display = 'none';
            player1InfoBox.style.display = 'block';
            player2InfoBox.style.display = 'block';
            centerInfoBox.style.display = 'block';
            playerControlsBox.style.display = 'flex';
            displayGameMessage('Fight!');

            if (playerNumber === 1) { player1Name.textContent = message.player1.nickname + " (You)"; player2Name.textContent = opponentNickname; }
            else { player1Name.textContent = opponentNickname; player2Name.textContent = message.player2.nickname + " (You)"; }
            updateHpUI(message.player1.id, message.player1.hp);
            updateHpUI(message.player2.id, message.player2.hp);

            const castleMargin = 30;
            player1Castle.x = castleMargin; player1Castle.width = CASTLE_WIDTH;
            player2Castle.x = canvas.width - castleMargin - CASTLE_WIDTH; player2Castle.width = CASTLE_WIDTH;

            activeSoldiers = [];
            wordInput.value = ''; wordFeedback.textContent = '';
            updateLettersUI([]); // Wait for initialLetters
            startRoundTimer(message.timer); // Starts timer, enables controls

            startGameLoop();
            break;

        case 'initialLetters':
        case 'newRound': // Combine handling for letters + timer reset
            if (!gameActive) break;
            console.log(`CLIENT: Received ${message.type}, letters:`, message.letters);
            if(message.type === 'newRound') displayGameMessage('New Round!');
            updateLettersUI(message.letters);
            if(message.timer) startRoundTimer(message.timer); // Reset timer if included
            else { // If only letters (initialLetters), ensure controls are enabled
                submitWordButton.disabled = !gameActive;
                wordInput.disabled = !gameActive;
                if(gameActive) wordInput.focus();
            }
            wordFeedback.textContent = '';
            break;

        case 'wordValidated':
            if (!gameActive) break;
            if (message.playerId === playerId) {
                if (message.isValid) {
                    displayWordFeedback(`"${message.word}" OK! +${message.soldierCount} soldiers.`, 'success');
                    updateLettersUI(message.newLetters);
                    spawnSoldiers(playerId, message.soldierCount);
                } else {
                    displayWordFeedback(`"${message.word}" is not valid!`, 'error');
                }
            } else {
                 if (message.isValid) {
                    displayGameMessage(`${opponentNickname}: ${message.word} (+${message.soldierCount})`);
                    spawnSoldiers(message.playerId, message.soldierCount);
                 }
            }
            // Re-enable controls AFTER processing feedback
            submitWordButton.disabled = !gameActive;
            wordInput.disabled = !gameActive;
             if(gameActive) wordInput.focus();
            break;

        case 'updateHP':
             if (!gameActive) break;
             updateHpUI(message.playerId, message.hp);
             const damageTakerNickname = (message.playerId === playerId) ? "Your" : opponentNickname+"'s";
             const attackerNickname = message.attackerId ? ( (message.attackerId === playerId) ? "Your" : opponentNickname+"'s" ) : "Opponent's";
             if (message.attackerId && message.attackerId !== message.playerId) {
                 displayGameMessage(`${attackerNickname} troops damaged ${damageTakerNickname} castle!`);
             }
            break;

        case 'gameOver':
            if (!gameActive && gameOverScreen.style.display !== 'none') break; // Avoid double trigger
            console.log(`CLIENT: Received gameOver. Winner: ${message.winnerId}`);
            const winnerIsMe = message.winnerId === playerId;
            const winnerNickname = winnerIsMe ? "You" : opponentNickname;
            const outcomeMessage = winnerIsMe ? `Victory!` : `${opponentNickname} Wins!`;
            const reason = message.reason === 'disconnect' ? ` (${opponentNickname} disconnected)` : '';
            showGameOver(`${outcomeMessage}${reason}`);
            break;

        case 'opponentLeft':
            if (!gameActive && gameOverScreen.style.display !== 'none') break;
             console.log("CLIENT: Received opponentLeft.");
             // Server *should* send gameOver, but display message immediately
             displayGameMessage(`${opponentNickname} has left the game.`, 'error');
             // Don't call showGameOver here unless server proves unreliable
            break;

         default:
            console.log("CLIENT: Unhandled message type:", message.type);
    }
}

// --- Start the application ---
init(); // Run init, which now waits for server config before connecting WS