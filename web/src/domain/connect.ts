export type PacketData = HandshakeData | SDPOffer | SDPAnswer | ICECandidate

export type HandshakeData = {
    type: "handshake-data"
    samples: { x: number; y: number; z: number }[]
}

export type SDPOffer = {
    type: "sdp-offer"
    sdp: RTCSessionDescriptionInit
}

export type SDPAnswer = {
    type: "sdp-answer"
    sdp: RTCSessionDescriptionInit
}

export type ICECandidate = {
    type: "ice-candidate"
    candidate: RTCIceCandidateInit
}
// eslint-disable-next-line
export type PacketHandler = (data: any) => void;
let socket: WebSocket | null = null;
const listeners = new Set<PacketHandler>();

export function connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
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
                const data = JSON.parse(event.data);
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
