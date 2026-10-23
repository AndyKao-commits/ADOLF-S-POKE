/* Shared cosmetic animation; inventory and reward settlement belong to game logic. */
(function(root){
  'use strict';
  const TIERS = Object.freeze({common:'#ff6262',rare:'#70baff',legendary:'#ffd34e',epic:'#dc93ff'});
  // Crack coordinates use the existing 40x48 egg icon coordinate system.
  const CRACKS = Object.freeze([[20,9],[17,15],[23,20],[18,25],[23,30],[18,35],[21,40]]);
  function create(options){
    options=options||{};
    let elapsed=0,phase='idle',tier='common',reduced=false,notified=false;
    const duration=()=>reduced?0.45:1.8;
    const state=()=>Object.freeze({phase,tier,elapsed,duration:duration(),progress:Math.min(1,elapsed/duration()),active:phase==='playing'});
    function finish(){
      if(phase!=='playing')return false;
      phase='complete';elapsed=duration();
      if(!notified){notified=true;if(typeof options.onComplete==='function')options.onComplete(state());}
      return true;
    }
    function start(config){
      if(phase==='playing')return false;
      config=config||{};
      if(!Object.hasOwn(TIERS,config.tier))throw new RangeError('Unknown hatching egg tier');
      tier=config.tier;reduced=!!config.reducedMotion;elapsed=0;notified=false;phase='playing';return true;
    }
    function update(dt){
      if(phase!=='playing'||!Number.isFinite(dt)||dt<=0)return state();
      elapsed=Math.min(duration(),elapsed+dt);if(elapsed>=duration())finish();return state();
    }
    function cancel(){phase='idle';elapsed=0;notified=false;}
    function draw(ctx,config){
      config=config||{};if(phase==='idle')return;
      const {x,y,eggImage}=config,scale=config.scale===undefined?2:config.scale;
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(scale)||scale<=0||!eggImage)return;
      const t=elapsed,progress=t/duration();
      const reveal=reduced?progress>=0.55:t>=1.35;
      const fill=ctx.fillStyle,stroke=ctx.strokeStyle;
      ctx.save();
      try{
        ctx.translate(x,y);ctx.imageSmoothingEnabled=false;
        const baseAlpha=ctx.globalAlpha;
        if(!reveal){
          const shake=reduced?0:Math.sin(t*30)*Math.min(1,t/0.5)*Math.max(0,1-t/1.35)*0.075;
          ctx.rotate(shake);
          const fade=reduced?Math.max(0,1-progress/0.55):1;
          ctx.globalAlpha=baseAlpha*fade;
          ctx.drawImage(eggImage,-20*scale,-24*scale,40*scale,48*scale);
          if(!reduced&&t>=0.65){
            ctx.strokeStyle='#2a2038';ctx.lineWidth=1.15*scale;ctx.lineJoin='miter';
            const count=Math.min(CRACKS.length,2+Math.floor((t-0.65)/0.11));
            ctx.beginPath();CRACKS.slice(0,count).forEach(([cx,cy],i)=>{if(i===0)ctx.moveTo((cx-20)*scale,(cy-24)*scale);else ctx.lineTo((cx-20)*scale,(cy-24)*scale);});ctx.stroke();
          }
        }
        if(!reduced&&t>=1.15&&t<1.6){
          // Local warm flash only: no full-screen flash or reward logic.
          ctx.globalAlpha=baseAlpha*0.38*Math.max(0,Math.sin((t-1.15)/0.45*Math.PI));
          ctx.fillStyle='#fff4cf';ctx.beginPath();ctx.arc(0,0,29*scale,0,Math.PI*2);ctx.fill();
        }
      }finally{ctx.restore();ctx.fillStyle=fill;ctx.strokeStyle=stroke;}
      if(reveal&&typeof config.drawResult==='function'){
        ctx.save();try{config.drawResult(ctx,x,y,state());}finally{ctx.restore();}
      }
      if(!reduced&&t>=1.35&&t<duration()){
        ctx.save();try{
          const p=(t-1.35)/0.45,n=tier==='epic'?12:6,alpha=ctx.globalAlpha;
          ctx.fillStyle=TIERS[tier];
          for(let i=0;i<n;i++){
            const angle=(i/n)*Math.PI*2,r=(16+p*18)*scale,px=Math.round(x+Math.cos(angle)*r),py=Math.round(y+Math.sin(angle)*r-p*8*scale);
            ctx.globalAlpha=alpha*(1-p)*0.8;ctx.fillRect(px,py,Math.max(1,scale),Math.max(1,scale));
          }
        }finally{ctx.restore();ctx.fillStyle=fill;ctx.strokeStyle=stroke;}
      }
    }
    return Object.freeze({start,update,draw,skip:finish,cancel,state});
  }
  root.EggHatching=Object.freeze({create,tiers:TIERS,cracks:CRACKS});
})(typeof window!=='undefined'?window:globalThis);
