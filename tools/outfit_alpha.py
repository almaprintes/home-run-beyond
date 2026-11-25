"""Repair missing artwork in the original five poses, not anatomical openings."""
from PIL import Image, ImageDraw, ImageFilter, ImageChops

# Coordinates refer to the original unscaled five reference frames. Painted
# behind original pixels, so the approved facets and existing detail survive.
REPAIRS={
 'ready':((194,347),[
  ([(138,34),(145,36),(152,43),(157,53),(160,58),(146,60),(138,49)],(177,53,53)),
  ([(114,130),(128,135),(137,140),(139,153),(139,165),(110,174),(96,166),(99,153)],(216,203,207)),
  ([(15,307),(37,311),(40,327),(13,328),(10,321)],(226,220,221)),
  ([(137,309),(153,309),(154,327),(134,326)],(163,52,51)),
 ]),
 'watch':((177,347),[
  ([(138,34),(145,36),(152,43),(157,53),(160,58),(146,60),(138,49)],(177,53,53)),
  ([(135,307),(153,307),(154,327),(132,326)],(160,52,51)),
 ]),
 'loaded':((207,355),[]),
 'contact':((359,286),[
  ([(1,261),(19,264),(20,276),(13,285),(2,283),(0,273)],(55,57,64)),
  ([(174,265),(181,267),(193,270),(197,279),(194,285),(175,285),(171,276)],(55,57,64)),
 ]),
 'follow':((289,306),[
  ([(169,5),(179,10),(185,19),(190,27),(194,29),(182,39),(169,30)],(176,52,54)),
  ([(98,258),(111,264),(113,277),(100,290),(90,299),(81,298),(66,263),(72,258)],(56,58,66)),
  ([(262,272),(274,275),(286,285),(288,292),(270,300),(254,294),(252,282)],(59,61,69)),
 ])
}

def repair_reference(original,pose):
    original=original.convert('RGBA');w,h=original.size
    (rw,rh),patches=REPAIRS[pose]
    # Supersampled underpainting retains the antialiased external contour.
    under=Image.new('RGBA',(w*3,h*3));draw=ImageDraw.Draw(under)
    for poly,color in patches:
        draw.polygon([(round(x*w*3/rw),round(y*h*3/rh)) for x,y in poly],fill=(*color,255))
    under=under.resize((w,h),Image.Resampling.LANCZOS)
    return Image.alpha_composite(under,original)

def opaque_core(image):
    # Keep a two-pixel antialias margin and real open spaces. An opaque
    # interior must not be weakened by a painted accent or visor overlay.
    alpha=image.getchannel('A')
    core=alpha.point(lambda a:255 if a>=128 else 0).filter(ImageFilter.MinFilter(5))
    out=image.copy();out.putalpha(ImageChops.lighter(alpha,core));return out

def verify_uniform(path,expected):
    actual=Image.open(path).convert('RGBA')
    if actual.size!=expected.size:raise ValueError(f'{path}: unexpected dimensions')
    alpha=actual.getchannel('A');reference=expected.getchannel('A')
    if ImageChops.difference(alpha,reference).getbbox():raise ValueError(f'{path}: alpha changed during export')
    core=alpha.point(lambda a:255 if a>=128 else 0).filter(ImageFilter.MinFilter(5))
    if ImageChops.subtract(core,alpha).getbbox():raise ValueError(f'{path}: transparent solid interior')
