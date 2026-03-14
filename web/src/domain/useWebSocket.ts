import { useEffect } from "react";
import { connect, disconnect } from "./connect";

export function useWebSocket(url: string) {
    useEffect(() => {
        connect(url);
        return () => disconnect(); // callback to close on unmount
    }, [url]);
}