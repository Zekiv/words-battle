// script_2d.js (Simplified - V2 with More Debugging)

// --- Get DOM Elements (Check immediately if they exist) ---
const nicknamePrompt = document.getElementById('nickname-prompt');
const connectionStatus = document.getElementById('connection-status');
console.log("CLIENT: Initial DOM Element Check:");
console.log("CLIENT: nicknamePrompt found?", !!nicknamePrompt); // Log true/false if found
console.log("CLIENT: connectionStatus found?", !!connectionStatus); // Log true/false if found

let ws = null;

function connectWebSocket() {
    // Determine WebSocket URL
    const currentProto = window.location.protocol;
    const wsProto = currentProto === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;
    const websocketUrl = `${wsProto}//${wsHost}`;

    console.log(`CLIENT: Attempting WebSocket connection to: ${websocketUrl}`);
    if (connectionStatus) { // Check if element exists before using it
        connectionStatus.textContent = `Connecting to ${websocketUrl}...`;
    } else {
        console.error("CLIENT: connectionStatus element is null, cannot update text.");
    }


    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log("CLIENT: WebSocket already open or connecting.");
        return;
    }
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
        console.log('CLIENT: ===== WebSocket Connection Opened =====');
        if (connectionStatus) { // Check element
            connectionStatus.textContent = 'WebSocket Connected! Waiting for server hello...';
        } else {
            console.error("CLIENT: ws.onopen - connectionStatus is null.");
        }
        // Hide nickname prompt once connected
        if (nicknamePrompt) { // Check element
             console.log("CLIENT: ws.onopen - Hiding nickname prompt.");
             nicknamePrompt.style.display = 'none';
        } else {
             console.error("CLIENT: ws.onopen - nicknamePrompt is null, cannot hide.");
        }
    };

    ws.onmessage = (event) => {
        console.log('CLIENT: ws.onmessage - Message event received.'); // Log if handler fires
        try {
            const message = JSON.parse(event.data);
            console.log('CLIENT: Message content:', message);

            if (message.type === 'serverHello') {
                 console.log("CLIENT: ws.onmessage - Received 'serverHello'.");
                 if (connectionStatus) { // Check element
                    connectionStatus.textContent = `Connected! Server says hello (ID: ${message.id})`;
                    console.log("CLIENT: ws.onmessage - Updated connectionStatus text.");
                 } else {
                    console.error("CLIENT: ws.onmessage - connectionStatus is null.");
                 }
            } else {
                 console.log("CLIENT: ws.onmessage - Received unexpected message type:", message.type);
            }

        } catch (error) {
             console.error('CLIENT: Failed to parse server message:', event.data, error);
             if (connectionStatus) connectionStatus.textContent = 'Error processing server message.';
        }
    };

    ws.onerror = (error) => {
         // Log the error event itself for more details if possible
         console.error('CLIENT: WebSocket Error Event:', error);
         if (connectionStatus) connectionStatus.textContent = 'WebSocket Connection Error.';
    };

    ws.onclose = (event) => {
        console.log(`CLIENT: WebSocket Connection Closed. Code: ${event.code}, Reason: ${event.reason}, WasClean: ${event.wasClean}`);
        if (connectionStatus) { // Check element
            // Update status more clearly based on whether connection was ever opened
            if (connectionStatus.textContent.includes('Connected!')) {
                 connectionStatus.textContent = `Disconnected (Code: ${event.code}). Refresh?`;
            } else {
                connectionStatus.textContent = `Connection Failed/Closed (Code: ${event.code}). Refresh?`;
            }
        } else {
             console.error("CLIENT: ws.onclose - connectionStatus is null.");
        }
        ws = null; // Clear reference
    };
}

// --- Initial Setup ---
function init() {
    console.log("CLIENT: Initializing (Debug Version)...");
    // Reset UI (minimal for this test)
     if (nicknamePrompt) {
        nicknamePrompt.style.display = 'block'; // Ensure prompt is visible initially
     } else {
        console.error("CLIENT: init - nicknamePrompt is null.");
     }
     if (connectionStatus) {
        connectionStatus.textContent = 'Initializing...';
     } else {
         console.error("CLIENT: init - connectionStatus is null.");
     }

    // Attempt WebSocket connection immediately
    connectWebSocket();
    console.log("CLIENT: init() finished."); // Confirm init runs completely
}

// Run init when the script loads (consider waiting for DOMContentLoaded?)
// Option 1: Run immediately (current setup)
// init();

// Option 2: Wait for DOM - Safer for accessing elements
document.addEventListener('DOMContentLoaded', (event) => {
    console.log('CLIENT: DOMContentLoaded event fired.');
    // Re-get references inside here in case they weren't ready before? (Though getElementById usually works early)
    // If the initial checks logged false, this is more likely the issue.
    init();
});