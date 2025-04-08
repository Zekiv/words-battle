// script_2d.js (Simplified for Connection Debugging)

const nicknamePrompt = document.getElementById('nickname-prompt');
const connectionStatus = document.getElementById('connection-status');

let ws = null;

function connectWebSocket() {
    // --- Determine WebSocket URL ---
    // We need to guess the URL since the server isn't sending config in this test
    // Use window.location to figure out the domain and protocol
    const currentProto = window.location.protocol; // "http:" or "https:"
    const wsProto = currentProto === "https:" ? "wss:" : "ws:"; // Use wss for https
    const wsHost = window.location.host; // e.g., "words-battle.onrender.com" or "localhost:5500"
    // *** IMPORTANT *** If your Node server runs on a different port than your HTTP server locally, adjust this logic.
    // On Render, the WebSocket should connect to the SAME host/port as the HTTP request.
    const websocketUrl = `${wsProto}//${wsHost}`;

    console.log(`CLIENT: Attempting WebSocket connection to: ${websocketUrl}`);
    connectionStatus.textContent = `Connecting to ${websocketUrl}...`;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log("CLIENT: WebSocket already open or connecting.");
        return;
    }
    if (ws) {
        ws.close(); // Close any previous attempt
    }

    ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
        console.log('CLIENT: ===== WebSocket Connection Opened =====');
        connectionStatus.textContent = 'WebSocket Connected! Waiting for server hello...';
        // Hide nickname prompt once connected for this test
        if (nicknamePrompt) nicknamePrompt.style.display = 'none';
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('CLIENT: Message received:', message);

            if (message.type === 'serverHello') {
                connectionStatus.textContent = `Connected! Server says hello (ID: ${message.id})`;
                // Now we know the connection works!
            }

        } catch (error) {
             console.error('CLIENT: Failed to parse server message:', event.data, error);
        }
    };

    ws.onerror = (error) => {
         console.error('CLIENT: WebSocket Error:', error);
         connectionStatus.textContent = 'WebSocket Connection Error.';
    };

    ws.onclose = (event) => {
        console.log(`CLIENT: WebSocket Connection Closed. Code: ${event.code}, Reason: ${event.reason}`);
        // Only show "Not connected" if it wasn't opened successfully before closing
        if (connectionStatus.textContent.indexOf('Connected!') === -1) {
            connectionStatus.textContent = `Connection Failed/Closed (Code: ${event.code}). Refresh?`;
        } else {
             connectionStatus.textContent = `Disconnected (Code: ${event.code}). Refresh?`;
        }
        ws = null; // Clear reference
    };
}

// --- Initial Setup ---
function init() {
    console.log("CLIENT: Simplified - Initializing.");
    // Reset UI (minimal for this test)
     if (nicknamePrompt) nicknamePrompt.style.display = 'block'; // Show prompt
     connectionStatus.textContent = 'Initializing...';

    // Attempt WebSocket connection immediately
    connectWebSocket();
}

// Run init when the script loads
init();