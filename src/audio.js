export class GameAudio{
 constructor(){this.ctx=null;this.enabled=true}
 init(){if(!this.enabled)return;try{this.ctx??=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume()}catch{}}
 tone(hz,duration=.15,type='sine',volume=.14,offset=0,slide=0){if(!this.enabled)return;this.init();if(!this.ctx)return;const c=this.ctx,t=c.currentTime+offset,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,hz+slide),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(c.destination);o.start(t);o.stop(t+duration+.05)}
 swing(){this.tone(290,.13,'sawtooth',.07,0,-180);this.tone(120,.18,'triangle',.1,.03,-65)}
 hit(q){this.tone(q==='perfect'?260:190,.21,'triangle',.17,0,-100);this.tone(q==='perfect'?670:430,.23,'sine',.14,.025,250);if(q==='perfect'){this.tone(850,.17,'sine',.07,.1,160);this.tone(1040,.18,'sine',.06,.22,150)}}
 cash(){this.tone(560,.12,'sine',.11);this.tone(830,.17,'sine',.1,.085)}
 miss(){this.tone(160,.22,'triangle',.08,0,-70)}
 // Firma sonora por material. Ganancias limitadas y enfriamiento para rebotes rápidos.
 impact(material='concrete',strength=20){
  if(!this.enabled)return;
  this.init();if(!this.ctx)return;
  const t=this.ctx.currentTime;
  if(this.lastImpactAt!==undefined&&t-this.lastImpactAt<.075)return;
  this.lastImpactAt=t;
  const power=Math.min(1,Math.max(0,Math.log1p(Math.max(0,strength))/Math.log(115)));
  const volume=.018+.045*power;
  if(material==='water'||material==='puddle'||material==='swamp'){
   this.tone(material==='swamp'?110:155,.20,'sine',volume*.65,0,-60);
   this.tone(390,.12,'triangle',volume*.43,.018,-310);
  }else if(material==='grass'||material==='dirt'){
   this.tone(100,.16,'triangle',volume*.75,0,-42);
   this.tone(155,.08,'sine',volume*.4,.012,-85);
  }else if(material==='rubber'){
   this.tone(80,.15,'sine',volume*.78,0,-40);
   this.tone(135,.11,'triangle',volume*.5,.02,-52);
  }else{
   const hard=material==='solid'||material==='road'||material==='asphalt';
   this.tone(hard?325:215,.075,'square',volume*.65,0,-170);
   this.tone(hard?720:430,.10,'triangle',volume*.54,.012,-260);
  }
 }
 land(){this.tone(94,.13,'square',.04,0,-45)}
 record(){[440,554,659,880].forEach((n,i)=>this.tone(n,.29,'sine',.09,i*.12))}
}