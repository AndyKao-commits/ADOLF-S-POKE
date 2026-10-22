# 血條與藍色進度條（第二版）

`hp-and-blue-bar-design.png` 已替換為第二版：薄深色外框、綠色斜線血條、下方細青藍色條。舊版可由 Git 歷史取得。尺寸 2172 × 724，透明 RGBA PNG。

## 執行預覽

在專案根目錄執行（需 Python 3）：

```sh
python3 -m http.server 8000
```

瀏覽器開啟：

```text
http://localhost:8000/assets/future-use/status-bars/preview.html
```

也可以直接開啟同資料夾的 `preview.html`。預覽不需要安裝套件。

## 工程使用方式

本 PNG 是透明背景的合併設計稿，包含固定長度的綠色及藍色填色，尚未接入遊戲。預覽中的圖片不會依數值變動。

僅展示外觀時可以使用（路徑以專案根目錄頁面為例）：

```html
<img src="assets/future-use/status-bars/hp-and-blue-bar-design.png"
     alt="綠色血條與藍色進度條"
     style="width: 240px; height: auto; image-rendering: pixelated;">
```

圖片包含上下透明留白；正式 HUD 排版前應依內容範圍裁切，不能把整張圖片的高度當作血條實際高度。

動態元件應依本稿製作獨立的外框、空底槽及滿格填色，再由程式裁切填色；不能縮放整張合併圖，否則外框與斜線會變形。合併圖中的綠色約 75%、藍色約 55%，不能直接拿現有填色當作滿格素材。

```js
// 在已有分層素材或 Canvas 繪製函式後使用；此段僅計算比例。
function ratio(value, maximum) {
  return maximum > 0 ? Math.min(1, Math.max(0, value / maximum)) : 0;
}
const hpRatio = ratio(currentHp, maxHp);
const visibleFillWidth = Math.round(fullFillWidth * hpRatio);
// 以 visibleFillWidth 裁切滿格填色，最後疊上固定外框。
```

角色名稱、血量數字、等級、藍條數值及更新時機由既有遊戲程式控制。藍條用途依遊戲邏輯決定。本次只替換預備素材與使用文件，尚未修改正式遊戲畫面。
