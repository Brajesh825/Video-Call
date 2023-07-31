// script.js
class VideoCallApp {
  constructor() {
    this.localVideo = document.getElementById('localVideo');
    this.remoteVideosContainer = document.getElementById('remoteVideos');
    this.startCallBtn = document.getElementById('startCall');
    this.endCallBtn = document.getElementById('endCall');
    this.userIdElement = document.getElementById('userId');
    this.userNameElement = document.getElementById('userName');
    this.userName = null;
    this.peer = null;
    this.localStream = null;
    this.connections = {};
    this.remoteUserVideoIds = new Set();
    this.initPeer();
    this.setupEventListeners();

  }

  generateUserId() {
    const id = Math.random().toString(36).slice(2);
    this.userIdElement.innerText = id;
    return id;
  }

  initPeer() {
    const userId = this.generateUserId();
    this.userIdElement.innerText = userId;

    const wsConfig = {
      host: "videocall-emn3.onrender.com",
      path: "/peerjs",
      secure: true
    };

    this.peer = new Peer(userId, wsConfig);
    this.peer.on('open', (id) => {
      console.log('Connected with ID:', id);
    });
  }

  setupEventListeners() {
    this.userNameElement.onchange = (e) => {
      this.userName = e.target.value;
    };

    this.startCallBtn.addEventListener('click', () => {
      this.startCall();
    });

    this.endCallBtn.addEventListener('click', () => {
      this.endCall();
    });

    this.peer.on('call', (call) => {
      this.handleIncomingCall(call);
    });
  }

  async startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.localVideo.srcObject = stream;
      this.localStream = stream;

      const remoteUserIds = prompt('Enter the IDs of the people you want to call (comma-separated):');
      if (!remoteUserIds) return;
      const remoteUserIdArray = remoteUserIds.split(',');

      for (const remoteUserId of remoteUserIdArray) {
        if (remoteUserId.trim() === '') continue;

        if (!this.connections[remoteUserId]) {
          const metadata = {
            callerUserName: this.userName,
            callerType: "audio"
          };

          const connection = this.peer.call(remoteUserId, stream, { metadata });
          console.log(connection);
          this.connections[remoteUserId] = connection;

          await new Promise((resolve, reject) => {
            connection.on('stream', (remoteStream) => {
              this.displayRemoteVideo(remoteUserId, remoteStream);
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

  endCall() {
    Object.keys(this.connections).forEach((remoteUserId) => {
      const connection = this.connections[remoteUserId];
      if (connection) {
        connection.close();
      }
      delete this.connections[remoteUserId];
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    this.remoteVideosContainer.innerHTML = '';
    this.localVideo.srcObject = null;
  }

  displayRemoteVideo(remoteUserId, stream) {
    if (!this.remoteUserVideoIds.has(remoteUserId)) {
      const remoteVideo = document.createElement('video');
      remoteVideo.autoplay = true;
      remoteVideo.srcObject = stream;
      this.remoteVideosContainer.appendChild(remoteVideo);
      this.remoteUserVideoIds.add(remoteUserId);
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
        this.localVideo.srcObject = stream;
        this.localStream = stream;

        call.answer(stream);
        this.connections[remoteUserId] = call;

        await new Promise((resolve, reject) => {
          call.on('stream', (remoteStream) => {
            this.displayRemoteVideo(remoteUserId, remoteStream);
            resolve();
          });
          call.on('error', (err) => {
            console.error('Error with peer connection:', err);
            reject(err);
          });
        });
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    }
  }
}

const videoCallApp = new VideoCallApp();
