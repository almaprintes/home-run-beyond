import {pitchTimingDeltaMs,timingQuality,batSpeedMs,clamp} from './logic.js?v=0.77.79';
import {equipmentBonuses} from './cosmetic-catalog.js?v=0.77.79';

// One clock for rendering, timing assistance and event-time sampling.
export const FOCUS_RATE=.55;
export function focusWindow(duration=1.52,precision=0){
 const center=.91*duration-batSpeedMs()/1000,half=.048*(1+clamp(precision||0,0,.25));
 return {center,half,start:center-half,end:center+half};
}
export function focusEnabled(game){return game?.save?.showHints!==false}
export function focusSlowEnabled(game){return focusEnabled(game)&&!game?.save?.reducedEffects}
export function advanceFocusTime(elapsed,dt,duration=1.52,precision=0,slow=true){
 let t=elapsed,remaining=Math.max(0,dt);
 if(!slow)return t+remaining;
 const {start,end}=focusWindow(duration,precision);
 if(t<start){const step=Math.min(remaining,start-t);t+=step;remaining-=step;}
 if(t<end&&remaining>0){const step=Math.min(remaining,(end-t)/FOCUS_RATE);t+=step*FOCUS_RATE;remaining-=step;}
 return t+remaining;
}
export function focusCue(game){
 if(game?.state!=='pitching'||game.strikeCalled||!focusEnabled(game)||!(game.pitchElapsed>0))return null;
 const duration=game.pitchDuration||1.52,precision=equipmentBonuses(game.save).precision;
 const {start,end,half}=focusWindow(duration,precision),t=game.pitchElapsed;
 if(t<start-.38||t>end)return null;
 const quality=timingQuality(pitchTimingDeltaMs(t,duration),{precision});
 const perfect=quality==='perfect',approach=clamp((t-(start-.38))/.38,0,1);
 return {perfect,approach,phase:perfect?clamp((t-start)/(2*half),0,1):0};
}
// An open reticle never covers the ball or the batter; no hit area or DOM control.
export function drawPerfectFocus(ctx,x,y,diameter,game){
 const cue=focusCue(game);
 if(!cue||!ctx?.arc||!ctx?.stroke||!ctx?.save||!ctx?.restore||!ctx?.beginPath)return false;
 const {perfect,approach,phase}=cue,base=Math.max(10,diameter*.5);
 const r=base+(perfect?9:10+(1-approach)*31);
 const reduced=!!game.save?.reducedEffects;
 ctx.save();
 ctx.globalAlpha=perfect?1:.32+approach*.55;
 ctx.strokeStyle=perfect?'#ffe18b':'#b4edff';
 ctx.lineWidth=perfect?2.8:1.6;
 if(!reduced){ctx.shadowColor=perfect?'#ffbf47':'#8de3ff';ctx.shadowBlur=perfect?10:4;}
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+Math.PI/10;
  ctx.beginPath();ctx.arc(x,y,r,a,a+Math.PI*.30);ctx.stroke();
 }
 if(perfect){
  ctx.shadowBlur=0;
  ctx.globalAlpha=reduced?.72:Math.max(.12,.70*(1-phase));
  ctx.strokeStyle='#fff5d1';ctx.lineWidth=1.25;
  ctx.beginPath();ctx.arc(x,y,r+(reduced?5:4+phase*14),0,Math.PI*2);ctx.stroke();
  if(ctx.fillText){
   ctx.globalAlpha=1;ctx.fillStyle='#fff3ce';ctx.font='900 12px system-ui, sans-serif';ctx.textAlign='center';
   if(ctx.strokeText){ctx.lineWidth=3;ctx.strokeStyle='#13283a';ctx.strokeText('¡AHORA!',x,y-r-10);}
   ctx.fillText('¡AHORA!',x,y-r-10);
  }
 }
 ctx.restore();return true;
}
