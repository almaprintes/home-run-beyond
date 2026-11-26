// Purely visual choreography. Never writes to the ball or influences a shot.
export const PITCHER_Z=21;
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
export function pitcherReactionPlan(shot){
 if(!shot||!Number.isFinite(shot.vz)||shot.vz<=0)return {jump:false,side:0,reach:0,start:0,duration:.75};
 const time=(PITCHER_Z+4.7)/shot.vz;
 const x=-4.5+(shot.contactOffsetMm||0)/1000+(shot.vx||0)*time;
 const y=2.5+(shot.vy||0)*time-4.905*time*time;
 const speed=Math.hypot(shot.vx||0,shot.vz),pass=time/clamp(speed/58,1,22);
 // Even a ball above his reach triggers a futile jump if it is near his line.
 const jump=Math.abs(x)<=10&&y>=.8&&y<=34&&pass<=2.4;
 return {jump,side:clamp(x/5,-1,1),reach:clamp((y-3.5)/5),start:Math.max(0,pass-.32),duration:.80,pass,x,y};
}
export function pitcherPose(game={}){
 const flight=game.state==='flight'||game.state==='landing'||game.state==='rest'&&!!game.ball;
 if(flight){
  const plan=game.pitcherReaction||pitcherReactionPlan(game.pendingShot);
  const t=Number.isFinite(game.pitcherReactionStartedAt)&&Number.isFinite(game.clock)?Math.max(0,game.clock-game.pitcherReactionStartedAt):Math.max(0,game.liveSeconds||0);
  const p=clamp((t-plan.start)/plan.duration);
  if(plan.jump&&t>=plan.start&&p<1){
   const arc=Math.sin(Math.PI*p),extension=ease(p/.24)*(1-ease((p-.69)/.31));
   return {phase:'jump',lift:2.05*arc,shift:plan.side*1.55*ease(p/.60),lean:plan.side*.35*arc,reach:extension,reachHeight:plan.reach,side:plan.side,step:arc,throw:0,look:plan.side};
  }
  return {phase:plan.jump&&p>=1?'land':'track',lift:0,shift:plan.jump&&p>=1?plan.side*1.55:0,lean:0,reach:plan.jump?0:.25*(1-ease(t/1.2)),reachHeight:plan.reach,side:plan.side,step:0,throw:0,look:plan.side};
 }
 const t=clamp((game.pitchElapsed||0)/(game.pitchDuration||1.52));
 const active=['pitching','aiming','swinging','whiff'].includes(game.state);
 if(!active)return {phase:'ready',lift:0,shift:0,lean:0,reach:0,reachHeight:0,side:0,step:0,throw:0,look:0};
 const wind=Math.sin(Math.PI*clamp(t/.20)),release=ease(t/.17),follow=release*(1-ease((t-.18)/.55));
 return {phase:t<.17?'throw':'follow',lift:0,shift:0,lean:0,reach:0,reachHeight:0,side:0,step:Math.max(0,wind*.85),throw:follow,look:0};
}
