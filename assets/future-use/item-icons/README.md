# 道具小圖（70 張）

依三張參考畫面重新繪製的像素風道具圖。名稱對應畫面上的英文道具名稱，並非招式名稱。

- 每張為 64 × 64 透明 PNG，圖案置中，建議以 32 或 64 像素顯示並關閉平滑。
- 檔名以英文名稱轉為小寫連字號；`manifest.json` 記錄名稱、檔案及參考圖位置。
- `preview.png` 為完整對照預覽。
- 本批為重新設計素材，非原始遊戲圖示逐像素複製。
- 尚未接入遊戲，不更改道具數值、效果或資料庫；實際道具 ID 需由工程端對照。
- 來源：AI 生成的三張圖集，依固定格線切出、透明留白置中並以 nearest-neighbor 縮至小圖。

## 能力記錄來源

下表依使用者提供的三張遊戲截圖記錄，採用該遊戲畫面中的數值，不套用寶可夢本傳的能力設定。`manifest.json` 的 `effect_zh_TW` 與下表一一對應。僅做素材文件記錄，不修改執行中的道具效果。畫面未明示的疊加算法、對象及持續時間不另作推定。

## 道具等級

依參考截圖的名稱字色標記，五級名稱由本次使用者授權安排。這是素材／企劃的等級紀錄，不推定為原遊戲的內部 rarity ID。

| 等級 | 字色 | 工程標記 | 排序 | 數量 |
|---|---|---|---|---|
| 神話 | 黃色 | `mythic` | 5 | 6 |
| 傳說 | 紫色 | `legendary` | 4 | 9 |
| 稀有 | 藍色 | `rare` | 3 | 11 |
| 優良 | 綠色 | `uncommon` | 2 | 19 |
| 一般 | 灰色 | `common` | 1 | 25 |

`manifest.json` 每個道具的 `rarity`、`rarity_zh_TW`、`rarity_rank`、`name_color`、`name_color_zh_TW` 可用於對照。`name_color` 是顏色名稱，並非從截圖推定的精確色碼；實際 UI 色碼由工程主題決定。等級只用於文件標記，未調整掉落率、價格或能力。

## 每局持有數量上限

**名稱後方 `×N` 表示該道具在每一局內可以持有的數量上限 N。** 數值依本次三張截圖逐項記錄於 `max_per_run`。這是各道具的個別上限，不是目前持有量或跨局庫存。

持有上限與能力描述的觸發次數、冷卻時間分別處理。例如 Max Revive 的持有上限為 3，但畫面能力仍寫「每局一次」；此文件保留兩項原始規定，不自行推定為三次復活。消耗後能否再取得、滿額後如何處理獎勵，以及疊加算法，仍需由遊戲規格決定。本次只補資料與規則，尚未加入遊戲執行時的上限檢查。

| 道具名稱 | 等級 | 字色 | 每局持有上限 | 圖片 | 能力（依遊戲截圖） |
|---|---|---|---:|---|---|
| Max Revive | 神話 | 黃色 | 3 | `max-revive.png` | 以 60% HP 復活一次。每局一次。 |
| Rare Candy | 神話 | 黃色 | 10 | `rare-candy.png` | 立即升級 +2，傷害 +5%。 |
| Master Ball | 神話 | 黃色 | 1 | `master-ball.png` | 傷害 +25%，幸運 +10。 |
| Reaper Cloth | 神話 | 黃色 | 1 | `reaper-cloth.png` | 每擊敗 100 個敵人傷害 +1%，最多 +30%。 |
| Comet Shard | 神話 | 黃色 | 1 | `comet-shard.png` | 金幣 +40%，幸運 +30。 |
| Moon Stone | 神話 | 黃色 | 3 | `moon-stone.png` | 彈體 +2，範圍 +25%。 |
| Max PP | 傳說 | 紫色 | 10 | `max-pp.png` | 彈射、環繞和連鎖招式彈體 +1。 |
| Max Elixir | 傳說 | 紫色 | 10 | `max-elixir.png` | 攻擊速度 +20%。 |
| Shiny Stone | 傳說 | 紫色 | 10 | `shiny-stone.png` | 傷害 +15%，範圍 +15%。 |
| Dusk Stone | 傳說 | 紫色 | 10 | `dusk-stone.png` | 暴擊傷害 +40%，暴擊率 +8%。 |
| Honey | 傳說 | 紫色 | 1 | `honey.png` | 精靈球提供 4 個道具而非 3 個。 |
| Fire Stone | 傳說 | 紫色 | 1 | `fire-stone.png` | 灼傷敵人倒下時爆炸。 |
| Ice Stone | 傳說 | 紫色 | 1 | `ice-stone.png` | 減速敵人倒下時爆炸。 |
| Revive | 傳說 | 紫色 | 3 | `revive.png` | 以 35% HP 復活一次。每局一次。 |
| Power Bracer | 傳說 | 紫色 | 3 | `power-bracer.png` | 傷害 +40%，移動速度 -15%。 |
| Life Orb | 稀有 | 藍色 | 5 | `life-orb.png` | 傷害 +30%，最大 HP -10%。 |
| Choice Band | 稀有 | 藍色 | 5 | `choice-band.png` | 傷害 +35%，攻擊速度 -8%。 |
| Choice Scarf | 稀有 | 藍色 | 5 | `choice-scarf.png` | 移動速度 +20%，攻擊速度 +10%。 |
| Expert Belt | 稀有 | 藍色 | 10 | `expert-belt.png` | 對弱於招式屬性的目標傷害 +30%。 |
| Assault Vest | 稀有 | 藍色 | 10 | `assault-vest.png` | 護甲 +12，最大 HP +12%。 |
| Exp. Share | 稀有 | 藍色 | 10 | `exp-share.png` | 經驗 +25%，拾取半徑 +20%。 |
| Star Piece | 稀有 | 藍色 | 10 | `star-piece.png` | 幸運 +20。 |
| Metronome | 稀有 | 藍色 | 3 | `metronome.png` | 每 10 秒不受傷，傷害 +4%，最多 +40%。 |
| Focus Sash | 稀有 | 藍色 | 1 | `focus-sash.png` | 15% 機率以 1 HP 抵擋致命一擊，每 20 秒一次。 |
| Lum Berry | 稀有 | 藍色 | 3 | `lum-berry.png` | 每 30 秒恢復 20% HP。 |
| Eviolite | 稀有 | 藍色 | 1 | `eviolite.png` | 伙伴仍可進化時：護甲 +50%，最大 HP +25%。 |
| Quick Claw | 優良 | 綠色 | 10 | `quick-claw.png` | 攻擊速度 +10%。 |
| Shell Bell | 優良 | 綠色 | 10 | `shell-bell.png` | 恢復所造成傷害的 1%。 |
| Leftovers | 優良 | 綠色 | 10 | `leftovers.png` | 每秒恢復 +1.2 HP。 |
| Rocky Helmet | 優良 | 綠色 | 10 | `rocky-helmet.png` | 接觸你的敵人受到 25 傷害。 |
| Amulet Coin | 優良 | 綠色 | 10 | `amulet-coin.png` | 金幣 +25%。 |
| Lucky Egg | 優良 | 綠色 | 10 | `lucky-egg.png` | 經驗 +15%。 |
| Muscle Band | 優良 | 綠色 | 10 | `muscle-band.png` | 傷害 +15%。 |
| Scope Lens | 優良 | 綠色 | 10 | `scope-lens.png` | 暴擊傷害 +30%。 |
| Light Clay | 優良 | 綠色 | 10 | `light-clay.png` | 持續時間 +20%。 |
| Sitrus Berry | 優良 | 綠色 | 3 | `sitrus-berry.png` | HP 低於 30% 時恢復 35% HP，每 45 秒一次。 |
| Smoke Ball | 優良 | 綠色 | 3 | `smoke-ball.png` | 受擊時 25% 機率隱身 1.5 秒。 |
| Flame Orb | 優良 | 綠色 | 10 | `flame-orb.png` | 命中時 5% 機率灼傷。 |
| Toxic Orb | 優良 | 綠色 | 10 | `toxic-orb.png` | 命中時 5% 機率中毒。 |
| Snowball | 優良 | 綠色 | 10 | `snowball.png` | 命中時 6% 機率減速。 |
| Big Root | 優良 | 綠色 | 10 | `big-root.png` | 治療 +15%。 |
| King's Rock | 優良 | 綠色 | 10 | `king-s-rock.png` | 命中時 6% 機率暈眩 0.5 秒。 |
| Protective Pads | 優良 | 綠色 | 3 | `protective-pads.png` | 接觸敵人的傷害 -30%。 |
| Sticky Barb | 優良 | 綠色 | 5 | `sticky-barb.png` | 附近敵人每秒受到 15 傷害。 |
| Silk Scarf | 優良 | 綠色 | 10 | `silk-scarf.png` | 一般招式傷害 +30%，傷害 +3%。 |
| Charcoal | 一般 | 灰色 | 10 | `charcoal.png` | 火招式傷害 +30%，傷害 +3%。 |
| Mystic Water | 一般 | 灰色 | 10 | `mystic-water.png` | 水招式傷害 +30%，傷害 +3%。 |
| Miracle Seed | 一般 | 灰色 | 10 | `miracle-seed.png` | 草招式傷害 +30%，傷害 +3%。 |
| Magnet | 一般 | 灰色 | 10 | `magnet.png` | 電招式傷害 +30%，傷害 +3%。 |
| Never-Melt Ice | 一般 | 灰色 | 10 | `never-melt-ice.png` | 冰招式傷害 +30%，傷害 +3%。 |
| Black Belt | 一般 | 灰色 | 10 | `black-belt.png` | 格鬥招式傷害 +30%，傷害 +3%。 |
| Poison Barb | 一般 | 灰色 | 10 | `poison-barb.png` | 毒招式傷害 +30%，傷害 +3%。 |
| Soft Sand | 一般 | 灰色 | 10 | `soft-sand.png` | 地面招式傷害 +30%，傷害 +3%。 |
| Sharp Beak | 一般 | 灰色 | 10 | `sharp-beak.png` | 飛行招式傷害 +30%，傷害 +3%。 |
| Twisted Spoon | 一般 | 灰色 | 10 | `twisted-spoon.png` | 超能力招式傷害 +30%，傷害 +3%。 |
| Silver Powder | 一般 | 灰色 | 10 | `silver-powder.png` | 蟲招式傷害 +30%，傷害 +3%。 |
| Hard Stone | 一般 | 灰色 | 10 | `hard-stone.png` | 岩石招式傷害 +30%，傷害 +3%。 |
| Spell Tag | 一般 | 灰色 | 10 | `spell-tag.png` | 幽靈招式傷害 +30%，傷害 +3%。 |
| Dragon Fang | 一般 | 灰色 | 10 | `dragon-fang.png` | 龍招式傷害 +30%，傷害 +3%。 |
| Black Glasses | 一般 | 灰色 | 10 | `black-glasses.png` | 惡招式傷害 +30%，傷害 +3%。 |
| Metal Coat | 一般 | 灰色 | 10 | `metal-coat.png` | 鋼招式傷害 +30%，傷害 +3%。 |
| Fairy Feather | 一般 | 灰色 | 10 | `fairy-feather.png` | 妖精招式傷害 +30%，傷害 +3%。 |
| Oran Berry | 一般 | 灰色 | 10 | `oran-berry.png` | 最大 HP +15。 |
| Quick Powder | 一般 | 灰色 | 10 | `quick-powder.png` | 移動速度 +7%。 |
| Bright Powder | 一般 | 灰色 | 10 | `bright-powder.png` | 閃避 +4%。 |
| Razor Claw | 一般 | 灰色 | 10 | `razor-claw.png` | 暴擊率 +6%。 |
| Wide Lens | 一般 | 灰色 | 10 | `wide-lens.png` | 範圍 +10%。 |
| Safety Goggles | 一般 | 灰色 | 10 | `safety-goggles.png` | 護甲 +5。 |
| Nugget | 一般 | 灰色 | 10 | `nugget.png` | 金幣 +15%。 |
| Big Nugget | 一般 | 灰色 | 5 | `big-nugget.png` | 精靈球價格降低 8%，最多 40%。 |
