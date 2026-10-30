# OWNDAYS 獨立網址上線包

目標 GitHub 專案：chengcade-code/hko-lens-lookup（現有 Vercel 專案已連接此儲存庫）。

預定新頁路徑：https://hko-lens-lookup.vercel.app/owndays/

目前狀態：程式及安裝頁已完成測試，但尚未推送或上線。此對話的 GitHub 連接在建立 Git tree 時被 API 拒絕（403 Resource not accessible by integration）。上述新頁路徑須部署完成後才可使用。

## 手動上線

1. 解壓此 ZIP。不要直接把 ZIP 檔上傳到 GitHub。
2. 在 GitHub 開啟 chengcade-code/hko-lens-lookup，使用 main 分支的 Add file → Upload files。
3. 上傳解壓後的整個 owndays 資料夾及 vercel.json（保留資料夾結構）。不需要改動現有 index.html。
4. Commit changes。Vercel 應按既有 Git 整合自動建立部署；在 Vercel 查看是否 Ready。若未自動部署，檢查 Vercel 專案與 main 分支的連接設定。
5. 部署成功後，在香港店舖電腦開啟上述新頁。先確認不需 VPN、不需登入就能開啟，再安裝並使用「外部載入測試」。
6. 只有看到「外部程式載入成功」，才使用「OWNDAYS 自動更新統計」。首次仍須對照人手數字。

只部署新子目錄；vercel.json 的快取設定只影響 /owndays/ 路徑。網站不提供資料寫入介面，不儲存密碼、客人明細或點算結果。

程式修改後需重新生成 runtime.js 並發佈，收藏夾本身不需重新安裝。src/ 保存可編輯分類及掃描來源；build.mjs 使用 esbuild。現有版本沿用收藏夾 1.6 的 R 名稱擷取、HKSP 計數、906 款商品及 125 個舊型號對照。
