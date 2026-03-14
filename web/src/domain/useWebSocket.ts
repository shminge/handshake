import { useEffect } from "react";
import { connect, disconnect } from "./connect";

export function useWebSocket(url: string) {
    useEffect(() => {
        connect(url);
        return () => disconnect(); // optional: close on unmount
    }, [url]);
}