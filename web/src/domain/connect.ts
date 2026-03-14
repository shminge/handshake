export type PacketData = ICECandidacy | STPAnswer | HandshakeData

export type ICECandidacy = {
    address: string;
    type: "ice-candidate"
}

export type STPAnswer = {
    address: string;
    type: "stp-answer"
}

export type HandshakeData = {
    mag: number[];
    type: "handshake-data"
}


export type PacketHandler = (data: PacketData) => void;
let socket: WebSocket | null = null;
const listeners = new Set<(data: PacketData) => void>();

/**
 * Connect to the WebSocket.
 * Resolves once the socket is open.
 */
export function connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // If already connected, resolve immediately
        if (socket?.readyState === WebSocket.OPEN) {
            resolve();
            return;
        }

        socket = new WebSocket(url);

        socket.onopen = () => {
            console.log("WebSocket connected");
            resolve();
        };

        socket.onclose = () => console.log("WebSocket disconnected");

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
            reject(err);
        };

        socket.onmessage = (event) => {
            try {
                const data: PacketData = JSON.parse(event.data);
                listeners.forEach((fn) => fn(data));
            } catch (err) {
                console.error("Failed to parse packet:", err);
            }
        };
    });
}

export function disconnect(): void {
    socket?.close();
    socket = null;
}

export function sendPacket(data: PacketData): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket is not connected");
        return;
    }
    socket.send(JSON.stringify(data));
}

export function addListener(fn: PacketHandler): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function handlePacket(data: PacketData) {
    listeners.forEach(fn => fn(data));
}
