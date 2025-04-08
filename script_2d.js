// script_2d.js (Full Game Logic + Render Ready + More Error Catching)

// --- Configuration ---
const PLAYER_1_COLOR = '#4CAF50'; const PLAYER_2_COLOR = '#F44336';
// ... (keep other constants) ...
const CASTLE_WIDTH = 60; const CASTLE_HEIGHT = 90;
// ... etc ...
const SOLDIER_SPEED = 2.0; const COMBAT_DISTANCE_THRESHOLD_2D = 10; // Increased slightly
const CASTLE_HIT_BOX_MARGIN = 2;


// --- Global Variables ---
let canvas, ctx; let ws = null; let websocketUrl = null; let playerId = null;
let gameId = null; let playerNumber = null; let playerLetters = [];
let activeSoldiers = []; let opponentNickname = 'Opponent'; let gameActive = false;
let animationFrameId = null; let player1Castle = { x: 0, y: 0, width: 0, height: 0, ownerId: null };
let player2Castle = { x: 0, y: 0, width: 0, height: 0, ownerId: null };
let currentTimerInterval = null; let groundLevel = 0;

// --- DOM Elements ---
// Declare variables, will be assigned in init
let nicknamePrompt, nicknameInput, joinButton, connectionStatus, gameUIOverlay;
let player1InfoBox, player2InfoBox, centerInfoBox, playerControlsBox;
let player1Name, player1HpDisplay, player1HpBar;
let player2Name, player2HpDisplay, player2HpBar;
let timerDisplay, gameMessage, lettersDisplay, wordInput, submitWordButton, wordFeedback;
let gameOverScreen, gameOverMessage, playAgainButton;

// --- Initialization ---
function init() {
    try {
        console.log("CLIENT: init() started.");
        // Assign DOM elements now that DOM is loaded
        canvas = document.getElementById('game-canvas-2d');
        ctx = canvas?.getContext('2d');
        nicknamePrompt = document.getElementById('nickname-prompt');
        nicknameInput = document.getElementById('nickname-input');
        joinButton = document.getElementById('join-button');
        connectionStatus = document.getElementById('connection-status');
        gameUIOverlay = document.getElementById('ui-overlay');
        player1InfoBox = document.querySelector('.player1-info');
        player2InfoBox = document.querySelector('.player2-info');
        centerInfoBox = document.getElementById('center-info');
        playerControlsBox = document.getElementById('player-controls');
        player1Name = document.getElementById('player1-name');
        player1HpDisplay = document.getElementById('player1-hp');
        player1HpBar = document.getElementById('player1-hp-bar');
        player2Name = document.getElementById('player2-name');
        player2HpDisplay = document.getElementById('player2-hp');
        player2HpBar = document.getElementById('player2-hp-bar');
        timerDisplay = document.getElementById('timer');
        gameMessage = document.getElementById('game-message');
        lettersDisplay = document.getElementById('letters-display');
        wordInput = document.getElementById('word-input');
        submitWordButton = document.getElementById('submit-word-button');
        wordFeedback = document.getElementById('word-feedback');
        gameOverScreen = document.getElementById('game-over');
        gameOverMessage = document.getElementById('game-over-message');
        playAgainButton = document.getElementById('play-again-button');

        if (!canvas || !ctx) {
            console.error("CLIENT: Canvas not found/supported!");
            if(connectionStatus) connectionStatus.textContent = "Error: Canvas element not found.";
            return;
        }
        calculateGroundLevel();
        setupUIListeners();
        resetUI();
        console.log("CLIENT: init() complete. Waiting for server config...");
    } catch (error) {
        console.error("CLIENT: CRITICAL ERROR during init():", error);
        if(connectionStatus) connectionStatus.textContent = "Initialization Error. Refresh.";
    }
}

function calculateGroundLevel() { if(canvas) groundLevel = canvas.height * 0.85; }

function resetUI(statusMsg = 'Connecting...') {
    try {
        if(nicknamePrompt) nicknamePrompt.style.display = 'block';
        if(gameOverScreen) gameOverScreen.style.display = 'none';
        if(player1InfoBox) player1InfoBox.style.display = 'none';
        if(player2InfoBox) player2InfoBox.style.display = 'none';
        if(centerInfoBox) centerInfoBox.style.display = 'none';
        if(playerControlsBox) playerControlsBox.style.display = 'none';
        if(lettersDisplay) lettersDisplay.innerHTML = '';
        if(wordInput) { wordInput.value = ''; wordInput.disabled = true; }
        if(wordFeedback) wordFeedback.textContent = '';
        if(submitWordButton) submitWordButton.disabled = true;
        if(connectionStatus) connectionStatus.textContent = statusMsg;
        else { console.warn("CLIENT: resetUI - connectionStatus element not found."); } // Added warning
        if(ctx) { clearCanvas(); drawBackground(); }
    } catch (error) {
        console.error("CLIENT: Error during resetUI():", error);
    }
}

// --- WebSocket Setup & Connection ---
function connectWebSocket(url) {
    try { // Add try block here too
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            console.log("CLIENT: WebSocket connection attempt ignored, already open or connecting.");
            return;
        }
        if (!url) {
            console.error("CLIENT: Cannot connect WebSocket, URL is missing.");
            if(connectionStatus) connectionStatus.textContent = 'Server Config Error. Refresh?';
            return;
        }

        console.log(`CLIENT: Attempting WebSocket connection to: ${url}`);
        websocketUrl = url;
        if(connectionStatus) connectionStatus.textContent = `Connecting WebSocket...`;

        if (ws) { ws.close(); }
        ws = new WebSocket(websocketUrl);

        ws.onopen = () => {
            console.log('CLIENT: WebSocket connection established.');
            if(connectionStatus) connectionStatus.textContent = 'Connected! Enter nickname.';
            if(nicknamePrompt) nicknamePrompt.style.display = 'block';
            else { console.error("CLIENT: ws.onopen - nicknamePrompt is null!");}
        };

        ws.onmessage = (event) => {
            try { // Inner try for message processing
                const message = JSON.parse(event.data);
                // console.log('CLIENT: Message received:', message.type);
                handleServerMessage(message);
            } catch (error) {
                console.error('CLIENT: Failed to parse or handle server message:', event.data, error);
                if(connectionStatus) connectionStatus.textContent = 'Error reading message.';
            }
        };

        ws.onerror = (error) => {
            console.error('CLIENT: WebSocket Error Event:', error);
            if(connectionStatus) connectionStatus.textContent = 'WebSocket Connection Error.';
            if (gameActive) { showGameOver("Connection Error"); }
        };

        ws.onclose = (event) => {
            console.log(`CLIENT: WebSocket Connection Closed. Code: ${event.code}, Reason: ${event.reason}, WasClean: ${event.wasClean}`);
            const wasConnected = connectionStatus?.textContent.includes('Connected!');
            gameActive = false; stopGameLoop(); clearInterval(currentTimerInterval);
            resetUI('Disconnected. Refresh?');
            if (connectionStatus) {
                if (event.code !== 1000 && event.code !== 1005) { connectionStatus.textContent = 'Disconnected. Refresh?'; }
                else if (!wasConnected && event.code !== 1000) { connectionStatus.textContent = `Connection Failed (Code: ${event.code}). Refresh?`; }
                else { connectionStatus.textContent = 'Disconnected.'; }
            }
            ws = null; playerId = null; gameId = null; playerNumber = null;
        };
    } catch (error) {
         console.error("CLIENT: CRITICAL ERROR during connectWebSocket():", error);
         if(connectionStatus) connectionStatus.textContent = "WebSocket Setup Error. Refresh.";
    }
}

// --- UI Listeners ---
function setupUIListeners() {
    try { // Add try block
        joinButton?.addEventListener('click', () => {
            const nick = nicknameInput?.value.trim();
            if (nick && ws && ws.readyState === WebSocket.OPEN) {
                if(connectionStatus) connectionStatus.textContent = 'Joining...';
                ws.send(JSON.stringify({ type: 'join', nickname: nick }));
                if(nicknamePrompt) nicknamePrompt.style.display = 'none';
            } else if (!nick) { if(connectionStatus) connectionStatus.textContent = 'Please enter a nickname.'; }
            else { if(connectionStatus) connectionStatus.textContent = 'Not connected. Refresh page.'; }
        });
        submitWordButton?.addEventListener('click', submitWord);
        wordInput?.addEventListener('keypress', (event) => { if (event.key === 'Enter' && !submitWordButton?.disabled) submitWord(); });
        wordInput?.addEventListener('input', () => { if(wordInput) wordInput.value = wordInput.value.toUpperCase(); });
        playAgainButton?.addEventListener('click', () => { window.location.reload(); });
    } catch (error) {
         console.error("CLIENT: Error setting up UI listeners:", error);
    }
}

// --- Canvas Drawing Functions (Assumed correct, no changes) ---
function drawCastle(x, y, width, height, playerColor) { if(!ctx) return; const ctY=y-height; const ttY=ctY-CASTLE_TURRET_HEIGHT; const fpX=x+width/2; ctx.fillStyle=CASTLE_BASE_COLOR; ctx.fillRect(x,ctY,width,height); ctx.strokeStyle='#555'; ctx.strokeRect(x,ctY,width,height); const tw=width*0.6; ctx.fillStyle=CASTLE_TURRET_COLOR; ctx.fillRect(x+(width-tw)/2,ttY,tw,CASTLE_TURRET_HEIGHT); ctx.strokeRect(x+(width-tw)/2,ttY,tw,CASTLE_TURRET_HEIGHT); const fptY=ttY-CASTLE_FLAG_HEIGHT; ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(fpX,ttY); ctx.lineTo(fpX,fptY); ctx.stroke(); ctx.lineWidth=1; ctx.fillStyle=playerColor; ctx.beginPath(); ctx.moveTo(fpX,fptY); ctx.lineTo(fpX+15,fptY+5); ctx.lineTo(fpX,fptY+10); ctx.closePath(); ctx.fill(); }
function drawSoldier(soldier) { if(!ctx) return; ctx.fillStyle=soldier.color; ctx.beginPath(); ctx.arc(soldier.x,soldier.y,soldier.size/2,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=0.5; ctx.stroke(); ctx.lineWidth=1; }
function drawBackground() { if(!ctx || !canvas) return; const sg=ctx.createLinearGradient(0,0,0,groundLevel); sg.addColorStop(0,'#87CEEB'); sg.addColorStop(1,'#B0E0E6'); ctx.fillStyle=sg; ctx.fillRect(0,0,canvas.width,groundLevel); ctx.fillStyle='#8BC34A'; ctx.fillRect(0,groundLevel,canvas.width,canvas.height-groundLevel); ctx.strokeStyle='#556B2F'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,groundLevel); ctx.lineTo(canvas.width,groundLevel); ctx.stroke(); ctx.lineWidth=1; }
function clearCanvas() { if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); }

// --- Game Logic & State Updates (Assumed mostly correct, wrapped in try/catch in handler) ---
function submitWord() { /* ... Keep exact code ... */ }
function updateLettersUI(letters) { /* ... Keep exact code ... */ }
function updateHpUI(targetPlayerId, hp, maxHp = 100) { /* ... Keep exact code ... */ }
function displayGameMessage(message, type = 'info') { /* ... Keep exact code ... */ }
function displayWordFeedback(message, type = 'info') { /* ... Keep exact code ... */ }
function startRoundTimer(durationMs) { /* ... Keep exact code ... */ }
function spawnSoldiers(ownerId, count) { /* ... Keep exact code ... */ }

// --- Animation Loop & Game Updates (2D) ---
function gameLoop() { try { if (!gameActive) return; clearCanvas(); drawBackground(); if (player1Castle?.ownerId) drawCastle(player1Castle.x, groundLevel, player1Castle.width, CASTLE_HEIGHT, PLAYER_1_COLOR); if (player2Castle?.ownerId) drawCastle(player2Castle.x, groundLevel, player2Castle.width, CASTLE_HEIGHT, PLAYER_2_COLOR); moveSoldiers(); checkCombat(); checkCastleHits(); activeSoldiers.forEach(drawSoldier); animationFrameId = requestAnimationFrame(gameLoop); } catch (error) { console.error("CLIENT: Error in gameLoop:", error); gameActive = false; /* Stop loop on error */ }}
function startGameLoop() { try { if (!animationFrameId && gameActive) { console.log("CLIENT: Starting game loop..."); animationFrameId = requestAnimationFrame(gameLoop); } } catch (error) { console.error("CLIENT: Error starting game loop:", error); }}
function stopGameLoop() { if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } }
function moveSoldiers() { try { activeSoldiers.forEach(s => { s.x += s.speed; }); } catch (error) { console.error("CLIENT: Error in moveSoldiers:", error); }}
function checkCombat() { try { const toRemove = new Set(); for (let i = 0; i < activeSoldiers.length; i++) { const s1 = activeSoldiers[i]; if (toRemove.has(s1.id)) continue; for (let j = i + 1; j < activeSoldiers.length; j++) { const s2 = activeSoldiers[j]; if (toRemove.has(s2.id) || s1.ownerId === s2.ownerId) continue; const dx = s1.x - s2.x; const dy = s1.y - s2.y; const dist = Math.sqrt(dx * dx + dy * dy); if (dist < COMBAT_DISTANCE_THRESHOLD_2D) { toRemove.add(s1.id); toRemove.add(s2.id); break; } } } if (toRemove.size > 0) removeSoldiersByIds([...toRemove]); } catch (error) { console.error("CLIENT: Error in checkCombat:", error); }}
function checkCastleHits() { try { const toRemove = new Set(); let p1Hits = 0; let p2Hits = 0; let p1Attackers = []; let p2Attackers = []; if (!player1Castle?.ownerId || !player2Castle?.ownerId) return; activeSoldiers.forEach(s => { if (toRemove.has(s.id)) return; const sLX = s.x - s.size / 2; const sRX = s.x + s.size / 2; const p1CRX = player1Castle.x + player1Castle.width; const p2CLX = player2Castle.x; if (s.ownerId === player2Castle.ownerId && s.speed < 0 && sLX <= p1CRX + CASTLE_HIT_BOX_MARGIN) { p1Hits++; toRemove.add(s.id); p2Attackers.push(s.ownerId); } else if (s.ownerId === player1Castle.ownerId && s.speed > 0 && sRX >= p2CLX - CASTLE_HIT_BOX_MARGIN) { p2Hits++; toRemove.add(s.id); p1Attackers.push(s.ownerId); } }); if (p1Hits > 0 && ws?.readyState === WebSocket.OPEN) { const attackerId = p2Attackers[0]; if (attackerId) ws.send(JSON.stringify({ type: 'castleHit', attackingPlayerId: attackerId, soldierCount: p1Hits })); } if (p2Hits > 0 && ws?.readyState === WebSocket.OPEN) { const attackerId = p1Attackers[0]; if (attackerId) ws.send(JSON.stringify({ type: 'castleHit', attackingPlayerId: attackerId, soldierCount: p2Hits })); } if (toRemove.size > 0) removeSoldiersByIds([...toRemove]); } catch (error) { console.error("CLIENT: Error in checkCastleHits:", error); }}
function removeSoldiersByIds(idsToRemove) { if (idsToRemove.length === 0) return; activeSoldiers = activeSoldiers.filter(soldier => !idsToRemove.includes(soldier.id)); }
function showGameOver(message) { try { console.log("CLIENT: showGameOver called:", message); gameActive = false; stopGameLoop(); clearInterval(currentTimerInterval); if(gameOverMessage) gameOverMessage.textContent = message; if(gameOverScreen) gameOverScreen.style.display = 'block'; if(player1InfoBox) player1InfoBox.style.display = 'none'; if(player2InfoBox) player2InfoBox.style.display = 'none'; if(centerInfoBox) centerInfoBox.style.display = 'none'; if(playerControlsBox) playerControlsBox.style.display = 'none'; if(nicknamePrompt) nicknamePrompt.style.display = 'none'; activeSoldiers = []; if(ctx) { clearCanvas(); drawBackground(); } } catch (error) { console.error("CLIENT: Error in showGameOver:", error); }}

// --- Server Message Handler (with try/catch around cases) ---
function handleServerMessage(message) {
    // console.log("CLIENT: Processing message type:", message.type); // Log type being processed
    try { // Wrap entire switch
        switch (message.type) {
            case 'serverConfig':
                try {
                    playerId = message.playerId;
                    console.log(`CLIENT: Received config. My ID: ${playerId}. WS URL: ${message.websocketUrl}`);
                    connectWebSocket(message.websocketUrl);
                } catch (e) { console.error("CLIENT: Error processing serverConfig:", e); }
                break;
            case 'waiting':
                try {
                    if(connectionStatus) connectionStatus.textContent = message.message;
                    resetUI(message.message);
                    if(nicknamePrompt) nicknamePrompt.style.display = 'none';
                } catch (e) { console.error("CLIENT: Error processing waiting:", e); }
                break;
            case 'gameStart':
                 try {
                    if (gameActive) { console.warn("CLIENT: Received gameStart while already active."); return; }
                    gameActive = true; gameId = message.gameId;
                    player1Castle.ownerId = message.player1.id; player2Castle.ownerId = message.player2.id;
                    playerNumber = (message.player1.id === playerId) ? 1 : 2;
                    opponentNickname = (playerNumber === 1) ? message.player2.nickname : message.player1.nickname;
                    console.log(`CLIENT: Game ${gameId} Started. Player ${playerNumber}. Opponent: ${opponentNickname}`);
                    if(gameOverScreen) gameOverScreen.style.display = 'none'; if(nicknamePrompt) nicknamePrompt.style.display = 'none';
                    if(player1InfoBox) player1InfoBox.style.display = 'block'; if(player2InfoBox) player2InfoBox.style.display = 'block';
                    if(centerInfoBox) centerInfoBox.style.display = 'block'; if(playerControlsBox) playerControlsBox.style.display = 'flex';
                    displayGameMessage('Fight!');
                    if (playerNumber === 1) { if(player1Name) player1Name.textContent = message.player1.nickname + " (You)"; if(player2Name) player2Name.textContent = opponentNickname; }
                    else { if(player1Name) player1Name.textContent = opponentNickname; if(player2Name) player2Name.textContent = message.player2.nickname + " (You)"; }
                    updateHpUI(message.player1.id, message.player1.hp); updateHpUI(message.player2.id, message.player2.hp);
                    const castleMargin = 30; if(canvas){player1Castle.x = castleMargin; player1Castle.width = CASTLE_WIDTH; player2Castle.x = canvas.width - castleMargin - CASTLE_WIDTH; player2Castle.width = CASTLE_WIDTH;}
                    activeSoldiers = []; if(wordInput) wordInput.value = ''; if(wordFeedback) wordFeedback.textContent = '';
                    updateLettersUI([]); startRoundTimer(message.timer); startGameLoop();
                } catch (e) { console.error("CLIENT: Error processing gameStart:", e); }
                break;
            case 'initialLetters': case 'newRound':
                try {
                    if (!gameActive) break;
                    if(message.type === 'newRound') displayGameMessage('New Round!');
                    updateLettersUI(message.letters);
                    if(message.timer) startRoundTimer(message.timer);
                    else { if(submitWordButton) submitWordButton.disabled = !gameActive; if(wordInput) wordInput.disabled = !gameActive; if(gameActive && wordInput) wordInput.focus(); }
                    if(wordFeedback) wordFeedback.textContent = '';
                } catch (e) { console.error("CLIENT: Error processing initialLetters/newRound:", e); }
                break;
            case 'wordValidated':
                try {
                    if (!gameActive) break;
                    if (message.playerId === playerId) { if (message.isValid) { displayWordFeedback(`"${message.word}" OK! +${message.soldierCount} soldiers.`, 'success'); updateLettersUI(message.newLetters); spawnSoldiers(playerId, message.soldierCount); } else displayWordFeedback(`"${message.word}" is not valid!`, 'error'); }
                    else { if (message.isValid) { displayGameMessage(`${opponentNickname}: ${message.word} (+${message.soldierCount})`); spawnSoldiers(message.playerId, message.soldierCount); } }
                    if(gameActive){ if(submitWordButton) submitWordButton.disabled = false; if(wordInput) { wordInput.disabled = false; wordInput.focus(); }}
                } catch (e) { console.error("CLIENT: Error processing wordValidated:", e); }
                break;
            case 'updateHP':
                try {
                    if (!gameActive) break; updateHpUI(message.playerId, message.hp);
                    const dtn = (message.playerId === playerId) ? "Your" : opponentNickname+"'s"; const an = message.attackerId ? ( (message.attackerId === playerId) ? "Your" : opponentNickname+"'s" ) : "Opponent's";
                    if (message.attackerId && message.attackerId !== message.playerId) displayGameMessage(`${an} troops damaged ${dtn} castle!`);
                } catch (e) { console.error("CLIENT: Error processing updateHP:", e); }
                break;
            case 'gameOver':
                try {
                    if (!gameActive && gameOverScreen?.style.display !== 'none') break; console.log(`CLIENT: Received gameOver. Winner: ${message.winnerId}`);
                    const winnerIsMe = message.winnerId === playerId; const winnerNN = winnerIsMe ? "You" : opponentNickname; const outcome = winnerIsMe ? `Victory!` : `${winnerNN} Wins!`; const reason = message.reason === 'disconnect' ? ` (${opponentNickname} disconnected)` : '';
                    showGameOver(`${outcome}${reason}`);
                } catch (e) { console.error("CLIENT: Error processing gameOver:", e); }
                break;
            case 'opponentLeft':
                try {
                    if (!gameActive && gameOverScreen?.style.display !== 'none') break;
                    displayGameMessage(`${opponentNickname} has left.`, 'error');
                } catch (e) { console.error("CLIENT: Error processing opponentLeft:", e); }
                break;
            default: console.log("CLIENT: Unhandled message type:", message.type);
        }
    } catch (error) { // Catch errors from the overall switch/processing logic
         console.error("CLIENT: Error in handleServerMessage switch:", error);
         if(connectionStatus) connectionStatus.textContent = "Message Handling Error.";
    }
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', (event) => {
    console.log('CLIENT: DOMContentLoaded event fired.');
    init(); // Run init after DOM is ready
});