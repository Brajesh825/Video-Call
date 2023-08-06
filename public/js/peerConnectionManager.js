// It Connect With Peer Server
// It Maintains the Number of connections
// It Maintains the Number of Remote Views
// It Maintains Incoming and Outgoing Call
import { ScreenManager } from "./screenManager.js";


class PeerConnectionManager {
    constructor(userId) {
        this.peer = new Peer(userId, {
            host: "videocall-emn3.onrender.com",
            path: "/peerjs",
            secure: true
        });
        this.connections = {};
        this.remoteUserVideoIds = new Set();

        this.peer.on('open', (id) => {
            console.log('Connected with ID:', id);
        });

        this.peer.on('call', (call) => {
            this.handleIncomingCall(call);
        });

        this.screenManager = new ScreenManager('remoteVideos')
    }
    setLocalVideoContainer(videoEl) {
        this.localVideo = videoEl
    }
    setRemoteVideoContainer(divEl) {
        this.remoteVideoContainer = divEl
    }
    async startOutgoingCall(userName) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.displayLocalVideo(stream)

            const remoteUserIds = prompt('Enter the IDs of the people you want to call (comma-separated):');
            if (!remoteUserIds) return;
            const remoteUserIdArray = remoteUserIds.split(',');

            for (const remoteUserId of remoteUserIdArray) {
                if (remoteUserId.trim() === '') continue;

                if (!this.connections[remoteUserId]) {
                    const metadata = {
                        callerUserName: userName,
                        callerType: "audio"
                    };

                    const connection = this.peer.call(remoteUserId, stream, { metadata });
                    this.connections[remoteUserId] = connection;

                    await new Promise((resolve, reject) => {
                        connection.on('stream', (remoteStream) => {
                            this.screenManager.addRemoteVideo(remoteUserId, remoteStream)
                            resolve();
                        });
                        connection.on('error', (err) => {
                            console.error('Error with peer connection:', err);
                            reject(err);
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    }
    async handleIncomingCall(call) {
        console.log("Incoming Video Call");
        const remoteUserId = call.peer;
        const callerName = call.metadata.callerUserName;
        const answer = confirm(`Incoming Video Call From ${callerName}`);
        if (answer) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                call.answer(stream);
                this.connections[remoteUserId] = call;
                this.displayLocalVideo(stream)

                call.on('stream', (remoteStream) => {
                    this.screenManager.addRemoteVideo(remoteUserId, remoteStream)
                });
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        }
    }
    closeConnections() {
        Object.values(this.connections).forEach((connection) => {
            if (connection) {
                connection.close();
            }
        });
        this.connections = {};
    }

    displayLocalVideo(stream) {
        this.localVideo.srcObject = stream;
        this.localStream = stream;
    }
}

export { PeerConnectionManager }