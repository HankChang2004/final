class PitchingAnalyzer {
    constructor() {
        this.videoInput = document.getElementById('videoInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.timeline = document.getElementById('timeline');
        this.timelineProgress = document.getElementById('timelineProgress');
        this.startMarker = document.getElementById('startMarker');
        this.endMarker = document.getElementById('endMarker');
        this.startTimeDisplay = document.getElementById('startTimeDisplay');
        this.endTimeDisplay = document.getElementById('endTimeDisplay');
        this.markStartBtn = document.getElementById('markStartBtn');
        this.markEndBtn = document.getElementById('markEndBtn');
        this.prevFrameBtn = document.getElementById('prevFrameBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.nextFrameBtn = document.getElementById('nextFrameBtn');
        this.playbackSpeed = document.getElementById('playbackSpeed');
        this.resetBtn = document.getElementById('resetBtn');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.newAnalysisBtn = document.getElementById('newAnalysisBtn');
        this.retryBtn = document.getElementById('retryBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.loadingText = document.getElementById('loadingText');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultMessage = document.getElementById('resultMessage');
        this.errorContainer = document.getElementById('errorContainer');
        this.errorMessage = document.getElementById('errorMessage');

        this.step1 = document.getElementById('step1');
        this.step2 = document.getElementById('step2');
        this.step3 = document.getElementById('step3');

        this.videoFile = null;
        this.startTime = null;
        this.endTime = null;
        this.frameRate = 30;
        this.backendUrl = 'https://unirritably-unfoul-chere.ngrok-free.dev';

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.videoInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', () => this.uploadArea.classList.remove('dragover'));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.videoInput.addEventListener('change', (e) => this.handleFileSelect(e));

        this.videoPlayer.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.videoPlayer.addEventListener('timeupdate', () => this.updateTimeline());
        this.videoPlayer.addEventListener('play', () => this.updatePlayButton(true));
        this.videoPlayer.addEventListener('pause', () => this.updatePlayButton(false));

        this.timeline.addEventListener('click', (e) => this.seekToPosition(e));

        this.markStartBtn.addEventListener('click', () => this.markStartTime());
        this.markEndBtn.addEventListener('click', () => this.markEndTime());

        this.prevFrameBtn.addEventListener('click', () => this.stepFrame(-1));
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.nextFrameBtn.addEventListener('click', () => this.stepFrame(1));
        this.playbackSpeed.addEventListener('change', (e) => {
            this.videoPlayer.playbackRate = parseFloat(e.target.value);
        });

        this.resetBtn.addEventListener('click', () => this.reset());
        this.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        this.newAnalysisBtn.addEventListener('click', () => this.reset());
        this.retryBtn.addEventListener('click', () => this.startAnalysis());

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            this.loadVideo(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.loadVideo(files[0]);
        }
    }

    loadVideo(file) {
        this.videoFile = file;
        const url = URL.createObjectURL(file);
        this.videoPlayer.src = url;
        this.showStep(2);
    }

    onVideoLoaded() {
        console.log(`影片已載入，時長: ${this.videoPlayer.duration.toFixed(2)}秒`);
        this.resetMarkers();
    }

    updateTimeline() {
        const progress = (this.videoPlayer.currentTime / this.videoPlayer.duration) * 100;
        this.timelineProgress.style.width = `${progress}%`;
    }

    seekToPosition(e) {
        const rect = this.timeline.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.videoPlayer.currentTime = pos * this.videoPlayer.duration;
    }

    markStartTime() {
        this.startTime = this.videoPlayer.currentTime;
        this.startTimeDisplay.textContent = this.formatTime(this.startTime);
        this.updateMarker(this.startMarker, this.startTime);
        this.validateTimes();
    }

    markEndTime() {
        this.endTime = this.videoPlayer.currentTime;
        this.endTimeDisplay.textContent = this.formatTime(this.endTime);
        this.updateMarker(this.endMarker, this.endTime);
        this.validateTimes();
    }

    updateMarker(marker, time) {
        const pos = (time / this.videoPlayer.duration) * 100;
        marker.style.left = `${pos}%`;
        marker.style.display = 'block';
    }

    validateTimes() {
        const valid = this.startTime !== null &&
            this.endTime !== null &&
            this.startTime < this.endTime;
        this.analyzeBtn.disabled = !valid;

        if (this.startTime !== null && this.endTime !== null && this.startTime >= this.endTime) {
            alert('錯誤：抬腳時間必須早於球離手時間！');
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
    }

    stepFrame(direction) {
        const frameTime = 1 / this.frameRate;
        this.videoPlayer.currentTime = Math.max(0,
            Math.min(this.videoPlayer.duration,
                this.videoPlayer.currentTime + (direction * frameTime)));
    }

    togglePlayPause() {
        if (this.videoPlayer.paused) {
            this.videoPlayer.play();
        } else {
            this.videoPlayer.pause();
        }
    }

    updatePlayButton(isPlaying) {
        this.playPauseBtn.textContent = isPlaying ? '暫停' : '播放';
    }

    handleKeyboard(e) {
        if (this.step2.style.display === 'none') return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.stepFrame(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.stepFrame(1);
                break;
            case 's':
            case 'S':
                this.markStartTime();
                break;
            case 'e':
            case 'E':
                this.markEndTime();
                break;
        }
    }

    showStep(stepNum) {
        this.step1.style.display = stepNum === 1 ? 'block' : 'none';
        this.step2.style.display = stepNum === 2 ? 'block' : 'none';
        this.step3.style.display = stepNum === 3 ? 'block' : 'none';
    }

    reset() {
        this.videoFile = null;
        this.startTime = null;
        this.endTime = null;
        this.videoPlayer.src = '';
        this.videoInput.value = '';
        this.startTimeDisplay.textContent = '--:--:---';
        this.endTimeDisplay.textContent = '--:--:---';
        this.resetMarkers();
        this.analyzeBtn.disabled = true;
        this.showStep(1);
        this.hideResults();
    }

    resetMarkers() {
        this.startMarker.style.display = 'none';
        this.endMarker.style.display = 'none';
        this.timelineProgress.style.width = '0%';
    }

    hideResults() {
        this.loadingIndicator.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
    }

    async startAnalysis() {
        this.showStep(3);
        this.hideResults();
        this.loadingText.textContent = '正在上傳影片...';

        try {
            const formData = new FormData();
            formData.append('video', this.videoFile);
            formData.append('start_time', this.startTime.toFixed(3));
            formData.append('end_time', this.endTime.toFixed(3));

            this.loadingText.textContent = '正在處理影片...';

            const response = await fetch(`${this.backendUrl}/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `伺服器錯誤: ${response.status}`);
            }

            const result = await response.json();
            this.showSuccess(result);

        } catch (error) {
            console.error('分析失敗:', error);
            this.showError(error.message);
        }
    }

    showSuccess(result) {
        this.loadingIndicator.style.display = 'none';
        this.resultContainer.style.display = 'block';

        let resultHTML = `
            <p>影片已成功裁剪並進行動作分析！</p>
            <p><strong>處理時間:</strong> ${result.duration || '未知'}</p>
        `;

        if (result.predicted_speed_mph) {
            resultHTML += `
                <div class="speed-result">
                    <h3>預測球速</h3>
                    <div class="speed-display">
                        <span class="speed-value">${result.predicted_speed_mph.toFixed(1)}</span>
                        <span class="speed-unit">mph</span>
                    </div>
                    <p class="speed-kmh">約 ${result.predicted_speed_kmh} km/h</p>
                </div>
            `;
        }

        this.resultMessage.innerHTML = resultHTML;
    }

    showError(message) {
        this.loadingIndicator.style.display = 'none';
        this.errorContainer.style.display = 'block';
        this.errorMessage.textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PitchingAnalyzer();
});
