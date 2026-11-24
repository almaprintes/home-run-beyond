// Audio híbrido: grabación real de bate de madera (CGEffex CC BY 4.0) y
// materializaciones locales para suelos; funciona sin red en Safari/iPhone.
const PROFILE=Object.freeze({
 swing:{length:.23,low:.045,body:.17,attack:.015,frequency:110,noise:.95,tone:0,kind:'air'},
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

// Sonido directo de materiales, generado una sola vez en memoria.
// El golpe es una suma de impulso breve y resonancias amortiguadas;
// se elimina la cola de ruido largo (que sonaba a fritura digital).
const CONTACT=Object.freeze({
 grass:   {length:.105,click:.0110,noise:.046,cut:480, body:[165,280,535],decay:.047,snap:.08,ring:.33,weight:.52},
 dirt:    {length:.109,click:.0090,noise:.048,cut:790, body:[175,310,610],decay:.047,snap:.14,ring:.34,weight:.46},
 asphalt: {length:.115,click:.0047,noise:.033,cut:1650,body:[215,410,770],decay:.040,snap:.30,ring:.37,weight:.30},
 concrete:{length:.117,click:.0047,noise:.037,cut:1450,body:[190,370,680],decay:.043,snap:.26,ring:.37,weight:.34},
 brick:   {length:.124,click:.0060,noise:.042,cut:1130,body:[190,350,650],decay:.050,snap:.23,ring:.38,weight:.35},
 solid:   {length:.121,click:.0040,noise:.031,cut:1900,body:[220,430,810],decay:.038,snap:.34,ring:.39,weight:.28},
 roof:    {length:.158,click:.0060,noise:.047,cut:1120,body:[160,320,575],decay:.070,snap:.18,ring:.39,weight:.38},
 rubber:  {length:.106,click:.0140,noise:.044,cut:560, body:[148,280,520],decay:.040,snap:.07,ring:.29,weight:.53}
});
export function contactProfile(name){return CONTACT[name]||null}
function synthContact(name,rate){
 const p=CONTACT[name],count=Math.max(1,Math.ceil(p.length*rate)),samples=new Float32Array(count);
 let seed=0x613d2baf ^ name.split('').reduce((n,c)=>(Math.imul(n,33)+c.charCodeAt(0))|0,0);
 let mid=0,low=0;
 const midAlpha=1-Math.exp(-2*Math.PI*p.cut/rate);
 const lowAlpha=1-Math.exp(-2*Math.PI*Math.min(270,p.cut*.52)/rate);
 const [f1,f2,f3]=p.body;
 for(let i=0;i<count;i++){
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const white=((seed>>>0)/2147483648)-1,t=i/rate;
  mid+=(white-mid)*midAlpha;
  low+=(mid-low)*lowAlpha;
  const crack=(white-mid)*Math.exp(-t/p.click);
  const grain=(mid-low)*Math.exp(-t/(name==='grass'?p.noise:p.noise*.23));
  const thud=low*Math.exp(-t/(p.decay*1.1));
  // Formantes cortos y no armónicos de madera / cuero. Sin zumbidos estables.
  const body=(
    Math.sin(2*Math.PI*f1*t)*.59+
    Math.sin(2*Math.PI*f2*t+.36)*.30+
    Math.sin(2*Math.PI*f3*t+.81)*.11
   )*Math.exp(-t/p.decay);
  const leading=1-Math.exp(-t*rate/9);
  const trailing=Math.pow(Math.max(0,1-t/p.length),2);
  samples[i]=(p.snap*crack+.55*grain+p.weight*thud+p.ring*body)*leading*trailing;
 }
 let peak=0;
 for(const x of samples)peak=Math.max(peak,Math.abs(x));
 const gain=.72/Math.max(peak,.001);
 for(let i=0;i<count;i++)samples[i]=Math.max(-.76,Math.min(.76,samples[i]*gain));
 return samples;
}
// Hard surfaces use a completely different contact model from grass or metal.
// This provides a dry rubber-on-pavement "tock" and a heavier facade "clap"
// if the CC0 field-recorded samples are not available offline.
function synthHardSurface(kind,rate){
 const road=kind==='asphalt',length=road?.104:.136,amount=Math.ceil(length*rate);
 const out=new Float32Array(amount);
 let seed=road?0x45e719a3:0x319b7f6d,mid=0,low=0;
 const highpass=1-Math.exp(-2*Math.PI*(road?3100:1800)/rate);
 const basspass=1-Math.exp(-2*Math.PI*(road?340:255)/rate);
 for(let i=0;i<amount;i++){
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const white=(seed>>>0)/2147483648-1,t=i/rate;
  mid+=(white-mid)*highpass;low+=(mid-low)*basspass;
  const crack=(white-mid)*Math.exp(-t/(road?.0029:.0044));
  const hard=(mid-low)*Math.exp(-t/(road?.0045:.006));
  const body=(Math.sin(2*Math.PI*(road?255:188)*t)+
   .29*Math.sin(2*Math.PI*(road?465:348)*t+.3))*Math.exp(-t/(road?.021:.035));
  const wallReflect=0; // Sin segundo golpe ni cola de aire.
  const envelope=(1-Math.exp(-t*rate/5))*Math.pow(Math.max(0,1-t/length),2);
  out[i]=(.18*crack+.28*hard+(road?.60:.72)*body+wallReflect)*envelope;
 }
 let peak=0;for(const x of out)peak=Math.max(peak,Math.abs(x));
 const scale=.68/Math.max(.0001,peak);
 for(let i=0;i<amount;i++)out[i]=Math.max(-.70,Math.min(.70,out[i]*scale));
 return out;
}
export function synthImpulse(kind='concrete',rate=22050){
 if(kind==='bat')throw new Error('El bate solo usa la grabación CGEffex');
 if(kind==='asphalt')return synthHardSurface('asphalt',rate);
 if(['concrete','brick','solid','roof'].includes(kind))return synthHardSurface('facade',rate);
 if(contactProfile(kind))return synthContact(kind,rate);
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
  const dryNoise=Math.exp(-t/.012);
  let sample=cfg.noise*(.55*mid+.65*bass+.45*transient)*dryNoise+cfg.tone*harmonic;
  if(cfg.kind==='air'){
   const swell=Math.pow(Math.sin(Math.PI*Math.min(1,t/cfg.length)),1.4);
   sample=(.8*slow+.3*(fast-slow))*swell*1.7;
  }else if(cfg.kind==='water'){
   const splash=(Math.exp(-Math.pow((t-.06)/.018,2))+
                 .67*Math.exp(-Math.pow((t-.12)/.027,2))+
                 .36*Math.exp(-Math.pow((t-.21)/.044,2)));
   sample=.35*bass*dryNoise+(.65*fast+.35*white)*splash*.22*Math.exp(-t/.065)+cfg.tone*harmonic;
  }else if(cfg.kind==='soft'){
   sample=(.85*slow*fade+.2*mid)*dryNoise+cfg.tone*harmonic;
  }
  a[i]=sample;
 }
 let peak=0;for(let i=0;i<count;i++)peak=Math.max(peak,Math.abs(a[i]));
 const norm=.80/Math.max(.15,peak);
 for(let i=0;i<count;i++)a[i]=Math.max(-.86,Math.min(.86,a[i]*norm));
 return a;
}
// Retain the strongest contact transient within the chosen recording, not the
// air movement before it or subsequent bounces. Keep a short natural decay.
export function recordedImpactSegment(buffer,start=0,end=buffer.duration,duration=.14){
 const rate=buffer.sampleRate||0;
 if(!rate||typeof buffer.getChannelData!=='function')return {offset:start,duration:Math.min(duration,Math.max(.001,(buffer.duration||end)-start))};
 const data=buffer.getChannelData(0),lo=Math.max(0,Math.floor(start*rate)),hi=Math.min(data.length,Math.floor(end*rate)),step=Math.max(1,Math.floor(rate*.004));
 let peak=-1,best=lo;
 for(let i=lo;i<hi;i+=step){let energy=0;for(let j=i;j<Math.min(hi,i+step);j++)energy+=data[j]*data[j];if(energy>peak){peak=energy;best=i}}
 const offset=Math.max(start,best/rate-.008);
 return {offset,duration:Math.min(duration,Math.max(.001,buffer.duration-offset))};
}
export class GameAudio{
 constructor(){
  this.ctx=null;this.enabled=true;this.buffers=new Map();this.lastImpactAt=-1e9;this.variant=0;
  this.strikeBuffer=null;this.strikeLoad=null;this.pendingStrike=false;this.voiceEnabled=true;
  this.recordedBuffers=new Map();this.recordedLoads=new Map();this.recordedMissing=new Set();this.recordedSegments=new Map();
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
  if(!this.enabled||kind==='bat'||kind==='swing')return;this.init();const c=this.ctx;
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
 prepareRecorded(kind){
  if(!this.enabled)return Promise.resolve(false);
  this.init();
  if(this.recordedBuffers.has(kind))return Promise.resolve(true);
  if(kind!=='bat'&&this.recordedMissing.has(kind))return Promise.resolve(false);
  if(this.recordedLoads.has(kind))return this.recordedLoads.get(kind);
  // Original recording if the public preview was available at build time,
  // always fall back to a bundled PCM WAV derived from the SAME CGEffex take.
  const files={
   bat:['bat-cgeffex.mp3','bat-cgeffex.wav'],
   asphalt:['asphalt-ball.mp3'],
   facade:['wall-ball.mp3']
  }[kind];
  if(!files||!this.ctx||typeof fetch!=='function'||
     typeof this.ctx.decodeAudioData!=='function')return Promise.resolve(false);
  const job=(async()=>{
   for(const file of files){
    try{
     const response=await fetch('./assets/audio/'+file+'?v=0.55.0');
     if(!response.ok)continue;
     const decoded=await this.ctx.decodeAudioData(await response.arrayBuffer());
     if(kind==='bat'&&file.endsWith('.mp3')&&decoded.duration<5.22)continue;
     this.recordedBuffers.set(kind,decoded);
     const selected=kind==='bat'&&file.endsWith('.mp3');
     const segment=recordedImpactSegment(decoded,selected?4.82:0,selected?5.22:Math.min(decoded.duration,10),kind==='bat'?.16:.12);
     this.recordedSegments.set(kind,segment);
     return true;
    }catch{}
   }
   this.recordedMissing.add(kind);
   return false;
  })().finally(()=>this.recordedLoads.delete(kind));
  this.recordedLoads.set(kind,job);return job;
 }
 prepareGameEffects(){
  // Llamado en el gesto de comenzar a batear: carga sin frenar la física.
  void this.prepareRecorded('bat');
  void this.prepareRecorded('asphalt');
  void this.prepareRecorded('facade');
 }
 playRecorded(kind,gainAmount){
  if(!this.enabled||!this.ctx)return false;
  const buffer=this.recordedBuffers.get(kind);
  if(!buffer)return false;
  const src=this.ctx.createBufferSource(),gain=this.ctx.createGain();
  src.buffer=buffer;
  this.variant=(this.variant+1)%7;
  src.playbackRate.value=kind==='bat'?1:.985+this.variant*.007;
  gain.gain.value=Math.min(kind==='bat'?.85:.4,Math.max(.001,gainAmount));
  src.connect(gain);gain.connect(this.ctx.destination);
  const segment=this.recordedSegments.get(kind);
  if(segment){
   const now=this.ctx.currentTime||0,level=gain.gain.value;
   gain.gain.setValueAtTime?.(level,now+Math.max(0,segment.duration-.025));
   gain.gain.linearRampToValueAtTime?.(0,now+segment.duration);
   src.start(0,segment.offset,segment.duration);
  }else src.start();
  return true;
 }
 swing(){} // El movimiento del bate es silencioso.
 hit(q){
  // Golpe único, seco y cálido; no tocar los perfiles de rebote.
  if(q==='miss')return;
  const gain=q==='perfect'?.72:q==='excellent'?.615:q==='good'?.54:.36;
  if(!this.enabled)return;
  if(this.playRecorded('bat',gain))return;
  // Solo el WAV real si WebAudio no está listo. Nunca la síntesis del bate.
  if(typeof Audio!=='undefined'){
   try{const clip=new Audio('./assets/audio/bat-cgeffex.wav?v=0.55.0');clip.volume=Math.min(1,gain);clip.play()?.catch?.(()=>{});}catch{}
  }
  void this.prepareRecorded('bat');
 }
 cash(){this.tone(560,.12,'sine',.11);this.tone(830,.17,'sine',.1,.085)}
 // Pequeño motivo original y discreto para el menú: nada se reproduce durante el bateo.
 menuMusic(){
  if(!this.enabled)return;
  for(const [hz,offset,duration] of [[261.63,0,.34],[329.63,.39,.35],[392,.83,.38],[523.25,1.33,.62]])
   this.tone(hz,duration,'sine',.027,offset);
 }
 miss(){} // Solo se oye la voz de strike cuando no hay contacto.
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
  this.strikeLoad=fetch('./assets/strike.mp3?v=0.55.0')
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
  // Evitar el traqueteo de rebotes rápidos sobre el mismo suelo.
  if(now-this.lastImpactAt<.115||strength<2.25)return;
  this.lastImpactAt=now;
  const kind=material==='road'?'asphalt':material==='puddle'?'puddle':soundProfile(material)===PROFILE.concrete?'concrete':material;
  // El segundo y tercer rebote deben sonar más discretos. El volumen
  // depende de la velocidad normal de impacto, no del total de impactos.
  const normalized=Math.min(1,Math.log1p(Math.max(0,strength))/Math.log(90));
  const soft=['grass','dirt','rubber','swamp'].includes(kind);
  const volume=(.022+.105*Math.pow(normalized,1.55))*(soft?.78:1);
  // Grabaciones CC0 para asfalto y fachada cuando están disponibles.
  // Césped y metal usan EXACTAMENTE su motor aprobado.
  const realKind=kind==='asphalt'?'asphalt':
   ['concrete','brick','solid','roof'].includes(kind)?'facade':null;
  if(!realKind||!this.playRecorded(realKind,volume))this.sound(kind,volume);
 }
 land(){this.sound('grass',.045)}
 record(){[440,554,659,880].forEach((n,i)=>this.tone(n,.29,'sine',.09,i*.12))}
}
