/*

// 1. Send your SDP offer as the signal
sendPacket({ signal: mySDPOffer });

// 2. Handle the server's response
usePacketListener(useCallback(async (msg) => {
    if (msg.type === 'waiting') {
        // sit tight
    }

    if (msg.type === 'matched' && msg.role === 'answerer') {
        // set peer A's offer as remote description, then send back an answer
        await peerConnection.setRemoteDescription(msg.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendPacket({ type: 'sdp-answer', sdp: answer });
    }

    if (msg.type === 'matched' && msg.role === 'offerer') {
        // wait for the answerer's sdp-answer to come back
    }

    if (msg.type === 'sdp-answer') {
        await peerConnection.setRemoteDescription(msg.sdp);
    }

    if (msg.type === 'ice-candidate') {
        await peerConnection.addIceCandidate(msg.candidate);
    }
}, []));

// 3. Relay your ICE candidates as they're generated
peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) sendPacket({ type: 'ice-candidate', candidate });
};

*/