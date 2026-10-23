# 單人出戰主頁－可操作原型

這個原型把 `docs/specs/solo-run-selection.md` 的規劃做成可點選的實際頁面。它引用目前 Git 內的素材與資料：

- 卡比獸：`assets/pokemon/143/Idle.png`，依 `js/data/sprites-meta.js` 的 32×64 幀繪製。
- 九張地圖縮圖：由 `js/world/regions.js`、`region-art.js` 與 `world.js` 實際渲染。
- 球、商店：`assets/future-use/balls` 與 `assets/future-use/shop`。
- 模式、地圖、難度名稱與倍率：`docs/specs/solo-run-selection.md`。

## 執行

請從專案根目錄啟動靜態伺服器（不要直接雙擊 HTML）：

```bash
python3 -m http.server 8080
```

瀏覽器開啟：

```text
http://localhost:8080/docs/prototypes/solo-menu/
```

若地區地形規則有修改，重新產生選單地圖：

```bash
node tools/render-solo-menu-maps.cjs
```

重新產生兩張審查用畫面：

```bash
python3 tools/render-solo-menu-preview.py
```

- `actual-main.png`：主頁套用「異色模式／神奧／惡夢」的實際配置圖。
- `actual-map-picker.png`：開啟地圖宮格後的實際配置圖。

## 功能用法

1. 點「模式」、「地圖」或「難度」開啟宮格。
2. 點選一格後立即套用、關閉宮格，並保存到瀏覽器 `localStorage`。
3. 摘要會同步顯示在卡比獸下方；重新整理仍保留選項。
4. 點「開始遊戲」查看已鎖定的設定與難度倍率。
5. 多人區會檢查房號是否為六位英數；下方九個入口會回應目前入口用途。

## 範圍

這是主頁互動與視覺驗證原型。它不會啟動正式戰鬥、建立真實多人房間，亦不會改寫現行存檔。接入正式遊戲時，開局按鈕須依規格建立不可變的本局設定，並將難度倍率只套用一次。
