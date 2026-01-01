// 揮棒反應訓練系統

class SwingTraining {
    constructor() {
        // 元素引用
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
        
        this.settingsSection = document.getElementById('settingsSection');
        this.trainingSection = document.getElementById('trainingSection');
        this.resultSection = document.getElementById('resultSection');
        
        // 狀態
        this.isRunning = false;
        this.isPaused = false;
        this.currentRound = 0;
        this.totalRounds = 10;
        this.intervalTime = 3;
        this.goRatio = 50;
        this.rhythmDelay = 700; // 節奏間隔（毫秒）
        this.goCount = 0;
        this.stopCount = 0;
        this.timeoutId = null;
        
        // 語音合成
        this.synth = window.speechSynthesis;
        this.voices = [];
        
        // 初始化
        this.init();
    }
    
    init() {
        this.loadVoices();
        this.bindEvents();
    }
    
    loadVoices() {
        // 載入可用的語音
        this.voices = this.synth.getVoices();
        
        // 如果語音列表尚未載入，等待載入完成
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
    }
    
    showSection(section) {
        this.settingsSection.style.display = section === 'settings' ? 'block' : 'none';
        this.trainingSection.style.display = section === 'training' ? 'block' : 'none';
        this.resultSection.style.display = section === 'result' ? 'block' : 'none';
    }
    
    speak(text, callback) {
        // 取消任何正在進行的語音
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2; // 固定語音速度
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // 嘗試使用中文語音
        const chineseVoice = this.voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn'));
        if (chineseVoice) {
            utterance.voice = chineseVoice;
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
        
        // 重置狀態
        this.currentRound = 0;
        this.goCount = 0;
        this.stopCount = 0;
        this.isRunning = true;
        this.isPaused = false;
        
        // 更新 UI
        this.totalRoundsEl.textContent = this.totalRounds === 0 ? '∞' : this.totalRounds;
        this.updateRoundDisplay();
        this.showSection('training');
        this.updatePauseButton();
        
        // 開始訓練
        this.commandDisplay.textContent = '準備...';
        this.commandDisplay.className = 'command-display';
        this.indicatorCircle.className = 'indicator-circle ready';
        this.indicatorCircle.textContent = '';
        
        // 延遲開始第一回合
        setTimeout(() => {
            if (this.isRunning) {
                this.runRound();
            }
        }, 2000);
    }
    
    runRound() {
        if (!this.isRunning || this.isPaused) return;
        
        // 檢查是否已完成所有回合
        if (this.totalRounds > 0 && this.currentRound >= this.totalRounds) {
            this.finishTraining();
            return;
        }
        
        this.currentRound++;
        this.updateRoundDisplay();
        
        // 決定這回合是 GO 還是 STOP
        const isGo = Math.random() * 100 < this.goRatio;
        
        // 開始倒數序列：1 -> 2 -> GO/STOP
        this.playSequence(isGo);
    }
    
    playSequence(isGo) {
        // 顯示和播放 "1"
        this.showCommand('1', 'counting');
        this.speak('1');
        
        // 使用節奏延遲控制間隔
        setTimeout(() => {
            if (!this.isRunning || this.isPaused) return;
            
            // 顯示和播放 "2"
            this.showCommand('2', 'counting');
            this.speak('2');
            
            setTimeout(() => {
                if (!this.isRunning || this.isPaused) return;
                
                // 顯示 GO 或 STOP
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
        
        // 顯示倒數計時
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
        
        // 重置顯示
        setTimeout(() => {
            if (this.isRunning && !this.isPaused) {
                this.commandDisplay.textContent = '準備...';
                this.commandDisplay.className = 'command-display';
                this.indicatorCircle.className = 'indicator-circle ready';
                this.indicatorCircle.textContent = '';
            }
        }, 1500);
        
        // 安排下一回合
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
            // 暫停
            this.synth.cancel();
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.commandDisplay.textContent = '已暫停';
            this.countdownDisplay.textContent = '點擊繼續按鈕恢復訓練';
        } else {
            // 繼續
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
        this.pauseBtn.textContent = this.isPaused ? '▶️ 繼續' : '⏸️ 暫停';
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
        
        // 更新結果
        this.totalRoundsResult.textContent = this.currentRound;
        this.goCountEl.textContent = this.goCount;
        this.stopCountEl.textContent = this.stopCount;
        
        // 顯示結果頁面
        this.showSection('result');
        
        // 播放完成語音
        setTimeout(() => {
            this.speak(`訓練完成！共 ${this.currentRound} 回合，GO ${this.goCount} 次，STOP ${this.stopCount} 次。`);
        }, 500);
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    new SwingTraining();
});
