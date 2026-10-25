# 地圖圖示

此資料夾存放小地圖、暫停地圖與地圖物件清單共用的像素圖示。成品皆為 64×64 PNG、透明背景，顯示時由 HUD 依地圖比例縮放。

| 檔案 | 用途 | 判定規則 |
|---|---|---|
| `enemy.png` | 小怪 | 非 Boss 且沒有菁英標記的敵人 |
| `elite.png` | 菁英怪 | `eliteWave` 或 `eliteMods` 存在 |
| `boss.png` | BOSS | `boss === true`，優先於菁英判定 |
| `shop.png` | 商店 | `G.World.shops` 中的商店位置 |
| `hatching-egg.png` | 孵化蛋 | `G.Pickups` 中 `kind === 'egg'` 的掉落物 |

## 執行方式

`js/ui/hud.js` 會在載入時預載本資料夾的圖示；`drawMark()` 同時供右上角雷達與完整地圖使用。地圖物件清單也使用相同檔案，因此之後若替換同名 PNG，不需再改程式。

若圖檔尚未載入完成，HUD 會暫時使用原本的幾何標記，不會造成地圖空白。
