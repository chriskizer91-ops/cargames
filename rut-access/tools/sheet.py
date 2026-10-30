#!/usr/bin/env python3
"""Lays screenshots out in a labelled grid, like docs/visual-comparison.jpg.

usage: tools/sheet.py out.jpg <columns> "shot.png|label" ...
"""
import sys
from PIL import Image, ImageDraw, ImageFont

out, cols, items = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
W, H, PAD, BAR = 640, 360, 8, 34
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (W + PAD) + PAD, rows * (H + BAR + PAD) + PAD), (18, 18, 20))
draw = ImageDraw.Draw(sheet)
for i, item in enumerate(items):
    path, label = item.split('|', 1)
    x, y = PAD + (i % cols) * (W + PAD), PAD + (i // cols) * (H + BAR + PAD)
    sheet.paste(Image.open(path).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + BAR))
    draw.text((x + 6, y + 7), label, font=font, fill=(235, 235, 235))
sheet.save(out, quality=88)
print(out, sheet.size)
