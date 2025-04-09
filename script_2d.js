// script_2d.js (Full Logic + Direct Connect V3 - Fixed Order Errors)

// --- Configuration ---
const PLAYER_1_COLOR = '#4CAF50'; const PLAYER_2_COLOR = '#F44336';
const CASTLE_BASE_COLOR = '#a1887f'; const CASTLE_TURRET_COLOR = '#795548';
const SOLDIER_SIZE = 12; const CASTLE_WIDTH = 60; const CASTLE_HEIGHT = 90;
const CASTLE_TURRET_HEIGHT = 25; const CASTLE_FLAG_HEIGHT = 18;
const SOLDIER_SPEED = 2.0; const COMBAT_DISTANCE_THRESHOLD_2D = SOLDIER_SIZE * 0.8;
const CASTLE_HIT_BOX_MARGIN = 2;

// --- Global Variables ---
let canvas, ctx; let ws = null; let playerId = null; let gameId = null;
let playerNumber = null; let playerLetters = []; let activeSoldiers = [];
let opponentNickname = 'Opponent'; let gameActive = false; let animationFrameId = null;
let player1Castle = { x: 0, y: 0, width: 0, height: 0, ownerId: null };
let player2Castle = { x: 0, y: 0, width: 0, height: 0, ownerId: null };
let currentTimerInterval = null; let groundLevel = 0;

// --- DOM Elements (Declare with 'let' globally) ---
let nicknamePrompt, nicknameInput, joinButton, connectionStatus, gameUIOverlay;
let player1InfoBox, player2InfoBox, centerInfoBox, playerControlsBox;
let player1Name, player1HpDisplay, player1HpBar;
let player2Name, player2HpDisplay, player2HpBar;
let timerDisplay, gameMessage, lettersDisplay, wordInput, submitWordButton, wordFeedback;
let gameOverScreen, gameOverMessage, playAgainButton;


// --- FUNCTION DEFINITIONS (Moved BEFORE init) ---

function calculateGroundLevel() { if(canvas) groundLevel = canvas.height * 0.85; }

function clearCanvas() { if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); }

function drawBackground() { if(!ctx || !canvas) return; calculateGroundLevel(); const sg=ctx.createLinearGradient(0,0,0,groundLevel); sg.addColorStop(0,'#87CEEB'); sg.addColorStop(1,'#B0E0E6'); ctx.fillStyle=sg; ctx.fillRect(0,0,canvas.width,groundLevel); ctx.fillStyle='#8BC34A'; ctx.fillRect(0,groundLevel,canvas.width,canvas.height-groundLevel); ctx.strokeStyle='#556B2F'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,groundLevel); ctx.lineTo(canvas.width,groundLevel); ctx.stroke(); ctx.lineWidth=1; }

function resetUI(statusMsg = 'Initializing...') {
    try {
        if(nicknamePrompt) nicknamePrompt.style.display = 'block'; else console.warn("resetUI: nicknamePrompt missing");
        if(gameOverScreen) gameOverScreen.style.display = 'none'; else console.warn("resetUI: gameOverScreen missing");
        if(player1InfoBox) player1InfoBox.style.display = 'none'; else console.warn("resetUI: player1InfoBox missing");
        if(player2InfoBox) player2InfoBox.style.display = 'none'; else console.warn("resetUI: player2InfoBox missing");
        if(centerInfoBox) centerInfoBox.style.display = 'none'; else console.warn("resetUI: centerInfoBox missing");
        if(playerControlsBox) playerControlsBox.style.display = 'none'; else console.warn("resetUI: playerControlsBox missing");
        if(lettersDisplay) lettersDisplay.innerHTML = ''; else console.warn("resetUI: lettersDisplay missing");
        if(wordInput) { wordInput.value = ''; wordInput.disabled = true; } else console.warn("resetUI: wordInput missing");
        if(wordFeedback) wordFeedback.textContent = ''; else console.warn("resetUI: wordFeedback missing");
        if(submitWordButton) submitWordButton.disabled = true; else console.warn("resetUI: submitWordButton missing");
        // Enable Join button/input only if WS is NOT currently connecting/open
        const joinDisabled = !!(ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING));
        if(joinButton) joinButton.disabled = joinDisabled; else console.warn("resetUI: joinButton missing");
        if(nicknameInput) nicknameInput.disabled = joinDisabled; else console.warn("resetUI: nicknameInput missing");

        if(connectionStatus) connectionStatus.textContent = statusMsg; else console.warn("resetUI: connectionStatus missing");
        if(ctx) { clearCanvas(); drawBackground(); } // Call drawing functions
    } catch (error) { console.error("CLIENT: Error during resetUI():", error); }
}

// --- Game Logic & State Updates ---
function submitWord() { // Define submitWord BEFORE setupUIListeners uses it
    if(!wordInput || !gameActive || !ws || ws.readyState !== WebSocket.OPEN) return;
    const word = wordInput.value.trim();
    if (word.length < 3) { displayWordFeedback('Word must be 3+ letters.', 'error'); return; }
    let tempLetters=[...playerLetters]; let possible=true;
    for (const char of word) { const index=tempLetters.indexOf(char); if(index===-1){possible=false;break;} tempLetters.splice(index,1); }
    if (!possible) { displayWordFeedback('You don\'t have those letters.', 'error'); return; }
    ws.send(JSON.stringify({ type: 'submitWord', word: word }));
    wordInput.value = ''; displayWordFeedback('Checking...', 'info'); if(submitWordButton) submitWordButton.disabled = true;
}
function updateLettersUI(letters) { playerLetters = letters || []; if(!lettersDisplay) return; lettersDisplay.innerHTML = ''; playerLetters.forEach(letter => { const tile = document.createElement('div'); tile.classList.add('letter-tile'); tile.textContent = letter; lettersDisplay.appendChild(tile); }); }
function updateHpUI(targetPlayerId, hp, maxHp = 100) { const hpValue = Math.max(0, hp); const hpPercent = (hpValue / maxHp) * 100; let targetHpD, targetHpB; if (targetPlayerId === player1Castle?.ownerId) { targetHpD = player1HpDisplay; targetHpB = player1HpBar; } else if (targetPlayerId === player2Castle?.ownerId) { targetHpD = player2HpDisplay; targetHpB = player2HpBar; } else return; if (targetHpD) targetHpD.textContent = `HP: ${hpValue}`; if (targetHpB) targetHpB.style.width = `${hpPercent}%`; }
function displayGameMessage(message, type = 'info') { if(!gameMessage) return; gameMessage.textContent = message; gameMessage.style.color = type === 'error' ? '#ff6666' : (type === 'success' ? '#90ee90' : '#ffdd88'); }
function displayWordFeedback(message, type = 'info') { if(!wordFeedback) return; wordFeedback.textContent = message; wordFeedback.style.color = type === 'error' ? '#ffaaaa' : (type === 'success' ? '#aaffaa' : '#eeeeee'); const ctrlDisabled = !gameActive || message === 'Checking...'; if(submitWordButton) submitWordButton.disabled = ctrlDisabled; if(wordInput) wordInput.disabled = ctrlDisabled; if (message !== 'Checking...') { setTimeout(() => { if (wordFeedback.textContent === message) { wordFeedback.textContent = ''; } }, 3500); } }
function startRoundTimer(durationMs) { clearInterval(currentTimerInterval); let remaining = Math.max(0, Math.floor(durationMs / 1000)); if(timerDisplay) timerDisplay.textContent = `Time: ${remaining}`; const ctrlDisabled = !gameActive; if(submitWordButton) submitWordButton.disabled = ctrlDisabled; if(wordInput) wordInput.disabled = ctrlDisabled; if(gameActive && wordInput) wordInput.focus(); currentTimerInterval = setInterval(() => { remaining--; if(timerDisplay) timerDisplay.textContent = `Time: ${remaining}`; if (remaining <= 0) { clearInterval(currentTimerInterval); if(timerDisplay) timerDisplay.textContent = 'Time: 0'; if (gameActive) { displayGameMessage("Time's up! Waiting..."); if(submitWordButton) submitWordButton.disabled = true; if(wordInput) wordInput.disabled = true; } } }, 1000); }
function spawnSoldiers(ownerId, count) { if (!gameActive || count <= 0 || !canvas) return; const isP1 = (ownerId === player1Castle?.ownerId); const spawnC = isP1 ? player1Castle : player2Castle; const targetC = isP1 ? player2Castle : player1Castle; if (!spawnC?.ownerId || !targetC?.ownerId) return; const spawnX = isP1 ? spawnC.x + spawnC.width + 5 + (Math.random()*5) : spawnC.x - 5 - (Math.random()*5); const baseSY = groundLevel - SOLDIER_SIZE / 2; const targetX = isP1 ? targetC.x : targetC.x + targetC.width; const color = isP1 ? PLAYER_1_COLOR : PLAYER_2_COLOR; const speed = SOLDIER_SPEED * (isP1 ? 1 : -1); for (let i = 0; i < count; i++) { const spawnY = baseSY + (Math.random() - 0.5) * (SOLDIER_SIZE*0.8); const finalX = spawnX + (Math.random() - 0.5) * 10; activeSoldiers.push({ id: `${ownerId}_s_${Date.now()}_${i}`, ownerId, x: finalX, y: spawnY, targetX, color, size: SOLDIER_SIZE, speed }); } }
function removeSoldiersByIds(ids) { if (ids.length === 0) return; activeSoldiers = activeSoldiers.filter(s => !ids.includes(s.id)); }
function showGameOver(message) { try { console.log("CLIENT: showGameOver called:", message); gameActive = false; stopGameLoop(); clearInterval(currentTimerInterval); if(gameOverMessage) gameOverMessage.textContent = message; if(gameOverScreen) gameOverScreen.style.display = 'block'; if(player1InfoBox) player1InfoBox.style.display = 'none'; if(player2InfoBox) player2InfoBox.style.display = 'none'; if(centerInfoBox) centerInfoBox.style.display = 'none'; if(playerControlsBox) playerControlsBox.style.display = 'none'; if(nicknamePrompt) nicknamePrompt.style.display = 'none'; activeSoldiers = []; if(ctx) { clearCanvas(); drawBackground(); } } catch (error) { console.error("CLIENT: Error in showGameOver:", error); }}

// --- Canvas Drawing Functions ---
function drawCastle(x, y, width, height, playerColor) { if(!ctx) return; const ctY=y-height; const ttY=ctY-CASTLE_TURRET_HEIGHT; const fpX=x+width/2; ctx.fillStyle=CASTLE_BASE_COLOR; ctx.fillRect(x,ctY,width,height); ctx.strokeStyle='#555'; ctx.strokeRect(x,ctY,width,height); const tw=width*0.6; ctx.fillStyle=CASTLE_TURRET_COLOR; ctx.fillRect(x+(width-tw)/2,ttY,tw,CASTLE_TURRET_HEIGHT); ctx.strokeRect(x+(width-tw)/2,ttY,tw,CASTLE_TURRET_HEIGHT); const fptY=ttY-CASTLE_FLAG_HEIGHT; ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(fpX,ttY); ctx.lineTo(fpX,fptY); ctx.stroke(); ctx.lineWidth=1; ctx.fillStyle=playerColor; ctx.beginPath(); ctx.moveTo(fpX,fptY); ctx.lineTo(fpX+15,fptY+5); ctx.lineTo(fpX,fptY+10); ctx.closePath(); ctx.fill(); }
function drawSoldier(soldier) { if(!ctx) return; ctx.fillStyle=soldier.color; ctx.beginPath(); ctx.arc(soldier.x,soldier.y,soldier.size/2,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=0.5; ctx.stroke(); ctx.lineWidth=1; }

// --- Animation Loop & Game Updates ---
function gameLoop() { try { if (!gameActive) return; clearCanvas(); drawBackground(); if (player1Castle?.ownerId) drawCastle(player1Castle.x, groundLevel, player1Castle.width, CASTLE_HEIGHT, PLAYER_1_COLOR); if (player2Castle?.ownerId) drawCastle(player2Castle.x, groundLevel, player2Castle.width, CASTLE_HEIGHT, PLAYER_2_COLOR); moveSoldiers(); checkCombat(); checkCastleHits(); activeSoldiers.forEach(drawSoldier); animationFrameId = requestAnimationFrame(gameLoop); } catch (error) { console.error("CLIENT: Error in gameLoop:", error); gameActive = false; showGameOver("Runtime Error!"); }}
function startGameLoop() { try { if (!animationFrameId && gameActive) { console.log("CLIENT: Starting game loop..."); animationFrameId = requestAnimationFrame(gameLoop); } } catch (error) { console.error("CLIENT: Error starting game loop:", error); }}
function stopGameLoop() { if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } }
function moveSoldiers() { try { activeSoldiers.forEach(s => { s.x += s.speed; }); } catch (error) { console.error("CLIENT: Error in moveSoldiers:", error); }}
function checkCombat() { try { const toRemove = new Set(); for (let i=0; i<activeSoldiers.length; i++) { const s1=activeSoldiers[i]; if(toRemove.has(s1.id)) continue; for (let j=i+1; j<activeSoldiers.length; j++) { const s2=activeSoldiers[j]; if(toRemove.has(s2.id)||s1.ownerId===s2.ownerId) continue; const dx=s1.x-s2.x; const dy=s1.y-s2.y; const dist=Math.sqrt(dx*dx+dy*dy); if(dist<COMBAT_DISTANCE_THRESHOLD_2D){toRemove.add(s1.id);toRemove.add(s2.id);break;}}} if(toRemove.size>0)removeSoldiersByIds([...toRemove]); } catch (error) { console.error("CLIENT: Error in checkCombat:", error); }}
function checkCastleHits() { try { const toRemove = new Set(); let p1H=0; let p2H=0; let p1A=[]; let p2A=[]; if(!player1Castle?.ownerId||!player2Castle?.ownerId) return; activeSoldiers.forEach(s=>{if(toRemove.has(s.id))return; const sLX=s.x-s.size/2; const sRX=s.x+s.size/2; const p1CRX=player1Castle.x+player1Castle.width; const p2CLX=player2Castle.x; if(s.ownerId===player2Castle.ownerId&&s.speed<0&&sLX<=p1CRX+CASTLE_HIT_BOX_MARGIN){p1H++;toRemove.add(s.id);p2A.push(s.ownerId);}else if(s.ownerId===player1Castle.ownerId&&s.speed>0&&sRX>=p2CLX-CASTLE_HIT_BOX_MARGIN){p2H++;toRemove.add(s.id);p1A.push(s.ownerId);}}); if(p1H>0&&ws?.readyState===WebSocket.OPEN){const attId=p2A[0];if(attId)ws.send(JSON.stringify({type:'castleHit',attackingPlayerId:attId,soldierCount:p1H}));} if(p2H>0&&ws?.readyState===WebSocket.OPEN){const attId=p1A[0];if(attId)ws.send(JSON.stringify({type:'castleHit',attackingPlayerId:attId,soldierCount:p2H}));} if(toRemove.size>0)removeSoldiersByIds([...toRemove]); } catch (error) { console.error("CLIENT: Error in checkCastleHits:", error); }}


// --- UI Listeners ---
function setupUIListeners() { // Define setupUIListeners BEFORE init calls it
    try {
        joinButton?.addEventListener('click', () => {
            const nick = nicknameInput?.value.trim();
            if (nick && ws && ws.readyState === WebSocket.OPEN) {
                if(connectionStatus) connectionStatus.textContent = 'Joining...';
                ws.send(JSON.stringify({ type: 'join', nickname: nick }));
                if(nicknamePrompt) nicknamePrompt.style.display = 'none';
                if(joinButton) joinButton.disabled = true; if(nicknameInput) nicknameInput.disabled = true;
            } else if (!nick) { if(connectionStatus) connectionStatus.textContent = 'Please enter a nickname.'; }
            else { if(connectionStatus) connectionStatus.textContent = 'Not connected yet.'; }
        });
        submitWordButton?.addEventListener('click', submitWord); // Listener uses submitWord function
        wordInput?.addEventListener('keypress', (event) => { if (event.key === 'Enter' && !submitWordButton?.disabled) submitWord(); });
        wordInput?.addEventListener('input', () => { if(wordInput) wordInput.value = wordInput.value.toUpperCase(); });
        playAgainButton?.addEventListener('click', () => { window.location.reload(); });
    } catch (error) { console.error("CLIENT: Error setting up UI listeners:", error); }
}


// --- WebSocket Setup & Connection (Connects Immediately) ---
function connectWebSocket() { // Define connectWebSocket BEFORE init calls it
    try {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) { return; }
        if (ws) { ws.close(); ws = null;}

        // Determine URL
        const currentProto=window.location.protocol; const wsProto=currentProto==="https:"?"wss:":"ws:";
        let wsHost=window.location.hostname; let wsPort=window.location.port||(currentProto==="https:"?443:80);
        if((wsHost==='localhost'||wsHost==='127.0.0.1')&&wsPort!=8080){console.log(`CLIENT: Adjusting port from ${wsPort} to 8080 for local Node.`);wsPort=8080;}
        const fullWebSocketUrl=`${wsProto}//${wsHost}:${wsPort}`;
        console.log(`CLIENT: Attempting WebSocket connection to: ${fullWebSocketUrl}`);
        if(connectionStatus) connectionStatus.textContent = `Connecting...`;

        ws = new WebSocket(fullWebSocketUrl); // Assign to global ws

        ws.onopen = () => { console.log('CLIENT: WebSocket connection established.'); if(connectionStatus) connectionStatus.textContent = 'Connected! Enter nickname & Join.'; if(nicknamePrompt) nicknamePrompt.style.display = 'block'; if(joinButton) joinButton.disabled = false; if(nicknameInput) nicknameInput.disabled = false; };
        ws.onmessage = (event) => { try { const message = JSON.parse(event.data); handleServerMessage(message); } catch (error) { console.error('CLIENT: Failed parse/handle message:', event.data, error); } };
        ws.onerror = (error) => { console.error('CLIENT: WebSocket Error Event:', error); if(connectionStatus) connectionStatus.textContent = 'Connection Error.'; if (gameActive) showGameOver("Connection Error"); };
        ws.onclose = (event) => { console.log(`CLIENT: WebSocket Closed. Code: ${event.code}`); gameActive = false; stopGameLoop(); clearInterval(currentTimerInterval); resetUI('Disconnected. Refresh?'); ws = null; playerId = null; gameId = null; playerNumber = null; };

    } catch (error) { console.error("CLIENT: CRITICAL ERROR during connectWebSocket():", error); if(connectionStatus) connectionStatus.textContent = "WS Setup Error."; }
}

// --- Server Message Handler ---
function handleServerMessage(message) { // Define handleServerMessage BEFORE ws.onmessage uses it
    try {
        switch (message.type) {
            case 'assignId': playerId = message.playerId; console.log(`CLIENT: Received assignId. My Player ID: ${playerId}`); if (connectionStatus && connectionStatus.textContent === 'Joining...') connectionStatus.textContent = 'Joined! Waiting...'; break;
            case 'waiting': if(connectionStatus) connectionStatus.textContent = message.message; resetUI(message.message); if(nicknamePrompt) nicknamePrompt.style.display = 'none'; break;
            case 'gameStart': if (gameActive) return; gameActive = true; gameId = message.gameId; player1Castle.ownerId = message.player1.id; player2Castle.ownerId = message.player2.id; playerNumber = (message.player1.id === playerId) ? 1 : 2; opponentNickname = (playerNumber === 1) ? message.player2.nickname : message.player1.nickname; console.log(`CLIENT: Game ${gameId} Started. Player ${playerNumber}. Opponent: ${opponentNickname}`); if(gameOverScreen) gameOverScreen.style.display = 'none'; if(nicknamePrompt) nicknamePrompt.style.display = 'none'; if(player1InfoBox) player1InfoBox.style.display = 'block'; if(player2InfoBox) player2InfoBox.style.display = 'block'; if(centerInfoBox) centerInfoBox.style.display = 'block'; if(playerControlsBox) playerControlsBox.style.display = 'flex'; displayGameMessage('Fight!'); if (playerNumber === 1) { if(player1Name) player1Name.textContent = message.player1.nickname + " (You)"; if(player2Name) player2Name.textContent = opponentNickname; } else { if(player1Name) player1Name.textContent = opponentNickname; if(player2Name) player2Name.textContent = message.player2.nickname + " (You)"; } updateHpUI(message.player1.id, message.player1.hp); updateHpUI(message.player2.id, message.player2.hp); const margin = 30; if(canvas){player1Castle.x = margin; player1Castle.width = CASTLE_WIDTH; player2Castle.x = canvas.width - margin - CASTLE_WIDTH; player2Castle.width = CASTLE_WIDTH;} activeSoldiers = []; if(wordInput) wordInput.value = ''; if(wordFeedback) wordFeedback.textContent = ''; updateLettersUI([]); startRoundTimer(message.timer); startGameLoop(); break;
            case 'initialLetters': case 'newRound': if (!gameActive) break; if(message.type === 'newRound') displayGameMessage('New Round!'); updateLettersUI(message.letters); if(message.timer) startRoundTimer(message.timer); else { if(submitWordButton) submitWordButton.disabled = !gameActive; if(wordInput) wordInput.disabled = !gameActive; if(gameActive && wordInput) wordInput.focus(); } if(wordFeedback) wordFeedback.textContent = ''; break;
            case 'wordValidated': if (!gameActive) break; if (message.playerId === playerId) { if (message.isValid) { displayWordFeedback(`"${message.word}" OK! +${message.soldierCount} soldiers.`, 'success'); updateLettersUI(message.newLetters); spawnSoldiers(playerId, message.soldierCount); } else displayWordFeedback(`"${message.word}" is not valid!`, 'error'); } else { if (message.isValid) { displayGameMessage(`${opponentNickname}: ${message.word} (+${message.soldierCount})`); spawnSoldiers(message.playerId, message.soldierCount); } } if(gameActive){ if(submitWordButton) submitWordButton.disabled = false; if(wordInput) { wordInput.disabled = false; wordInput.focus(); }} break;
            case 'updateHP': if (!gameActive) break; updateHpUI(message.playerId, message.hp); const dtn = (message.playerId === playerId) ? "Your" : opponentNickname+"'s"; const an = message.attackerId ? ( (message.attackerId === playerId) ? "Your" : opponentNickname+"'s" ) : "Opponent's"; if (message.attackerId && message.attackerId !== message.playerId) displayGameMessage(`${an} troops damaged ${dtn} castle!`); break;
            case 'gameOver': if (!gameActive && gameOverScreen?.style.display !== 'none') break; console.log(`CLIENT: Received gameOver. Winner: ${message.winnerId}`); const win = message.winnerId === playerId; const winNN = win ? "You" : opponentNickname; const out = win ? `Victory!` : `${winNN} Wins!`; const rsn = message.reason === 'disconnect' ? ` (${opponentNickname} disconnected)` : ''; showGameOver(`${out}${rsn}`); break;
            case 'opponentLeft': if (!gameActive && gameOverScreen?.style.display !== 'none') break; displayGameMessage(`${opponentNickname} has left.`, 'error'); break;
             default: console.log("CLIENT: Unhandled message type:", message.type);
        }
    } catch (error) { console.error("CLIENT: Error in handleServerMessage switch:", error); if(connectionStatus) connectionStatus.textContent = "Msg Handling Error."; }
}


// --- Initialization ---
function init() { // Define init BEFORE DOMContentLoaded calls it
    try {
        console.log("CLIENT: init() started (Direct Connect V3 - Fixed Order).");
        // Assign DOM elements
        canvas = document.getElementById('game-canvas-2d'); ctx = canvas?.getContext('2d');
        nicknamePrompt = document.getElementById('nickname-prompt'); nicknameInput = document.getElementById('nickname-input');
        joinButton = document.getElementById('join-button'); connectionStatus = document.getElementById('connection-status');
        gameOverScreen = document.getElementById('game-over'); gameOverMessage = document.getElementById('game-over-message'); playAgainButton = document.getElementById('play-again-button');
        player1InfoBox = document.querySelector('.player1-info'); player2InfoBox = document.querySelector('.player2-info'); centerInfoBox = document.getElementById('center-info'); playerControlsBox = document.getElementById('player-controls');
        player1Name = document.getElementById('player1-name'); player1HpDisplay = document.getElementById('player1-hp'); player1HpBar = document.getElementById('player1-hp-bar'); player2Name = document.getElementById('player2-name'); player2HpDisplay = document.getElementById('player2-hp'); player2HpBar = document.getElementById('player2-hp-bar');
        timerDisplay = document.getElementById('timer'); gameMessage = document.getElementById('game-message'); lettersDisplay = document.getElementById('letters-display'); wordInput = document.getElementById('word-input'); submitWordButton = document.getElementById('submit-word-button'); wordFeedback = document.getElementById('word-feedback');

        // Check critical elements after assignment
        if (!canvas || !ctx || !connectionStatus || !nicknamePrompt || !joinButton || !submitWordButton ) { console.error("CLIENT: Critical UI elements missing during init!"); return; }

        calculateGroundLevel();
        setupUIListeners(); // Call listeners setup AFTER functions are defined
        resetUI('Initializing...'); // Reset UI state AFTER functions are defined
        console.log("CLIENT: init() complete. Attempting direct connection...");
        connectWebSocket(); // Attempt connection

    } catch (error) { console.error("CLIENT: CRITICAL ERROR during init():", error); if(connectionStatus) connectionStatus.textContent = "Init Error."; }
}


// --- Start the application ---
document.addEventListener('DOMContentLoaded', (event) => {
    console.log('CLIENT: DOMContentLoaded event fired.');
    init(); // Run init after DOM is ready
});