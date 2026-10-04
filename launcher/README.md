# 電腦端控制台（Windows）

私人派對用：在 **Windows 電腦**雙擊啟動／關閉伺服器。  
平板與手機仍只用瀏覽器，不需安裝。

## 用法

1. 安裝 [Node.js LTS](https://nodejs.org/)
2. 把整個 `KTV` 專案放到電腦（例如 `C:\Users\你\KTV`）
3. 雙擊專案根目錄的 **`啟動開唱.bat`**（或 `start-kaichang.bat`）
4. 第一次按「First-time setup (install + build)」
5. 派對開始：按「Start Party」
6. 平板用畫面上的 `http://192.168.x.x:8787/player.html`（可按「Copy tablet URL」）
7. 派對結束：按「Stop Party」

### 用 PowerShell 更新後再開（不要用 `cd /d`）

```powershell
cd C:\Users\tr197\KTV
git pull
.\start-kaichang.bat
```

視窗右上角應顯示 `launcher build 2026-10-04e`。

## 開機啟動（選用）

控制台裡可按「加入開機啟動」：  
開機後會開啟控制台視窗，**不會自動開派對**（避免沒聚會也佔資源）。  
要唱的時候再按「啟動派對」。

## 說明

- 不會改平板／手機頁面
- 日誌在 `.party/server.log`
- 預設埠 `8787`，可在控制台修改
