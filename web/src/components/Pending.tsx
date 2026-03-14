import { useState } from "react"
import { startMotion } from "../logic/motion.ts"
import { makeApexDetector, type Spike } from "../logic/spike.ts"

export default function Pending() {

    const [enabled, setEnabled] = useState(false)
    const [spikes, setSpikes] = useState<Spike[]>([])

    const apexDetector = makeApexDetector(8)

    const handleStart = async () => {

        try {

            await startMotion(({ x, y, z }) => {
                const spike = apexDetector(x, y, z)
                if (spike) setSpikes(prev => [...prev, spike])
            })

            setEnabled(true)

        } catch (err) {
            alert(err)
        }
    }

    return (
        <div>

            <button onClick={handleStart} disabled={enabled}>
                {enabled ? "Motion Enabled" : "Start Motion"}
            </button>

            <ul>
                {spikes.map((s, i) => (
                    <li key={i}>
                        {s.magnitude.toFixed(2)} @ {s.time}
                    </li>
                ))}
            </ul>

        </div>
    )
}