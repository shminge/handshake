import { addListener, sendPacket } from './connect';

// STUN for direct connections + TURN for mobile CGNAT relay.
// openrelay.metered.ca is a free public TURN service for development.
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
 * Returns a promise that resolves with the open RTCDataChannel,
 * or rejects on ICE failure / timeout.
 */
export function setupWebRTC(role: 'offerer' | 'answerer'): Promise<RTCDataChannel> {
    return new Promise((resolve, reject) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Each signaling step must happen at most once.
        let offerHandled = false;
        let answerHandled = false;
        let remoteDescSet = false;
        let settled = false;

        // ICE candidates buffered before remote description is applied.
        const pendingCandidates: RTCIceCandidateInit[] = [];

        const settle = (fn: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            clearTimeout(timeoutId);
            fn();
        };

        const fail = (reason: unknown) => {
            settle(() => {
                pc.close();
                reject(reason instanceof Error ? reason : new Error(String(reason)));
            });
        };

        const timeoutId = setTimeout(
            () => fail(new Error(`WebRTC timed out after ${CONNECTION_TIMEOUT_MS / 1000}s`)),
            CONNECTION_TIMEOUT_MS
        );

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendPacket({ type: 'ice-candidate', candidate: event.candidate.toJSON() });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE:', pc.iceConnectionState, '| signaling:', pc.signalingState);
            if (pc.iceConnectionState === 'failed') {
                fail(new Error('ICE connection failed — no route to peer'));
            }
        };

        const applyPendingCandidates = async () => {
            for (const c of pendingCandidates.splice(0)) {
                await pc.addIceCandidate(new RTCIceCandidate(c));
            }
        };

        // eslint-disable-next-line
        const cleanup = addListener(async (msg: any) => {
            try {
                if (msg.type === 'sdp-offer' && role === 'answerer') {
                    if (offerHandled) {
                        console.warn('[WebRTC] Ignoring duplicate sdp-offer');
                        return;
                    }
                    if (pc.signalingState !== 'stable') {
                        console.warn('[WebRTC] sdp-offer arrived in unexpected state:', pc.signalingState);
                        return;
                    }
                    offerHandled = true;
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    remoteDescSet = true;
                    await applyPendingCandidates();
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendPacket({ type: 'sdp-answer', sdp: pc.localDescription as RTCSessionDescriptionInit });

                } else if (msg.type === 'sdp-answer' && role === 'offerer') {
                    if (answerHandled) {
                        console.warn('[WebRTC] Ignoring duplicate sdp-answer');
                        return;
                    }
                    if (pc.signalingState !== 'have-local-offer') {
                        console.warn('[WebRTC] sdp-answer arrived in unexpected state:', pc.signalingState);
                        return;
                    }
                    answerHandled = true;
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    remoteDescSet = true;
                    await applyPendingCandidates();

                } else if (msg.type === 'ice-candidate' && msg.candidate) {
                    if (remoteDescSet) {
                        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                    } else {
                        pendingCandidates.push(msg.candidate);
                    }
                }
            } catch (err) {
                console.error('[WebRTC] Signaling error:', err);
                fail(err);
            }
        });

        if (role === 'offerer') {
            const channel = pc.createDataChannel('files', { ordered: true });
            channel.onopen = () => settle(() => resolve(channel));
            channel.onerror = fail;

            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    sendPacket({ type: 'sdp-offer', sdp: pc.localDescription as RTCSessionDescriptionInit });
                })
                .catch(fail);
        } else {
            pc.ondatachannel = (event) => {
                const channel = event.channel;
                channel.onopen = () => settle(() => resolve(channel));
                channel.onerror = fail;
            };
        }
    });
}
