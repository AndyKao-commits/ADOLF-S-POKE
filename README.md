# 開唱 HomeKTV

Web 型態家庭 KTV 點歌系統：電視／電腦當播放器，手機當點歌遙控器。

## 功能

- **播放器** `/player.html`：YouTube 播放、待播歌單、4 位包廂號 + QR Code、卡拉 OK 字幕疊加
- **遙控** `/remote.html`：掃碼或輸入包廂號、搜尋點歌／插播、歌單管理、播放控制
- **搜尋**：伺服端 YouTube 搜尋（免 API Key），可自動加「伴奏 / KTV / karaoke / 左伴右唱」
- **歌詞**：LRCLIB 同步歌詞（免 API Key），逐字／逐行 highlight，可調時間偏移
- **人聲消除**：參考 [KarOK](https://karok.kaienet.work/) 的 Mid/Side 演算法（一般／自適應／高品質），在遙控頁開關與調強度

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

## 人聲消除說明

演算法參考 KarOK：在瀏覽器以 Web Audio 做 Mid/Side 中央人聲壓制（非 AI stem split）。

1. 手機遙控 →「遙控」分頁 → 開啟「人聲消除」
2. 播放器會下載可處理音軌，靜音 YouTube 原聲，改播處理後音訊（畫面仍用 MV）
3. 需要本機可用的 `yt-dlp`（用於取得音訊）；若取得失敗會自動退回原聲

```bash
pip install -U yt-dlp
# 或設定 YT_DLP_PATH=/path/to/yt-dlp
```

## 技術

- Vite + TypeScript（多頁：`player.html` / `remote.html`）
- Express + Socket.IO（房間狀態、歌單、遙控指令）
- YouTube 搜尋（innertube / HTML / Piped 備援，免 Data API Key）
- [LRCLIB](https://lrclib.net/docs) 歌詞
- YouTube IFrame Player API 播放 + Web Audio 人聲消除
- `yt-dlp` 音訊擷取（人聲消除用）
