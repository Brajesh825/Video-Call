

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
            console.trace();
            console.log('Connected with ID:', id);
        });
    }
    getPeer() {
        return this.peer
    }

}

export { PeerConnectionManager }