import { VideoCallContainer } from "./videoCallContainer.js";
import { PeerConnectionManager } from "./peerConnectionManager.js";

// User Interface Will Talk To Peer Connection Manager and Manipulate Dom Element

class UserInterface {
    constructor() {
        this.userId = this.getUserIdFromLocalStorage() || this.generateUserId();
        this.userName = null;
        this.localVideo = null
        this.setupInitialScreen();
        this.setupEventListeners();
        this.setUpPeerConnection()
    }
    getUserIdFromLocalStorage() {
        return localStorage.getItem('userId');
    }
    setUserIdToLocalStorage(userId) {
        localStorage.setItem('userId', userId);
    }
    generateUserId() {
        const generatedUserId = Math.random().toString(36).slice(2);
        this.setUserIdToLocalStorage(generatedUserId);
        return generatedUserId;
    }
    setupInitialScreen() {
        this.videoCallContainer = new VideoCallContainer();
        this.videoCallContainer.createUserIdElement(this.userId)
        this.videoCallContainer.createUserNameElement()
        this.videoCallContainer.createCallButtonsContainer()
        this.videoCallContainer.createLocalVideoElement()
        this.videoCallContainer.createRemoteVideosContainer()
        document.body.appendChild(this.videoCallContainer.getConatiner());
    }
    setupEventListeners() {
        this.userNameElement = this.videoCallContainer.getUserNameElement()
        this.userNameElement.onchange = (e) => {
            this.userName = e.target.value;
        };
        this.startCallBtn = this.videoCallContainer.getStartCallButton()
        this.startCallBtn.addEventListener('click', () => {
            this.startCall();
        });
        this.endCallBtn = this.videoCallContainer.getEndCallButton()
        this.endCallBtn.addEventListener('click', () => {
            this.endCall();
        });
        this.localVideo = this.videoCallContainer.getLocalVideoElement()
        this.remoteVideoContainer = this.videoCallContainer.getRemoteVideosContainer()
    }
    setUpPeerConnection() {
        this.peerConnectionManager = new PeerConnectionManager(this.userId)
        this.peerConnectionManager.setLocalVideoContainer(this.localVideo)
        this.peerConnectionManager.setRemoteVideoContainer(this.remoteVideoContainer)
    }
    async startCall() {
        this.peerConnectionManager.startOutgoingCall(this.userName, this.displayL)
    }
    endCall() {
        this.peerConnectionManager.closeConnections()
    }
}


export { UserInterface }