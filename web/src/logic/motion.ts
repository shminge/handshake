export type MotionSample = {
    x: number
    y: number
    z: number
}

export async function startMotion(onSample: (s: MotionSample) => void) {
    // eslint-disable-next-line
    const DME = DeviceMotionEvent as any

    if (typeof DME.requestPermission === "function") {
        const permission = await DME.requestPermission()
        if (permission !== "granted") {
            throw new Error("Permission denied")
        }
    }

    const handler = (event: DeviceMotionEvent) => {
        const acc = event.acceleration

        // absolute value because ios and android seem to be interchangable up to a factor of -1
        const x = Math.abs(acc?.x ?? 0)
        const y = Math.abs(acc?.y ?? 0)
        const z = Math.abs(acc?.z ?? 0)

        onSample({ x, y, z })
    }

    window.addEventListener("devicemotion", handler)

    return () => {
        window.removeEventListener("devicemotion", handler)
    }
}