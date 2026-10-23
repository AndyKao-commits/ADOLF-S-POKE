# 主頁響應式排版規格：內容框、自適應與背景展示

狀態：工程實作規格。本文件整理桌面版主頁的版面問題、期望結果，以及手機、平板、桌面與橫向裝置共用的排版規則。功能內容沿用 `docs/specs/solo-run-selection.md`，本文件只定義主頁容器與響應式行為。

## 使用者需求

目前電腦版主頁的左側「單人出戰設定」與右側「多人房間」外框接近填滿整個可用高度，但實際內容只占上方一小部分。框內下方因此產生大量空白，同時遮住地圖、寶可夢、商店、岩石、水晶及其他背景細節。

期望結果：

1. 左右框的高度只需要包住自己的內容，不應為了填滿畫面而拉長。
2. 左側設定、中央角色、右側房間三欄整體水平置中，左右視覺重量保持平衡。
3. 左右框頂端對齊；不因兩邊內容高度不同而各自垂直置中。
4. 框外多出的空間保留給遊戲背景、場景物件與環境動畫展示。
5. 中央夥伴、出戰摘要及「開始遊戲」仍是主畫面的主要焦點。
6. 底部九個功能入口維持可操作，不與上方內容重疊。
7. 版面必須依可用寬度、高度、畫面方向與安全區自動調整，不以手機型號建立例外清單。

## 現況與工程位置

現行結構位於：

- 主頁 DOM：`index.html` 的 `#scr-menu`。
- 主頁樣式：`css/style.css` 的「menú principal」段落與後方 media queries。
- 左側框：`.menu-modes`。
- 中央展示：`.menu-stage`。
- 右側框：`.menu-room`。
- 底部入口：`.menu-dock`。

目前 `#scr-menu` 使用三欄 Grid。桌面基礎規則已出現 `height: auto`，但後方低高度 media query 會把 `.menu-modes` 改成 `height: 100%`、`align-self: stretch`，並讓內部項目使用 `flex: 1`。實作時必須檢查 cascade，避免較後方規則把內容高度重新拉滿。

不得在桌面左右框套用以下規則：

```css
height: 100%;
min-height: 100%;
align-self: stretch;
flex: 1;
inset-block: 0;
```

如果低高度橫向模式確實需要壓縮內容，應縮小間距、角色與次要文字，而不是把側框撐滿。

## 共用尺寸公式

不要把主頁高度寫死為某一款手機尺寸。可用內容高度定義為：

```text
availableHeight = 100dvh
                - topBarHeight
                - bottomDockHeight
                - safeAreaTop
                - safeAreaBottom
```

CSS 變數建議：

```css
:root {
  --menu-top-h: clamp(48px, 7dvh, 64px);
  --menu-dock-h: clamp(62px, 10dvh, 86px);
  --menu-gap: clamp(8px, 2vw, 24px);
  --menu-panel-pad: clamp(12px, 1.5vw, 16px);
}
```

使用 `100dvh`，不要只使用 `100vh`。`dvh` 會跟著手機網址列、瀏海與瀏覽器控制列變動，較接近當下真正可見區域。

主頁安全區：

```css
#scr-menu {
  min-height: 100dvh;
  padding:
    calc(var(--menu-top-h) + env(safe-area-inset-top))
    max(var(--menu-gap), env(safe-area-inset-right))
    calc(var(--menu-dock-h) + env(safe-area-inset-bottom))
    max(var(--menu-gap), env(safe-area-inset-left));
}
```

所有可縮放尺寸採用：

```text
clamp(可接受最小值, 依畫面變動值, 可接受最大值)
```

不要只使用 `vw` 或只使用百分比，否則超寬螢幕會放得過大，小手機則可能縮得無法操作。

## 桌面版與大型平板

適用條件：寬度至少 900px，且可用高度大於 620px。

| 區域 | 建議寬度 | 高度規則 |
|---|---:|---|
| 左側單人設定 | 270–300px | `max-content`，隨內容 |
| 中央角色區 | 380–560px | 使用中間剩餘空間 |
| 右側多人房間 | 270–300px | `max-content`，隨內容 |
| 欄間距 | 24–48px | 使用 `clamp()` |
| 三欄總寬上限 | 1280–1360px | 水平置中 |

建議基準規則：

```css
@media (min-width: 900px) and (min-height: 621px) {
  #scr-menu {
    grid-template-columns:
      clamp(270px, 22vw, 300px)
      minmax(380px, 560px)
      clamp(270px, 22vw, 300px);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      "modes stage room"
      "dock dock dock";
    column-gap: clamp(24px, 3vw, 48px);
    width: min(100%, 1360px);
    margin-inline: auto;
    justify-content: center;
    align-items: start;
  }

  .menu-modes,
  .menu-room {
    width: 100%;
    height: max-content;
    min-height: 0;
    max-height: none;
    align-self: start;
    justify-self: center;
    padding: var(--menu-panel-pad);
  }

  .menu-stage {
    width: 100%;
    min-width: 0;
    align-self: stretch;
  }
}
```

左右框的標題基準線應對齊。框體高度不同是正常結果，下方露出的區域直接顯示背景，不補空白面板，也不加入無功能的裝飾框。

## 手機與直向平板

適用條件：寬度低於 900px。改成單欄，不把三欄縮成三條狹窄直欄。

建議順序：

```text
標題／中央夥伴
→ 單人出戰設定
→ 開始遊戲與本局摘要
→ 多人房間
→ 底部功能列
```

若既有 DOM 不便拆分 `.menu-stage`，第一輪可以採用 `stage → modes → room → dock`，但必須確保「開始遊戲」在首次可見或一次短距離捲動內可到達。

```css
@media (max-width: 899px) {
  #scr-menu {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "stage"
      "modes"
      "room"
      "dock";
    gap: clamp(10px, 3vw, 18px);
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }

  .menu-stage,
  .menu-modes,
  .menu-room {
    width: min(100%, 560px);
    height: max-content;
    margin-inline: auto;
  }
}
```

手機內容若超過畫面高度，允許主內容垂直捲動。不得透過整體 `transform: scale()` 把所有按鈕縮小到難以觸控。

## 低高度與手機橫向

低高度不能只根據寬度判定。橫向手機可能寬度超過 900px，但高度不足以使用完整桌面版。

低高度標準：`max-height: 620px`。處理順序：

1. 縮小上下 padding 與區塊 gap。
2. 縮小夥伴展示區，但維持像素整數倍率或 `image-rendering: pixelated`。
3. 隱藏次要說明文字，例如入口副標、地圖補充說明與統計次要行。
4. 保留模式、地圖、難度、開始遊戲、房號輸入等主要操作。
5. 最後才允許主內容捲動；不可裁切主要按鈕。

```css
@media (max-height: 620px) {
  :root {
    --menu-top-h: 44px;
    --menu-dock-h: 58px;
  }

  #scr-menu { gap: 6px; }

  #menu-partner {
    width: clamp(112px, 24dvh, 170px);
    height: clamp(88px, 19dvh, 132px);
  }

  .menu-modes,
  .menu-room { padding: 8px; }
}
```

手機橫向可保留三欄，但必須採緊湊內容：

```css
@media (orientation: landscape) and (max-height: 520px) {
  #scr-menu {
    grid-template-columns:
      minmax(200px, 30vw)
      minmax(220px, 1fr)
      minmax(210px, 32vw);
    grid-template-areas:
      "modes stage room"
      "dock dock dock";
  }

  .menu-item small,
  #menu-region-help,
  .secondary-text { display: none; }
}
```

若三欄總最小寬度加間距大於實際可用寬度，必須回退單欄或兩欄，不允許產生水平溢出。

## 按鈕與底部功能列

所有可操作目標至少 44×44 CSS px：

```css
button,
input,
select,
[role="button"] {
  min-height: 44px;
}
```

底部九個入口在桌面維持一排平均分配。小手機寬度不足時，允許橫向捲動，不能硬縮成無法辨識的九個小格：

```css
.menu-dock {
  display: flex;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.menu-dock::-webkit-scrollbar { display: none; }

@media (max-width: 899px) {
  .menu-dock .menu-item {
    flex: 0 0 clamp(68px, 18vw, 92px);
  }
}
```

底部功能列若採固定定位，主內容底部 padding 必須包含功能列高度與 `safe-area-inset-bottom`，避免「開始遊戲」或多人按鈕被遮住。

## 不可破壞的功能

這次排版修改不得更動：

- 模式、地圖、難度的資料與保存邏輯。
- 五種模式 ID、九地區 ID 與難度倍率。
- 多人房間的建立、加入、房號驗證與同步。
- 夥伴選擇、等級、異色狀態與動畫。
- 底部九個入口的路由與提示狀態。
- 背景世界的更新與繪製頻率。
- 既有手機遊戲內 HUD；本文件只處理主頁。

不要複製一份手機 DOM。桌面與手機應共用相同語意結構，以 CSS Grid、Flex 排序與必要的內容容器完成響應式排版。

## 驗收矩陣

至少測試下列 viewport。測試時需同時包含瀏覽器網址列顯示／收合，以及有安全區的裝置模擬。

| 類型 | Viewport | 應採排版 |
|---|---:|---|
| 小型手機直向 | 320×568 | 單欄、可捲動、按鈕不小於 44px |
| iPhone 常見直向 | 390×844 | 單欄、無水平溢出 |
| Android 常見直向 | 412×915 | 單欄、中央與框水平置中 |
| 小型手機橫向 | 568×320 | 緊湊版，主要操作完整 |
| 手機橫向 | 844×390 | 緊湊三欄或安全回退，不溢出 |
| 平板直向 | 768×1024 | 單欄或兩欄，不能是壓縮三欄 |
| 平板橫向 | 1024×768 | 三欄，左右框依內容高度 |
| 筆電 | 1366×768 | 三欄水平置中，背景充分露出 |
| 桌面 | 1920×1080 | 三欄不無限放大，總寬不超過 1360px |

每個尺寸都要通過：

1. 無水平 scrollbar。
2. 左右框沒有因版面撐開而出現大片框內空白。
3. 左右框頂端對齊，三欄整體水平置中。
4. 所有主要按鈕可見、可點且不被底部列遮住。
5. 開啟模式、地圖或難度宮格時，對話框不超出可視區。
6. 軟鍵盤打開並輸入房號時，輸入框與提交按鈕仍可見。
7. 旋轉裝置後版面立即重新排列，沒有殘留的固定高度。
8. 背景仍持續顯示與更新，框外空間沒有額外遮罩。
9. 文字放大至 200% 時仍可捲動完成主要操作。
10. `prefers-reduced-motion` 不影響版面尺寸與可操作性。

## 完成定義

工程完成時應提供桌面、手機直向與手機橫向三張實際瀏覽器截圖，並說明測試 viewport。只改 mockup 或設計圖不算完成；必須在 `index.html`、`css/style.css` 與實際主頁互動中驗證。若為了排版修改 DOM，需同步檢查 `js/ui/menu.js` 的 selector 仍可取得原元素。

最終視覺原則：框只承載操作內容，遊戲世界負責填滿其餘空間；裝置越大，增加的是背景展示範圍，不是面板內的空白。
