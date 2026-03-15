import { useEffect, useRef, useState } from "react";

const CHUNK_SIZE = 16384; // 16 KB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

type ReceivedFile = { name: string; url: string; size: number };

export default function Connected({ channel }: { channel: RTCDataChannel }) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
    const receivingRef = useRef<{ name: string; chunks: ArrayBuffer[] } | null>(null);

    useEffect(() => {
        channel.binaryType = 'arraybuffer';

        channel.onmessage = (event) => {
            if (typeof event.data === 'string') {
                const msg = JSON.parse(event.data);
                if (msg.type === 'file-start') {
                    receivingRef.current = { name: msg.name, chunks: [] };
                } else if (msg.type === 'file-end' && receivingRef.current) {
                    const { name, chunks } = receivingRef.current;
                    const blob = new Blob(chunks);
                    const url = URL.createObjectURL(blob);
                    setReceivedFiles(prev => [...prev, { name, url, size: blob.size }]);
                    receivingRef.current = null;
                }
            } else if (event.data instanceof ArrayBuffer && receivingRef.current) {
                receivingRef.current.chunks.push(event.data);
            }
        };

        return () => { channel.onmessage = null; };
    }, [channel]);

    const sendFile = async () => {
        if (!selectedFile || sending) return;
        setSending(true);
        setSendProgress(0);

        channel.send(JSON.stringify({
            type: 'file-start',
            name: selectedFile.name,
            size: selectedFile.size,
        }));

        let offset = 0;
        while (offset < selectedFile.size) {
            if (channel.bufferedAmount > CHUNK_SIZE * 8) {
                await new Promise<void>(resolve => {
                    channel.bufferedAmountLowThreshold = CHUNK_SIZE * 2;
                    channel.onbufferedamountlow = () => resolve();
                });
            }
            const slice = selectedFile.slice(offset, offset + CHUNK_SIZE);
            channel.send(await slice.arrayBuffer());
            offset += CHUNK_SIZE;
            setSendProgress(Math.min(100, Math.round((offset / selectedFile.size) * 100)));
        }

        channel.send(JSON.stringify({ type: 'file-end' }));
        setSending(false);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    return (
        <div className="page connected-page">
            <div className="connected-badge">Connected</div>

            <section className="file-section">
                <h2>Send a file</h2>
                <label className="file-picker">
                    <span className="file-picker-icon">📎</span>
                    <input
                        type="file"
                        onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                        disabled={sending}
                    />
                    {selectedFile
                        ? <span>{selectedFile.name} — {formatSize(selectedFile.size)}</span>
                        : <span>Choose a file...</span>
                    }
                    {selectedFile && selectedFile.size > MAX_FILE_SIZE && (
                        <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '0.8rem' }}>
                            Max file size is 5 MB
                        </span>
                    )}
                </label>

                {sending && (
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${sendProgress}%` }} />
                    </div>
                )}

                <button
                    className="primary-btn"
                    onClick={sendFile}
                    disabled={!selectedFile || sending || (selectedFile?.size ?? 0) > MAX_FILE_SIZE}
                >
                    {sending ? `Sending — ${sendProgress}%` : 'Send'}
                </button>
            </section>

            <section className="file-section">
                <h2>Received files</h2>
                {receivedFiles.length === 0
                    ? <p className="empty-msg">Nothing yet</p>
                    : receivedFiles.map((f, i) => (
                        <div key={i} className="received-file">
                            <span className="download-link">{f.name}</span>
                            <span className="file-size">{formatSize(f.size)}</span>
                            <a href={f.url} download={f.name} className="download-btn">
                                Save
                            </a>
                        </div>
                    ))
                }
            </section>
        </div>
    );
}
