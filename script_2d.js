// script_2d.js (Full Game Logic + Connects to Specific Path /websocket)

// --- Configuration ---
// ... Keep All Constants ...
const WEBSOCKET_PATH = "/websocket"; // Define the path

// --- Global Variables ---
// ... Keep All Globals (ws, playerId, gameActive, etc.) ...
let websocketBaseUrl = null; // Store the base URL from server

// --- DOM Elements ---
// ... Keep All DOM Element Variables (declare with let) ...

// --- Initialization ---
function init() {
    try {
        console.log("CLIENT: init() started.");
        // Assign DOM elements
        canvas = document.getElementById('game-canvas-2d'); ctx = canvas?.getContext('2d');
        // ... Assign ALL others ...
        connectionStatus = document.getElementById('connection-status');

        if (!canvas || !ctx || !connectionStatus /* ... check others if critical ... */) {
             console.error("CLIENT: Critical element(s) missing!"); return;
        }

        calculateGroundLevel();
        setupUIListeners();
        resetUI();
        console.log("CLIENT: init() complete. Waiting for server config...");
    } catch (error) { console.error("CLIENT: CRITICAL ERROR during init():", error); /* ... */ }
}
function calculateGroundLevel() { /* ... */ }
function resetUI(statusMsg = 'Connecting...') { /* ... */ }

// --- WebSocket Setup & Connection ---
function connectWebSocket(baseUrl) { // Takes BASE URL now
    try {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) { return; }
        if (!baseUrl) { console.error("CLIENT: Cannot connect WebSocket, Base URL missing."); if(connectionStatus) connectionStatus.textContent = 'Config Error.'; return; }

        // *** Construct the FULL URL with the path ***
        const fullWebSocketUrl = baseUrl + WEBSOCKET_PATH;
        console.log(`CLIENT: Attempting WebSocket connection to: ${fullWebSocketUrl}`);
        // Store base for potential reconnect logic, but use full for connection
        websocketBaseUrl = baseUrl;
        if(connectionStatus) connectionStatus.textContent = `Connecting...`;

        if (ws) { ws.close(); ws = null;}
        ws = new WebSocket(fullWebSocketUrl); // Connect to the specific path

        ws.onopen = () => { console.log('CLIENT: WebSocket connection established.'); if(connectionStatus) connectionStatus.textContent = 'Connected! Enter nickname.'; if(nicknamePrompt) nicknamePrompt.style.display = 'block'; };
        ws.onmessage = (event) => { try { const message = JSON.parse(event.data); handleServerMessage(message); } catch (error) { console.error('CLIENT: Failed to parse/handle message:', event.data, error); if(connectionStatus) connectionStatus.textContent = 'Msg Error.'; } };
        ws.onerror = (error) => { console.error('CLIENT: WebSocket Error Event:', error); if(connectionStatus) connectionStatus.textContent = 'Connection Error.'; if (gameActive) { showGameOver("Connection Error"); } };
        ws.onclose = (event) => { console.log(`CLIENT: WebSocket Closed. Code: ${event.code}`); const wasConnected = connectionStatus?.textContent.includes('Connected!'); gameActive = false; stopGameLoop(); clearInterval(currentTimerInterval); resetUI('Disconnected. Refresh?'); if (connectionStatus) { /* Update status based on event.code/wasConnected */ } ws = null; playerId = null; gameId = null; playerNumber = null; };
    } catch (error) { console.error("CLIENT: CRITICAL ERROR during connectWebSocket():", error); if(connectionStatus) connectionStatus.textContent = "WS Setup Error."; }
}

// --- UI Listeners ---
function setupUIListeners() { /* ... Keep Full Logic ... */ }

// --- Canvas Drawing Functions ---
function drawCastle(x, y, width, height, playerColor) { /* ... Keep Full Logic ... */ }
function drawSoldier(soldier) { /* ... Keep Full Logic ... */ }
function drawBackground() { /* ... Keep Full Logic ... */ }
function clearCanvas() { /* ... Keep Full Logic ... */ }

// --- Game Logic & State Updates ---
function submitWord() { /* ... Keep Full Logic ... */ }
function updateLettersUI(letters) { /* ... Keep Full Logic ... */ }
function updateHpUI(targetPlayerId, hp, maxHp = 100) { /* ... Keep Full Logic ... */ }
function displayGameMessage(message, type = 'info') { /* ... Keep Full Logic ... */ }
function displayWordFeedback(message, type = 'info') { /* ... Keep Full Logic ... */ }
function startRoundTimer(durationMs) { /* ... Keep Full Logic ... */ }
function spawnSoldiers(ownerId, count) { /* ... Keep Full Logic ... */ }

// --- Animation Loop & Game Updates ---
function gameLoop() { /* ... Keep Full Logic ... */ }
function startGameLoop() { /* ... Keep Full Logic ... */ }
function stopGameLoop() { /* ... Keep Full Logic ... */ }
function moveSoldiers() { /* ... Keep Full Logic ... */ }
function checkCombat() { /* ... Keep Full Logic ... */ }
function checkCastleHits() { /* ... Keep Full Logic ... */ }
function removeSoldiersByIds(ids) { /* ... Keep Full Logic ... */ }
function showGameOver(message) { /* ... Keep Full Logic ... */ }

// --- Server Message Handler ---
function handleServerMessage(message) {
    try {
        switch (message.type) {
            case 'serverConfig':
                playerId = message.playerId;
                // ** Store the BASE URL **
                websocketBaseUrl = message.websocketBaseUrl;
                console.log(`CLIENT: Received config. ID: ${playerId}. Base WS URL: ${websocketBaseUrl}`);
                // ** Connect using the BASE URL ** (connectWebSocket will add the path)
                connectWebSocket(websocketBaseUrl);
                break;
            // ... Keep ALL other cases ('waiting', 'gameStart', etc.) exactly as they were ...
            case 'waiting': /* ... */ break;
            case 'gameStart': /* ... */ break;
            // ... etc ...
            default: console.log("CLIENT: Unhandled message type:", message.type);
        }
    } catch (error) { console.error("CLIENT: Error in handleServerMessage switch:", error); if(connectionStatus) connectionStatus.textContent = "Msg Handling Error."; }
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', (event) => {
    console.log('CLIENT: DOMContentLoaded event fired.');
    init();
});