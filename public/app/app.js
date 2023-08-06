import { PeerConnectionManager } from "./connectionManager.js";

class Meeting {
    constructor() {
        this.userId = localStorage.getItem('userId') || generateRandomId();
        this.meetingContainer = document.createElement('div');
        this.meetingContainer.classList.add('meeting-container');
        document.body.appendChild(this.meetingContainer);

        this.container = document.createElement('div'); // Create the container for grid and chat
        this.container.classList.add('container'); // Apply CSS styling to the container
        this.meetingContainer.appendChild(this.container); // Add the container to the meeting container

        this.screenContainer = document.createElement('div');
        this.screenContainer.classList.add('screen-container');
        this.container.appendChild(this.screenContainer);

        this.mainScreen = document.createElement('div');
        this.mainScreen.classList.add('main-screen');
        this.screenContainer.appendChild(this.mainScreen);

        this.videoGrid = document.createElement('div');
        this.videoGrid.classList.add('video-grid');
        this.screenContainer.appendChild(this.videoGrid); // Add the grid to the container

        this.chatWindow = document.createElement('div'); // Create the chat window element
        this.chatWindow.classList.add('chat-window'); // Apply CSS styling to the chat window
        this.container.appendChild(this.chatWindow); // Add the chat window to the container

        this.controls = document.createElement('div');
        this.controls.classList.add('controls');
        this.meetingContainer.appendChild(this.controls);

        this.createControlButtons(); // Create control buttons
        this.createChatToggleButton();
        this.createChatMessagesContainer();
        this.addSampleChatMessages();
        this.createChatInputContainer();
        this.createLocalVideo();

        this.isSharingScreen = false; // Add a flag for screen sharing status
        this.screenStream = null; // Add a placeholder for the screen stream
        this.isVideoStretched = false;

        if (window.innerWidth <= 600) {
            this.chatWindow.classList.add('chat-hidden');
        }

        // handling peer
        function generateRandomId() {
            // This is a simple way to generate a random ID. You can use a more robust method if needed.
            return Math.random().toString(36).substr(2, 10);
        }


        localStorage.setItem('userId', this.userId);
        // Create PeerConnectionManager with the user ID
        this.peerConnectionManager = new PeerConnectionManager(this.userId);
        this.peer = this.peerConnectionManager.getPeer();

        this.peer.on('call', (call) => {
            console.log("incoming call");
            this.handleIncomingCall(call);
        });

        this.connections = {}
        this.remoteUserVideoIds = new Set();

    }
    // VideoCall Section
    startGroupCall(recipientIds) {
        // Establish mesh connections with all recipients
        this.connectToPeers(recipientIds);

        // Start outgoing calls to all recipients
        recipientIds.forEach((recipientId) => {
            const call = this.peer.call(recipientId, this.localStream, {
                metadata: { recipients: recipientIds },
            });

            console.log(call);

            this.handleOutgoingCall(call, recipientIds);
        });
    }

    connectToPeers(peerIds) {
        peerIds.forEach((peerId) => {
            if (peerId !== this.userId && !this.connections[peerId]) {
                this.connections[peerId] = this.peer.connect(peerId, {
                    serialization: "json",
                    metadata: { userId: this.peer.id },
                });
                this.connections[peerId].on("open", () => {
                    console.log("Connected to peer:", peerId);
                });
                this.handleDataConnection(this.connections[peerId]);
            }
        });
    }

    handleDataConnection(connection) {
        connection.on("data", (data) => {
            console.log("Received data:", data);
            // Handle received data from other peers
        });

        connection.on("close", () => {
            console.log("Data connection closed");
            // Handle data connection closed event
        });
    }
    // handling outgoing call
    handleOutgoingCall(call, recipientIds) {
        // Add event listeners to handle the outgoing call
        call.on("stream", (remoteStream) => {
            // Handle the remote stream and add it to the video grid
            const remoteVideoElement = this.createVideoElement(remoteStream);
            const remoteVideoContainer = this.createVideoElementContainer(
                remoteVideoElement,
                call.peer // The user ID of the remote caller
            );
            this.addVideoStream(remoteVideoContainer);
        });

        call.on("close", () => {
            // Handle the call when it is closed (e.g., remote user hung up)
            // Remove the video element associated with the call
            const remoteVideoElement = document.getElementById(call.peer);
            if (remoteVideoElement) {
                this.videoGrid.removeChild(remoteVideoElement.parentNode);
            }
        });

        // Send the list of all recipients in metadata
        call.metadata = { recipients: recipientIds };
    }

    async handleIncomingCall(call) {
        // Show a confirmation dialog to the user
        const shouldAcceptCall = window.confirm("Incoming call from " + call.peer + ". Do you want to accept?");

        if (shouldAcceptCall) {
            // Get the local stream first (if not already available)
            if (!this.localStream) {
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    this.localVideo.srcObject = this.localStream;
                } catch (error) {
                    console.error("Error accessing webcam and/or microphone:", error);
                    return;
                }
            }

            // Answer the incoming call and send the local stream
            call.answer(this.localStream);

            // Add event listeners to handle the incoming call
            call.on("stream", (remoteStream) => {
                // Handle the remote stream and add it to the video grid
                const remoteVideoElement = this.createVideoElement(remoteStream);
                const remoteVideoContainer = this.createVideoElementContainer(
                    remoteVideoElement,
                    call.peer // The user ID of the remote caller
                );
                this.addVideoStream(remoteVideoContainer);
            });

            call.on("close", () => {
                // Handle the call when it is closed (e.g., remote user hung up)
                // Remove the video element associated with the call
                const remoteVideoElement = document.getElementById(call.peer);
                if (remoteVideoElement) {
                    this.videoGrid.removeChild(remoteVideoElement.parentNode);
                }
            });

            // Send the list of all recipients in metadata
            call.metadata = { recipients: call.metadata.recipients };

            // Start the local stream and show it on the main screen
            const localVideoContainer = this.createVideoElementContainer(
                this.localVideo,
                "You" // Use "You" as the username for local video
            );
            localVideoContainer.classList.add("main-video-container");
            this.mainScreen.appendChild(localVideoContainer);
        } else {
            // If the user declines the call, close the call
            call.close();
        }
    }


    // Chat Section
    addSampleChatMessages() {
        const sampleMessages = [
            { user: 'User1', message: 'Hello everyone!' },
            { user: 'User2', message: 'Hi there!' },
            {
                user: 'User1', message: 'How"s everyone doing?'
            },
            { user: 'User3', message: 'Great! How about you?' },
        ];

        sampleMessages.forEach((message) => {
            this.addChatMessage(message.user, message.message);
        });
    }
    addChatMessage(user, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.innerHTML = `<strong>${user}:</strong> ${message}`;
        this.chatWindow.appendChild(messageElement);
    }
    sendMessage() {
        const message = this.chatInput.value;
        if (message.trim() !== '') {
            this.addChatMessage('You', message);
            this.chatInput.value = '';
        }
    }
    createChatToggleButton() {
        this.chatToggleBtn = document.createElement('button');
        this.chatToggleBtn.classList.add('control-button');
        this.chatToggleBtn.textContent = 'Toggle Chat';
        this.controls.appendChild(this.chatToggleBtn);

        this.chatToggleBtn.addEventListener('click', () => {
            this.toggleChatWindow();
        });
    }
    toggleChatWindow() {
        this.chatWindow.classList.toggle('chat-hidden');
    }
    createChatInputContainer() {
        this.chatInputContainer = document.createElement('div');
        this.chatInputContainer.classList.add('chat-input-container');
        this.chatWindow.appendChild(this.chatInputContainer);

        this.chatInput = document.createElement('input');
        this.chatInput.classList.add('chat-input');
        this.chatInput.placeholder = 'Type your message...';
        this.chatInputContainer.appendChild(this.chatInput);

        this.sendButton = document.createElement('button');
        this.sendButton.classList.add('send-button');
        this.sendButton.textContent = 'Send';
        this.chatInputContainer.appendChild(this.sendButton);
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

    }
    createChatMessagesContainer() {
        this.chatMessagesContainer = document.createElement('div');
        this.chatMessagesContainer.classList.add('chat-messages-container');
        this.chatWindow.appendChild(this.chatMessagesContainer);
    }
    addChatMessage(user, message) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message-container');

        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.innerHTML = `<strong>${user}:</strong> ${message}`;

        messageContainer.appendChild(messageElement);
        this.chatMessagesContainer.appendChild(messageContainer);
    }
    createChatInputContainer() {
        this.sendContainer = document.createElement('div');
        this.sendContainer.classList.add('send-container');
        this.chatWindow.appendChild(this.sendContainer);

        this.chatInputContainer = document.createElement('div');
        this.chatInputContainer.classList.add('chat-input-container');
        this.sendContainer.appendChild(this.chatInputContainer);

        this.chatInput = document.createElement('input');
        this.chatInput.classList.add('chat-input');
        this.chatInput.placeholder = 'Type your message...';
        this.chatInputContainer.appendChild(this.chatInput);

        this.sendButton = document.createElement('button');
        this.sendButton.classList.add('send-button');
        this.sendButton.textContent = 'Send';
        this.chatInputContainer.appendChild(this.sendButton);
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
    }
    addVideoStream(videoElement) {
        this.videoGrid.appendChild(videoElement);
        videoElement.addEventListener('loadedmetadata', () => {
            videoElement.play();
        });
    }
    createControlButtons() {
        this.toggleVideoBtn = this.createControlButton('Toggle Video');
        this.toggleAudioBtn = this.createControlButton('Toggle Audio');
        this.shareScreenBtn = this.createControlButton('Share Screen');
        this.inviteBtn = this.createControlButton("Invite");

        // Add event listeners for controls (toggleVideo, toggleAudio, shareScreen)
        this.toggleVideoBtn.addEventListener('click', () => {
            this.toggleLocalVideo();
        });

        // Add event listener for the Toggle Audio button
        this.toggleAudioBtn.addEventListener('click', () => {
            this.toggleLocalAudio();
        });

        // Add event listener for the Share Screen button
        this.shareScreenBtn.addEventListener('click', () => {
            this.toggleScreenShare();
        });


        // Add Event Listener For The Invite Button
        this.inviteBtn.addEventListener("click", () => {
            this.createInviteModel()
            this.showInviteModal();
        });

    }
    createInviteModel() {
        const modalOverlay = document.createElement("div");
        modalOverlay.id = "modal-overlay";
        modalOverlay.style.display = "none";
        modalOverlay.addEventListener("click", () => {
            this.hideInviteModal();
        });

        // Create the modal dialog
        const modalDialog = document.createElement("div");
        modalDialog.id = "modal-dialog";
        modalDialog.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        // Add elements to the modal dialog
        const modalTitle = document.createElement("h3");
        modalTitle.textContent = "Invite Participants";
        modalDialog.appendChild(modalTitle);

        const recipientLabel = document.createElement("label");
        recipientLabel.setAttribute("for", "recipient-ids");
        recipientLabel.textContent = "Enter recipient IDs (comma-separated):";
        modalDialog.appendChild(recipientLabel);

        const recipientInput = document.createElement("input");
        recipientInput.type = "text";
        recipientInput.id = "recipient-ids";
        modalDialog.appendChild(recipientInput);

        const inviteButton = document.createElement("button");
        inviteButton.id = "invite-button";
        inviteButton.textContent = "Invite";
        inviteButton.addEventListener("click", () => {
            this.handleInviteButtonClick();
        });
        modalDialog.appendChild(inviteButton);

        const closeButton = document.createElement("button");
        closeButton.id = "close-modal-button";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", () => {
            this.hideInviteModal();
        });
        modalDialog.appendChild(closeButton);

        // Add the modal dialog to the overlay
        modalOverlay.appendChild(modalDialog);

        // Add the modal overlay to the meeting container
        this.meetingContainer.appendChild(modalOverlay);

        const recipientContainer = document.createElement("div");
        recipientContainer.id = "recipient-container";
        modalDialog.appendChild(recipientContainer);

        // Create the "Add New Recipient" button
        const addRecipientButton = document.createElement("button");
        addRecipientButton.textContent = "Add New Recipient";
        addRecipientButton.addEventListener("click", () => {
            this.addNewRecipient();
        });
        modalDialog.appendChild(addRecipientButton);


    }
    handleInviteButtonClick() {
        const recipientIds = [];
        const recipientElements = document.querySelectorAll(".recipient-item");
        recipientElements.forEach((element) => {
            const recipientId = element.querySelector("span").textContent;
            recipientIds.push(recipientId);
        });

        // Do something with the recipient IDs, e.g., initiate a call
        console.log("Inviting participants:", recipientIds);

        // Close the modal after handling the button click
        this.hideInviteModal();

        this.startGroupCall(recipientIds)

    }
    showInviteModal() {
        const modalOverlay = document.getElementById("modal-overlay");
        modalOverlay.style.display = "block";
    }
    hideInviteModal() {
        const modalOverlay = document.getElementById("modal-overlay");
        modalOverlay.style.display = "none";
    }
    addNewRecipient() {
        const recipientIdsInput = document.getElementById("recipient-ids");
        const recipientContainer = document.getElementById("recipient-container");

        const recipientId = recipientIdsInput.value.trim();
        if (recipientId) {
            const recipientElement = document.createElement("div");
            recipientElement.classList.add("recipient-item");

            const recipientText = document.createElement("span");
            recipientText.textContent = recipientId;
            recipientElement.appendChild(recipientText);

            const removeButton = document.createElement("button");
            removeButton.textContent = "Remove";
            removeButton.addEventListener("click", () => {
                recipientElement.remove();
            });
            recipientElement.appendChild(removeButton);

            recipientContainer.appendChild(recipientElement);

            recipientIdsInput.value = "";
        }
    }
    createControlButton(text) {
        const button = document.createElement('button');
        button.classList.add('control-button');
        button.textContent = text;
        this.controls.appendChild(button);
        return button;
    }
    createLocalVideo() {
        if (!this.localVideo) {
            this.localVideo = this.createVideoElement();
            this.localVideo.classList.add('local-video');
            this.localVideo.classList.add('video-stream');
            const videoContainer = this.createVideoElementContainer(this.localVideo, this.userId)
            this.videoGrid.appendChild(videoContainer);
        }
        if (!this.screenVideo) {
            this.screenVideo = this.createVideoElement();
            this.screenVideo.classList.add('screen-video');
            this.screenVideo.classList.add('video-stream');
            const videoContainer = this.createVideoElementContainer(this.screenVideo, this.userId)
            this.videoGrid.appendChild(videoContainer);
        }

    }
    initLocalVideo() {
        // Check if the browser supports getUserMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Get access to the user's webcam
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    this.localStream = stream; // Store the local stream
                    this.localVideo.srcObject = stream;
                    this.localVideo.play(); // Play the local video stream
                })
                .catch(error => {
                    console.error('Error accessing webcam:', error);
                });
        } else {
            console.error('getUserMedia not supported');
        }
    }
    createVideoElement(src, className) {
        const video = document.createElement('video');
        if (src) {
            video.srcObject = src;
        }
        if (className) {
            video.classList.add(className);
        }
        video.autoplay = true;
        video.playsInline = true;

        return video;
    }
    createVideoElementContainer(videoElement, username) {
        const videoContainer = document.createElement('div');
        videoContainer.classList.add('video-container');
        videoContainer.appendChild(videoElement);

        // User ID text
        const userIdText = document.createElement('div');
        userIdText.classList.add('user-id');
        userIdText.textContent = `User ID: ${username}`;
        videoContainer.appendChild(userIdText);

        const fullScreenButton = document.createElement('button');
        fullScreenButton.classList.add('full-screen-button');
        fullScreenButton.innerHTML = '<i class="fas fa-expand"></i> <span class="sr-only">Full Screen</span>'
        fullScreenButton.addEventListener('click', () => {
            if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen();
            } else if (videoContainer.mozRequestFullScreen) {
                videoContainer.mozRequestFullScreen();
            } else if (videoContainer.webkitRequestFullscreen) {
                videoContainer.webkitRequestFullscreen();
            } else if (videoContainer.msRequestFullscreen) {
                videoContainer.msRequestFullscreen();
            }
        });

        const stretchVideoBtn = document.createElement('button');
        stretchVideoBtn.classList.add('stretch-video-button');
        stretchVideoBtn.textContent = 'Stretch Video';
        stretchVideoBtn.innerHTML = '<i class="fas fa-compress"></i> <span class="sr-only">Stretch Video</span>'

        stretchVideoBtn.addEventListener('click', () => {
            while (this.mainScreen.firstChild) {
                this.mainScreen.removeChild(this.mainScreen.firstChild);
            }

            const newVideoElement = this.createVideoElement(videoElement.srcObject, 'main-screen-video');

            const newVideoContainer = this.createVideoElementContainer(newVideoElement, username);
            newVideoContainer.classList.add('main-video-container');

            this.mainScreen.appendChild(newVideoContainer);
        });

        videoContainer.appendChild(fullScreenButton);
        videoContainer.appendChild(stretchVideoBtn);

        return videoContainer;
    }
    toggleLocalAudio() {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    }
    toggleLocalVideo() {

        if (!this.localStream) {
            console.log("no local stream starting");
            this.initLocalVideo();
            return;
        }

        const videoTracks = this.localStream.getVideoTracks(); // get video tracks only
        videoTracks.forEach(track => {
            track.enabled = !track.enabled; // toggle video tracks only
        });
    }
    async toggleScreenShare() {
        if (this.isSharingScreen) {
            // Stop sharing the screen
            this.stopScreenShare();
        } else {
            // Check if the user has already started sharing their video
            let shouldShareVideo = true;
            if (this.localStream) {
                shouldShareVideo = confirm("Do you want to share your video along with the screen?");
            }

            try {
                // Get access to the screen stream
                this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: shouldShareVideo });

                // Replace the local video stream with the screen stream
                if (this.localStream && shouldShareVideo) {
                    this.localStream.getTracks().forEach(track => track.stop());
                }

                // Update the local video with the screen stream
                this.localVideo.srcObject = this.screenStream;
                this.localStream = this.screenStream;

                // Share the screen stream with all connected peers
                for (const peerId in this.connections) {
                    const peerConnection = this.connections[peerId];
                    const call = peerConnection.call(peerId, this.localStream, { metadata: { recipients: [...this.remoteUserVideoIds] } });
                    this.setupCallListeners(call, peerId);
                }

                this.isSharingScreen = true; // Update the flag
            } catch (error) {
                console.error("Error sharing screen:", error);
            }
        }
    }

    async shareScreen() {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            this.screenVideo.srcObject = this.screenStream;

            this.screenStream.getTracks()[0].onended = () => {
                this.stopScreenShare();
            };

            this.isSharingScreen = true; // Update the flag
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    }
    stopScreenShare() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null; // Clear the screen stream
            this.screenVideo.srcObject = null;
            this.isSharingScreen = false; // Update the flag
        }
    }

    setupCallListeners(call, peerId) {
        call.on("stream", (remoteStream) => {
            // When the remote stream is received, add it to the video grid
            this.addRemoteVideoStream(remoteStream, peerId);
        });

        call.on("close", () => {
            // When the call is closed, remove the remote video from the video grid
            this.removeRemoteVideoStream(peerId);
        });

        call.on("error", (error) => {
            console.error("Call error:", error);
        });
    }

    addRemoteVideoStream(remoteStream, peerId) {
        if (!this.remoteUserVideoIds.has(peerId)) {
            // Add the new peer to the set of remote users
            this.remoteUserVideoIds.add(peerId);

            // Create a new video element for the remote stream
            const remoteVideo = this.createVideoElement(remoteStream, `remote-video-${peerId}`);
            remoteVideo.classList.add("remote-video");
            const videoContainer = this.createVideoElementContainer(remoteVideo, peerId);
            this.videoGrid.appendChild(videoContainer);

            // Play the remote video stream
            remoteVideo.addEventListener("loadedmetadata", () => {
                remoteVideo.play();
            });
        }
    }

    removeRemoteVideoStream(peerId) {
        if (this.remoteUserVideoIds.has(peerId)) {
            // Remove the peer from the set of remote users
            this.remoteUserVideoIds.delete(peerId);

            // Remove the remote video element from the video grid
            const remoteVideo = document.getElementById(`remote-video-${peerId}`);
            if (remoteVideo) {
                const videoContainer = remoteVideo.parentElement;
                this.videoGrid.removeChild(videoContainer);
            }
        }
    }


}

export { Meeting }