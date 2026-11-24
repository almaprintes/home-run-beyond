// Motor de audio procedural: impulsos filtrados y resonancias breves en vez de pitidos.
// Sin descargas ni librerías; compatible con AudioContext de Safari/iPhone.
const PROFILE=Object.freeze({
 swing:{length:.23,low:.045,body:.17,attack:.015,frequency:110,noise:.95,tone:0,kind:'air'},
 bat:{length:.26,low:.092,body:.055,attack:.002,frequency:340,noise:.88,tone:.32,kind:'hard'},
 concrete:{length:.23,low:.075,body:.075,attack:.004,frequency:225,noise:.76,tone:.24,kind:'hard'},
 brick:{length:.23,low:.07,body:.085,attack:.006,frequency:210,noise:.87,tone:.18,kind:'hard'},
 solid:{length:.22,low:.09,body:.065,attack:.003,frequency:370,noise:.75,tone:.31,kind:'hard'},
 roof:{length:.28,low:.095,body:.125,attack:.005,frequency:165,noise:.72,tone:.26,kind:'hollow'},
 metal:{length:.34,low:.085,body:.2,attack:.003,frequency:920,noise:.43,tone:.48,kind:'metal'},
 rubber:{length:.21,low:.13,body:.09,attack:.016,frequency:90,noise:.35,tone:.13,kind:'soft'},
 grass:{length:.23,low:.15,body:.13,attack:.024,frequency:80,noise:.46,tone:.05,kind:'soft'},
 dirt:{length:.24,low:.10,body:.13,attack:.02,frequency:95,noise:.61,tone:.06,kind:'soft'},
 asphalt:{length:.19,low:.08,body:.065,attack:.004,frequency:250,noise:.83,tone:.21,kind:'hard'},
 water:{length:.46,low:.11,body:.28,attack:.017,frequency:87,noise:.76,tone:.06,kind:'water'},
 swamp:{length:.42,low:.14,body:.29,attack:.03,frequency:74,noise:.54,tone:.05,kind:'water'},
 puddle:{length:.35,low:.105,body:.21,attack:.018,frequency:120,noise:.73,tone:.06,kind:'water'}
});
export function soundProfile(name){return PROFILE[name]||PROFILE.concrete}
export function synthImpulse(kind='bat',rate=22050){
 const cfg=soundProfile(kind),count=Math.max(1,Math.ceil(cfg.length*rate)),a=new Float32Array(count);
 let seed=0x7f4a7c15^kind.split('').reduce((h,c)=>Math.imul(h,31)+c.charCodeAt(0)|0,0);
 let slow=0,fast=0;
 const lowAlpha=Math.min(.95,2*Math.PI*cfg.low*1400/rate);
 const fastAlpha=Math.min(.95,2*Math.PI*1700/rate);
 for(let i=0;i<count;i++){
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const white=(seed>>>0)/2147483648-1;
  slow+=(white-slow)*lowAlpha;
  fast+=(white-fast)*fastAlpha;
  const t=i/rate,fade=Math.exp(-t/cfg.body);
  const crack=Math.exp(-t/Math.max(.002,cfg.attack*2.2));
  const transient=(white-fast)*crack;
  const mid=(fast-slow)*fade;
  const bass=slow*fade;
  const harmonic=Math.sin(2*Math.PI*cfg.frequency*t+.15*Math.sin(t*31))*
      Math.exp(-t/(cfg.kind==='metal'?.155:cfg.kind==='hollow'?.09:.055));
  let sample=cfg.noise*(.55*mid+.65*bass+.45*transient)+cfg.tone*harmonic;
  if(cfg.kind==='air'){
   const swell=Math.pow(Math.sin(Math.PI*Math.min(1,t/cfg.length)),1.4);
   sample=(.8*slow+.3*(fast-slow))*swell*1.7;
  }else if(cfg.kind==='water'){
   const splash=(Math.exp(-Math.pow((t-.06)/.018,2))+
                 .67*Math.exp(-Math.pow((t-.12)/.027,2))+
                 .36*Math.exp(-Math.pow((t-.21)/.044,2)));
   sample=.35*bass+(.65*fast+.35*white)*splash*.33+cfg.tone*harmonic;
  }else if(cfg.kind==='soft'){
   sample=.85*slow*fade+.2*mid+cfg.tone*harmonic;
  }
  a[i]=sample;
 }
 let peak=0;for(let i=0;i<count;i++)peak=Math.max(peak,Math.abs(a[i]));
 const norm=.80/Math.max(.15,peak);
 for(let i=0;i<count;i++)a[i]=Math.max(-.86,Math.min(.86,a[i]*norm));
 return a;
}
export class GameAudio{
 constructor(){
  this.ctx=null;this.enabled=true;this.buffers=new Map();this.lastImpactAt=-1e9;this.variant=0;
  this.strikeBuffer=null;this.strikeLoad=null;this.pendingStrike=false;this.voiceEnabled=true;
 }
 init(){if(!this.enabled)return;try{this.ctx??=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume()}catch{}}
 tone(hz,duration=.15,type='sine',volume=.14,offset=0,slide=0){
  if(!this.enabled)return;this.init();if(!this.ctx)return;
  const c=this.ctx,t=c.currentTime+offset,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(hz,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,hz+slide),t+duration);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(volume,t+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g).connect(c.destination);o.start(t);o.stop(t+duration+.05);
 }
 sound(kind,volume=.18){
  if(!this.enabled)return;this.init();const c=this.ctx;
  if(!c||!c.createBuffer||!c.createBufferSource||!c.createGain)return;
  let buffer=this.buffers.get(kind);
  if(!buffer){
   const data=synthImpulse(kind,c.sampleRate),audio=c.createBuffer(1,data.length,c.sampleRate);
   audio.getChannelData(0).set(data);
   this.buffers.set(kind,audio);buffer=audio;
  }
  const src=c.createBufferSource(),gain=c.createGain();
  this.variant=(this.variant+1)%7;
  src.buffer=buffer;src.playbackRate.value=.96+this.variant*.014;
  gain.gain.value=Math.min(.4,Math.max(.001,volume));
  src.connect(gain);gain.connect(c.destination);src.start();
 }
 swing(){this.sound('swing',.20)}
 hit(q){this.sound('bat',q==='perfect'?.38:q==='excellent'?.32:q==='good'?.26:.16)}
 cash(){this.tone(560,.12,'sine',.11);this.tone(830,.17,'sine',.1,.085)}
 // Pequeño motivo original y discreto para el menú: nada se reproduce durante el bateo.
 menuMusic(){
  if(!this.enabled)return;
  for(const [hz,offset,duration] of [[261.63,0,.34],[329.63,.39,.35],[392,.83,.38],[523.25,1.33,.62]])
   this.tone(hz,duration,'sine',.027,offset);
 }
 miss(){this.sound('swing',.09)}
 // Voz grabada localmente: en iOS no dependemos del sintetizador de voz.
 // Comparte AudioContext con los efectos del bate, y se precarga al tocar jugar.
 prepareStrike(){
  if(!this.enabled||this.voiceEnabled===false)return Promise.resolve(false);
  this.init();
  if(this.strikeBuffer)return Promise.resolve(true);
  if(this.strikeLoad)return this.strikeLoad;
  const ctx=this.ctx;
  if(!ctx||typeof fetch!=='function'||typeof ctx.decodeAudioData!=='function')
   return Promise.resolve(false);
  this.strikeLoad=fetch('./assets/strike.mp3?v=0.42.0')
   .then(response=>{
    if(!response.ok)throw Error('Audio de strike: HTTP '+response.status);
    return response.arrayBuffer();
   })
   .then(data=>ctx.decodeAudioData(data))
   .then(buffer=>{
    this.strikeBuffer=buffer;
    if(this.pendingStrike&&this.enabled){
     this.pendingStrike=false;
     this.playStrike();
    }
    return true;
   })
   .catch(error=>{
    console.warn('No se pudo cargar la voz del árbitro',error);
    this.pendingStrike=false;
    return false;
   })
   .finally(()=>{this.strikeLoad=null});
  return this.strikeLoad;
 }
 playStrike(){
  const ctx=this.ctx;
  if(!this.enabled||!ctx||!this.strikeBuffer)return false;
  try{
   const source=ctx.createBufferSource(),gain=ctx.createGain();
   source.buffer=this.strikeBuffer;
   gain.gain.value=.85;
   source.connect(gain).connect(ctx.destination);
   source.start(0);
   return true;
  }catch(error){console.warn('No se pudo reproducir Strike',error);return false}
 }
 strike(){
  if(!this.enabled||this.voiceEnabled===false)return;
  this.init();
  if(this.strikeBuffer){this.playStrike();return;}
  this.pendingStrike=true;
  // Si la red tarda al primer lanzamiento, se emite al acabar la decodificación.
  void this.prepareStrike();
 }
 impact(material='concrete',strength=20){
  if(!this.enabled)return;
  this.init();if(!this.ctx)return;
  const now=this.ctx.currentTime;
  if(now-this.lastImpactAt<.075)return;
  this.lastImpactAt=now;
  const normalized=Math.min(1,Math.log1p(Math.max(0,strength))/Math.log(115));
  const kind=material==='road'?'asphalt':material==='puddle'?'puddle':soundProfile(material)===PROFILE.concrete?'concrete':material;
  this.sound(kind,.09+.23*normalized);
 }
 land(){this.sound('grass',.12)}
 record(){[440,554,659,880].forEach((n,i)=>this.tone(n,.29,'sine',.09,i*.12))}
}
