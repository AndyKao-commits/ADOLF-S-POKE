const fs=require('node:fs');
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas' : '@napi-rs/canvas');
const colors=[['#83b574','#6a9a60'],['#69aadd','#4583ba'],['#b28bdd','#845daf'],['#e0bb54','#b58b35']];
for(let tier=1;tier<=4;tier++){
 const cv=createCanvas(40,48),c=cv.getContext('2d');
 for(let y=3;y<43;y++)for(let x=4;x<36;x++){
 const rx=12.8*(.76+.24*y/42),d=((x-19.5)/rx)**2+((y-23)/20)**2;if(d>1)continue;
 let col=d>.87?'#273b39':x+y<31?'#fff9dd':x+y>55?'#b9bea4':'#e8e9c6';
 if(d<.8&&(((x-13)/4)**2+((y-17)/5)**2<1||((x-26)/5)**2+((y-26)/4)**2<1||((x-15)/5)**2+((y-34)/4)**2<1||((x-22)/3)**2+((y-8)/3)**2<1))col=colors[tier-1][x%3===0?1:0];
 c.fillStyle=col;c.fillRect(x,y,1,1);
 }
 // Tier marker also distinguishes levels without relying solely on hue.
 for(let i=0;i<tier;i++){c.fillStyle=colors[tier-1][1];c.fillRect(20-tier*2+i*4,24,2,2);}
 fs.writeFileSync(__dirname+'/egg-level-'+tier+'.png',cv.toBuffer('image/png'));
}
