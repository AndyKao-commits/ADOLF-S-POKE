/* Code-native pixel scenery. All dimensions are art pixels; Tiles scales ×2.
 * Decorative ground never changes collision. Solid landmarks use World props.
 */
G.RegionArt = (() => {
  const profiles = {
    kanto: { tree: 'oak', grass: 'fern', marker: 'trail', road: '#b59b6c', edge: '#766549' },
    johto: { tree: 'autumn', grass: 'leaf', marker: 'gate', road: '#a7a08c', edge: '#6a665b' },
    hoenn: { tree: 'palm', grass: 'reed', marker: 'vent', road: '#b9ab78', edge: '#7a7956' },
    sinnoh: { tree: 'pine', grass: 'snow', marker: 'shrine', road: '#bdceda', edge: '#8ea9bd' },
    unova: { tree: 'park', grass: 'hedge', marker: 'lamp', road: '#a2a8aa', edge: '#697781' },
    kalos: { tree: 'topiary', grass: 'flower', marker: 'fountain', road: '#dacbb0', edge: '#ada087' },
    alola: { tree: 'palm', grass: 'tropical', marker: 'tiki', road: '#e8d9ab', edge: '#c9b77f' },
    galar: { tree: 'oak', grass: 'heather', marker: 'stones', road: '#a69b7c', edge: '#7d795e' },
    paldea: { tree: 'olive', grass: 'dry', marker: 'crystal', road: '#c9b291', edge: '#988267' }
  };
  const regionFor = bi => G.Regions.list.find(p => p.biome === bi);
  function rect(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(x,y,w,h); }
  function canopy(c,x,y,w,h,color) {
    rect(c,x+3,y,w-6,h,color); rect(c,x,y+3,w,h-6,color);
  }
  function sprite(bi,type,variant) {
    const p = regionFor(bi); if (!p || !['tree','grass','landmark'].includes(type)) return null;
    const a=profiles[p.id], b=G.Tiles.BIOMES[bi];
    const cv=document.createElement('canvas'); cv.width=40; cv.height=44;
    const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
    if(type==='tree') {
      rect(c,18,24,5,18,'#4b3928');rect(c,20,25,2,17,'#987148');
      if(a.tree==='palm') {
        for(let i=0;i<4;i++) rect(c,19+i,21+i*5,4,6,i%2?'#987148':'#715132');
        for(const [x,y,w,h] of [[3,12,17,4],[1,16,12,3],[20,10,17,4],[29,14,10,3],[10,5,10,4],[17,8,6,14],[23,3,9,4],[5,21,14,3],[23,20,14,4]]) rect(c,x,y,w,h,b.leaf[2]);
        rect(c,9,11,10,2,b.leaf[3]);rect(c,23,9,10,2,b.leaf[3]);
        rect(c,18,19,3,3,'#765235');rect(c,22,18,3,3,'#65432b');
      } else if(a.tree==='pine') {
        for(let j=0;j<5;j++) { const w=8+j*5;rect(c,20-Math.floor(w/2),4+j*5,w,6,'#426b70');rect(c,21-Math.floor(w/2),4+j*5,w-2,2,'#f1f8ff'); }
        rect(c,15,40,13,2,'#edf7ff');
      } else if(a.tree==='topiary'||a.tree==='park') {
        for(const [y,w] of [[4,14],[11,24],[20,28]]) {canopy(c,20-w/2,y,w,10,b.leaf[1]);rect(c,22-w/2,y,w-5,2,b.leaf[3]);}
        if(a.tree==='park'){rect(c,11,39,20,3,'#7e7e7d');rect(c,13,37,16,2,'#b3b2a6');}
      } else if(a.tree==='olive') {
        rect(c,12,22,4,12,'#6a5140');rect(c,14,20,9,4,'#6a5140');
        canopy(c,4,12,18,12,'#617450');canopy(c,17,7,19,14,'#81905d');canopy(c,12,3,17,10,'#a2ac79');
        for(const [x,y] of [[11,18],[26,12],[20,7]])rect(c,x,y,2,2,'#39402a');
      } else {
        canopy(c,4,11,31,20,b.leaf[0]);canopy(c,7,6,26,20,b.leaf[1]);canopy(c,10,3,20,15,b.leaf[2]);
        rect(c,13,5,13,3,b.leaf[3]);rect(c,8,15,5,6,b.leaf[2]);
        if(a.tree==='autumn')for(const [x,y]of [[7,12],[25,9],[12,22],[29,19]])rect(c,x,y,4,3,'#e4b653');
      }
    } else if(type==='grass') {
      // Low silhouettes keep enemies and pickups readable.
      cv.width=24; cv.height=18; const shift=variant?1:0;
      if(['flower','heather','tropical'].includes(a.grass)) {
        for(let i=0;i<5;i++){const x=3+i*4,y=7+(i%2)*3;rect(c,x, y,1,9,b.grass[0]);rect(c,x-2+shift,y-2,5,3,a.grass==='heather'?'#b595cc':a.grass==='tropical'?'#f57f74':b.flowers[i%3]);rect(c,x,y-1,1,1,'#fff2bb');}
      } else if(a.grass==='snow') {
        rect(c,2,12,20,4,'#eaf5ff');rect(c,5,9,14,4,'#ffffff');rect(c,8,7,8,2,'#ffffff');rect(c,3,16,18,1,'#9db5c7');
      } else if(a.grass==='leaf') {
        for(let i=0;i<9;i++)rect(c,2+i*2,10+i%3,4,2,i%2?'#c89446':'#b35f3a');
      } else {
        for(let i=0;i<7;i++){const x=4+i*2,h=(a.grass==='reed'?12:6)+i%3;rect(c,x+shift,17-h,2,h,b.grass[i%3]);if(a.grass==='reed')rect(c,x,15-h,3,4,'#8b673e');else rect(c,x-2,13-h,4,2,b.grass[2]);}
      }
    } else {
      // Each landmark has a stable, modest footprint, matching World.r=14.
      rect(c,6,39,28,4,'#555b56');rect(c,8,37,24,3,'#b9b6a3');
      switch(a.marker) {
        case 'trail': rect(c,18,15,4,23,'#735338');rect(c,7,12,27,12,'#594331');rect(c,9,14,23,8,'#b89b68');rect(c,12,17,12,2,'#4c5e40');rect(c,23,15,3,6,'#4c5e40');break;
        case 'gate': for(const x of [8,28])rect(c,x,11,4,27,'#a54835');rect(c,3,8,34,4,'#432e2c');rect(c,6,12,28,4,'#c46145');rect(c,10,20,21,3,'#9c4636');break;
        case 'vent': for(let j=0;j<5;j++)rect(c,9-j,33-j*3,23+j*2,4,j%2?'#505454':'#686c67');rect(c,14,18,12,4,'#352c29');rect(c,17,19,5,2,'#e2a15a');for(let j=0;j<4;j++)rect(c,18+j%2*3,4+j*3,5,2,'#d3d5c6');break;
        case 'shrine':rect(c,10,33,21,4,'#9faeba');rect(c,13,13,15,21,'#687b8d');rect(c,16,17,9,16,'#bfcbd3');rect(c,19,20,3,9,'#647285');rect(c,8,10,25,4,'#f2f8fc');rect(c,13,7,15,3,'#ffffff');break;
        case 'lamp':rect(c,18,12,4,25,'#4e5862');rect(c,10,35,20,3,'#57616a');rect(c,13,4,14,12,'#344655');rect(c,16,6,8,7,'#ffec9b');rect(c,11,3,18,2,'#354855');rect(c,17,1,6,2,'#6e7b86');break;
        case 'fountain':rect(c,5,31,30,8,'#8f9caa');rect(c,8,31,24,5,'#68c9df');rect(c,17,18,6,16,'#d3d9d8');rect(c,10,17,20,4,'#bbc7cb');rect(c,13,18,14,2,'#76ccdc');rect(c,19,6,2,11,'#b3eff5');rect(c,15,8,10,2,'#e5fbff');break;
        case 'tiki':rect(c,12,12,16,25,'#845b3b');rect(c,14,12,12,25,'#b38450');rect(c,15,18,4,4,'#433b2d');rect(c,22,18,3,4,'#433b2d');rect(c,17,27,7,3,'#704332');rect(c,8,7,24,5,'#48a46b');rect(c,12,3,16,4,'#79c880');rect(c,18,4,4,4,'#f6b1be');break;
        case 'stones':for(const [x,y,w,h]of [[6,22,8,16],[16,13,9,25],[28,24,7,14]]){rect(c,x,y,w,h,'#737b72');rect(c,x+2,y+1,w-3,h-2,'#9da395');rect(c,x,y+w,3,3,'#657b48');}break;
        case 'crystal':for(const [x,y,w,h]of [[8,24,8,14],[16,9,10,29],[27,21,7,17]]){rect(c,x,y,w,h,'#71b9bd');rect(c,x+2,y+3,3,h-4,'#d0f4ed');rect(c,x+2,y-3,w-4,3,'#9dded9');}break;
      }
    }
    return cv;
  }
  function ground(cv,cx,cy,n,at,bi,seed) {
    const p=regionFor(bi);if(!p)return;
    const a=profiles[p.id],c=cv.getContext('2d'),b=G.Tiles.BIOMES[bi];
    for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
      const tx=cx*n+x,ty=cy*n+y;if(at(tx,ty)!=='floor')continue;
      const ox=x*16,oy=y*16,h=G.U.hash(tx,ty,seed+1401);
      if(G.Regions.path(tx,ty)) {
        rect(c,ox,oy,16,16,a.road);
        if(['unova','johto','kalos'].includes(p.id)) {
          rect(c,ox,oy,16,1,a.edge);rect(c,ox+8,oy,1,8,a.edge);rect(c,ox,oy+8,16,1,a.edge);rect(c,ox+3,oy+8,1,8,a.edge);
        } else for(let i=0;i<4;i++)rect(c,ox+(tx*3+i*5&15),oy+(ty*7+i*3&15),2,1,a.edge);
        continue;
      }
      // Patch accents are deterministic, baked once into each chunk.
      if(p.id==='kalos' && ((tx%12+12)%12<4)&&((ty%12+12)%12<4)) {
        rect(c,ox+1,oy+1,14,14,'#57764d');for(let j=0;j<3;j++)for(let i=0;i<3;i++)rect(c,ox+3+i*4,oy+3+j*4,2,2,b.flowers[(i+j)%3]);
      } else if(p.id==='sinnoh'&&h<.28) {
        rect(c,ox+3,oy+4,2,4,'#9db6cb');rect(c,ox+8,oy+9,2,4,'#abc0d0');
      } else if(p.id==='alola'&&h<.17) {
        rect(c,ox+5,oy+8,5,2,'#fff0d8');rect(c,ox+6,oy+6,3,2,'#f9d1ba');rect(c,ox+7,oy+6,1,4,'#d4a883');
      } else if(p.id==='johto'&&h<.25) {
        rect(c,ox+4,oy+5,3,2,'#cb9447');rect(c,ox+9,oy+10,3,2,'#a96c40');
      } else if(p.id==='hoenn'&&h<.14) {
        rect(c,ox+3,oy+9,6,3,'#536966');rect(c,ox+4,oy+8,4,1,'#81928a');
      } else if(p.id==='paldea'&&h<.2) {
        rect(c,ox+4,oy+7,2,6,'#b0d3c5');rect(c,ox+6,oy+10,3,2,'#739ea0');
      } else if(p.id==='galar'&&h<.22) {
        for(let i=0;i<3;i++)rect(c,ox+3+i*4,oy+6+i%2*3,2,3,'#bba2c8');
      } else if(p.id==='kanto'&&h<.2) {
        rect(c,ox+4,oy+9,7,2,'#426f36');rect(c,ox+6,oy+5,2,8,'#7dac59');
      }
    }
  }
  return {sprite,ground,profiles};
})();
