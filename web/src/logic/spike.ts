export type Spike = {
    time: string        // formatted HH:MM:SS.ms
    magnitude: number
    x: number
    y: number
    z: number
}

type Sample = {
    x: number
    y: number
    z: number
    timestamp: number
}

export function makeApexDetector(threshold: number) {
    const buffer: Sample[] = []

    const formatTime = (ts: number) => {
        const d = new Date(ts)
        const ms = String(d.getMilliseconds()).padStart(3, "0")
        const s = String(d.getSeconds()).padStart(2, "0")
        const m = String(d.getMinutes()).padStart(2, "0")
        const h = String(d.getHours()).padStart(2, "0")
        return `${h}:${m}:${s}.${ms}`
    }

    return function detectApex(x: number, y: number, z: number): Spike | null {
        const now = Date.now()
        buffer.push({ x, y, z, timestamp: now })

        // Only start checking when we have 5 samples
        if (buffer.length < 5) return null

        // Middle sample is the candidate apex
        const candidate = buffer[2]
        const mags = buffer.map(s => Math.sqrt(s.x*s.x + s.y*s.y + s.z*s.z))
        const mag = mags[2]

        let spike: Spike | null = null

        // Candidate is above threshold and greater than neighbors
        if (mag > threshold &&
            mag > mags[0] &&
            mag > mags[1] &&
            mag > mags[3] &&
            mag > mags[4]
        ) {
            spike = {
                time: formatTime(candidate.timestamp),
                magnitude: mag,
                x: candidate.x,
                y: candidate.y,
                z: candidate.z
            }
        }

        // Slide the window
        buffer.shift()

        return spike
    }
}