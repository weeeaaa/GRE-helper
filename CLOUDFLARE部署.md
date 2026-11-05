# 部署到自己的 Cloudflare 帳號

這是 Workers 動態網站，不是 Pages 靜態網站。保留原 Sites 本機預覽；依使用者選擇，正式環境為 public-shared：免登入、所有人可閱讀與編輯同一份筆記，收藏與閱讀紀錄也共用。

## 準備一次

1. 使用自己的 Cloudflare 帳號。`npx wrangler login` 會開啟官方登入頁。
2. 在專案根目錄執行 `npx wrangler d1 create gre-notebook-db`，記下 database_id。
3. 執行 `npx wrangler r2 bucket create gre-notebook-images`。如果帳號尚未啟用 R2，先在 Cloudflare 控制台檢查付款／用量條款再啟用；R2 超出免費額度會收費。
4. D1 與 R2 已建立；cloudflare.config.json 已填入實際 D1 ID 與 bucket 名稱，不用重新複製範本。
5. 不需要 Zero Trust、Access、Team domain、AUD 或登入 Email。若你已在 Cloudflare 控制台對這個網站啟用 Access，需停用對應保護，否則外層仍會要求登入。
6. `access_mode` 保持 `public-shared`，`data_user_id` 保持 `local_seedy`，承接原有資料與圖片路徑。這是共用資料空間識別碼，不是密碼。

## 建置、預檢與發布

```sh
npm ci
npm run cf:build
npm run cf:check
```

`cf:check` 是 Wrangler dry-run，不發布。不需要把 `dist` 推 GitHub。`cf:build` 會沿用框架產生的程式，再產生獨立的 `dist/server/wrangler.cloudflare.json`，不覆寫本機設定。缺少真實設定會停止。

**先完成下方資料搬移，再使用：**

```sh
npm run cf:deploy
```

若尚未搬移資料，正式站可能只見初始筆記或無法儲存；在搬移完成前不要開始新增筆記，以免兩邊資料分岔。

手機和電腦直接開同一正式網址，不需登入。所有訪客共用筆記、收藏與閱讀紀錄。之後請把正式網址提供給 GRE skill，讓它在確認草稿後更新正式網站。不要繼續只存 localhost。程式更新才需要重新部署；筆記更新寫入資料庫即可。

## 搬移現有資料（不可省略）

GitHub push 不會搬移 `.wrangler/state`。網站「文字備份」也不包含所有資料。

- D1：完整匯出本機資料庫，包含 records、versions、vocabulary、highlights、favorites、vocab_plan、vocab_views、vocab_images 等實際資料表及原有 schema。先備份，再匯入一個新的空白遠端資料庫；不要對已有內容的遠端庫直接重跑匯入。
- 可用 `npx wrangler d1 export DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --output backups/local-d1.sql` 取得本機快照；核對資料表、27題與最新內容後，再用 `npx wrangler d1 execute DB --remote --config dist/server/wrangler.cloudflare.json --file backups/local-d1.sql` 匯入空庫。
- R2：上傳圖片是獨立檔案；須逐一搬移原 object key（包含 `local_seedy/` 前綴）與 Content-Type。D1 的圖片紀錄或 URL 不等於圖片本身。`public/questions` 原圖隨程式部署，後來上傳的原圖則必須另外搬移。
- 空白全新網站可以用 `npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.cloudflare.json` 建表；若已匯入完整 SQL schema，**不要再跑全部初始建表 migration**。需要核對／建立 migration baseline，之後才套用新增 migration。
- 完成後驗證錯題、單字、收藏、進度、重點、圖片、版本與整份 PDF，兩台裝置開啟比對。這份設定不會自動搬移或清空資料。

## GitHub 與費用

GitHub 是程式版本庫。已加入 `.github/workflows/cloudflare.yml`：推送 main 後先檢查 TypeScript、測試、建置與部署包，再套用尚未執行的資料表 migration 並發布。Pull request 只執行檢查。CI 不會重新匯入本機筆記，也不會清空雲端資料。

在 repository 的 Settings → Secrets and variables → Actions 新增 `CLOUDFLARE_API_TOKEN`。使用 Edit Cloudflare Workers 範本，限定自己的帳號，並加入 D1 Edit 供資料表 migration 使用；此流程不直接操作 R2 圖片，因此不需要額外的 R2 Edit。Token 不寫入程式。`cloudflare.production.json` 僅包含非機密資源識別碼，CI 會用它產生部署設定。

`cloudflare.config.json`、`.dev.vars*`、`.env*`、`.wrangler/`、`backups/` 不提交。不要把 API token 放進程式或 JSON；Wrangler 登入保存在工具的正常認證位置。

查核日期：2026-11-05。Workers Free 每天100,000 requests、每次10ms CPU；D1 Free 每日500萬列讀取／10萬列寫入、總儲存5GB；R2 Standard 免費額度每月10GB-month、100萬次A操作／1000萬次B操作，超額依用量收費；Access Free 50人。個人使用可先試免費方案，但 SSR等CPU成本仍需在正式站測量，不能保證免費方案足夠。Workers Paid 基本費每月 US$5 起，不代表包含所有超額費用。workers.dev 網址不必另外買網域。

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://www.cloudflare.com/plans/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/

## 本次驗證狀態

- TypeScript、現有正式建置、獨立登入安全測試與設定產生測試通過。
- Wrangler dry-run 在目前 Windows 沙箱內被檔案讀取限制擋住（esbuild 無法讀取上層目錄），未完成部署包預檢。請在正常終端完成 `npm run cf:check` 後再部署；不能把一般 build 通過當成 Cloudflare 已驗證部署成功。
- 2026-11-05 已套用 7 個 D1 migration，匯入本機實際儲存的 3 筆資料（records、vocab_plan、vocab_images 各 1 筆）；其餘初始題目與單字隨程式內建資料部署，不能把 records 的 1 筆解讀成只剩 1 題。已查詢遠端核對資料筆數。
- 6 個 R2 圖片已依原 object key 與 Content-Type 搬移；備份位於 `backups/pre-cloudflare-20261105/`，包含所有應用資料表、種子資料及圖片。不要再次執行匯入 SQL。
- 正式網址與 GitHub Actions 首次部署仍待發布成功後驗證。
