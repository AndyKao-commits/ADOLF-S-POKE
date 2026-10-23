# 掉落用幸運蛋：四個顏色

等級順序依使用者指定：**普通 → 稀有 → 傳說 → 史詩**。此系列的史詩高於傳說，不套用其他道具的五級分法。

| 等級 | 精靈球配色參考 | 檔案 |
|---|---|---|
| 普通 | 精靈球：紅白 | lucky-egg-common.png |
| 稀有 | 超級球：藍紅 | lucky-egg-rare.png |
| 傳說 | 高級球：黑金 | lucky-egg-legendary.png |
| 史詩 | 大師球：紫粉 | lucky-egg-epic.png |

每張為 40×48 透明 PNG，同款蛋形、像素風外框；可用於對局掉落圖示。`manifest.json` 記錄等級、排序、配色及圖片對應，`preview.png` 是四級預覽。圖片由生成圖集切出主體後以 nearest-neighbor 縮小並置中。

本批已替換既有 `eggs/egg-level-1.png`～`egg-level-4.png`，分別對應普通、稀有、傳說、史詩。命名版檔案與舊路徑相容版圖像完全一致。亦不自動套用 70 道具中 Lucky Egg 的「經驗 +15%／持有上限 10」能力。這些是否是同一遊戲機制尚未指定。

掉落率、拾取後功能、獎勵池、數量上限及孵化時間與獎勵設定尚未指定。本次完成四級外觀與素材標記，未接入遊戲。

## 執行預覽

專案根目錄執行 `python3 -m http.server 8000`，開啟：

http://localhost:8000/assets/future-use/lucky-eggs/preview.html

亦可直接用瀏覽器開啟 preview.html。

## 使用

```html
<img src="assets/future-use/lucky-eggs/lucky-egg-common.png"
     alt="普通幸運蛋" width="40" height="48" style="image-rendering:pixelated">
```

替換檔名可切換等級，建議 40×48 或 80×96 整數倍顯示。Canvas 關閉 `imageSmoothingEnabled`，待圖片載入後以 `drawImage(image, x, y, 40, 48)` 繪製。

新版孵化視覺使用 [共用 Canvas 動畫](../egg-hatching/README.md)，直接讀取本目錄四級蛋圖，不需要四份 GIF。
