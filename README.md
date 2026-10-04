# 開唱 HomeKTV

Web 型態家庭 KTV 點歌系統：電視／電腦當播放器，手機當點歌遙控器。

## 功能

- **播放器** `/player.html`：YouTube 播放、待播歌單、4 位包廂號 + QR Code、卡拉 OK 字幕疊加
- **遙控** `/remote.html`：掃碼或輸入包廂號、搜尋點歌／插播、歌單管理、播放控制
- **搜尋**：伺服端 YouTube 搜尋（免 API Key），可自動加「伴奏 / KTV / karaoke / 左伴右唱」
- **歌詞**：LRCLIB 同步歌詞（免 API Key），逐字／逐行 highlight，可調時間偏移

## 快速開始

```bash
npm install
npm run dev
```

- 前端（Vite）：http://localhost:5173/
- 播放器：http://localhost:5173/player.html
- 遙控：http://localhost:5173/remote.html
- API / Socket：http://localhost:8787/

正式環境：

```bash
npm run build
npm start
```

預設監聽 `PORT=8787`。

## 使用方式

1. 在電視或電腦打開 `/player.html`，畫面會顯示包廂號碼與 QR Code
2. 手機掃碼（或打開 `/remote.html` 輸入 4 碼）加入
3. 搜尋歌曲 → 點歌／插播；播放器自動依序播放
4. 遙控可切歌、重唱、±10 秒、音量／靜音，並同步歌詞

## 技術

- Vite + TypeScript（多頁：`player.html` / `remote.html`）
- Express + Socket.IO（房間狀態、歌單、遙控指令）
- [youtubei.js](https://ytjs.dev/) 搜尋（免 YouTube Data API Key）
- [LRCLIB](https://lrclib.net/docs) 歌詞
- YouTube IFrame Player API 播放
