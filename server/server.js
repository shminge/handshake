import http from "http";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import { compare } from "./compare.js";

// registries
const sessions = new Map();
const connections = new Map();

const PURGE_TIME = 3_000;
const pending = new Map();

setInterval(purge, PURGE_TIME);

function purge() {
    const cutoff = Date.now() - PURGE_TIME;
    for (const [id, entry] of pending) {
        if (entry.timestamp < cutoff) pending.delete(id);
    }
}

function findMatch(pid, incomingSignal) {
    for (const [id, entry] of pending) {
        if (id != pid && compare(entry.signal, incomingSignal)) return id;
    }
    return null;
}

function send(socket, msg) {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(msg));
    }
}

// server setup
const port = process.env.PORT || 3000;

const httpServer = http.createServer();

const wss = new WebSocketServer({
    server: httpServer
});

httpServer.listen(port, "0.0.0.0", () => {
    console.log(`WebSocket server listening on 0.0.0.0:${port}`);
});

// connection handling
wss.on("connection", (socket) => {
    const id = crypto.randomUUID();
    console.log(`Client connected: ${id}`);

    connections.set(id, socket);

    socket.on("message", (raw) => {
        let msg;

        try {
            msg = JSON.parse(raw);
        } catch {
            send(socket, { error: "Invalid JSON" });
            return;
        }

        let peerId, peerSocket;

        switch (msg.type) {
            case "handshake-data": {
                const signal = msg.mag;

                if (signal == null) {
                    send(socket, { error: "Invalid data provided." });
                    return;
                }

                const matchId = findMatch(id, signal);

                if (matchId == null) {
                    pending.set(id, {
                        signal,
                        timestamp: Date.now()
                    });

                    send(socket, {
                        type: "waiting",
                        message: "Waiting for a peer..."
                    });

                } else {
                    pending.delete(matchId);

                    sessions.set(id, matchId);
                    sessions.set(matchId, id);

                    const matchSocket = connections.get(matchId);

                    send(matchSocket, {
                        type: "match-success",
                        role: "offerer"
                    });

                    send(socket, {
                        type: "match-success",
                        role: "answerer"
                    });
                }

                break;
            }

            case "sdp-offer": {
                peerId = sessions.get(id);
                peerSocket = connections.get(peerId);

                if (peerSocket) {
                    send(peerSocket, {
                        type: "sdp-offer",
                        sdp: msg.sdp
                    });
                }

                break;
            }

            case "sdp-answer": {
                peerId = sessions.get(id);
                peerSocket = connections.get(peerId);

                if (peerSocket) {
                    send(peerSocket, {
                        type: "sdp-answer",
                        sdp: msg.sdp
                    });
                }

                break;
            }

            case "ice-candidate": {
                peerId = sessions.get(id);
                peerSocket = connections.get(peerId);

                if (peerSocket) {
                    send(peerSocket, {
                        type: "ice-candidate",
                        candidate: msg.candidate
                    });
                }

                break;
            }

            default:
                send(socket, {
                    error: `Unknown message type: ${msg.type}`
                });
        }
    });

    socket.on("close", () => {
        const peerId = sessions.get(id);

        if (peerId) {
            const peerSocket = connections.get(peerId);

            if (peerSocket) {
                send(peerSocket, {
                    type: "peer-disconnected"
                });
            }

            sessions.delete(peerId);
        }

        sessions.delete(id);
        connections.delete(id);
        pending.delete(id);
    });
});