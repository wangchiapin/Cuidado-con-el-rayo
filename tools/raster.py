# 把 bg/svg/*.svg 轉成 bg/*.webp（遊戲實際載入的是 webp 圖片；手機只要解一張圖，不用處理一大堆向量圖形）
# 用法：python3 tools/raster.py   （已經有同名 webp 就跳過）
import os, sys, glob
from playwright.sync_api import sync_playwright
from PIL import Image
import io
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
W, H = 840, 1724
todo = [f for f in sorted(glob.glob(os.path.join(ROOT, 'bg', 'svg', '*.svg'))) if not os.path.exists(os.path.join(ROOT, 'bg', os.path.basename(f)[:-4] + '.webp'))]
if todo:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        pg = b.new_page(viewport={'width': W, 'height': H})
        for f in todo:
            pg.goto('file://' + f); pg.wait_for_timeout(200)
            png = pg.screenshot(type='png')
            out = os.path.join(ROOT, 'bg', os.path.basename(f)[:-4] + '.webp')
            Image.open(io.BytesIO(png)).convert('RGB').save(out, 'WEBP', quality=80, method=6)
            print('raster', os.path.basename(out), os.path.getsize(out) // 1024, 'KB')
        b.close()
