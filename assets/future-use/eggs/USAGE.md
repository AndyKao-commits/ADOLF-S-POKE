# 孵化蛋：新版圖片與名稱

此四級孵化蛋已改用精靈球配色的孵化蛋外觀，順序為 **普通 → 稀有 → 傳說 → 史詩**。史詩為本系列最高級，依使用者指定。

| 等級 | 名稱 | 配色參考 | 正式命名檔（相對 assets/future-use） | 原路徑相容檔 |
|---|---|---|---|---|
| 1 | 普通孵化蛋 | 精靈球 | `hatching-eggs/hatching-egg-common.png` | `eggs/egg-level-1.png` |
| 2 | 稀有孵化蛋 | 超級球 | `hatching-eggs/hatching-egg-rare.png` | `eggs/egg-level-2.png` |
| 3 | 傳說孵化蛋 | 高級球 | `hatching-eggs/hatching-egg-legendary.png` | `eggs/egg-level-3.png` |
| 4 | 史詩孵化蛋 | 大師球 | `hatching-eggs/hatching-egg-epic.png` | `eggs/egg-level-4.png` |

所有小圖均為 40×48 透明 PNG。兩組路徑的檔案內容相同，舊引用不必改路徑即可顯示新圖。新接入建議使用具有名稱的 hatching-eggs 檔案，名稱對照見 `../hatching-eggs/manifest.json`。

`pokemon-egg-design.png` 保留為舊版通用設計參考，已不作為目前四級孵化蛋的預設圖。`render-eggs.cjs` 已改為從新命名檔同步四級相容圖片，不會再生成舊版配色。

## 規則

本次替換圖片、等級標記與預覽，不調整掉落率、孵化時間、花費、持有上限或獎勵。這些未定義的欄位維持待設定。不套用 70 道具中 Lucky Egg 的經驗加成。

新版改用 `../egg-hatching/egg-hatching.js` 共用 Canvas 孵化動畫，直接讀取四級蛋圖片，流程為搖晃、裂紋、局部閃光、顯示既定結果，播放 1.8 秒。詳見 [孵化動畫接入規則](../egg-hatching/README.md)。舊 `egg-hatching.gif` 保留參考，不再推薦接入；動畫時長不是實際孵化等待時間。

## 執行預覽

專案根目錄執行 `python3 -m http.server 8000`，開啟：

http://localhost:8000/assets/future-use/eggs/preview.html

預覽顯示新名稱與新圖片。亦可直接開啟 preview.html。

## 更新舊路徑相容圖片

在專案根目錄執行 `node assets/future-use/eggs/render-eggs.cjs`，將四張命名版素材同步到 egg-level-1～4。無額外套件。

## 引用範例

```html
<img src="assets/future-use/hatching-eggs/hatching-egg-common.png"
     alt="普通孵化蛋" width="40" height="48" style="image-rendering:pixelated">
```

建議顯示為 40×48 或 80×96，Canvas 關閉 imageSmoothingEnabled。尚未部署或接入正式遊戲的孵化流程。
