import { useEffect } from "react";
import { addListener, type PacketHandler } from "./connect";

export function usePacketListener(handler: PacketHandler) {
    useEffect(() => {
        return addListener(handler);
    }, []);
}