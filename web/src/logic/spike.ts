export type Spike = {
    time: number
    magnitude: number
    x: number
    y: number
    z: number
}

type Sample = {
    x: number
    y: number
    z: number
    time: number
}

export function makeApexDetector(threshold: number) {
    const buffer: Sample[] = []

    return function detectApex(x: number, y: number, z: number): Spike | null {
        const now = Date.now()
        const sample: Sample = { x, y, z, time: now }
        buffer.push(sample)

        // Only process once we have 3 samples
        if (buffer.length < 3) return null

        const [a, b, c] = buffer

        // Magnitudes
        const magA = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z)
        const magB = Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z)
        const magC = Math.sqrt(c.x*c.x + c.y*c.y + c.z*c.z)

        let spike: Spike | null = null

        if (magB > threshold && magB > magA && magB > magC) {
            spike = {
                time: b.time,
                magnitude: magB,
                x: b.x,
                y: b.y,
                z: b.z
            }
        }

        // Remove the oldest sample so we can slide
        buffer.shift()

        return spike
    }
}