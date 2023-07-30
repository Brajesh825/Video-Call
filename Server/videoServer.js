const { PeerServer } = require("peer");

class VideoServer {
    constructor(config) {
        this.config = config
        this.allowedAction = [""]
    }
    start() {
        const peerServer = PeerServer(this.config)
        peerServer.on('connection', (client) => {
            console.log(`New client connected with ID: ${client.getId()}`);
        });
    }
}


module.exports = VideoServer