class ScreenManager {
    constructor(videoContainerId) {
        this.container = document.getElementById(videoContainerId);
        this.remoteVideos = new Map();
        this.setupLayout();
    }

    setupLayout() {
        // this.container.style.display = 'grid';
        // this.container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        // this.container.style.gridGap = '10px';
    }

    addRemoteVideo(remoteUserId, stream) {
        if (!this.remoteVideos.has(remoteUserId)) {
            const videoWrapper = document.createElement('div');
            const remoteVideo = document.createElement('video');
            remoteVideo.autoplay = true;
            remoteVideo.srcObject = stream;

            const muteButton = document.createElement('button');
            muteButton.textContent = 'Mute';
            muteButton.onclick = () => this.toggleMute(muteButton, remoteVideo);

            videoWrapper.appendChild(remoteVideo);
            videoWrapper.appendChild(muteButton);

            this.container.appendChild(videoWrapper);
            this.remoteVideos.set(remoteUserId, { video: remoteVideo, muteButton });
        }
    }

    removeRemoteVideo(remoteUserId) {
        if (this.remoteVideos.has(remoteUserId)) {
            const { video, muteButton } = this.remoteVideos.get(remoteUserId);
            video.srcObject = null;
            this.container.removeChild(video.parentElement);
            this.remoteVideos.delete(remoteUserId);
        }
    }

    removeAllRemoteVideos() {
        this.remoteVideos.forEach(({ video }) => {
            video.srcObject = null;
            this.container.removeChild(video.parentElement);
        });
        this.remoteVideos.clear();
    }

    toggleMute(muteButton, videoElement) {
        if (videoElement.muted) {
            videoElement.muted = false;
            muteButton.classList.remove('muted'); // Remove 'muted' class when unmuted
        } else {
            videoElement.muted = true;
            muteButton.classList.add('muted'); // Add 'muted' class when muted
        }
    }
}


export { ScreenManager }