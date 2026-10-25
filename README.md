# 別被雷劈到 · ¡Cuidado con el rayo!

中文讀音打字遊戲（給西語學生）。看到一個字，在時間內用內建的拼音或注音鍵盤打出讀音（要打聲調）。
打對往上走一階；打錯或時間到，被雷劈一次，但還是往上走。爬完 10 階，看被劈幾次。

- 單檔 `index.html`，直接用 GitHub Pages 開（Settings → Pages → main / root）。
- 目前是單機版，沒有接 Firebase、沒有排行榜。
- 題目是單字（約 1,375 字，台灣讀音），來自 game-kit 的八千詞等級與 GoodTeacher 讀音表。

## 重新產生
```
npm install
node tools/build_words.js   # 產生 data/words.json（需要 game-kit 資料夾，預設 /home/claude/game-kit）
node tools/build.js         # 產生 index.html
python3 tests/test_game.py  # 自動測試（Playwright + Chromium）
```

## 之後可以做
連線版（房間、暱稱、被劈就出局）、詞語題、輕聲字、廟前台階＋雷公電母的主題。
