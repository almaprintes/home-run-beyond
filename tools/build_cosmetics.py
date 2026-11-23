#!/usr/bin/env python3
"""Bake complete five-pose uniform sprites, independent bats and balls.
Run in CI before tests and before publishing GitHub Pages.
No UI rectangles, DOM overlays, runtime body painting or external image API.
"""
from __future__ import annotations
import json, math, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

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
BAT_AREA={
 "ready":[(.03,.0),(.235,.0),(.275,.40),(.29,.46),(.16,.46),(.07,.20)],
 "watch":[(.03,.0),(.235,.0),(.275,.40),(.29,.46),(.16,.46),(.07,.20)],
 "loaded":[(.29,.0),(.52,.0),(.41,.32),(.30,.42),(.17,.35)],
 "contact":[(.55,.34),(.99,.30),(1,.57),(.56,.57)],
 "follow":[(0,.095),(.47,.10),(.49,.30),(0,.35)]}
HEAD={
 "ready":(.56,.24),"watch":(.56,.24),"loaded":(.69,.26),
 "contact":(.31,.17),"follow":(.54,.25)}
def bake_uniform(original,item,pose,remove_bat=False):
    if item["id"]=="red" and not remove_bat:return original.copy()
    base=original.copy().convert("RGBA")
    w,h=base.size;px=base.load()
    c=rgb(item["color"]);a=rgb(item["accent"])
    mode=item["design"];shirt=JERSEY[pose];helmet=HELMET[pose]
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
                color=shade(c,brightness+28)
            elif within(u,v0,shirt) and neutral:
                accent_here=pattern(mode,u,v0,item["id"])
                cloth=c if mode not in ("chef","kimono","astronaut","golf","polo","retro") else (235,231,218)
                color=shade(a if accent_here else cloth,brightness)
            elif .69<=v0<=.94 and neutral and brightness>105:
                leg=(235,234,227) if mode not in ("basket","boxing","running","cycling","wrestling","robot","ninja") else mix(c,(220,215,217),.32)
                if mode in ("stripes","retro","cycling") and ((u+.01)%.115)<.018:leg=a
                color=shade(leg,brightness)
            elif (v0>.73 or within(u,v0,shirt)) and red:
                color=shade(a,brightness+30)
            if color:px[x,y]=(*color,alpha)
    # High-contrast details painted into the SAME complete full-frame asset.
    if mode not in ("classic","shoulders","polo","stripes","pinstripes","hoops","chevron","hockey","basket","cycling","running","boxing","kimono","wrestling","retro","golf","jersey","rugby","fireman"):
        dr=ImageDraw.Draw(base,"RGBA")
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
    if remove_bat:
        cut=Image.new("L",(w,h),0);dr=ImageDraw.Draw(cut)
        dr.polygon([(int(u*w),int(v*h)) for u,v in BAT_AREA[pose]],fill=255)
        cp=cut.load();p=base.load()
        for y in range(h):
            for x in range(w):
                if cp[x,y]<128:continue
                r,g,b,alpha=p[x,y]
                if alpha<5:continue
                # Actual old wooden shaft, never the red helmet or player skin.
                wood=r>78 and r>g*1.11 and g>b*1.23 and g>52
                if wood or (r<105 and g<105 and b<105 and y<h*.35):
                    p[x,y]=(0,0,0,0)
    return base

def draw_bat(item):
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

def main():
    outfits=catalog("outfit");bats=catalog("bat");balls=catalog("ball")
    if (len(outfits),len(bats),len(balls))!=(33,35,32):
        raise ValueError("Unexpected cosmetic catalogue size")
    total=0
    for pose in POSES:
        src=Image.open(ROOT/"assets"/"batter"/(pose+".webp")).convert("RGBA")
        for item in outfits:
            for nobat in (False,True):
                path=OUT/"outfits"/item["id"]/(pose+("-nobat" if nobat else "")+".webp")
                save(bake_uniform(src,item,pose,nobat),path);total+=1
    for item in bats:
        save(draw_bat(item),OUT/"bats"/(item["id"]+".webp"));total+=1
    for item in balls:
        path=OUT/"balls"/(item["id"]+".webp")
        save(draw_ball(item),path,lossless=True)
        verify_ball(path,item["design"])
        total+=1
    manifest={
        "version":1,"generator":"tools/build_cosmetics.py",
        "counts":{"outfits":len(outfits),"outfitFrames":len(outfits)*len(POSES)*2,
                  "bats":len(bats),"balls":len(balls),"ballsValidated":len(balls),"total":total},
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
