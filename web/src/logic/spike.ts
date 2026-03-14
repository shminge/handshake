import type {HandshakeData} from "../domain/connect.ts";

export type Sample = {
    time: number
    magnitude: number
}

export type Snippet = Sample[]

export function snippetToPacketData(s: Snippet): HandshakeData {
    const mags = s.map(sample => sample.magnitude);
    return {
        type: "handshake-data",
        mag: mags,
    }
}


export function makeSnippetDetector(threshold: number, snippetDuration = 1000, sampleRate = 60) {
    let recording = false
    let snippet: Snippet = []
    let startTime = 0

    return function processSample(x: number, y: number, z: number): Snippet | null {
        const now = Date.now()
        const mag = Math.sqrt(x*x + y*y + z*z)

        if (!recording && mag > threshold) {
            // start recording
            recording = true
            snippet = []
            startTime = now
        }

        if (recording) {
            snippet.push({ time: now, magnitude: mag })

            if (now - startTime >= snippetDuration) {
                // finish recording
                recording = false
                const captured = snippet
                snippet = []
                return captured
            }
        }

        return null
    }
}