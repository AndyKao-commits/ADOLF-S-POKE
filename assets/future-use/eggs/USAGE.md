# 孵化蛋／幸運蛋：新版圖片與名稱

此四級孵化蛋已改用精靈球配色的幸運蛋外觀，順序為 **普通 → 稀有 → 傳說 → 史詩**。史詩為本系列最高級，依使用者指定。

| 等級 | 名稱 | 配色參考 | 正式命名檔（相對 assets/future-use） | 原路徑相容檔 |
|---|---|---|---|---|
| 1 | 普通幸運蛋 | 精靈球 | `lucky-eggs/lucky-egg-common.png` | `eggs/egg-level-1.png` |
| 2 | 稀有幸運蛋 | 超級球 | `lucky-eggs/lucky-egg-rare.png` | `eggs/egg-level-2.png` |
| 3 | 傳說幸運蛋 | 高級球 | `lucky-eggs/lucky-egg-legendary.png` | `eggs/egg-level-3.png` |
| 4 | 史詩幸運蛋 | 大師球 | `lucky-eggs/lucky-egg-epic.png` | `eggs/egg-level-4.png` |

所有小圖均為 40×48 透明 PNG。兩組路徑的檔案內容相同，舊引用不必改路徑即可顯示新圖。新接入建議使用具有名稱的 lucky-eggs 檔案，名稱對照見 `../lucky-eggs/manifest.json`。

`pokemon-egg-design.png` 保留為舊版通用設計參考，已不作為目前四級孵化蛋的預設圖。`render-eggs.cjs` 已改為從新命名檔同步四級相容圖片，不會再生成舊版配色。

## 規則

本次替換圖片、等級標記與預覽，不調整掉落率、孵化時間、花費、持有上限或獎勵。這些未定義的欄位維持待設定。不套用 70 道具中 Lucky Egg 的經驗加成。

既有 `../egg-hatching/egg-hatching.gif` 仍是舊綠斑蛋的共用動畫示範，尚未重畫成此四種配色；預覽不再把它當作新版四級蛋的對應動畫。GIF 的 4.16 秒不是實際孵化時間。

## 執行預覽

專案根目錄執行 `python3 -m http.server 8000`，開啟：

http://localhost:8000/assets/future-use/eggs/preview.html

預覽顯示新名稱與新圖片。亦可直接開啟 preview.html。

## 更新舊路徑相容圖片

在專案根目錄執行 `node assets/future-use/eggs/render-eggs.cjs`，將四張命名版素材同步到 egg-level-1～4。無額外套件。

## 引用範例

```html
<img src="assets/future-use/lucky-eggs/lucky-egg-common.png"
     alt="普通幸運蛋" width="40" height="48" style="image-rendering:pixelated">
```

建議顯示為 40×48 或 80×96，Canvas 關閉 imageSmoothingEnabled。尚未部署或接入正式遊戲的孵化流程。
