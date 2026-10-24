# 夥伴熟練度：金級微光／鑽石金光

本目錄提供可執行的 Canvas 光效模組與實際角色預覽，尚未載入正式遊戲入口。純外觀特效，不增加任何能力。

## 執行

專案根目錄執行 `python3 -m http.server 8000`，開啟：

http://localhost:8000/assets/future-use/partner-aura/preview.html

預覽使用現有 `assets/pokemon/143/Idle.png` 首幀；左側無光效、中間金級、右側鑽石，可切換低畫質與減少動態。

## 實作規則

| 等級 | 身體後方 | 身體周圍 | 地面 |
|---|---|---|---|
| 金級 gold | 暖白色淡光，3.2 秒呼吸週期 | 最多 5 個細小上浮像素 | 不新增光環 |
| 鑽石 diamond | 金色較明顯光暈，2.6 秒呼吸週期 | 最多 12 個金色像素，部分十字星點 | 淡金色橢圓圈 |
| 其他／未知 | 無 | 無 | 無 |

鑽石取代金級，不疊加兩套。光暈放於角色後方，保持原本角色色彩，粒子主要在兩側，不遮住身體。血條與危險提示應後畫，保持可見。

**等級門檻沿用目前熟練度系統，不新增或推測門檻數字。** 此工作副本尚未找到對應金／鑽石熟練度資料介面，因此正式接入須由現有可信的夥伴資料轉成 `gold`、`diamond` 或 `none`；不可用這張範例截圖的 67/100 推算門檻。

## 接入範例

載入 `assets/future-use/partner-aura/partner-aura.js` 後，在玩家繪製處分兩層呼叫：

```js
const aura = {
  tier: verifiedPartnerTier, // 'none' | 'gold' | 'diamond'，由既有熟練度系統提供
  x: player.x, y: player.y, // 目前繪圖座標系的角色腳底中心
  width: visibleBodyWidth, height: visibleBodyHeight, // 當前角色可見身體尺寸，非整張圖集大小
  time: simulationTimeSeconds, seed: stablePlayerSeed,
  dead: player.dead, visible: isOnScreen,
  quality: lowQuality ? 'low' : 'high',
  reducedMotion: prefersReducedMotion,
  attenuation: player.flash > 0 ? 0.3 : player.invuln > 0 ? 0.5 : 1
};
PartnerAura.draw(ctx, aura, 'behind');
// 原本角色、受傷閃紅及無敵閃爍繪製；保留原行為。
PartnerAura.draw(ctx, aura, 'front');
// 血條、名稱及重要提示最後畫。
```

此段為接入位置示意，變數需由實際程式提供，不能直接貼上當成完整遊戲修改。

- 對應位置：`js/entities/player.js` 的 `draw(ctx)`，角色 `this.anim.draw` 前後。正式程式應從靜態偏好讀取畫質，不在每幀存取資料庫。
- 玩家可見身體尺寸與腳底位置要依當前動畫、飛行高度、進化／變身及縮放計算；效果不可依全圖集高度放大。
- 效果綁定當局選定的夥伴熟練度，不因進化、暫時變身或異色貼圖切換而降級，也不把等級永久寫到進化後物種。
- 開局讀取已驗證等級；當局若更新熟練度，用既有系統確認後更新；死亡或離場停畫，復活再依目前等級恢復。
- 使用遊戲時間秒數而非每幀隨機數；暫停時停止增加 time，避免暫停仍播放。seed 使用穩定玩家識別映射，不直接依姓名推測。
- 多人同步已驗證的等級標記，各裝置本地繪製；不傳粒子位置、不每幀讀遠端資料。舊客戶端缺欄位視為 none。
- 低畫質：金級 2、鑽石 4 個粒子，後方光暈減為 2 層。減少動態：固定淡光、完全停用粒子及呼吸，優先遵守系統設定。
- 模組無每幀影像濾鏡、無逐像素運算、無持續粒子陣列；畫面外直接跳過。繪圖透過 save/restore 隔離，不污染既有透明度與合成設定。
- 受傷／無敵時由 attenuation 降低特效；不得關掉原本受傷、無敵或狀態提示。透明度會沿用呼叫端 globalAlpha。

## 驗收

對照一般／金／鑽石；角色移動與鏡頭縮放跟隨；大小體型、飛行、進化及變身不偏位；死亡不發光、復活恢復；暫停停止動態；受傷提示優先；多人只傳等級；低畫質和減少動態有效；不影響攻防數值。預覽只能驗證視覺模組，以上遊戲整合項目需接入後實測。

靜態對照：`preview.png`（一般／金級／鑽石）。已完成 Canvas 模組檢查：三階顯示、畫筆狀態還原、死亡停畫及減少動態的畫面穩定性。尚未進行遊戲內連線及各形態整合驗收。
