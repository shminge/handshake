import { addListener, sendPacket } from './connect';

// STUN for direct connections + TURN for mobile CGNAT relay.
// openrelay.metered.ca is a free public TURN service for development.
// For production, replace with your own coturn/TURN credentials.
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

const CONNECTION_TIMEOUT_MS = 30_000;

/**
 * Set up a WebRTC peer connection using trickle ICE.
 * ICE candidates are exchanged individually as they are discovered,
 * which is essential for mobile CGNAT (carrier-grade NAT) traversal.
 *
 * Returns a promise that resolves with the open RTCDataChannel,
 * or rejects on ICE failure / timeout.
 */
export function setupWebRTC(role: 'offerer' | 'answerer'): Promise<RTCDataChannel> {
    return new Promise((resolve, reject) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // ICE candidates that arrived before setRemoteDescription was called.
        const pendingCandidates: RTCIceCandidateInit[] = [];
        let remoteDescSet = false;

        const fail = (reason: unknown) => {
            cleanup();
            clearTimeout(timeoutId);
            pc.close();
            reject(reason instanceof Error ? reason : new Error(String(reason)));
        };

        const timeoutId = setTimeout(
            () => fail(new Error(`WebRTC connection timed out (${CONNECTION_TIMEOUT_MS / 1000}s)`)),
            CONNECTION_TIMEOUT_MS
        );

        // Trickle ICE: send each candidate to the peer as it is discovered.
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendPacket({ type: 'ice-candidate', candidate: event.candidate.toJSON() });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed') {
                fail(new Error('ICE connection failed — no route to peer'));
            }
        };

        const applyPendingCandidates = async () => {
            for (const c of pendingCandidates.splice(0)) {
                await pc.addIceCandidate(new RTCIceCandidate(c));
            }
        };

        const cleanup = addListener(async (msg: any) => {
            try {
                if (msg.type === 'sdp-offer' && role === 'answerer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    remoteDescSet = true;
                    await applyPendingCandidates();
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    // Send answer immediately — don't wait for ICE gathering (trickle ICE).
                    sendPacket({ type: 'sdp-answer', sdp: pc.localDescription as RTCSessionDescriptionInit });

                } else if (msg.type === 'sdp-answer' && role === 'offerer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    remoteDescSet = true;
                    await applyPendingCandidates();

                } else if (msg.type === 'ice-candidate' && msg.candidate) {
                    if (remoteDescSet) {
                        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                    } else {
                        // Buffer until remote description is set.
                        pendingCandidates.push(msg.candidate);
                    }
                }
            } catch (err) {
                fail(err);
            }
        });

        const onChannelOpen = (channel: RTCDataChannel) => {
            cleanup();
            clearTimeout(timeoutId);
            resolve(channel);
        };

        if (role === 'offerer') {
            const channel = pc.createDataChannel('files', { ordered: true });
            channel.onopen = () => onChannelOpen(channel);
            channel.onerror = fail;

            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    // Send SDP immediately — candidates will trickle in separately.
                    sendPacket({ type: 'sdp-offer', sdp: pc.localDescription as RTCSessionDescriptionInit });
                })
                .catch(fail);
        } else {
            pc.ondatachannel = (event) => {
                const channel = event.channel;
                channel.onopen = () => onChannelOpen(channel);
                channel.onerror = fail;
            };
        }
    });
}
