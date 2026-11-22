export class GameAudio{
 constructor(){this.ctx=null;this.enabled=true}
 init(){if(!this.enabled)return;try{this.ctx??=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume()}catch{}}
 tone(hz,duration=.15,type='sine',volume=.14,offset=0,slide=0){if(!this.enabled)return;this.init();if(!this.ctx)return;const c=this.ctx,t=c.currentTime+offset,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,hz+slide),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(c.destination);o.start(t);o.stop(t+duration+.05)}
 swing(){this.tone(290,.13,'sawtooth',.07,0,-180);this.tone(120,.18,'triangle',.1,.03,-65)}
 hit(q){this.tone(q==='perfect'?260:190,.21,'triangle',.17,0,-100);this.tone(q==='perfect'?670:430,.23,'sine',.14,.025,250);if(q==='perfect'){this.tone(850,.17,'sine',.07,.1,160);this.tone(1040,.18,'sine',.06,.22,150)}}
 cash(){this.tone(560,.12,'sine',.11);this.tone(830,.17,'sine',.1,.085)}
 miss(){this.tone(160,.22,'triangle',.08,0,-70)}
 land(){this.tone(94,.13,'square',.04,0,-45)}
 record(){[440,554,659,880].forEach((n,i)=>this.tone(n,.29,'sine',.09,i*.12))}
}