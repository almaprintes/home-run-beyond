#!/usr/bin/env python3
"""Produce licensed impact clips for the offline Home Run Beyond PWA.

All outputs are short 32 kHz MP3s, generated during both validation and
publishing. Bat always has a bundled CGEffex field-recording fallback; other
material samples are optional CC0 Freesound previews (procedural game fallback).
No gameplay browser request ever goes to Freesound.
"""
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import urllib.request

ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/"assets"/"audio"
DEST.mkdir(parents=True,exist_ok=True)
BAT_BACKUP=DEST/"bat-cgeffex-source.wav"
USER_AGENT="HomeRunBeyond/0.50 (+https://github.com/almaprintes/home-run-beyond)"
SOURCES=[
 {
  "name":"bat-cgeffex",
  "page":"https://freesound.org/people/CGEffex/sounds/93136/",
  "preview":"https://cdn.freesound.org/previews/93/93136_1386366-hq.mp3",
  "offset":4.82, "duration":0.40, "fallback":BAT_BACKUP,
  "required":True,"label":"CGEffex CC BY 4.0",
 },
 {
  "name":"asphalt-ball",
  "page":"https://freesound.org/people/JaenKleynhans/sounds/267882/",
  "id":267882,"offset":0.0,"duration":0.31,
  "required":False,"label":"JaenKleynhans CC0 1.0",
 },
 {
  "name":"wall-ball",
  "page":"https://freesound.org/people/BranRainey/sounds/108737/",
  "id":108737,"offset":0.0,"duration":0.35,
  "required":False,"label":"BranRainey CC0 1.0",
 }
]

def download(url):
 req=urllib.request.Request(url,headers={"User-Agent":USER_AGENT,"Referer":"https://freesound.org/"})
 with urllib.request.urlopen(req,timeout=12) as response:
  data=response.read(8_000_000)
 if len(data)<1000:raise ValueError("file too small")
 return data

def find_preview(item):
 if item.get("preview"):return item["preview"]
 key=str(item["id"])
 html=download(item["page"]).decode("utf-8","ignore")
 # On Freesound the player preview is in the page's public bootstrap data.
 escaped=html.replace(r"\/","/").replace(r"\u002F","/").replace("&amp;","&")
 matches=re.findall(
   rf'(?:https?:)?//(?:cdn\.)?freesound\.org/(?:data/)?previews/{int(key)//1000}/{key}_\d+-hq\.mp3',
   escaped,re.I)
 if not matches:
  matches=re.findall(
   rf'(?:data/)?previews/{int(key)//1000}/{key}_\d+-hq\.mp3',
   escaped,re.I)
 if matches:
  url=matches[0]
  if url.startswith("data/") or url.startswith("previews/"):
   return "https://freesound.org/"+url
  return "https:"+url if url.startswith("//") else url
 raise ValueError(f"Could not find public HQ preview URL for Freesound #{key}")

def convert(source,out,offset,length,from_preview):
 # Exact short segment, with clean non-clipping, de-hiss and fade.
 # Bat stays dry. Wall and asphalt are natural recordings, never mixed
 # with the existing grass/container-metal samples.
 end=max(0.13,length-0.07)
 filter=f"highpass=f=130,lowpass=f=7800,afade=t=out:st={end:.3f}:d=0.07,alimiter=limit=0.90"
 cmd=["ffmpeg","-hide_banner","-loglevel","error","-nostdin","-y",
      "-ss",str(offset),"-i",str(source),"-t",str(length),
      "-af",filter,"-vn","-ac","1","-ar","32000","-codec:a","libmp3lame",
      "-b:a","96k",str(out)]
 subprocess.run(cmd,check=True,timeout=18)
 if out.stat().st_size<700:raise ValueError("invalid encoded audio")
 return out.stat().st_size

def main():
 if not shutil.which("ffmpeg"):raise RuntimeError("ffmpeg required to create licensed gameplay audio")
 with tempfile.TemporaryDirectory(prefix="hrb-audio-") as temp:
  temp=Path(temp)
  for item in SOURCES:
   path=DEST/(item["name"]+".mp3")
   source=temp/(item["name"]+"-source.mp3")
   origin="Freesound preview"
   try:
    url=find_preview(item)
    source.write_bytes(download(url))
   except Exception as exc:
    if item.get("fallback") and item["fallback"].exists():
     source=item["fallback"];origin="bundled attributed Freesound recording"
     print(f"  {item['name']}: public preview unavailable ({type(exc).__name__}), using attributed recorded source")
    elif item["required"]:
     raise RuntimeError(f"Required recording missing: {item['name']}") from exc
    else:
     # The game has a dedicated local impulse fallback for this material.
     # Never mistake an absent file for a successfully shipped recording.
     print(f"  {item['name']}: CC0 preview unavailable ({type(exc).__name__}), procedural fallback")
     if path.exists():path.unlink()
     continue
   sec=item["offset"] if origin=="Freesound preview" else 0
   convert(source,path,sec,item["duration"],origin=="Freesound preview")
   print(f"  {item['name']}: {path.stat().st_size} bytes, {origin} — {item['label']}")

if __name__=="__main__":main()
