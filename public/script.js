// script.js
const localVideo = document.getElementById('localVideo');
const remoteVideosContainer = document.getElementById('remoteVideos');
const startCallBtn = document.getElementById('startCall');
const endCallBtn = document.getElementById('endCall');
const userIdElement = document.getElementById('userId');
const userNameElement = document.getElementById('userName');

let userName;
userNameElement.onchange = (e) => {
  userName = e.target.value;
};

let peer, localStream, connections = {};

// Function to generate a random ID for the user
function generateUserId() {
  const id = Math.random().toString(36).slice(2);
  userIdElement.innerText = id; // Update the element with the generated ID
  return id;
}

// Generate a random ID for the user
const userId = generateUserId();
userIdElement.innerText = userId;

const wsConfig = {
  host: "videocall-emn3.onrender.com",
  path: "/peerjs",
  secure: true
};

// Connect to the Peer server
peer = new Peer(userId, wsConfig);

peer.on('open', (id) => {
  console.log('Connected with ID:', id);
});

// Start a call with multiple users
function startCall() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      localVideo.srcObject = stream;
      localStream = stream;

      const remoteUserIds = prompt('Enter the IDs of the people you want to call (comma-separated):');
      if (!remoteUserIds) return;

      const remoteUserIdArray = remoteUserIds.split(',');

      for (const remoteUserId of remoteUserIdArray) {
        if (remoteUserId.trim() === '') continue;

        const metadata = {
          callerUserName: userName,
          callerType: "audio"
        };

        const connection = peer.call(remoteUserId, stream, { metadata });
        connections[remoteUserId] = connection;

        connection.on('stream', (remoteStream) => {
          displayRemoteVideo(remoteUserId, remoteStream);
        });
      }
    })
    .catch((error) => {
      console.error('Error accessing media devices:', error);
    });
}

// End the call
function endCall() {
  Object.keys(connections).forEach((remoteUserId) => {
    const connection = connections[remoteUserId];
    if (connection) {
      connection.close();
    }
    delete connections[remoteUserId];
  });

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }

  remoteVideosContainer.innerHTML = '';
  localVideo.srcObject = null;
}

function displayRemoteVideo(remoteUserId, stream) {
  const remoteVideo = document.createElement('video');
  remoteVideo.autoplay = true;
  remoteVideo.srcObject = stream;
  remoteVideosContainer.appendChild(remoteVideo);
}

// Start call when the "Start Call" button is clicked
startCallBtn.addEventListener('click', () => {
  startCall();
});

// End call when the "End Call" button is clicked
endCallBtn.addEventListener('click', () => {
  endCall();
});

// Listen for incoming calls
peer.on('call', (call) => {
  console.log("Incoming Video Call");
  const remoteUserId = call.peer;
  const callerName = call.metadata.callerUserName;
  const answer = confirm(`Incoming Video Call From ${callerName}`);
  if (answer) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideo.srcObject = stream;
        localStream = stream;

        call.answer(stream);
        connections[remoteUserId] = call;

        call.on('stream', (remoteStream) => {
          displayRemoteVideo(remoteUserId, remoteStream);
        });
      })
      .catch((error) => {
        console.error('Error accessing media devices:', error);
      });
  }
});
