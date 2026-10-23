# 待使用遊戲素材：店鋪、孵化動畫與孵化蛋

此目錄為之後使用而保存的獨立素材，尚未接入遊戲。不要將「已存檔」視為「已部署」。

| 標記 | 檔案 | 規格與用途 |
|---|---|---|
| 店鋪 | `shop/shop-only.png` | 512×448，透明 PNG；僅店鋪本體，無角色、商品、蛋、招牌、箱子。原始設計解析度 128×112，整數倍放大 4 倍。 |
| 孵化動畫 | `egg-hatching/egg-hatching.gif` | 256×256，透明背景，51 個編碼影格、4.16 秒，循環播放；搖晃→裂紋→破殼。 |
| 普通孵化蛋（1 級） | `eggs/egg-level-1.png` | 40×48，透明 PNG；精靈球配色，對應 `hatching-eggs/hatching-egg-common.png`。 |
| 稀有孵化蛋（2 級） | `eggs/egg-level-2.png` | 40×48，透明 PNG；超級球配色，對應 `hatching-eggs/hatching-egg-rare.png`。 |
| 傳說孵化蛋（3 級） | `eggs/egg-level-3.png` | 40×48，透明 PNG；高級球配色，對應 `hatching-eggs/hatching-egg-legendary.png`。 |
| 史詩孵化蛋（4 級） | `eggs/egg-level-4.png` | 40×48，透明 PNG；大師球配色，對應 `hatching-eggs/hatching-egg-epic.png`。 |

四級配色為本批素材的視覺分級，不代表已設定遊戲中的稀有度、孵化時間或掉落機率。孵化 GIF 是既有綠斑蛋的共用示範，尚未製作各級專屬動畫。全部素材以 nearest-neighbor 整數倍顯示，避免模糊。未更動雲端資料或玩家紀錄。

`manifest.json` 記錄用途、尺寸、影格數與 SHA-256；`eggs/render-eggs.cjs` 為新版四級蛋相容路徑的同步腳本（新版改為同步命名版圖檔，無額外套件）。

## 商店與精靈球預覽／執行方式

在專案根目錄執行 `python3 -m http.server 8000`：

- 商店：`http://localhost:8000/assets/future-use/shop/preview.html`，詳見 [商店使用說明](shop/README.md)。
- 四種精靈球：`http://localhost:8000/assets/future-use/balls/preview.html`，詳見 [精靈球使用說明](balls/README.md)。

四種球圖示位於 `balls/`，每張 40×40 透明 PNG。預覽頁亦可直接在瀏覽器開啟；本批為靜態素材，不會啟動商店或捕捉功能。

## 糖果與精靈蛋

- [糖果代幣規則及預覽方式](candy/README.md)：新版大圖 `candy/candy-token.png`。
- [精靈蛋規則及預覽方式](eggs/USAGE.md)：新版大圖 `eggs/pokemon-egg-design.png`、四級蛋與孵化動畫。
- 工程資料表：`docs/specs/candy-and-eggs.json`。尚未接入正式遊戲。

## 夥伴熟練度光效

[金級微光／鑽石金光模組與實作規則](partner-aura/README.md)。執行 `python3 -m http.server 8000` 後開啟 `http://localhost:8000/assets/future-use/partner-aura/preview.html`。可執行的視覺模組，尚未接入正式遊戲與熟練度資料。

## 掉落用四級孵化蛋

[普通／稀有／傳說／史詩孵化蛋](hatching-eggs/README.md)，依四種精靈球配色製作，已替換四級孵化蛋圖片。40×48 透明 PNG，尚未接入遊戲掉落流程。

## 新版共用孵化動畫

四級孵化蛋共用 `egg-hatching/egg-hatching.js`，播放 1.8 秒，支援跳過及減少動態。[執行與接入規則](egg-hatching/README.md)。舊綠斑 GIF 保留參考，正式接入以新模組為準，尚未部署。
