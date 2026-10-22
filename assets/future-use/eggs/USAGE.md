# 精靈蛋：素材、規則及執行方式

## 檔案位置

- `pokemon-egg-design.png`：新版奶黃色蛋殼、綠色斑點的通用外觀，透明 PNG。不預設為某一級。
- `egg-level-1.png`～`egg-level-4.png`：既有四級小圖，40×48，分別為綠、藍、紫、金色斑點。
- `../egg-hatching/egg-hatching.gif`：既有 256×256、4.16 秒循環孵化動畫，只是共用美術示範。

## 規則狀態

四級目前只有外觀分級；孵化時間、花費、掉落來源、各級獎勵池、機率及持有上限尚未定義。不得把 4.16 秒的 GIF 長度當成實際孵化時間，也不能從斑點顏色推定稀有度機率。通用大圖與四級小圖是不同美術版本，尚未做成統一尺寸或各級專屬孵化動畫。

工程流程建議：取得蛋後保存唯一 ID、等級與狀態；條件達成時先保存孵化結果，再播放動畫並展示結果。同一顆蛋僅結算一次，動畫重播或重新整理不可重複發獎。這是接入規格建議，尚未實作。數值未定的欄位在 `docs/specs/candy-and-eggs.json` 記為 null，正式接入前需補齊。

## 執行預覽

專案根目錄執行 `python3 -m http.server 8000`，開啟：

http://localhost:8000/assets/future-use/eggs/preview.html

也可直接開啟本資料夾 preview.html。GIF 自動循環；預覽不建立蛋、不計時、不抽獎或發放寶可夢。

## 接入方式

根目錄頁面引用通用圖：

```html
<img src="assets/future-use/eggs/pokemon-egg-design.png" alt="精靈蛋"
     width="80" style="height:auto;image-rendering:pixelated">
```

四級小圖可用 `egg-level-1.png` 等檔名，建議 40×48 或 80×96 整數倍顯示。動畫可用 `<img src="assets/future-use/egg-hatching/egg-hatching.gif" alt="孵化動畫">` 展示，但循環 GIF 沒有可供可靠結算的播放完成事件；正式孵化應由遊戲狀態控制結算，不靠 GIF 迴圈發獎。Canvas 請關閉 imageSmoothingEnabled。
