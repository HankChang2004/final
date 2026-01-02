class SwingTraining {
    constructor() {
        this.startTrainingBtn = document.getElementById('startTrainingBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopTrainingBtn = document.getElementById('stopTrainingBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.backToSettingsBtn = document.getElementById('backToSettingsBtn');

        this.roundCountSelect = document.getElementById('roundCount');
        this.intervalTimeSelect = document.getElementById('intervalTime');
        this.goRatioSelect = document.getElementById('goRatio');
        this.rhythmSpeedSelect = document.getElementById('rhythmSpeed');

        this.currentRoundEl = document.getElementById('currentRound');
        this.totalRoundsEl = document.getElementById('totalRounds');
        this.commandDisplay = document.getElementById('commandDisplay');
        this.visualIndicator = document.getElementById('visualIndicator');
        this.indicatorCircle = this.visualIndicator.querySelector('.indicator-circle');
        this.countdownDisplay = document.getElementById('countdownDisplay');

        this.totalRoundsResult = document.getElementById('totalRoundsResult');
        this.goCountEl = document.getElementById('goCount');
        this.stopCountEl = document.getElementById('stopCount');

        this.successInput = document.getElementById('successInput');
        this.failInput = document.getElementById('failInput');
        this.saveResultBtn = document.getElementById('saveResultBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.historyTotal = document.getElementById('historyTotal');
        this.historySuccess = document.getElementById('historySuccess');
        this.historyRate = document.getElementById('historyRate');

        this.settingsSection = document.getElementById('settingsSection');
        this.trainingSection = document.getElementById('trainingSection');
        this.resultSection = document.getElementById('resultSection');

        this.isRunning = false;
        this.isPaused = false;
        this.currentRound = 0;
        this.totalRounds = 10;
        this.intervalTime = 3;
        this.goRatio = 50;
        this.rhythmDelay = 700;
        this.goCount = 0;
        this.stopCount = 0;
        this.timeoutId = null;

        this.synth = window.speechSynthesis;
        this.voices = [];

        this.init();
    }

    init() {
        this.loadVoices();
        this.bindEvents();
    }

    loadVoices() {
        this.voices = this.synth.getVoices();

        if (this.voices.length === 0) {
            this.synth.addEventListener('voiceschanged', () => {
                this.voices = this.synth.getVoices();
            });
        }
    }

    bindEvents() {
        this.startTrainingBtn.addEventListener('click', () => this.startTraining());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.stopTrainingBtn.addEventListener('click', () => this.stopTraining());
        this.restartBtn.addEventListener('click', () => this.startTraining());
        this.backToSettingsBtn.addEventListener('click', () => this.showSection('settings'));

        this.saveResultBtn.addEventListener('click', () => this.saveResult());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    showSection(section) {
        this.settingsSection.style.display = section === 'settings' ? 'block' : 'none';
        this.trainingSection.style.display = section === 'training' ? 'block' : 'none';
        this.resultSection.style.display = section === 'result' ? 'block' : 'none';
    }

    speak(text, callback) {
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = 'en-US';

        const englishVoice = this.voices.find(v => v.lang.includes('en-US') || v.lang.includes('en'));
        if (englishVoice) {
            utterance.voice = englishVoice;
        }

        if (callback) {
            utterance.onend = callback;
        }

        this.synth.speak(utterance);
    }

    startTraining() {
        // 讀取設定
        this.totalRounds = parseInt(this.roundCountSelect.value);
        this.intervalTime = parseInt(this.intervalTimeSelect.value);
        this.goRatio = parseInt(this.goRatioSelect.value);
        this.rhythmDelay = parseInt(this.rhythmSpeedSelect.value);

        this.currentRound = 0;
        this.goCount = 0;
        this.stopCount = 0;
        this.isRunning = true;
        this.isPaused = false;

        this.totalRoundsEl.textContent = this.totalRounds === 0 ? '∞' : this.totalRounds;
        this.updateRoundDisplay();
        this.showSection('training');
        this.updatePauseButton();

        this.commandDisplay.textContent = '準備...';
        this.commandDisplay.className = 'command-display';
        this.indicatorCircle.className = 'indicator-circle ready';
        this.indicatorCircle.textContent = '';

        setTimeout(() => {
            if (this.isRunning) {
                this.runRound();
            }
        }, 2000);
    }

    runRound() {
        if (!this.isRunning || this.isPaused) return;

        if (this.totalRounds > 0 && this.currentRound >= this.totalRounds) {
            this.finishTraining();
            return;
        }

        this.currentRound++;
        this.updateRoundDisplay();

        const isGo = Math.random() * 100 < this.goRatio;

        this.playSequence(isGo);
    }

    playSequence(isGo) {
        this.showCommand('1', 'counting');
        this.speak('1');

        setTimeout(() => {
            if (!this.isRunning || this.isPaused) return;

            this.showCommand('2', 'counting');
            this.speak('2');

            setTimeout(() => {
                if (!this.isRunning || this.isPaused) return;

                if (isGo) {
                    this.showCommand('GO!', 'go');
                    this.goCount++;
                    this.speak('GO', () => {
                        this.scheduleNextRound();
                    });
                } else {
                    this.showCommand('STOP!', 'stop');
                    this.stopCount++;
                    this.speak('STOP', () => {
                        this.scheduleNextRound();
                    });
                }
            }, this.rhythmDelay);
        }, this.rhythmDelay);
    }

    showCommand(text, type) {
        this.commandDisplay.textContent = text;
        this.commandDisplay.className = `command-display ${type}`;
        this.indicatorCircle.className = `indicator-circle ${type}`;
        this.indicatorCircle.textContent = text;
    }

    scheduleNextRound() {
        if (!this.isRunning) return;

        let countdown = this.intervalTime;
        this.countdownDisplay.textContent = `下一回合: ${countdown}秒`;

        const countdownInterval = setInterval(() => {
            if (!this.isRunning || this.isPaused) {
                clearInterval(countdownInterval);
                return;
            }

            countdown--;
            if (countdown > 0) {
                this.countdownDisplay.textContent = `下一回合: ${countdown}秒`;
            } else {
                this.countdownDisplay.textContent = '';
                clearInterval(countdownInterval);
            }
        }, 1000);

        setTimeout(() => {
            if (this.isRunning && !this.isPaused) {
                this.commandDisplay.textContent = '準備...';
                this.commandDisplay.className = 'command-display';
                this.indicatorCircle.className = 'indicator-circle ready';
                this.indicatorCircle.textContent = '';
            }
        }, 1500);

        this.timeoutId = setTimeout(() => {
            if (this.isRunning && !this.isPaused) {
                this.runRound();
            }
        }, this.intervalTime * 1000);
    }

    updateRoundDisplay() {
        this.currentRoundEl.textContent = this.currentRound;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.updatePauseButton();

        if (this.isPaused) {
            this.synth.cancel();
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.commandDisplay.textContent = '已暫停';
            this.countdownDisplay.textContent = '點擊繼續按鈕恢復訓練';
        } else {
            this.commandDisplay.textContent = '準備...';
            this.countdownDisplay.textContent = '';
            setTimeout(() => {
                if (this.isRunning && !this.isPaused) {
                    this.runRound();
                }
            }, 1500);
        }
    }

    updatePauseButton() {
        this.pauseBtn.textContent = this.isPaused ? '繼續' : '暫停';
    }

    stopTraining() {
        this.isRunning = false;
        this.synth.cancel();
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.finishTraining();
    }

    finishTraining() {
        this.isRunning = false;
        this.synth.cancel();

        this.totalRoundsResult.textContent = this.currentRound;
        this.goCountEl.textContent = this.goCount;
        this.stopCountEl.textContent = this.stopCount;

        this.successInput.value = 0;
        this.failInput.value = 0;

        this.loadHistory();

        this.showSection('result');
    }

    saveResult() {
        const success = parseInt(this.successInput.value) || 0;
        const fail = parseInt(this.failInput.value) || 0;

        if (success === 0 && fail === 0) {
            alert('請輸入成功或失敗次數！');
            return;
        }

        if (success + fail > this.currentRound) {
            alert(`錯誤：成功+失敗次數 (${success + fail}) 不能超過訓練回合數 (${this.currentRound})！`);
            return;
        }

        const history = this.getHistory();

        history.records.push({
            date: new Date().toISOString(),
            rounds: this.currentRound,
            goCount: this.goCount,
            stopCount: this.stopCount,
            success: success,
            fail: fail
        });

        history.totalSuccess += success;
        history.totalFail += fail;
        history.totalAttempts += (success + fail);

        localStorage.setItem('swingTrainingHistory', JSON.stringify(history));

        this.loadHistory();

        alert('結果已儲存！');
    }

    getHistory() {
        const stored = localStorage.getItem('swingTrainingHistory');
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            records: [],
            totalSuccess: 0,
            totalFail: 0,
            totalAttempts: 0
        };
    }

    loadHistory() {
        const history = this.getHistory();

        this.historyTotal.textContent = history.totalAttempts;
        this.historySuccess.textContent = history.totalSuccess;

        if (history.totalAttempts > 0) {
            const rate = (history.totalSuccess / history.totalAttempts * 100).toFixed(1);
            this.historyRate.textContent = `${rate}%`;
        } else {
            this.historyRate.textContent = '--%';
        }
    }

    clearHistory() {
        if (confirm('確定要清除所有歷史記錄嗎？')) {
            localStorage.removeItem('swingTrainingHistory');
            this.loadHistory();
            alert('歷史記錄已清除！');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SwingTraining();
});
