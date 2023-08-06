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
            this.handleIncomingCall(call);
        });

        this.connections = {}
        this.activeRecipients = new Set();
        this.connectedPeers = new Set();
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
            this.handleOutgoingCall(call, recipientIds);
        });
    }

    connectToPeers(peerIds) {
        peerIds.forEach((peerId) => {
            if (peerId !== this.peer.id && !this.connections[peerId]) {
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

    handleIncomingCall(call) {
        const callerId = call.peer;
        const callerRecipients = call.metadata.recipients;

        // Check if the caller is in the active recipients list
        if (!this.activeRecipients.has(callerId)) {
            // Caller is not in the active recipients list, prompt the user to accept the call
            if (confirm(`Incoming call from ${callerId}. Do you want to accept the call?`)) {
                // User accepted the call, add the caller to the active recipients list
                this.activeRecipients.add(callerId);
            } else {
                // User declined the call, hang up the call and return
                call.close();
                return;
            }
        }

        // Answer the incoming call and send the local stream
        call.answer(this.localStream);

        // Add event listeners to handle the incoming call
        call.on("stream", (remoteStream) => {
            // Check if the caller is already connected, if not, add the video
            if (!this.connectedPeers.has(callerId)) {
                // Handle the remote stream and add it to the video grid
                const remoteVideoElement = this.createVideoElement(remoteStream);
                const remoteVideoContainer = this.createVideoElementContainer(
                    remoteVideoElement,
                    callerId
                );
                this.addVideoStream(remoteVideoContainer);

                // Add the user ID to the connectedPeers Set
                this.connectedPeers.add(callerId);
            }
        });

        call.on("close", () => {
            // Handle the call when it is closed (e.g., remote user hung up)
            // Remove the video element associated with the call
            const remoteVideoElement = document.getElementById(callerId);
            if (remoteVideoElement) {
                this.videoGrid.removeChild(remoteVideoElement.parentNode);

                // Remove the user ID from the connectedPeers Set
                this.connectedPeers.delete(callerId);
            }
        });

        // Send the list of all recipients in metadata, including the caller and other recipients
        const allRecipients = [...callerRecipients, this.userId]; // Add the caller and the current user to the recipients list
        call.metadata = { recipients: allRecipients };

        // Initiate outgoing calls to all recipients in the metadata
        this.connectToPeers(callerRecipients);

        callerRecipients.forEach((recipientId) => {
            // Check if the recipient is in the active recipients list
            if (!this.activeRecipients.has(recipientId)) {
                // Prompt the user to accept the call
                if (confirm(`Outgoing call to ${recipientId}. Do you want to initiate the call?`)) {
                    // User accepted the call, add the recipient to the active recipients list
                    this.activeRecipients.add(recipientId);

                    // Initiate the outgoing call
                    const outgoingCall = this.peer.call(recipientId, this.localStream, {
                        metadata: { recipients: allRecipients },
                    });

                    // Add event listeners to handle the outgoing call
                    this.handleOutgoingCall(outgoingCall, allRecipients);
                }
            }
        });
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
        if (!this.connectedPeers.has(videoElement.dataset.userId)) {
            this.videoGrid.appendChild(videoElement);
            videoElement.addEventListener('loadedmetadata', () => {
                videoElement.play();
            });
            // Add the user ID to the connectedPeers Set
            this.connectedPeers.add(videoElement.dataset.userId);
          }
       
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
            this.stopScreenShare();
        } else {
            await this.shareScreen();
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

}

export { Meeting }