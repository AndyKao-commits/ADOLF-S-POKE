const modes=[
  ['normal','一般','原本的敵群、首領與升級流程','../../../assets/future-use/balls/poke-ball.png'],
  ['shiny','異色模式','敵人以異色外觀登場','../../../assets/future-use/balls/great-ball.png'],
  ['boss','首領挑戰','迎戰高強度首領流程','../../../assets/future-use/balls/ultra-ball.png'],
  ['castle','守護幼犬','保護目標並抵抗波次','../../../assets/future-use/balls/cursed-ball.png'],
  ['siege','城堡攻防','進入既有單人攻城規則','../../../assets/future-use/balls/master-ball.png']
];
const maps=[
  ['random','隨機','每局從可用地區抽選','maps/kanto.png'],['kanto','關都','常青林道','maps/kanto.png'],
  ['johto','城都','古林與遺跡石庭','maps/johto.png'],['hoenn','豐緣','雨林水道與火山岩岸','maps/hoenn.png'],
  ['sinnoh','神奧','雪原與天冠山道','maps/sinnoh.png'],['unova','合眾','都會街廓與河岸公園','maps/unova.png'],
  ['kalos','卡洛斯','幾何花園與噴泉步道','maps/kalos.png'],['alola','阿羅拉','熱帶沙灘與環礁','maps/alola.png'],
  ['galar','伽勒爾','曠野草原與湖畔石陣','maps/galar.png'],['paldea','帕底亞','高原荒地與環形盆地','maps/paldea.png']
];
const difficulties=[['normal','普通','1.00×','標準生成與生命'],['hard','困難','1.25×','生成頻率與敵人生命'],['challenge','挑戰','1.50×','生成頻率與敵人生命'],['nightmare','惡夢','2.00×','生成頻率與敵人生命']];
const catalog={mode:{title:'選擇遊戲模式',help:'目前規劃的五種模式',items:modes},map:{title:'選擇出戰地圖',help:'九地區縮圖由 Git 中的地形規則實際產生',items:maps},difficulty:{title:'選擇單人難度',help:'倍率套用在現有單人基準上',items:difficulties}};
const defaults={mode:'normal',map:'random',difficulty:'normal'};
let state={...defaults};
try{state={...state,...JSON.parse(localStorage.getItem('poketide-solo-prototype')||'{}')}}catch{}
for(const key of Object.keys(defaults))if(!catalog[key].items.some(x=>x[0]===state[key]))state[key]=defaults[key];
const picker=document.querySelector('#picker'),grid=document.querySelector('#picker-grid'),notice=document.querySelector('#notice');let active='';
const item=(key,id)=>catalog[key].items.find(x=>x[0]===id);
function refresh(){for(const key of Object.keys(state))document.querySelector(`[data-value="${key}"]`).textContent=item(key,state[key])[1];document.querySelector('#summary').textContent=`${item('mode',state.mode)[1]} ・ ${item('map',state.map)[1]}${state.map==='random'?'地圖':''} ・ ${item('difficulty',state.difficulty)[1]}`}
function openPicker(key){active=key;const data=catalog[key];document.querySelector('#picker-kicker').textContent=key==='mode'?'MODE':key==='map'?'REGION MAP':'DIFFICULTY';document.querySelector('#picker-title').textContent=data.title;document.querySelector('#picker-help').textContent=data.help;grid.innerHTML='';for(const opt of data.items){const b=document.createElement('button');b.className=`option ${key==='difficulty'?'simple':key}${opt[0]===state[key]?' selected':''}`;b.dataset.id=opt[0];if(key==='difficulty')b.innerHTML=`<b>${opt[2]}</b><strong>${opt[1]}</strong><small>${opt[3]}</small>`;else b.innerHTML=`<img src="${opt[3]}" alt=""><span class="meta"><strong>${opt[1]}</strong><small>${opt[2]}</small></span>`;b.onclick=()=>choose(opt[0]);grid.appendChild(b)}picker.showModal()}
function choose(id){state[active]=id;localStorage.setItem('poketide-solo-prototype',JSON.stringify(state));refresh();picker.close();toast(`已選擇：${item(active,id)[1]}`)}
function toast(msg){const el=document.querySelector('.toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
document.querySelectorAll('[data-picker]').forEach(b=>b.onclick=()=>openPicker(b.dataset.picker));document.querySelector('.close').onclick=()=>picker.close();
document.querySelector('#start').onclick=()=>{const d=item('difficulty',state.difficulty);document.querySelector('#notice-title').textContent='本局設定已準備';document.querySelector('#notice-body').textContent='此頁是可操作的介面原型。設定與保存已生效，尚未接入正式對局。';document.querySelector('#notice-details').innerHTML=`<div class="details">模式：<b>${item('mode',state.mode)[1]}</b><br>地圖：<b>${item('map',state.map)[1]}</b><br>難度：<b>${d[1]}（${d[2]}）</b></div>`;notice.showModal()};
document.querySelector('.ok').onclick=()=>notice.close();
document.querySelector('#join').onclick=()=>{const v=document.querySelector('#room-code').value.trim();toast(/^[A-Za-z0-9]{6}$/.test(v)?'代碼格式正確；原型未連線':'請輸入 6 位英數房間代碼')};
document.querySelector('#create').onclick=()=>toast('建立房間會交由現有多人系統處理');
document.querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>toast(`${b.dataset.info}：展示主頁入口位置`));
refresh();

// Draw the actual first Idle frame from assets/pokemon/143/Idle.png using its sprite metadata (32×64, scale 4).
const canvas=document.querySelector('#partner'),ctx=canvas.getContext('2d'),sprite=new Image();sprite.src='../../../assets/pokemon/143/Idle.png';sprite.onload=()=>{ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,256,256);ctx.drawImage(sprite,0,0,32,64,64,0,128,256)};
