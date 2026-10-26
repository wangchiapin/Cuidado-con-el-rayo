# 別被雷劈到 · ¡Cuidado con el rayo!

中文讀音打字遊戲（給西語學生）。看到一個字，在時間內用內建的拼音或注音鍵盤打出讀音（要打聲調）。
打對往上走一階；打錯或時間到，被雷劈一次，但還是往上走。爬完 10 階，看被劈幾次。

- 網址：https://wangchiapin.github.io/Cuidado-con-el-rayo/
- 單檔 `index.html`，直接用 GitHub Pages 開（Settings → Pages → main / root）。
- 介面可切換：繁體／簡體、中文／西文／英文。拼音鍵盤、注音鍵盤都有（電腦也能直接用實體鍵盤打）。

## 難度

三種難度，差別在「題庫範圍」和「每題時間」。字的等級用「華語八千詞」：N1、N2 = 準備級，L1 入門、L2 基礎、L3 進階、L4 高階、L5 流利（數字越大越難）。

| 難度 | 每題時間 | 字的範圍 | 字數 |
|---|---|---|---|
| 簡單 | 15 秒 | N1、N2、L1 | 355 |
| 普通 | 10 秒 | N2、L1、L2、L3 | 598 |
| 進階 | 10 秒 | L2、L3、L4、L5，加上輕聲字（的、嗎、吧…） | 1,021 |

輕聲字只在進階出現。一局固定 10 階，每階一個字。星星：沒被劈 3 顆，被劈 1～2 次 2 顆，3～5 次 1 顆，6 次以上 0 顆。

## 排行榜（Firebase）

- 開始畫面可以輸入暱稱（最多 14 個字，存在自己的手機裡）；🏆 鈕看排行榜。
- **簡單、普通、進階各一個榜**，拼音和注音玩家在同一個榜（鍵盤只是輸入方式，題目一樣難）。
- 排名：**被雷劈越少越前面，一樣就比誰爬得快**。只顯示前 10 名，自己那一列會標色。
- 每台裝置（匿名登入）每個難度只留一筆最好成績；比較差的成績不會蓋掉好的。
- 沒有暱稱時，結算畫面會先給你看榜，再問暱稱，輸入後才上榜。
- 讀不到榜單時，遊戲照常玩，只是榜單區顯示「暫時無法使用」。
- Firebase 專案：`memorma-24dab`（跟翻牌記憶、收納小達人等同一個）。
- 資料位置：`rayo_boards/{easy|normal|hard}/entries/{匿名登入的 uid}`
  - 欄位：`name`、`strikes`（被劈次數 0～10）、`secs`（用時秒數）、`kb`（`pinyin`／`zhuyin`）、`rank`、`updatedAt`
  - `rank = (10 − 被劈次數) × 100000 + (99999 − 用時秒數)`，越大越前面。
- **安全規則**：完整版在 `firestore.rules.txt`（是 memorma 現行規則加上這個遊戲的 `rayo_boards` 區塊，其他一個字都沒動）。要上線時，把整份貼到 Firebase 主控台 → Firestore → 規則 → 發布。也請把同一份蓋到 Memorama repo 的 `firestore-rules-full.txt`，才不會下次改規則時把這一段弄丟。

## 遊玩紀錄

跟所有遊戲一樣用 game-kit 的 `plays.js`，遊戲代號 `rayo`，寫到 memorma 專案：

- `visits`：打開頁面時記一次（每台裝置每天一筆）。
- `plays`：按「開始」記一局，爬完 10 階時補上結果（`level` 例如 `normal-pinyin`、`score` = 答對題數、`secs`、暱稱）；中途離開的那一局就是「沒玩完」。
- 後台（分享區 stats.html）的「遊玩紀錄」分頁和「排行榜總覽」都看得到。

## 字庫從哪裡來

不另外維護字庫，全部取自 game-kit（你的共用零件 repo）：

- 華語八千詞等級（`bank/vocab_levels.json`）→ 只取單字；
- GoodTeacher 台灣讀音表（`bank/gt/readings.txt`）→ 台灣讀音，多音字只收基本讀音和規則會改成的讀音；
- 沒收錄的單音字用 `pinyin-pro` 補，簡體字用 `opencc-js` 轉。

要改字庫，請改 game-kit 的資料，再重新執行下面的「重新產生」。

## 重新產生（改了程式或字庫才需要）

`index.html` 是自動組出來的：`src/template.html`（遊戲本體）＋ game-kit 的共用零件（靜音鍵、版權小字、遊玩紀錄等）＋ 字庫 ＋ 程式畫的人物和街景。所以重新組檔時，需要電腦上有 **game-kit 資料夾**（預設放在 `/home/claude/game-kit`，放別處就用 `GAMEKIT=資料夾路徑` 告訴它）。平常只是玩遊戲、或只改 `index.html` 以外的說明文字，完全用不到。

```
npm install
node tools/build_words.js   # 產生 data/words.json（讀 game-kit 的字庫）
node tools/build.js         # 產生 index.html（改了 src/template.html 一定要跑）
python3 tests/test_game.py          # 遊戲自動測試（Playwright + Chromium）
python3 tests/test_leaderboard.py   # 排行榜＋遊玩紀錄測試（假的 Firebase，不連網）
```

## 之後可以做

連線版（房間、暱稱、被劈就出局）、詞語題、廟前台階＋雷公電母的主題。
