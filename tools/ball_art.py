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


def bezier(points,steps=36):
    """Smooth tennis-felt grooves; paths are visible across the front hemisphere."""
    p0,p1,p2,p3=points
    result=[]
    for i in range(steps+1):
        t=i/steps;u=1-t
        result.append((
          u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0],
          u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]
        ))
    return result


def circle_mask():
    mask=Image.new("L", (DIAM, DIAM))
    ImageDraw.Draw(mask).ellipse(tuple(v*SCALE for v in BODY), fill=255)
    return mask


# The approved creator-supplied baseball is the single source of truth for
# ALL eight baseball skins. Never procedurally recreate its stitches.
from pathlib import Path

APPROVED_BASEBALL = Path(__file__).resolve().parent.parent / "assets" / "baseball.webp"


def polished_gold_baseball(original):
    """Polished gold finish on the approved silhouette and embossed stitches."""
    result = original.copy()
    src, dst = original.load(), result.load()
    # A reflective metallic environment, with dark horizon band, bright studio
    # panels and a warm reflected rim. All highlights stay INSIDE the sphere.
    stops = [(0.0,(65,29,5)),(.18,(118,62,9)),(.34,(208,132,24)),
             (.51,(255,200,70)),(.68,(255,232,143)),(.83,(255,247,211)),(1.,(255,255,246))]
    def palette(t):
        t=max(0.,min(1.,t))
        for (a,c),(b,d) in zip(stops,stops[1:]):
            if t<=b:
                f=(t-a)/(b-a)
                return tuple(round(v+(w-v)*f) for v,w in zip(c,d))
        return stops[-1][1]
    for y in range(SIZE):
        for x in range(SIZE):
            r,g,b,alpha=src[x,y]
            if not alpha:
                continue
            u=(x-79.5)/72.;v=(y-79.5)/72.
            z=math.sqrt(max(0.,1-u*u-v*v))
            # Reflected light direction rather than flat leather tint.
            horizon=math.exp(-((v+.07-.22*u)/.13)**2)
            panel=math.exp(-((u+.34+.17*v)/.19)**2-((v+.38)/.56)**2)
            glint=math.exp(-((u+.38)/.09)**2-((v+.49)/.09)**2)
            rim=math.exp(-((u-.65)/.15)**2-((v-.18)/.65)**2)
            lower=math.exp(-((v-.55+.18*u)/.20)**2)
            light=(.36+.19*z+.42*panel+.50*glint+.31*rim+.17*lower-.38*horizon)
            light*=.82+.18*(r*.25+g*.65+b*.10)/255.
            red_thread=r>82 and r>g*1.21 and r>b*1.16
            if red_thread:
                # Preserve the relief of every original stitch; bronze/gold,
                # not red thread. Bright edge remains on raised stitch faces.
                relief=max(0.,min(1.,(r*.52+g*.33+b*.15)/200.))
                col=palette(.055+.40*relief+.14*panel)
            else:
                col=palette(light)
            dst[x,y]=(*col,alpha)
    return result


def restored_baseball(item):
    """Keep original 3D stitches and leather shading; tint ONLY leather pixels."""
    original = Image.open(APPROVED_BASEBALL).convert("RGBA")
    original = original.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    if item["id"] == "classic":
        return original   # Bit-for-bit the approved sprite after resizing.
    if item["id"] == "dorada":
        return polished_gold_baseball(original)

    color = rgb(item["color"])
    result = original.copy()
    source_px = original.load()
    target_px = result.load()
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b, alpha = source_px[x, y]
            if alpha == 0:
                continue
            # Preserve the original red 3D stitches, cross-seam shadows and
            # outlines. Their geometry/shading must match the classic exactly.
            red_thread = r > 82 and r > g * 1.21 and r > b * 1.16
            if red_thread:
                continue
            # Target colour modifies only the white/off-white leather, while
            # retaining original lighting, soft shadows and surface highlights.
            light = (r * .25 + g * .65 + b * .10) / 246
            light = max(.13, min(1.12, light))
            shade = .22 + .79 * light
            specular = max(0, light - .91) * 48
            target_px[x, y] = (
                min(255, round(color[0] * shade + specular)),
                min(255, round(color[1] * shade + specular)),
                min(255, round(color[2] * shade + specular)),
                alpha,
            )
    return result


def draw_ball(item):
    mode=item["design"]
    if mode=="baseball":
        return restored_baseball(item)
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

    if mode=="rainbow":
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
        # Tennis is FELT with recessed WHITE CURVED GROOVES, not a smooth
        # green baseball. The previous arcs sat along the outer silhouette
        # and vanished when downsampled to the 20-36px moving ball.
        # Broad spherical shading keeps the ball readable on light grass.
        d.ellipse((30,39,148,150),(47,81,18,39))
        d.ellipse((26,23,116,96),(248,255,173,53))
        rnd=random.Random("tennis-felt-v44")
        for i in range(980):
            x=rnd.uniform(21,139);y=rnd.uniform(21,139)
            if (x-80)**2+(y-80)**2>59**2:continue
            size=rnd.choice((.45,.65,.9,1.2))
            tone=(240,255,164,25) if i%3 else (81,118,34,26)
            d.ellipse((x-size,y-size,x+size,y+size),tone)
        # Two continuous S-curves across the frontal hemisphere.
        left=(bezier(((65,27),(32,37),(29,65),(58,78)))+
              bezier(((58,78),(80,94),(75,115),(65,133))))
        right=[(160-x,y) for x,y in left]
        for seam in (left,right):
            # Dark recessed channel, cream felt seam and one fine glint.
            d.line(seam,(105,138,36,220),11)
            d.line(seam,(251,252,235,255),7)
            d.line([(x-1,y-1) for x,y in seam],(255,255,249,128),2)
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
    if design=="tennis":
        # Required visible pale grooves on BOTH halves, not just on the rim.
        left=right=0
        for sy in range(34,127):
            for sx in range(34,127):
                rr,gg,bb,aa=px[sx,sy]
                if aa>240 and rr>215 and gg>215 and bb>175:
                    if sx<78:left+=1
                    if sx>82:right+=1
        if left<85 or right<85:
            raise ValueError(f"{path}: tennis felt grooves missing or too faint: left={left} right={right}")
    if design=="baseball":
        # Regression test against the ORIGINAL physical stitching art.
        reference=Image.open(APPROVED_BASEBALL).convert("RGBA")
        reference=reference.resize((SIZE,SIZE),Image.Resampling.LANCZOS)
        original=reference.load()
        seam_pixels=0
        altered_stitches=0
        for sy in range(16,145):
            for sx in range(16,145):
                rr,gg,bb,aa=original[sx,sy]
                is_thread=aa>220 and rr>82 and rr>gg*1.21 and rr>bb*1.16
                if is_thread:
                    seam_pixels+=1
                    if path.stem=='dorada':
                        pr,pg,pb,pa=px[sx,sy]
                        # Same silhouette/relief, but metallic bronze instead of red.
                        if pa!=aa or not (pr>=pg>=pb) or pg<pr*.38:
                            altered_stitches+=1
                    elif px[sx,sy]!=original[sx,sy]:
                        altered_stitches+=1
        if seam_pixels<70:
            raise ValueError(f"{path}: missing original detailed red stitching ({seam_pixels}px)")
        if altered_stitches:
            raise ValueError(f"{path}: original stitching was modified in {altered_stitches} pixels")
        if path.stem=='dorada':
            if any(px[x,y][3]!=original[x,y][3] for y in range(SIZE) for x in range(SIZE)):
                raise ValueError('gold ball silhouette changed')
            values=[px[x,y] for y in range(30,130) for x in range(30,130) if (x-80)**2+(y-80)**2<48**2]
            if not any(r>=245 and g>=225 and b>=130 for r,g,b,a in values) or not any(r<145 and g<95 for r,g,b,a in values):
                raise ValueError('gold ball must contain bright reflections and dark metallic contrast')
        if path.stem=="classic":
            differences=sum(px[x,y]!=original[x,y]
                            for y in range(25,135) for x in range(25,135)
                            if (x-80)**2+(y-80)**2<=50**2)
            if differences:
                raise ValueError(f"{path}: classic baseball differs from approved artwork in {differences} pixels")

def verify_uv(path):
    img=Image.open(path).convert("RGBA")
    if img.size!=(SIZE,SIZE):
        raise ValueError(f"{path}: unexpected UV size")
    if img.getchannel("A").getextrema()!=(255,255):
        raise ValueError(f"{path}: UV source has transparency")
