from PIL import Image,ImageDraw,ImageFont,ImageFilter
import math
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'icons';root.mkdir(exist_ok=True)
S=768
im=Image.new('RGBA',(S,S));pix=im.load()
for y in range(S):
 for x in range(S):
  t=y/S;pix[x,y]=(int(6+12*t),int(33+25*t),int(55+21*t),255)
d=ImageDraw.Draw(im,'RGBA')
# speed trails in three luminous layered bands
for i in range(5):
 offs=70*i
 d.polygon([(70,590-offs),(410,340-offs*.43),(478,362-offs*.35),(150,660-offs)],fill=(48+27*i,195+10*i,219,130-i*17))
 d.ellipse((90+i*15,570-i*56,165+i*15,642-i*56),fill=(255,186,80,160))
# ball shadow halo
for ring in range(12,0,-1):
 b=ring*7;d.ellipse((293-b,190-b,691+b,590+b),fill=(255,185,94,int(3+(12-ring)*2)))
d.ellipse((280,187,695,600),fill=(8,22,42,110))
d.ellipse((275,180,675,580),fill=(255,253,242,255))
d.arc((309,170,506,587),-86,84,fill=(221,68,71,255),width=21)
d.arc((435,165,650,581),93,272,fill=(221,68,71,255),width=21)
for j in range(11):
 t=(j+.25)*math.pi/12
 x=405-83*math.cos(t);y=375+193*math.sin(t)
 d.line((x-13,y-11,x+9,y+11),fill=(193,56,67,230),width=8)
 x=550+80*math.cos(t);y=378+193*math.sin(t)
 d.line((x-12,y+10,x+13,y-9),fill=(193,56,67,230),width=8)
d.ellipse((335,220,408,288),fill=(255,255,255,175))
# frame sheen
for i in range(3):d.rounded_rectangle((i+8,i+8,S-i-8,S-i-8),radius=142,outline=(199,240,237,35),width=5)
for size in (192,512):
 im.resize((size,size),Image.Resampling.LANCZOS).convert('RGB').save(root/f'icon-{size}.png',optimize=True)
print('icons created')