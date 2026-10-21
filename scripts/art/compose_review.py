"""Lay out actual Blender render frames; never generate replacement artwork."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2];directory=ROOT/'docs/art-review'
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
try:font=ImageFont.truetype(font_path,24);small=ImageFont.truetype(font_path,18)
except OSError:font=small=ImageFont.load_default()
for kind,name,identifier in [('naruto','Naruto — Shippuden benchmark','naruto-uzumaki'),('luffy','Luffy — East Blue benchmark','monkey-d-luffy')]:
    canvas=Image.new('RGB',(1560,880),'#f5f3ed');draw=ImageDraw.Draw(canvas);draw.text((24,12),name,font=font,fill='#27383f')
    for i,angle in enumerate(['front','side','back']):
        frame=Image.open(directory/f'{kind}-{angle}.png').convert('RGB');canvas.paste(frame,(i*520,70));draw.text((i*520+24,44),angle.title(),font=small,fill='#485a61')
    canvas.save(directory/f'{kind}-turnaround.png',optimize=True)
    frame=Image.open(directory/f'{kind}-front.png');frame.save(ROOT/f'static/characters/{identifier}-benchmark.png',optimize=True)
