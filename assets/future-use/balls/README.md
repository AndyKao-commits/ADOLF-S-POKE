# 四種精靈球圖示

每張為 40×40 透明 PNG，保留原始像素尺寸。這批與 `item-icons/master-ball.png` 為不同批次設計，工程應擇一使用以維持風格一致。尚未接入遊戲。

| 名稱 | 檔案 |
|---|---|
| 精靈球 Poké Ball | poke-ball.png |
| 超級球 Great Ball | great-ball.png |
| 高級球 Ultra Ball | ultra-ball.png |
| 大師球 Master Ball | master-ball.png |

## 執行預覽

在專案根目錄執行：

```sh
python3 -m http.server 8000
```

開啟 http://localhost:8000/assets/future-use/balls/preview.html 。也可直接用瀏覽器開啟本資料夾的 preview.html，不需安裝套件。

## 使用方式

從專案根目錄頁面引用：

```html
<img src="assets/future-use/balls/poke-ball.png" alt="精靈球"
     width="40" height="40" style="image-rendering: pixelated;">
```

替換檔名即可顯示其他球種。建議 40×40 或 80×80 整數倍顯示。Canvas 設定 `ctx.imageSmoothingEnabled = false`，待圖片載入後用 `ctx.drawImage(image, x, y, 40, 40)`。這些是靜態圖示；捕捉動畫、庫存數量、按鈕事件及捕捉機率由遊戲程式處理。
