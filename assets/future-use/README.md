# 待使用遊戲素材：店鋪、孵化動畫與精靈蛋

此目錄為之後使用而保存的獨立素材，尚未接入遊戲。不要將「已存檔」視為「已部署」。

| 標記 | 檔案 | 規格與用途 |
|---|---|---|
| 店鋪 | `shop/shop-only.png` | 512×448，透明 PNG；僅店鋪本體，無角色、商品、蛋、招牌、箱子。原始設計解析度 128×112，整數倍放大 4 倍。 |
| 孵化動畫 | `egg-hatching/egg-hatching.gif` | 256×256，透明背景，51 個編碼影格、4.16 秒，循環播放；搖晃→裂紋→破殼。 |
| 精靈蛋 1 級 | `eggs/egg-level-1.png` | 40×48，透明 PNG，綠色斑紋，1 個等級標點。 |
| 精靈蛋 2 級 | `eggs/egg-level-2.png` | 40×48，透明 PNG，藍色斑紋，2 個等級標點。 |
| 精靈蛋 3 級 | `eggs/egg-level-3.png` | 40×48，透明 PNG，紫色斑紋，3 個等級標點。 |
| 精靈蛋 4 級 | `eggs/egg-level-4.png` | 40×48，透明 PNG，金色斑紋，4 個等級標點。 |

四級配色為本批素材的視覺分級，不代表已設定遊戲中的稀有度、孵化時間或掉落機率。孵化 GIF 是既有綠斑蛋的共用示範，尚未製作各級專屬動畫。全部素材以 nearest-neighbor 整數倍顯示，避免模糊。未更動雲端資料或玩家紀錄。

`manifest.json` 記錄用途、尺寸、影格數與 SHA-256；`eggs/render-eggs.cjs` 為四級蛋的原生像素繪製來源（需要 `@napi-rs/canvas`）。

## 商店與精靈球預覽／執行方式

在專案根目錄執行 `python3 -m http.server 8000`：

- 商店：`http://localhost:8000/assets/future-use/shop/preview.html`，詳見 [商店使用說明](shop/README.md)。
- 四種精靈球：`http://localhost:8000/assets/future-use/balls/preview.html`，詳見 [精靈球使用說明](balls/README.md)。

四種球圖示位於 `balls/`，每張 40×40 透明 PNG。預覽頁亦可直接在瀏覽器開啟；本批為靜態素材，不會啟動商店或捕捉功能。
