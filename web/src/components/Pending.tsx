import { useState } from "react";
import { startMotion } from "../logic/motion";
import { makeSnippetDetector, snippetToPacketData } from "../logic/spike";
import { sendPacket, connect, type PacketData } from "../domain/connect";

const WS_URL = "https://handshake-iv6dtq.fly.dev";
//"ws://127.0.0.1:1234";

export default function Pending() {
    const [enabled, setEnabled] = useState(false);
    const [connecting, setConnecting] = useState(false);

    const handleStart = async () => {
        setConnecting(true);
        try {
            // Request motion permission FIRST — must be synchronous from user gesture
            const DME = DeviceMotionEvent as any;
            if (typeof DME.requestPermission === "function") {
                const permission = await DME.requestPermission();
                if (permission !== "granted") {
                    alert("Motion permission denied");
                    setConnecting(false);
                    return;
                }
            }

            // Now do async work after permission is granted
            await connect(WS_URL);

            const snippetDetector = makeSnippetDetector(12);
            await startMotion(({ x, y, z }) => {
                const snippet = snippetDetector(x, y, z);
                if (snippet) {
                    const packet: PacketData = snippetToPacketData(snippet);
                    sendPacket(packet);
                }
            });
            setEnabled(true);
        } catch (err) {
            const msg = [
                "type: " + typeof err,
                "constructor: " + (err as any)?.constructor?.name,
                "message: " + (err as any)?.message,
                "raw: " + String(err),
            ].join("\n");
            alert(msg);
        } finally {
            setConnecting(false);
        }
    };

    return (
        <div>
            <button onClick={handleStart} disabled={enabled || connecting}>
                {enabled
                    ? "Motion Enabled"
                    : connecting
                        ? "Connecting..."
                        : "Start the Motion"}
            </button>
        </div>
    );
}