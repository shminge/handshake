
export type PacketData = {};
let socket: WebSocket | null = null;
export type PacketHandler = (data: PacketData) => void;
const listeners = new Set<PacketHandler>();


export function connect(url: string): void {
    if (socket?.readyState === WebSocket.OPEN) return;

    socket = new WebSocket(url);

    socket.onopen = () => console.log("WebSocket connected");
    socket.onclose = () => console.log("WebSocket disconnected");
    socket.onerror = (err) => console.error("WebSocket error:", err);
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handlePacket(data);
    };
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

function handlePacket(data: PacketData) {
    listeners.forEach(fn => fn(data));
}