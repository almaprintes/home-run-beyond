#!/usr/bin/env python3
"""Bake complete five-pose uniform sprites, independent bats and balls.
Run in CI before tests and before publishing GitHub Pages.
No UI rectangles, DOM overlays, runtime body painting or external image API.
"""
from __future__ import annotations
import json, math, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from outfit_alpha import repair_reference, opaque_core, verify_uniform

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "src" / "cosmetic-catalog.js"
OUT = ROOT / "assets" / "baked"
POSES = ("ready", "watch", "loaded", "contact", "follow")

def catalog(typ):
    content=SOURCE.read_text(encoding="utf-8")
    m=re.search(r"export const "+typ.upper()+r"_CATALOG=parse\(\`\n(.*?)\n\`,'"+typ+r"'\);",content,re.S)
    if not m:raise ValueError("Catalog "+typ+" not found")
    items=[]
    for row in m.group(1).splitlines():
        entry=row.split("|")
        if len(entry)!=7:raise ValueError("Bad catalog row: "+row)
        ident,name,price,design,color,accent,emoji=entry
        items.append(dict(id=ident,name=name,price=int(price),design=design,color=color,accent=accent))
    return items

def rgb(col):
    return tuple(int(col[i:i+2],16) for i in (1,3,5))
def shade(col,luminance):
    mult=max(.26,min(1.35,luminance/207))
    return tuple(max(0,min(255,round(c*mult))) for c in col)
def within(x,y,box):
    return box[0]<=x<=box[2] and box[1]<=y<=box[3]
def mix(a,b,t):
    return tuple(round(x*(1-t)+y*t) for x,y in zip(a,b))
def pattern(mode,u,v,ident):
    if mode in ("stripes","pinstripes"):
        width=.11 if mode=="stripes" else .054
        return ((u+.03)%width)<width*(.43 if mode=="stripes" else .18)
    if mode in ("hoops","hockey","rugby"):
        return ((v+.012)%.092)<.031
    if mode in ("cycling","running","astronaut","robot","wrestling"):
        return abs((u-.53)+.35*(v-.52))<.08 or abs((u-.43)-.6*(v-.52))<.045
    if mode in ("basket","jersey"):
        return .475<u<.525 or (.52<v<.54)
    if mode in ("chevron","polo","shoulders"):
        return abs(v-(.43+.23*abs(u-.54)))<.026
    if mode in ("boxing","kimono","ninja"):
        return abs(u-v*.6-.06)<.045
    if mode in ("fireman","fisher"):
        return (v%.13)<.025
    if mode=="retro":return ((u+.01)%.05)<.012
    if mode=="pirate":return abs((u-.28)-(v-.39)*1.2)<.03
    if mode=="cowboy":return abs((u-.70)+(v-.43)*1.1)<.04
    if mode=="chef":return abs(u-.52)<.014
    if mode=="golf":return (u+.3*v)%.12<.025
    return False

JERSEY={
 "ready":(.27,.405,.80,.695),"watch":(.27,.405,.82,.695),
 "loaded":(.19,.39,.83,.72),"contact":(.10,.33,.54,.69),
 "follow":(.31,.36,.76,.70)}
HELMET={
 "ready":(.22,.04,1,.45),"watch":(.22,.04,1,.45),
 "loaded":(.26,.08,1,.47),"contact":(.09,0,.53,.38),
 "follow":(.25,0,.84,.39)}
# Hand-traced exposed shafts on the five actual original frames, in pixels.
# The boundary follows the shaft to the fingers, not a guessed colour range.
# Hands, helmet and sleeves are outside these polygons.
BAT_FRAME_MASKS={
 "ready":((194,347),[[(5,0),(41,0),(53,24),(57,65),(54,108),(57,123),(40,127),(35,109),(27,88),(16,52),(6,22)],[(49,182),(73,181),(75,189),(68,196),(54,195),(48,189)]]),
 "watch":((177,347),[[(6,0),(42,0),(51,18),(58,65),(55,107),(58,123),(41,127),(35,109),(26,80),(15,46),(6,20)],[(49,182),(73,181),(75,189),(68,196),(54,195),(48,189)]]),
 "loaded":((207,355),[[(65,0),(103,0),(106,12),(98,32),(78,60),(60,91),(48,113),(28,111),(30,97),(42,68),(54,35)]]),
 "contact":((359,286),[[(209,127),(235,121),(286,112),(320,109),(325,122),(321,142),(289,149),(245,154),(213,154),(210,145)]]),
 "follow":((289,306),[[(0,62),(17,60),(48,65),(81,67),(99,65),(100,94),(76,95),(47,100),(16,102),(0,92)]])
}
_LEGACY_BAT_MASK_CACHE={}
def legacy_bat_mask(original,pose):
    if pose in _LEGACY_BAT_MASK_CACHE:return _LEGACY_BAT_MASK_CACHE[pose]
    w,h=original.size
    (rw,rh),polygons=BAT_FRAME_MASKS[pose]
    mask=Image.new("L",(w,h),0); draw=ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon([(round(x*w/rw),round(y*h/rh)) for x,y in polygon],fill=255)
    # Count actual artwork, not the transparent margin of the mask.
    alpha=original.getchannel("A")
    from PIL import ImageChops
    mask=ImageChops.multiply(mask,alpha).point(lambda a:255 if a else 0)
    _LEGACY_BAT_MASK_CACHE[pose]=mask
    return mask

HEAD={
 "ready":(.56,.24),"watch":(.56,.24),"loaded":(.69,.26),
 "contact":(.31,.17),"follow":(.54,.25)}
# Exclusive championship finish; the source facets and alpha are preserved.
# Helmet = polished metal; textile = black with woven gold panels and piping.
def champion_gold(t):
    stops=((0.,(62,27,5)),(.25,(133,72,11)),(.48,(218,143,25)),(.70,(255,207,73)),(.88,(255,240,160)),(1.,(255,255,233)))
    t=max(0.,min(1.,t))
    for (lo,c),(hi,d) in zip(stops,stops[1:]):
        if t<=hi:return mix(c,d,(t-lo)/(hi-lo))
    return stops[-1][1]

def champion_helmet(u,v,brightness,pose):
    hx,hy=HEAD[pose]
    # Studio-style reflections in the same relative place for each pose.
    x=(u-hx)/.28;y=(v-hy)/.18
    panel=math.exp(-((x+.44+.30*y)/.29)**2-((y+.35)/.90)**2)
    band=math.exp(-((y-.15-.24*x)/.23)**2)
    rim=math.exp(-((x-.75)/.24)**2-((y-.12)/1.2)**2)
    spec=math.exp(-((x+.52)/.14)**2-((y+.56)/.20)**2)
    return champion_gold(.22+.53*brightness/190+.44*panel+.30*spec+.22*rim-.27*band)

def champion_cloth(u,v,brightness,pose):
    x0,y0,x1,y1=JERSEY[pose]
    x=(u-x0)/max(.01,x1-x0);y=(v-y0)/max(.01,y1-y0)
    # Gold shoulders, a broad diagonal sash and thin gold edging on black.
    sash=abs(x-(.24+.62*y))
    if y<.22 or sash<.16 or x<.07 or x>.93 or y>.90:
        return champion_gold(.30+.60*brightness/235+.10*math.sin((x+y)*9))
    return shade((49,47,45),brightness+42)

def bake_uniform(original,item,pose,remove_bat=False):
    if item["id"]=="red" and not remove_bat:return original.copy()
    base=original.copy().convert("RGBA")
    w,h=base.size;px=base.load()
    c=rgb(item["color"]);a=rgb(item["accent"])
    mode=item["design"];shirt=JERSEY[pose];helmet=HELMET[pose]
    champion=item['id']=='gold'
    for y in range(h):
        v=y/max(1,h);v0=y/float(h)
        for x in range(w):
            r,g,b,alpha=px[x,y]
            if alpha<24:continue
            u=x/max(1,w)
            brightness=(r*.32+g*.50+b*.18)
            # Keep face, forearms, gloves and black contour pixels original.
            neutral=max(r,g,b)-min(r,g,b)<53 and brightness>92
            red=r>g*1.3 and r>b*1.25 and g<126 and r>70
            color=None
            if within(u,v0,helmet) and red:
                color=champion_helmet(u,v0,brightness,pose) if champion else shade(c,brightness+28)
            elif within(u,v0,shirt) and neutral:
                accent_here=pattern(mode,u,v0,item["id"])
                cloth=c if mode not in ("chef","kimono","astronaut","golf","polo","retro") else (235,231,218)
                color=champion_cloth(u,v0,brightness,pose) if champion else shade(a if accent_here else cloth,brightness)
            elif .69<=v0<=.94 and neutral and brightness>105:
                leg=(235,234,227) if mode not in ("basket","boxing","running","cycling","wrestling","robot","ninja") else mix(c,(220,215,217),.32)
                if mode in ("stripes","retro","cycling") and ((u+.01)%.115)<.018:leg=a
                color=shade((45,44,43) if champion else leg,brightness)
            elif (v0>.73 or within(u,v0,shirt)) and red:
                color=champion_gold(.30+.60*brightness/220) if champion else shade(a,brightness+30)
            if color:px[x,y]=(*color,alpha)
    # High-contrast details painted into the SAME complete full-frame asset.
    if mode not in ("classic","shoulders","polo","stripes","pinstripes","hoops","chevron","hockey","basket","cycling","running","boxing","kimono","wrestling","retro","golf","jersey","rugby","fireman"):
        overlay=Image.new("RGBA",base.size);dr=ImageDraw.Draw(overlay,"RGBA")
        head=HEAD[pose];hx,hy=int(head[0]*w),int(head[1]*h)
        sx=max(7,int(w*.15));sy=max(6,int(h*.045))
        if mode=="chef":
            dr.rounded_rectangle((hx-sx,hy-4*sy,hx+sx,hy-1*sy),radius=max(3,sx//4),fill=(242,240,229,255),outline=(180,187,188,255),width=2)
            dr.rectangle((hx-sx,hy-sy*2,hx+sx,hy-sy),fill=(*a,255))
        elif mode=="cowboy":
            dr.ellipse((hx-2*sx,hy-sy*2,hx+2*sx,hy-sy//2),fill=(159,103,61,230),outline=(78,51,39,255),width=2)
        elif mode=="pirate":
            dr.polygon([(hx-2*sx,hy-sy),(hx-sx,hy-3*sy),(hx,hy-2*sy),(hx+sx,hy-3*sy),(hx+2*sx,hy-sy)],fill=(38,45,60,255),outline=(*a,255))
        elif mode=="fisher":
            dr.arc((hx-2*sx,hy-2*sy,hx+2*sx,hy+sy),0,180,fill=(*a,255),width=max(3,sy//2))
        elif mode=="astronaut":
            dr.ellipse((hx-2*sx,hy-4*sy,hx+2*sx,hy+3*sy),outline=(198,241,253,240),width=max(3,sx//6))
            dr.ellipse((hx-sx,hy-2*sy,hx+sx,hy+sy),fill=(58,121,158,90),outline=(236,251,255,190),width=2)
        elif mode=="ninja":
            dr.polygon([(hx-sx,hy-sy),(hx+2*sx,hy-sy),(hx+sx,hy+sy),(hx-sx,hy+sy)],fill=(35,42,53,245))
            dr.line((hx-sx//2,hy,hx+sx,hy),fill=(232,229,216,250),width=3)
        elif mode=="robot":
            dr.rectangle((hx-sx,hy-sy,hx+sx,hy+sy),fill=(41,74,91,220),outline=(128,222,226,240),width=3)
            dr.line((hx-sx//2,hy,hx+sx//2,hy),fill=(116,249,244,255),width=3)
        base=Image.alpha_composite(base,overlay)
    if remove_bat:
        # Work from the untouched reference, not the recoloured outfit:
        # the mask must be identical for every uniform and every custom bat.
        mask=legacy_bat_mask(original,pose).load()
        p=base.load()
        for y in range(h):
            for x in range(w):
                # The approved artwork also includes old decorative flourishes.
                # They are removed only OUTSIDE the body, on no-bat variants:
                # the aiming arrow (loaded) and old ball/sparks (contact).
                old_fx=(pose=="loaded" and ((x/w>.73 and .47<y/h<.62) or (x/w<.25 and .59<y/h<.71))) or (
                    pose=="contact" and x/w>.79 and .24<y/h<.63)
                if (mask[x,y] or old_fx) and p[x,y][3]:
                    p[x,y]=(0,0,0,0)
    return opaque_core(base)

def nova_bat():
    """Metallic violet barrel with cyan inlays on the exact approved bat alpha."""
    src=Image.open(APPROVED_CLASSIC).convert("RGBA")
    out=src.copy();p=out.load();w,h=out.size
    alpha=src.getchannel("A");a=alpha.load()
    for x in range(w):
        ys=[y for y in range(h) if a[x,y]>120]
        if not ys:continue
        mid=(ys[0]+ys[-1])/2;radius=max(1,(ys[-1]-ys[0])/2)
        for y in range(h):
            r,g,b,aa=p[x,y]
            if not aa:continue
            v=(y-mid)/radius
            curve=math.sqrt(max(0,1-v*v))
            stripe=math.exp(-((v+.43)/.19)**2)
            light=.35+.42*curve+.42*stripe
            if x<76:
                weave=.09 if (x//3+y//2)%2 else 0
                c=(22+65*light+weave*100,25+67*light,35+80*light)
            else:
                hue=.5+.5*math.sin(x*.025)
                c=((105+70*hue)*light,(65+30*hue)*light,(190+52*hue)*light)
                # Narrow recessed diagonal inlays, each with a cyan core.
                groove=(x+v*12)%37
                if x>109 and x<285 and abs(v)<.77:
                    if groove<5:c=tuple(q*.44 for q in c)
                    if 1<groove<3:c=(90+58*curve,205+42*curve,250)
                if stripe>.75:c=tuple(q+27*stripe for q in c)
            p[x,y]=tuple(max(0,min(255,round(q))) for q in c)+(aa,)
    out.putalpha(alpha)
    return out

def closed_umbrella():
    """Folded fabric canopy, metal ferrule, strap and curved handle."""
    scale=3;img=Image.new("RGBA",(320*scale,116*scale));d=ImageDraw.Draw(img)
    def line(points,color,width):
        d.line([(round(x*scale),round(y*scale)) for x,y in points],fill=color,width=round(width*scale),joint="curve")
    def poly(points,color):
        d.polygon([(round(x*scale),round(y*scale)) for x,y in points],fill=color)
    def ellipse(box,color):
        d.ellipse(tuple(round(v*scale) for v in box),fill=color)
    # Dark rubber J handle, chrome shaft, long tapered folded canopy.
    curve=[(75,57),(31,57),(18,61),(13,73),(17,84),(27,88),(37,83)]
    line(curve,(24,31,41,255),14);line(curve,(61,71,85,255),7)
    line([(65,57),(310,57)],(123,143,165,255),8)
    line([(70,54),(310,54)],(224,231,238,255),2)
    poly([(76,56),(106,31),(177,30),(239,42),(291,55),(240,70),(167,83),(110,78)],(24,53,100,255))
    poly([(76,56),(107,33),(177,30),(239,42),(291,55),(171,48),(110,47)],(72,134,205,255))
    poly([(76,56),(110,47),(171,48),(291,55),(167,64),(106,66)],(45,92,158,255))
    poly([(76,56),(106,66),(167,64),(291,55),(240,70),(167,83),(110,78)],(19,43,84,255))
    line([(107,35),(169,37),(232,48),(288,55)],(133,180,230,255),2)
    line([(110,75),(167,77),(234,65),(286,57)],(44,80,132,255),2)
    poly([(136,32),(151,32),(151,80),(136,80)],(25,41,68,255))
    line([(139,34),(139,77)],(75,102,143,255),2)
    ellipse((140,49,147,56),(177,191,207,255))
    line([(288,57),(310,57)],(158,179,200,255),5)
    ellipse((305,53,315,61),(91,108,126,255))
    return img.resize((320,116),Image.Resampling.LANCZOS)

def draw_bat(item):
    if item["id"]=="nova":return nova_bat()
    if item["id"]=="paraguas":return closed_umbrella()
    img=Image.new("RGBA",(320,116),(0,0,0,0));d=ImageDraw.Draw(img,"RGBA")
    mode=item["design"];c=rgb(item["color"]);a=rgb(item["accent"])
    d.line([(18,57),(73,57)],fill=(40,46,54),width=18)
    d.line([(22,51),(68,51)],fill=(117,124,131),width=4)
    specials=("broom","trout","wire","bread","banana","paddle","guitar","wrench","hammer","hockey","umbrella","cactus","wand","mic","pan","swordfish","lollipop","foam","tentacle","bone","mace","shovel","rake","carrot","torch")
    if mode not in specials:
        d.polygon([(60,49),(118,43),(282,35),(299,43),(299,71),(282,80),(118,70),(60,64)],fill=(*c,255))
        d.line([(116,43),(280,35)],fill=(*a,245),width=5)
        for i in range(6 if mode in ("carbon","metal","neon","ice","flame","nebula") else 1):
            x=130+i*24
            d.line([(x,47),(x+12,67)],fill=(*a,130),width=2)
    elif mode in ("trout","swordfish"):
        d.line([(57,58),(120,58)],fill=(72,117,118,255),width=20)
        d.ellipse((105,25,272,91),fill=(*c,255),outline=(39,84,96,255),width=4)
        d.polygon([(256,53),(306,19),(294,58),(306,97)],fill=(*a,255))
        d.polygon([(153,31),(197,5),(221,30)],fill=(*a,240))
        d.polygon([(168,85),(218,107),(227,83)],fill=(*a,230))
        d.ellipse((116,38,127,50),fill=(254,255,255,255))
        d.ellipse((119,40,123,46),fill=(19,37,53,255))
        for i in range(5):d.line([(163+i*16,42),(163+i*16,78)],fill=(226,246,237,100),width=2)
        if mode=="swordfish":d.polygon([(105,56),(63,54),(86,49),(100,52)],fill=(235,247,242,250))
    elif mode=="broom":
        d.line([(58,58),(256,58)],fill=(*c,255),width=14)
        d.polygon([(241,37),(313,20),(313,96),(241,80)],fill=(*a,255))
        for i in range(17):d.line([(260,34+i*3),(310,22+i*4)],fill=(152,110,53,255),width=2)
    elif mode=="wire":
        d.line([(56,57),(289,57)],fill=(*c,255),width=30)
        for i in range(12):
            x=107+i*16;d.line([(x,42),(x+22,73)],fill=(*a,255),width=4)
            d.line([(x+7,76),(x+13,43)],fill=(107,113,118,255),width=3)
        for i in range(7):
            x=117+i*25;d.polygon([(x,40),(x+4,25),(x+10,40)],fill=(174,182,190,255))
    elif mode in ("bread","banana","carrot"):
        p=[(61,51),(111,41),(203,26),(279,29),(311,51),(299,72),(209,84),(112,72)]
        d.polygon(p,fill=(*c,255),outline=(*a,255))
        if mode=="bread":
            for i in range(6):
                x=130+i*27;d.line([(x,42),(x+13,69)],fill=(164,108,57,255),width=6)
        elif mode=="banana":d.arc((95,14,301,95),10,170,fill=(255,250,155,255),width=9)
        else:
            for i in range(7):
                x=131+i*20;d.line([(x,36),(x+12,74)],fill=(182,99,36,255),width=3)
            d.polygon([(284,33),(316,9),(309,52)],fill=(53,146,92,255))
    elif mode in ("paddle","shovel","rake","hockey","foam","umbrella"):
        d.line([(62,57),(260,57)],fill=(*c,255),width=16)
        if mode=="paddle":d.ellipse((238,29,313,85),fill=(*a,255),outline=(*c,255),width=3)
        elif mode=="shovel":d.polygon([(244,30),(306,19),(315,58),(306,91),(244,79)],fill=(*a,255))
        elif mode=="rake":
            d.line([(280,23),(280,90)],fill=(*a,255),width=13)
            for i in range(7):d.line([(280,30+i*9),(312,30+i*9)],fill=(*c,255),width=4)
        elif mode=="hockey":d.line([(268,55),(268,82),(315,82)],fill=(*a,255),width=17)
        elif mode=="foam":d.polygon([(101,34),(307,34),(316,57),(307,80),(101,80)],fill=(*a,255))
        else:d.polygon([(271,31),(310,58),(271,85)],fill=(*a,255))
    elif mode in ("guitar","wrench","hammer","mic","pan","mace"):
        d.line([(64,57),(243,57)],fill=(*c,255),width=16)
        if mode=="guitar":
            d.ellipse((217,22,293,94),fill=(*a,255),outline=(75,51,43,255),width=5)
            d.ellipse((261,31,316,84),fill=(*c,255))
            d.ellipse((266,43,283,70),fill=(37,40,50,255))
            for i in range(4):d.line([(80,51+i*3),(311,51+i*3)],fill=(254,240,199,150),width=1)
        elif mode=="wrench":d.polygon([(250,35),(281,11),(306,25),(287,47),(287,68),(308,91),(280,106),(250,78)],fill=(*a,255))
        elif mode=="hammer":d.rectangle((245,14,310,101),fill=(*a,255))
        elif mode=="mic":
            d.ellipse((249,20,315,98),fill=(*a,255))
            for i in range(8):d.line([(258,32+i*8),(305,32+i*8)],fill=(*c,255),width=2)
        elif mode=="pan":d.ellipse((235,13,311,104),fill=(*a,255),outline=(48,59,69,255),width=7)
        else:
            d.ellipse((240,18,305,96),fill=(*a,255))
            for i in range(9):
                theta=i*math.tau/9;x=272+math.cos(theta)*31;y=57+math.sin(theta)*40
                d.polygon([(x-5,y-5),(x+8,y),(x-5,y+5)],fill=(*c,255))
    elif mode in ("cactus","tentacle","bone"):
        d.line([(65,56),(287,56)],fill=(*c,255),width=32)
        for i in range(6):
            x=104+i*32
            if mode=="bone":
                d.ellipse((x-7,41,x+7,73),fill=(*a,240))
            else:
                d.ellipse((x-6,33 if i%2 else 67,x+7,47 if i%2 else 81),fill=(*a,255))
        if mode=="cactus":d.line([(182,57),(186,17)],fill=(*c,255),width=17)
    elif mode in ("torch","wand","lollipop"):
        d.line([(58,56),(265,56)],fill=(*c,255),width=13)
        if mode=="torch":
            d.polygon([(275,85),(253,40),(278,4),(306,44),(298,83)],fill=(254,181,61,255))
            d.polygon([(276,70),(274,26),(292,50)],fill=(255,247,151,255))
        elif mode=="wand":
            for i in range(10):
                th=i*math.tau/10
                d.line([(284,58),(284+math.cos(th)*27,58+math.sin(th)*27)],fill=(*a,255),width=4)
        else:
            d.ellipse((240,13,309,102),fill=(*c,255),outline=(*a,255),width=4)
            for i in range(6):d.arc((245+i*4,17+i*4,305-i*3,97-i*3),i*20,300,fill=(*a,200),width=2)
    return img

from ball_art import draw_ball, verify_ball

def save(img,path,lossless=False):
    path.parent.mkdir(parents=True,exist_ok=True)
    if lossless:
        img.save(path,"WEBP",lossless=True,method=6,exact=True)
    else:
        img.save(path,"WEBP",quality=87,method=4,exact=True)

# Same grip and tip coordinates as WEAPON_POSES. No engine changes.
CLASSIC_ANCHORS={
 "ready":((194,347),(50,153),(26,4)),
 "watch":((177,347),(50,153),(27,4)),
 "loaded":((207,355),(35,129),(86,3)),
 "contact":((359,286),(202,145),(319,126)),
 "follow":((289,306),(108,83),(3,80)),
}
APPROVED_CLASSIC=ROOT/"assets"/"approved"/"bats"/"classic.webp"
def apply_classic_bat(frame,reference,pose,bat):
    from PIL import ImageChops
    body=frame.copy()
    body.putalpha(ImageChops.multiply(body.getchannel("A"),ImageChops.invert(legacy_bat_mask(reference,pose))))
    (rw,rh),(gx,gy),(tx,ty)=CLASSIC_ANCHORS[pose]
    w,h=frame.size;gx*=w/rw;gy*=h/rh;tx*=w/rw;ty*=h/rh
    c=(tx-gx)/292;s=(ty-gy)/292;den=c*c+s*s
    affine=(c/den,s/den,18-(c*gx+s*gy)/den,-s/den,c/den,58-(-s*gx+c*gy)/den)
    weapon=bat.transform(frame.size,Image.Transform.AFFINE,affine,resample=Image.Resampling.BICUBIC)
    return opaque_core(Image.alpha_composite(weapon,body))

def betis_uniform(image,pose):
    """Offline full-sprite fabric variant of the validated Athletic artwork."""
    image=image.convert('RGBA');out=image.copy();px=out.load();w,h=image.size
    bounds={'ready':(230,286),'watch':(230,286),'loaded':(235,295),'contact':(229,295),'follow':(230,292)}
    low,high=bounds[pose]
    clamp=lambda x:max(0,min(1,x))
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if not a:continue
            t=clamp((r-max(g,b)-18)/30)*clamp((r/(g+1)-1.70)/.35)*clamp((b+20-g)/10) if y>=140 else 0
            if t:
                new=(.13*r+.52*g,.69*r+.37*g,.27*r+.50*b)
                px[x,y]=tuple(round(v+(n-v)*t) for v,n in zip((r,g,b),new))+(a,)
                continue
            if low<=y<=high:
                lum=(r+g+b)/3;spread=max(r,g,b)-min(r,g,b)
                t=clamp((25-spread)/12)*clamp((115-lum)/25)
                if t:
                    white=min(250,130+lum*1.55)
                    new=(white,white,white+min(3,255-white))
                    px[x,y]=tuple(round(v+(n-v)*t) for v,n in zip((r,g,b),new))+(a,)
    return out

def wimbledon_uniform(image,pose):
    """White tennis whites on the validated complete character, no helmet."""
    out=image.convert("RGBA");px=out.load();w,h=out.size
    low,high={'ready':(230,286),'watch':(230,286),'loaded':(235,295),'contact':(229,295),'follow':(230,292)}[pose]
    clamp=lambda x:max(0,min(1,x))
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if not a:continue
            red=clamp((r-max(g,b)-18)/30)*clamp((r/(g+1)-1.70)/.35)*clamp((b+20-g)/10) if y>=140 else 0
            if red:
                white=min(249,125+.62*r+.14*g)
                col=(white,white,min(252,white+2))
                px[x,y]=tuple(round(v+(n-v)*red) for v,n in zip((r,g,b),col))+(a,)
                continue
            if low<=y<=high or y>=329:
                lum=(r+g+b)/3;spread=max(r,g,b)-min(r,g,b)
                t=clamp((25-spread)/12)*clamp((115-lum)/25)
                if t:
                    white=min(245,125+lum*1.55)
                    px[x,y]=tuple(round(v+(white-v)*t) for v in (r,g,b))+(a,)
    return out

def main():
    outfits=catalog("outfit");bats=catalog("bat");balls=catalog("ball")
    if (len(outfits),len(bats),len(balls))!=(33,35,32):
        raise ValueError("Unexpected cosmetic catalogue size")
    total=0
    classic=Image.open(APPROVED_CLASSIC).convert('RGBA')
    if classic.size!=(320,116):raise ValueError('Invalid approved classic bat dimensions')
    for pose in POSES:
        src=Image.open(ROOT/"assets"/"batter"/(pose+".webp")).convert("RGBA")
        src=opaque_core(repair_reference(src,pose))
        mask=legacy_bat_mask(src,pose)
        removed=sum(1 for v in mask.getdata() if v>0)
        if removed<130:
            raise ValueError(f"{pose}: original bat was not extracted (pixels={removed})")
        if removed>src.width*src.height*.12:
            raise ValueError(f"{pose}: bat-only mask erased too much of the player ({removed} pixels)")
        print(f"  Clean {pose} original bat: {removed} removed pixels",flush=True)
        for item in outfits:
            for nobat in (False,True):
                path=OUT/"outfits"/item["id"]/(pose+("-nobat" if nobat else "")+".webp")
                approved=ROOT/"assets"/"approved"/"outfits"/("futbol_rojo" if item["id"] in ("futbol_verde","tenis_blanco") else item["id"])
                if approved.is_dir():
                    # Approved complete character, never recolor or mask its body.
                    anchors=json.loads((approved/"anchors.json").read_text(encoding="utf-8"))
                    source=approved/(pose+"-nobat.webp")
                    baked=opaque_core(Image.open(source).convert("RGBA"))
                    if item["id"]=="futbol_verde":baked=betis_uniform(baked,pose)
                    if item["id"]=="tenis_blanco":baked=wimbledon_uniform(baked,pose)
                    if not nobat:
                        anchor=anchors[pose];w,h=baked.size
                        gx,gy=anchor["grip"][0]*w,anchor["grip"][1]*h
                        tx,ty=anchor["tip"][0]*w,anchor["tip"][1]*h
                        c=(tx-gx)/292;s=(ty-gy)/292;den=c*c+s*s
                        affine=(c/den,s/den,18-(c*gx+s*gy)/den,-s/den,c/den,58-(-s*gx+c*gy)/den)
                        weapon=classic.transform(baked.size,Image.Transform.AFFINE,affine,resample=Image.Resampling.BICUBIC)
                        baked=opaque_core(Image.alpha_composite(weapon,baked))
                    save(baked,path);verify_uniform(path,baked);total+=1
                    continue
                baked=bake_uniform(src,item,pose,nobat)
                if not nobat:baked=apply_classic_bat(baked,src,pose,classic)
                save(baked,path);verify_uniform(path,baked);total+=1
    for item in bats:
        path=OUT/"bats"/(item["id"]+".webp")
        approved=APPROVED_CLASSIC.parent/(item["id"]+".webp")
        if approved.is_file():
            art=Image.open(approved).convert("RGBA")
            if art.size!=classic.size:raise ValueError(f'{approved}: wrong bat dimensions')
            if item["id"] in ("gold","ruby","ocean","carbono","neon","baguette"):
                from PIL import ImageChops
                if ImageChops.difference(art.getchannel("A"),classic.getchannel("A")).getbbox():
                    raise ValueError(f"{approved}: must match the classic silhouette pixel for pixel")
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(approved.read_bytes())
        else:save(draw_bat(item),path)
        total+=1
    for item in balls:
        path=OUT/"balls"/(item["id"]+".webp")
        save(draw_ball(item),path,lossless=True)
        verify_ball(path,item["design"])
        total+=1
    manifest={
        "version":1,"generator":"tools/build_cosmetics.py",
        "counts":{"outfits":len(outfits),"outfitFrames":len(outfits)*len(POSES)*2,
                  "uniformAlphaValidated":len(outfits)*len(POSES)*2,"bats":len(bats),"balls":len(balls),"ballsValidated":len(balls),"total":total},
        "poses":list(POSES),
        "outfits":[i["id"] for i in outfits],
        "bats":[i["id"] for i in bats],
        "balls":[i["id"] for i in balls],
        "verified":all((OUT/"outfits"/item["id"]/(pose+".webp")).exists() for item in outfits for pose in POSES)
                    and all((OUT/"balls"/(item["id"]+".webp")).exists() for item in balls)
                    and all((OUT/"balls"/(item["id"]+".webp")).exists() for item in balls)
    }
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Baked",total,"WebP images; 8 restored original-stitched baseball skins, 24 themed balls")

if __name__=="__main__":main()
