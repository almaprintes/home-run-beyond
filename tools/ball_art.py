"""High-resolution baseball and themed ball assets used by Home Run Beyond.

The marketplace icon and in-game sprite are the same WebP. The circular body
is fully opaque, decoration is clipped to the body, and only intentional
silhouettes (Sun rays, Saturn rings, meteor trail, fuse) extend outside it.
Baseball skins additionally get an opaque square UV texture for true rolling
rotation. No UV projection is ever applied to a round RGBA sprite.
"""
from __future__ import annotations

import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageChops

SIZE = 160
SCALE = 3
DIAM = SIZE * SCALE
BODY = (19, 19, 141, 141)


def rgb(color):
    return tuple(int(color[i:i+2], 16) for i in (1, 3, 5))


def rgba(color, alpha=255):
    return (*rgb(color), alpha) if isinstance(color, str) else (*color[:3], alpha)


class Painter:
    def __init__(self, img):
        self.d = ImageDraw.Draw(img, "RGBA")

    def xy(self, coords):
        return tuple(round(v * SCALE) for v in coords)

    def ellipse(self, box, fill, outline=None, width=1):
        self.d.ellipse(self.xy(box), fill=fill,
                       outline=outline, width=max(1, round(width*SCALE)))

    def polygon(self, points, fill, outline=None, width=1):
        p=[self.xy(v) for v in points]
        self.d.polygon(p, fill=fill)
        if outline:
            self.d.line(p+[p[0]], fill=outline, width=max(1,round(width*SCALE)), joint="curve")

    def line(self, points, fill, width=2):
        self.d.line([self.xy(v) for v in points], fill=fill,
                    width=max(1,round(width*SCALE)), joint="curve")

    def arc(self, box, start, end, fill, width=3):
        self.d.arc(self.xy(box), start, end, fill=fill, width=max(1,round(width*SCALE)))

    def pieslice(self, box, start, end, fill):
        self.d.pieslice(self.xy(box), start, end, fill=fill)

    def text(self, xy, value, fill, size=36):
        try:
            font=ImageFont.truetype("DejaVuSans-Bold.ttf", round(size*SCALE))
        except OSError:
            font=ImageFont.load_default(size=round(size*SCALE))
        self.d.text(self.xy(xy), value, font=font, anchor="mm", fill=fill,
                    stroke_width=max(0, SCALE//3), stroke_fill=fill)


def circle_mask():
    mask=Image.new("L", (DIAM, DIAM))
    ImageDraw.Draw(mask).ellipse(tuple(v*SCALE for v in BODY), fill=255)
    return mask


def draw_seams(d, base=SIZE, stroke=(194,62,60,255)):
    """Two continuous baseball seam arcs and short angled cross-stitches."""
    left=[];right=[]
    for y in range(27,134,3):
        t=(y-27)/106
        bow=math.sin(math.pi*t)
        left.append((61-14*bow,y))
        right.append((99+14*bow,y))
    d.line(left,stroke,2.5);d.line(right,stroke,2.5)
    for y in range(35,127,11):
        bow=math.sin(math.pi*(y-27)/106)
        xl=61-14*bow;xr=99+14*bow
        d.line([(xl-4,y-4),(xl+5,y+4)],stroke,1.65)
        d.line([(xr-5,y+4),(xr+4,y-4)],stroke,1.65)


def baseball_uv(item):
    """Fully opaque UV source: never sample transparent rounded corners."""
    img=Image.new("RGBA", (DIAM, DIAM), rgba(item["color"]))
    p=Painter(img)
    primary=rgba(item["accent"])
    # Keep the stitching in the same positions as the circular icon.
    draw_seams(p,stroke=primary)
    return img.resize((SIZE,SIZE),Image.Resampling.LANCZOS)


def draw_ball(item):
    mode=item["design"]
    color=rgba(item["color"])
    accent=rgba(item["accent"])
    if mode=="dice":
        img=Image.new("RGBA",(DIAM,DIAM));d=Painter(img)
        # Genuine closed cube, without a round white "core" behind it.
        d.polygon([(30,49),(88,23),(133,53),(80,77)],
                  (252,246,234,255),(106,99,94,255),2)
        d.polygon([(30,49),(80,77),(80,140),(28,104)],
                  (229,218,204,255),(106,99,94,255),2)
        d.polygon([(80,77),(133,53),(131,111),(80,140)],
                  (239,229,215,255),(106,99,94,255),2)
        for x,y in [(45,72),(63,84),(47,104),(100,80),(115,89),(98,108)]:
            d.ellipse((x-5,y-5,x+5,y+5),accent)
        return img.resize((SIZE,SIZE),Image.Resampling.LANCZOS)

    mask=circle_mask()
    # Silhouette features behind the OPAQUE sphere.
    outer=Image.new("RGBA",(DIAM,DIAM))
    od=Painter(outer)
    if mode=="sun":
        for i in range(16):
            a=i*math.tau/16
            od.line([(80+math.cos(a)*56,80+math.sin(a)*56),
                     (80+math.cos(a)*76,80+math.sin(a)*76)],
                    (255,180,48,255),7)
    if mode=="saturn":
        od.ellipse((3,48,157,113),None,(242,222,177,235),11)
        od.ellipse((10,55,150,106),None,(175,145,98,220),5)
    if mode=="meteor":
        for i in range(6):
            y=40+i*13
            od.polygon([(6,y),(42,y-8),(48,y+9)],(246,151,67,205))
    if mode=="bomb":
        od.line([(82,24),(95,7),(108,10)],(215,193,146,255),6)
        od.ellipse((106,3,119,16),(255,211,71,255))

    body=Image.new("RGBA",(DIAM,DIAM))
    bd=Painter(body)
    bd.ellipse(BODY,color)
    details=Image.new("RGBA",(DIAM,DIAM))
    d=Painter(details)

    if mode=="baseball":
        draw_seams(d,stroke=accent)
    elif mode=="rainbow":
        colors=[(226,86,91,255),(249,167,76,255),(245,226,106,255),
                (101,198,111,255),(82,169,218,255),(156,115,204,255)]
        for i,c in enumerate(colors):
            d.pieslice(BODY,i*60,(i+1)*60,c)
        d.ellipse((74,74,86,86),(245,245,235,255))
    elif mode=="sun":
        d.ellipse((28,28,132,132),(255,199,64,255))
        d.ellipse((47,42,96,88),(255,236,130,120))
        for i in range(7):
            a=i*math.tau/7
            x=80+math.cos(a)*33;y=80+math.sin(a)*33
            d.ellipse((x-8,y-5,x+8,y+5),(250,139,42,110))
    elif mode in ("moon","mars","meteor","golf","snow","orange"):
        rnd=random.Random(item["id"])
        for i in range(26 if mode=="golf" else 15):
            x=rnd.uniform(40,120);y=rnd.uniform(40,120)
            r=rnd.uniform(2,7 if mode in ("golf","orange") else 10)
            if (x-80)**2+(y-80)**2>(51-r)**2:
                continue
            if mode=="golf":
                col=(172,183,191,58);edge=(134,151,165,90)
            elif mode=="orange":
                col=(187,108,45,75);edge=None
            elif mode=="snow":
                col=(165,206,233,75);edge=(253,253,254,125)
            elif mode=="moon":
                col=(119,128,142,105);edge=(235,240,244,165)
            else:
                col=rgba(item["accent"],100);edge=rgba(item["accent"],145)
            d.ellipse((x-r,y-r,x+r,y+r),col,edge,1)
        if mode=="orange":
            d.ellipse((68,28,90,40),(78,145,73,245))
    elif mode=="earth":
        for poly in [
            [(30,68),(44,41),(65,45),(75,62),(65,82),(46,109),(35,99)],
            [(89,32),(121,54),(110,74),(133,95),(103,103),(84,85)],
            [(107,101),(122,114),(97,137),(83,122)]
        ]:
            d.polygon(poly,accent)
        d.arc((34,35,126,75),175,355,(255,255,255,120),5)
    elif mode=="saturn":
        for y in [45,60,74,89,107]:
            d.line([(29,y),(132,y+2)],(243,220,178,95),7)
        d.arc((4,48,156,112),4,175,(247,231,196,255),11)
    elif mode=="billiard":
        d.ellipse((50,47,110,110),(255,255,249,255))
        d.text((80,79),"8",(19,21,28,255),38)
    elif mode=="tennis":
        # Two clean white curved seams entirely confined to the ball.
        d.arc((20,13,103,148),109,251,(253,253,248,255),5)
        d.arc((61,13,143,148),289,71,(253,253,248,255),5)
    elif mode=="beach":
        colors=[(246,84,93,255),(246,213,81,255),(78,181,222,255),
                (95,206,133,255),(245,245,240,255),(154,102,205,255)]
        for i,c in enumerate(colors):
            d.pieslice(BODY,i*60-30,(i+1)*60-30,c)
        d.ellipse((72,72,88,88),(250,249,233,255))
    elif mode=="watermelon":
        # Whole green rind, no detached red loops outside the sphere.
        for i in range(-5,6):
            x=80+i*14
            d.arc((x-26,17,x+26,143),80,280,
                  (37,116,62,195),5)
        d.ellipse((53,30,91,42),(60,140,62,200))
    elif mode=="eyeball":
        d.ellipse((47,47,115,115),accent)
        d.ellipse((63,62,99,99),(29,33,45,255))
        d.ellipse((72,68,84,80),(255,255,255,255))
    elif mode=="disco":
        choices=[(183,210,235,230),(238,247,252,255),
                 (135,170,211,250),(144,221,217,245)]
        for y in range(19,143,13):
            for x in range(21,141,13):
                d.polygon([(x,y),(x+11,y),(x+11,y+11),(x,y+11)],
                          choices[(x//13+y//13)%len(choices)])
    elif mode=="bomb":
        d.ellipse((40,34,79,66),(255,255,255,70))
    elif mode=="pumpkin":
        for i in range(-3,4):
            d.arc((39+i*9,23,121+i*9,138),90,270,rgba(item["accent"],180),3)
        d.polygon([(47,72),(65,74),(52,89)],(67,48,41,255))
        d.polygon([(89,74),(107,72),(98,89)],(67,48,41,255))
        d.line([(80,20),(84,34)],(55,132,65,255),7)
    elif mode=="soccer":
        d.polygon([(80,50),(104,66),(97,94),(65,99),(56,72)],accent)
        for x,y in [(38,45),(122,46),(119,110),(45,119)]:
            d.polygon([(x-11,y-7),(x+10,y-9),(x+15,y+9),(x-5,y+17)],accent)
        for x,y in [(50,63),(108,67),(98,112),(57,108)]:
            d.line([(80,80),(x,y)],(45,47,53,115),2)
    elif mode=="bowling":
        for x,y in [(62,55),(96,60),(78,91)]:
            d.ellipse((x-8,y-8,x+8,y+8),(24,25,36,255))
    elif mode=="donut":
        d.ellipse((30,34,130,128),rgba(item["accent"]))
        for i in range(20):
            a=i*math.tau/20
            x=80+math.cos(a)*34;y=80+math.sin(a)*29
            d.line([(x-3,y-2),(x+3,y+2)],
                   [(255,250,176,255),(173,224,249,255),(189,250,207,255)][i%3],2)
        # Chocolate-covered central hole, not a transparent pixel hole.
        d.ellipse((63,62,98,99),(65,46,51,255))
        d.ellipse((69,68,91,92),(30,27,34,255))
    elif mode=="candy":
        for i in range(12):
            a=i*math.tau/12
            d.line([(80,80),(80+math.cos(a)*59,80+math.sin(a)*59)],
                   accent if i%2 else (244,245,240,255),10)
        d.ellipse((72,72,88,88),(249,250,245,245))
    elif mode=="crystal":
        d.polygon([(79,21),(121,45),(135,96),(83,138),(35,114),(28,61)],
                  rgba(item["accent"],215))
        d.polygon([(79,21),(97,67),(83,138)],(232,255,255,190))
        d.polygon([(35,114),(97,67),(135,96),(83,138)],(87,165,195,165))
    # Clip ALL texture and decorations to the sphere, then composite over
    # an opaque ball. Deliberate outer silhouettes (Sun/Saturn) stay behind.
    details.putalpha(ImageChops.multiply(details.getchannel("A"),mask))
    body.alpha_composite(details)
    body.putalpha(mask)
    outer.alpha_composite(body)
    return outer.resize((SIZE,SIZE),Image.Resampling.LANCZOS)


def verify_ball(path, design):
    """Reject holes, missing baseball seams or decorative overflow in CI."""
    img=Image.open(path).convert("RGBA")
    if img.size!=(SIZE,SIZE):
        raise ValueError(f"{path}: size {img.size}")
    px=img.load()
    # A cube is NOT circular: outside its polygon and on anti-aliased edges
    # transparency is intentional. Validate solid points on each cube face.
    if design=="dice":
        for x,y in [(80,80),(82,60),(80,118),(45,79),(58,95),(102,84),(112,98)]:
            if px[x,y][3]<250:
                raise ValueError(f"{path}: missing cube face at {x},{y}: {px[x,y][3]}")
    else:
        # Every circular ball must be fully opaque throughout the visible core.
        for y in range(28,133):
            for x in range(28,133):
                if (x-80)**2+(y-80)**2<=50**2 and px[x,y][3]!=255:
                    raise ValueError(f"{path}: transparent core at {x},{y}: {px[x,y][3]}")
    if design=="baseball":
        center=px[80,80]
        if center[3]!=255:
            raise ValueError(f"{path}: missing baseball surface")
        # Stitches must be visible on the left and right of the sphere.
        left=sum(1 for y in range(35,127) if any(
            abs(px[x,y][0]-center[0])>26 or abs(px[x,y][1]-center[1])>26
            for x in range(43,65)))
        right=sum(1 for y in range(35,127) if any(
            abs(px[x,y][0]-center[0])>26 or abs(px[x,y][1]-center[1])>26
            for x in range(95,119)))
        if left<12 or right<12:
            raise ValueError(f"{path}: baseball seams incomplete ({left}, {right})")


def verify_uv(path):
    img=Image.open(path).convert("RGBA")
    if img.size!=(SIZE,SIZE):
        raise ValueError(f"{path}: unexpected UV size")
    if img.getchannel("A").getextrema()!=(255,255):
        raise ValueError(f"{path}: UV source has transparency")
