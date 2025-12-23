# 投球動作分析系統

這是一個用於分析投手投球動作的網頁應用程式。

## 功能

- 上傳投球影片
- 標記抬腳時間和球離手時間
- 自動裁剪影片並進行 AlphaPose + MotionBERT 分析

## 架構

- **前端**: 靜態 HTML/CSS/JS (可部署到 GitHub Pages)
- **後端**: Flask Python 伺服器 (需要本地運行)

## 使用方式

### 1. 啟動本地後端

```bash
cd ~/project
python app.py
```

後端會在 `http://localhost:5000` 啟動。

### 2. 使用 ngrok 暴露本地後端 (遠端存取用)

如果需要從 GitHub Pages 連接到本地後端，需要使用 ngrok：

```bash
# 安裝 ngrok (如果尚未安裝)
# https://ngrok.com/download

# 啟動 ngrok
ngrok http 5000
```

ngrok 會提供一個公開 URL，例如 `https://xxxx.ngrok.io`

### 3. 在網頁上設定後端位址

1. 開啟網站: https://你的用戶名.github.io/project/
2. 在右上角輸入框中貼上 ngrok URL
3. 點擊「連接」
4. 上傳影片並標記時間點

## 本地開發

直接開啟 `static/index.html` 或啟動 Flask 伺服器後訪問 `http://localhost:5000`

## 依賴

### 後端
- Python 3.x
- Flask
- flask-cors
- ffmpeg

### 分析腳本
- AlphaPose
- MotionBERT
- Conda 環境
