#!/usr/bin/env python3
"""Reproducible, dependency-free build of licensed impact recordings.

Always converts the bundled CGEffex IMA-ADPCM WAV to a universally
supported, trimmed mono PCM16 WAV using Python's standard library.
Optionally copies public Freesound MP3 previews as-is when available.
No ffmpeg, pip modules, API credentials, or network needed to ship the bat.
"""
from pathlib import Path
import math
import re
import struct
import urllib.request
import wave

ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/"assets"/"audio"
DEST.mkdir(parents=True,exist_ok=True)
BAT_BACKUP=DEST/"bat-cgeffex-source.wav"
AGENT="HomeRunBeyond/0.50 (https://github.com/almaprintes/home-run-beyond)"
STEPS=(7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,
50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,
279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,
1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,
4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,
12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767)
INDEX=(-1,-1,-1,-1,2,4,6,8,-1,-1,-1,-1,2,4,6,8)

def riff_chunks(data):
 if data[:4]!=b"RIFF" or data[8:12]!=b"WAVE":
  raise ValueError("Source must be RIFF WAVE")
 pos=12
 while pos+8<=len(data):
  kind=data[pos:pos+4];size=struct.unpack_from("<I",data,pos+4)[0]
  start=pos+8
  yield kind,data[start:start+size]
  pos=start+size+(size&1)

def decode_ima_wav(source):
 chunks=dict(riff_chunks(source))
 fmt=chunks.get(b"fmt ",b"")
 if len(fmt)<16:raise ValueError("WAVE fmt chunk missing")
 tag,channels,rate,_,align,bits=struct.unpack_from("<HHIIHH",fmt)
 if tag!=17 or channels!=1 or bits!=4 or align<8:
  raise ValueError(f"Expected mono IMA-ADPCM, got format={tag}, channels={channels}")
 payload=chunks.get(b"data")
 if not payload:raise ValueError("WAVE data chunk missing")
 output=[]
 for offset in range(0,len(payload),align):
  block=payload[offset:offset+align]
  if len(block)<4:break
  predictor=struct.unpack_from("<h",block,0)[0]
  index=min(88,block[2])
  output.append(predictor)
  for byte in block[4:]:
   for nibble in (byte&15,byte>>4):
    step=STEPS[index]
    delta=step>>3
    if nibble&1:delta+=step>>2
    if nibble&2:delta+=step>>1
    if nibble&4:delta+=step
    predictor=max(-32768,min(32767,predictor+(-delta if nibble&8 else delta)))
    index=max(0,min(88,index+INDEX[nibble]))
    output.append(predictor)
 return rate,output

def write_clip(source,target):
 rate,samples=decode_ima_wav(source.read_bytes())
 if len(samples)<rate*.22:raise ValueError("CGEffex backing recording too short")
 # Find the sharpest actual strike, retain 20ms before and 315ms after.
 # The original approved take contains a little leading/background quiet.
 limit=max(1,min(len(samples)-int(rate*.23),int(rate*.95)))
 peak=max(range(limit),key=lambda i:abs(samples[i]))
 pre=int(rate*.020)
 start=max(0,peak-pre)
 end=min(len(samples),start+int(rate*.37))
 clip=list(samples[start:end])
 if len(clip)<rate*.20:raise ValueError("Missing enough data after CGEffex impact")
 fade=min(len(clip),int(rate*.055))
 max_amp=max(1,max(abs(v) for v in clip))
 gain=.79*32767/max_amp
 for i in range(len(clip)):
  # Fade out to avoid a wave discontinuity; no artificial attack layered.
  tail=1 if i<len(clip)-fade else (len(clip)-i)/fade
  clip[i]=max(-32768,min(32767,round(clip[i]*gain*tail)))
 with wave.open(str(target),"wb") as writer:
  writer.setnchannels(1);writer.setsampwidth(2);writer.setframerate(rate)
  writer.writeframes(struct.pack("<"+"h"*len(clip),*clip))
 return rate,len(clip),target.stat().st_size

def download_preview(url,limit=900000):
 req=urllib.request.Request(url,headers={"User-Agent":AGENT,"Referer":"https://freesound.org/"})
 with urllib.request.urlopen(req,timeout=8) as response:
  data=response.read(limit+1)
 if not 2000<len(data)<=limit:raise ValueError("invalid MP3 preview length")
 return data

def optional_preview(name,url,source_page=None,sound_id=None):
 path=DEST/(name+".mp3")
 try:
  if url is None and source_page and sound_id:
   html=download_preview(source_page,limit=1800000).decode("utf-8","ignore")
   html=html.replace(r"\/","/").replace(r"\u002F","/")
   directory=sound_id//1000
   urls=re.findall(
    rf'((?:https?:)?//(?:cdn\.)?freesound\.org/(?:data/)?previews/{directory}/{sound_id}_\d+-hq\.mp3)',
    html,re.I)
   if not urls:
    urls=re.findall(rf'(?:data/)?previews/{directory}/{sound_id}_\d+-hq\.mp3',html,re.I)
   if not urls:raise ValueError("public player MP3 URL is not embedded")
   url=urls[0]
   if url.startswith("//"):url="https:"+url
   if url.startswith("data/") or url.startswith("previews/"):
    url="https://freesound.org/"+url
  data=download_preview(url)
  path.write_bytes(data)
  print(f"  {name}: recorded Freesound preview available ({len(data)} bytes)")
 except Exception as exc:
  if path.exists():path.unlink()
  print(f"  {name}: not available ({type(exc).__name__}); independent synthesized fallback")

def main():
 rate,n,size=write_clip(BAT_BACKUP,DEST/"bat-cgeffex.wav")
 print(f"  CGEffex: bundled real bat crack, {n/rate:.3f} sec, {size} bytes, WAV PCM16")
 # HQ selected Freesound original take, optionally available. In browsers
 # use its 4.82..5.3s segment; if missing use bundled real WAV.
 optional_preview("bat-cgeffex","https://cdn.freesound.org/previews/93/93136_1386366-hq.mp3")
 optional_preview("asphalt-ball",None,
  "https://freesound.org/people/JaenKleynhans/sounds/267882/",267882)
 optional_preview("wall-ball",None,
  "https://freesound.org/people/BranRainey/sounds/108737/",108737)

if __name__=="__main__":main()
