# 糖果：素材、規則及執行方式

`rare-candy-design.png` 是新版藍色糖體與扭結包裝設計圖，透明 PNG。另一版 64×64 小圖在 `../item-icons/rare-candy.png`；兩者是同一道具的不同美術版本，擇一使用，不新增第二套道具。

## 已記錄規則

- 名稱：Rare Candy；等級：神話（黃色名稱）。
- 能力：立即升級 +2，傷害 +5%。
- 每局持有上限：10。上限不等於必定能觸發 10 次。
- 依先前截圖記錄，與 `item-icons/manifest.json` 對齊。觸發方式是拾取、選取或手動使用，以及傷害加成的疊加算法，截圖未指定，接入前需明確設定。
- 本圖不代表跨局永久加成。現有專案未找到糖果執行邏輯，本次先保存素材及規格。

## 執行預覽

專案根目錄執行 `python3 -m http.server 8000`，開啟：

http://localhost:8000/assets/future-use/candy/preview.html

亦可直接開啟本資料夾 preview.html。預覽只展示圖片，不套用能力。

## 接入方式

從根目錄頁面引用 `<img src="assets/future-use/candy/rare-candy-design.png" alt="糖果" width="80" style="height:auto;image-rendering:pixelated">`。

完整設計圖有透明留白，正式製作小圖前應依主體範圍裁切並核對尺寸，勿直接壓成正方形。需要現成小圖可改用 `assets/future-use/item-icons/rare-candy.png`，以 32 或 64 像素顯示。Canvas 請關閉 imageSmoothingEnabled。程式讀取規格見 `docs/specs/candy-and-eggs.json`。
