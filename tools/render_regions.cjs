const fs=require('fs'),vm=require('vm');
// Optional preview dependency: npm install --no-save @napi-rs/canvas
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas' : '@napi-rs/canvas');
const c={console,G:{Sprites:{PX:2}},document:{createElement:()=>createCanvas(1,1)}};c.window=c;vm.createContext(c);
for(const f of ['js/core/util.js','js/world/tiles.js','js/world/regions.js','js/world/region-art.js','js/world/world.js']) vm.runInContext(fs.readFileSync(f,'utf8'),c);
const G=c.G;G.FX={twinkle(){}};
const out=createCanvas(1200,1080),o=out.getContext('2d');o.fillStyle='#101725';o.fillRect(0,0,1200,1080);
for(const [i,p] of G.Regions.list.entries()){
 G.World.reset(417,p.id);G.World.setBiome(p.biome,true);
 const cv=createCanvas(800,640),ctx=cv.getContext('2d');
 const cam={w:800,h:640,left:()=>320,top:()=>320,sees:()=>true};
 ctx.translate(-320,-320);G.World.drawGround(ctx,cam);
 for(const prop of G.World.visibleProps(cam).sort((a,b)=>a.y-b.y)) G.World.drawProp(ctx,prop,0);
 const x=(i%3)*400,y=Math.floor(i/3)*360;o.drawImage(cv,x,y+35,400,320);
 o.fillStyle='#ffffff';o.font='bold 18px sans-serif';o.fillText(p.id.toUpperCase(),x+12,y+25);
}
fs.writeFileSync('docs/region-map-preview.png',out.toBuffer('image/png'));

fs.writeFileSync('docs/region-map-preview.webp',out.toBuffer('image/webp'));
