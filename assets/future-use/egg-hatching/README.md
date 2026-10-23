# 共用孵化動畫（四級孵化蛋）

`egg-hatching.js` 是可執行的 Canvas 共用模組，直接使用 `../hatching-eggs/` 的四張 40×48 透明蛋圖。無額外套件、不需四份 GIF。四級名稱順序：普通 common、稀有 rare、傳說 legendary、史詩 epic。

## 執行預覽

專案根目錄執行：

```sh
python3 -m http.server 8000
```

開啟 http://localhost:8000/assets/future-use/egg-hatching/preview.html 。選擇等級後按「開始孵化」，可跳過或開啟減少動態。結果使用現有卡比獸首幀作示範，不代表任何等級的實際獎勵。

## 動畫規則

- 一次播放 1.8 秒：0～0.65 秒蛋輕搖；0.65～1.35 秒逐步疊加同一套裂紋；1.15～1.60 秒局部暖白閃光；1.35 秒蛋消失、顯示結果並散開光點；1.8 秒完成。
- 裂紋由程式共用座標繪製，透明區域不新增背景，不需要額外裂紋圖檔。這是簡化的破殼轉場，不分別製作碎殼動畫。
- 各級流程相同；普通／稀有／傳說各 6 粒子，史詩 12 粒子，配色對應蛋圖。不全螢幕閃白。
- 減少動態：0.45 秒淡出／直接顯示結果，沒有搖晃、閃光或粒子；優先採用系統 prefers-reduced-motion。
- 完成後結果停留，由宿主程式控制關閉；不自動循環。
- `skip()` 直接到完成狀態；`cancel()` 中止並回到 idle，不觸發完成通知。播放中再次 `start()` 回傳 false，不重入。
- 這是視覺播放時間，不是孵化等待時間。掉落率、等待條件、成本與獎勵機率仍由遊戲規則決定。

## 遊戲接入

先載入 `egg-hatching.js` 並預載本次等級對應的蛋圖、已確定結果的圖片；失敗時顯示重試提示，不先扣款或標記已領獎。

```js
const animation = EggHatching.create({
  onComplete: () => showContinueButton() // 只改 UI，不在這裡抽獎或發獎
});
animation.start({ tier: eggTier, reducedMotion: prefersReducedMotion });
// 遊戲更新：暫停時不要傳入時間增量，dt 為秒。
animation.update(dt);
// 繪製：x、y 為蛋中心，scale=2 顯示 80×96。
animation.draw(ctx, {
  x, y, scale: 2, eggImage,
  drawResult: (ctx, x, y) => drawSavedHatchResult(ctx, savedResult, x, y)
});
```

範例的 UI、圖像載入、獎勵及遊戲變數由宿主提供；本模組不提供實際孵化資料庫。

實際流程：先驗證蛋與條件 → 以蛋唯一 ID 保存唯一的孵化結果／結算狀態 → 開始播放 → 顯示已保存結果 → 完成後開放繼續。若結算失敗，不播放成功結果。重新整理、跳過或重播不能重新抽獎或重複發獎。onComplete 每次播放最多呼叫一次；跨局／跨重開防重必須由既有保存系統處理，不能只靠動畫記憶體狀態。

`state()` 提供 phase、tier、elapsed、duration、progress、active。可用 tier 僅限 common/rare/legendary/epic；未知等級拋出 RangeError，宿主應驗證資料。`drawResult` 由宿主繪製既定結果，模組不決定寶可夢。畫筆狀態以 save/restore 隔離。

## 舊動畫

`egg-hatching.gif` 保留為舊綠斑蛋美術參考，已由本共用動畫取代為推薦接入方式；不要把循環 GIF 或其 4.16 秒當作新孵化流程。正式遊戲目前尚未接入本模組。

驗證命令：`node --test tests/egg-hatching.test.cjs`。四項測試覆蓋完成通知不重複、跳過／取消、暫停與無效時間、減少動態及未知等級。`preview-stages.png` 為四級動畫分段對照。
