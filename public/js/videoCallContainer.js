class VideoCallContainer {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'videoCallContainer';
    }
    getConatiner() {
        return this.container
    }
    createUserIdElement(userId) {
        const userIdHeading = document.createElement('h2');
        userIdHeading.innerText = 'Your ID: ';
        const userIdElement = document.createElement('span');
        userIdElement.id = 'userId';
        userIdElement.innerText = userId; // Set the provided user ID
        userIdHeading.appendChild(userIdElement);
        this.container.appendChild(userIdHeading);
    }
    getUserIdElement() {
        return document.getElementById('userId')
    }
    createUserNameElement() {
        const userNameElement = document.createElement('input');
        userNameElement.type = 'text';
        userNameElement.id = 'userName';
        userNameElement.placeholder = 'Your Name';
        this.container.appendChild(userNameElement);
    }
    getUserNameElement() {
        return document.getElementById('userName')
    }
    createCallButtonsContainer() {
        const callButtonsContainer = document.createElement('div');
        callButtonsContainer.id = 'callButtons';
        const startCallBtn = document.createElement('button');
        startCallBtn.id = 'startCall';
        startCallBtn.textContent = 'Start Call';
        const endCallBtn = document.createElement('button');
        endCallBtn.id = 'endCall';
        endCallBtn.textContent = 'End Call';
        callButtonsContainer.appendChild(startCallBtn);
        callButtonsContainer.appendChild(endCallBtn);
        this.container.appendChild(callButtonsContainer);
    }
    getStartCallButton() {
        return document.getElementById('startCall')
    }
    getEndCallButton() {
        return document.getElementById('endCall')
    }
    createLocalVideoElement() {
        const localVideo = document.createElement('video');
        localVideo.id = 'localVideo';
        localVideo.autoplay = true;
        localVideo.muted = true;
        const localVideoContainer = document.createElement('div');
        localVideoContainer.id = 'localVideoContainer';
        localVideoContainer.appendChild(localVideo);
        this.container.appendChild(localVideoContainer);
    }
    getLocalVideoElement() {
        return document.getElementById('localVideo')
    }

    createRemoteVideosContainer() {
        const remoteVideosContainer = document.createElement('div');
        remoteVideosContainer.id = 'remoteVideos';
        remoteVideosContainer.classList.add('remote-videos-container');
        this.container.appendChild(remoteVideosContainer);
    }
    getRemoteVideosContainer() {
        return document.getElementById('remoteVideos')
    }
}


export { VideoCallContainer }