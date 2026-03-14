import { WebSocketServer } from 'ws';
import { compare } from "./compare.js";

// Create web sockets registry
const sessions = new Map();

// Create attempted connections registry
const connections = new Map();

// Create signal backlog
const PURGE_TIME = 10_000;
const pending = new Map();

setInterval(purge, PURGE_TIME);

function purge() {
    const cutoff = Date.now() - PURGE_TIME;
    for (const [id, entry] of pending) {
        if (entry.timestamp < cutoff) pending.delete(id);
    }
}

function findMatch(incomingSignal) {
    for (const [id, entry] of pending) {
        if (compare(entry.signal, incomingSignal)) return id;
    }
    return null;
}

function send(socket, msg) {
    socket.send(JSON.stringify(msg));
}

// Create web socket server
const port = 1234;
const server = new WebSocketServer({ port });
console.log(`WebSocket server listening on port ${port}`);

// Handle events
server.on("connection", (socket) => {
    const id = crypto.randomUUID();
    console.log(`Client connected: ${id}`);

    // Add socket to registry
    connections.set(id, socket);

    socket.on("message", (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            send(socket, { error: 'Invalid JSON' });
            return;
        }

        let peerId, peerSocket;
        switch (msg.type) {
            case "handshake-data": {
                // Search for matches
                const signal = msg.signal;
                if (signal == null) { // TODO: or invalid
                    send(socket, { error: 'Invalid data provided.' });
                    return;
                }

                const matchId = findMatch(signal);
                if (matchId == null) {
                    // If none, add
                    pending.set(id, { signal, timestamp: Date.now() });
                    send(socket, { type: 'waiting', message: 'Waiting for a peer...' });
                } else {
                    // If matched, create pair and message back about ice-candidacy
                    pending.delete(matchId);
                    sessions.set(id, matchId);
                    sessions.set(matchId, id);

                    const matchSocket = connections.get(matchId);
                    // Tell the waiting peer they're the offerer
                    send(matchSocket, { type: 'match-success', role: 'offerer' });
                    // Tell the incoming peer they're the answerer
                    send(socket, { type: 'match-success', role: 'answerer' });
                }
                break;
            }

            case "sdp-offer": {
                // Verify message

                // Forward SDP offer
                peerId = sessions.get(id);
                peerSocket = connections.get(peerId);
                if (peerSocket) {
                    send(peerSocket, { type: 'sdp-offer', sdp: msg.sdp });
                }
                break;
            }

            case "sdp-answer": {
                // Verify message

                // Forward SDP answer
                peerId = sessions.get(id);
                peerSocket = connections.get(peerId);
                if (peerSocket) {
                    send(peerSocket, { type: 'sdp-answer', sdp: msg.sdp });
                }
                break;
            }

            case "ice-candidate": {
                // Verify message

                // Forward ICE candidate
                peerId = sessions.get(id);
                peerSocket = connections.get(peerId);
                if (peerSocket) {
                    send(peerSocket, { type: 'ice-candidate', candidate: msg.candidate });
                }
                break;
            }

            default:
                send(socket, { error: `Unknown message type: ${msg.type}` });
        }
    });

    socket.on("close", () => {
        // Remove all trace of this id (pending, connections, etc)
        const peerId = sessions.get(id);
        if (peerId) {
            const peerSocket = connections.get(peerId);
            if (peerSocket) send(peerSocket, { type: 'peer-disconnected' });
            sessions.delete(peerId);
        }

        sessions.delete(id);
        connections.delete(id);
        pending.delete(id);
    });
});