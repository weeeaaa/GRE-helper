# 對話訂正 → 網站匯入

正式網站：https://gre-notebook.wangpeiyu93126.workers.dev/

使用者傳題目到對話。助理查證、完整整理，保留原題及使用者敘述，先呈現訂正草稿。使用者確認後，提供 UTF-8 JSON 訂正檔，網站左側「匯入訂正」選檔，確認預覽後按「確認並匯入」。這不是網站自動 AI 辨識；無需另外的 AI API。

檔案格式：`{"format":"gre-corrections-v1","notes":[...]}`，每批最多50題、6MB。每題沿用 lib/types.ts 的 Note 欄位，識別碼以 `I_` 開頭，例如 `I_20261105_abc123`，同一題重試必須保留同一識別碼。不要把同一份檔案改識別碼後重新匯入。匯入只新增，遇到既有識別碼會跳過，絕不覆蓋網站現有內容；需要修改時使用原有編輯器與 revision 儲存流程。

- section：`Verbal` 或 `Quan`。
- Quan category：`粗心` 或 `觀念加強`（`觀念錯`可自動對應觀念加強）。不確定時問使用者，不從答錯直接推斷粗心。完整訂正放 blocks，單欄支援文字、表格與網站既有圖片。
- Verbal 四欄都必須提供字串，空白就留空：vocabulary＝可能不熟的生字；options＝選項單字；clues＝邏輯線索；commentary＝檢討補充。
- 單字逐行 `word = 中文意思`，必要時補語境義、詞性與辨義。邏輯線索寫原文關鍵詞、轉折／指代與推理；檢討補充說明正解與其他選項不成立的原因，不能只給答案。
- title、original 必填；original 保留完整題幹與選項。source、answer 保留來源與作答資訊。reviewQuestion 放不含答案的完整複習題，reviewAnswer 獨立保存。
- reason 只填使用者提供的錯因，否則空白。
- images／blocks 的圖片只接受此網站的 `/api/media/<id>` 或既有 `/questions/<數字>.png`。新截圖先由網站正常圖片上傳流程取得 URL，或匯入後在題目頁貼上；不要把本機路徑或未上傳圖片寫成假網址。匯入檔不內嵌圖片。
- 本次只加入匯入功能，不新增題目，也不更動既有學習紀錄。
