# 商店素材

`shop-only.png`：透明 PNG，512×448；原始設計 128×112，整數放大 4 倍。僅店鋪本體，不含店員、商品與招牌。尚未接入遊戲。

## 執行預覽

在專案根目錄執行：

```sh
python3 -m http.server 8000
```

開啟 http://localhost:8000/assets/future-use/shop/preview.html 。也可直接用瀏覽器開啟此資料夾的 preview.html，不需安裝套件。

## 使用方式

從專案根目錄頁面引用：

```html
<img src="assets/future-use/shop/shop-only.png" alt="商店"
     width="128" height="112" style="image-rendering: pixelated;">
```

建議顯示為 128×112、256×224 或 512×448，維持比例。Canvas 請設定 `ctx.imageSmoothingEnabled = false`，圖片載入後用 `ctx.drawImage(image, x, y, 128, 112)` 繪製。PNG 只負責外觀，碰撞範圍、互動距離、開啟商店介面及購買邏輯由遊戲程式另行設定。

## 局內交易貨幣

本次商店購買道具使用遊戲中掉落的糖果代幣，圖案為 `assets/future-use/candy/candy-token.png`。規則與預覽見 [糖果代幣說明](../candy/README.md)。此代幣與永久強化金幣、升級道具 Rare Candy 分開記錄。實際商品代幣價格尚未設定；不得直接套用永久強化價格。
