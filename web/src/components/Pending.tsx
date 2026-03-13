import { useState } from "react";

export default function Pending() {
    const [output, setOutput] = useState("Motion not started");
    const [enabled, setEnabled] = useState(false);

    const startMotion = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const DME = DeviceMotionEvent as any;

        if (typeof DME.requestPermission === "function") {
            try {
                const permission = await DME.requestPermission();
                if (permission !== "granted") {
                    alert("Permission denied");
                    return;
                }
            } catch (err) {
                alert("Error requesting permission: " + err);
                return;
            }
        }

        window.addEventListener("devicemotion", (event) => {
            const acc = event.acceleration;

            const x = acc?.x ?? 0;
            const y = acc?.y ?? 0;
            const z = acc?.z ?? 0;

            setOutput(
                `Linear Acceleration (gravity removed)
x: ${x.toFixed(2)}
y: ${y.toFixed(2)}
z: ${z.toFixed(2)}`
            );
        });

        setEnabled(true);
    };

    return (
        <div>
            <button onClick={startMotion} disabled={enabled}>
                {enabled ? "Motion Enabled" : "Start Motion"}
            </button>

            <pre>{output}</pre>
        </div>
    );
}