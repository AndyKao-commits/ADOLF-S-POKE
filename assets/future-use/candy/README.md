# 糖果代幣：素材、規則及執行方式

`candy-token.png`：藍色糖體與扭結包裝的透明 PNG，1536×1024。原檔 `rare-candy-design.png` 已更名，避免與升級道具混淆。

## 已確認規則

- 糖果是局內商店貨幣：在遊戲中掉落，玩家拾取後增加糖果代幣餘額。
- 在遊戲中的商店，以糖果代幣購買道具。
- 糖果代幣與永久強化使用的金幣分開記錄。
- 糖果代幣與 `../item-icons/rare-candy.png` 的 Rare Candy 是不同項目；代幣不附加「升級 +2／傷害 +5%」，不標神話級，也不套用道具持有上限 10。
- Rare Candy 仍是原本 70 道具之一，原有能力、分級及持有上限保留。

掉落敵人或來源、掉落率、每個掉落物的面額、餘額上限、商品價格及跨局是否保留尚未指定，不自行填入數值。規格位於 `docs/specs/candy-and-eggs.json` 的 `candy`。

## 接入規則

使用獨立 `candy_token` 餘額。拾取同一個掉落物只能入帳一次。商店顯示代幣餘額及價格，購買時重新確認餘額與道具 `max_per_run`；只有交易成功才扣款、發放道具。失敗、超過持有上限或不足額時不扣款。這些是工程接入規格，尚未修改遊戲執行程式。

## 執行預覽

專案根目錄執行 `python3 -m http.server 8000`，開啟：

http://localhost:8000/assets/future-use/candy/preview.html

亦可直接開啟此資料夾的 preview.html。預覽只展示代幣圖案，不會生成掉落物、入帳或交易。

## 圖片使用方式

```html
<img src="assets/future-use/candy/candy-token.png" alt="糖果代幣"
     width="80" style="height:auto;image-rendering:pixelated">
```

完整設計圖有透明留白，正式小圖應先依主體範圍裁切並核對尺寸，不可直接壓成正方形。Canvas 請關閉 imageSmoothingEnabled。尚未另外製作代幣的 64×64 小圖，不能把 Rare Candy 小圖當作此代幣的正式檔案對應。
