"""Create review PNGs from repository assets when a browser is unavailable."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/prototypes/solo-menu'
FONT = Path('/workspace/scratch/215d8e4fee94/test-fonts/NotoSansCJKtc-Regular.otf')
if not FONT.exists(): FONT = ROOT / 'assets/fonts/PixelifyPS-400.ttf'
def font(n): return ImageFont.truetype(str(FONT), n)
def text(d, xy, value, size, fill='white', anchor=None): d.text(xy, value, font=font(size), fill=fill, anchor=anchor)
def rounded(d, box, fill, outline='#315d73', width=2, radius=15): d.rounded_rectangle(box, radius, fill, outline, width)
def asset(path, size):
    im=Image.open(ROOT/path).convert('RGBA'); im.thumbnail(size, Image.Resampling.NEAREST); return im

W,H=1440,900
im=Image.new('RGB',(W,H),'#071729'); d=ImageDraw.Draw(im)
for y in range(H):
    k=y/H; d.line((0,y,W,y),fill=(int(12-5*k),int(47-25*k),int(66-28*k)))
d.rectangle((0,0,W,76),fill='#07131f'); d.line((0,75,W,75),fill='#234d62',width=3)
text(d,(55,14),'POKÉ',32,'#ffd84c'); text(d,(150,14),'TIDE',32,'#68cdf8'); text(d,(56,50),'寶可夢生存戰',11,'#dff8ff')
rounded(d,(1120,20,1370,58),'#101e32','#345773',2,22); text(d,(1245,39),'💎 0      🪙 12,460',16,anchor='mm')

# background hills and grass
d.polygon([(300,650),(580,240),(760,650)],fill='#17536a'); d.polygon([(630,650),(940,280),(1190,650)],fill='#17455d')
d.ellipse((-150,570,1590,1000),fill='#164a38')

def panel(x,y,w,h,title,tag):
    rounded(d,(x,y,x+w,y+h),'#0b2132','#315d73'); text(d,(x+20,y+18),title,20); text(d,(x+w-20,y+24),tag,10,'#65ddd1',anchor='ra'); d.line((x+18,y+52,x+w-18,y+52),fill='#315064')
panel(55,145,310,500,'單人出戰設定','SOLO')
rows=[('◈','模式','異色模式','#ff6378'),('⌖','地圖','神奧','#69c9ff'),('✦','難度','惡夢','#ffd657')]
for i,(ico,label,val,col) in enumerate(rows):
    y=215+i*86; rounded(d,(73,y,347,y+72),'#0c1f31','#33566c',2,10); text(d,(99,y+36),ico,24,col,anchor='mm'); text(d,(126,y+16),label,12,'#88a9bb'); text(d,(126,y+39),val,19); text(d,(324,y+35),'›',27,'#6ce1d2',anchor='mm')
d.rectangle((73,486,347,585),fill='#082036'); d.rectangle((73,486,76,585),fill='#63d8ce'); text(d,(89,500),'如何使用',13,'#74e8da'); text(d,(89,528),'點選欄位開啟宮格，選擇後會自動保存。',12,'#a9c4d2'); text(d,(89,552),'按「開始遊戲」可查看本局設定。',12,'#a9c4d2')

# actual Snorlax frame
sheet=Image.open(ROOT/'assets/pokemon/143/Idle.png').convert('RGBA'); sn=sheet.crop((0,0,32,64)).resize((192,384),Image.Resampling.NEAREST)
d.ellipse((620,565,820,610),fill='#02090d99'); im.alpha_composite(sn,(624,205)) if im.mode=='RGBA' else im.paste(sn,(624,205),sn)
rounded(d,(656,115,784,148),'#071b2a','#43819b',1,7); text(d,(720,131),'夥伴等級   Lv. 12',12,'#ffe165',anchor='mm')
text(d,(720,594),'YOUR PARTNER',11,'#65d8cd',anchor='mm'); text(d,(720,627),'卡比獸',31,anchor='mm'); text(d,(720,660),'異色模式 ・ 神奧 ・ 惡夢',14,'#d9f4f5',anchor='mm')
rounded(d,(585,689,855,747),'#e8a52c','#fff4b4',3,8); text(d,(720,718),'開始遊戲  ▶',22,'#17130b',anchor='mm')

panel(1075,145,310,500,'多人房間','CO-OP')
for p,x in [('assets/future-use/balls/great-ball.png',1140),('assets/future-use/balls/ultra-ball.png',1270)]:
    a=asset(p,(64,64)).resize((64,64),Image.Resampling.NEAREST); im.paste(a,(x,215),a)
d.line((1212,247,1260,247),fill='#6cdccd',width=2)
text(d,(1095,305),'輸入房間代碼',12,'#86a9b9'); rounded(d,(1095,330,1365,377),'#07131f','#34596d',2,7); text(d,(1110,344),'A1B2C3',18,'#fff'); d.rectangle((1290,330,1365,377),fill='#268f87'); text(d,(1328,353),'加入',15,anchor='mm')
rounded(d,(1095,397,1365,445),'#193d55','#37647c',2,7); text(d,(1230,421),'＋ 建立新房間',15,anchor='mm'); text(d,(1095,470),'原型示範入口與輸入檢查；連線仍使用現有多人系統。',11,'#7899a9')

d.rectangle((0,805,W,H),fill='#07131f'); d.line((0,805,W,805),fill='#1c4c62',width=3)
labels=['寶可夢','強化','商店','背包','扭蛋','任務','好友','排行','設定']
for i,label in enumerate(labels):
    x=360+i*82; text(d,(x,858),label,12,'#b5d1dc',anchor='mm')
shop=asset('assets/future-use/shop/shop-only.png',(42,42)); im.paste(shop,(360+2*82-21,817),shop)
ball=asset('assets/future-use/balls/master-ball.png',(39,39)); im.paste(ball,(360+4*82-19,819),ball)
text(d,(360+82,832),'⬆',27,'#fff',anchor='mm'); text(d,(360+3*82,832),'🎒',25,anchor='mm')
im.save(OUT/'actual-main.png')

# Map dialog review view
overlay=Image.new('RGBA',(W,H),(1,5,10,205)); base=im.convert('RGBA'); base.alpha_composite(overlay)
dd=ImageDraw.Draw(base); rounded(dd,(285,75,1155,825),'#0b2030','#4b8394',2,15); text(dd,(315,100),'REGION MAP',11,'#61d8cf'); text(dd,(315,124),'選擇出戰地圖',27); text(dd,(315,164),'九地區縮圖由 Git 中的地形規則實際產生',12,'#92adbb'); text(dd,(1115,124),'×',25,anchor='mm'); dd.line((285,190,1155,190),fill='#31546a')
cards=[('random','隨機','每局從可用地區抽選','kanto'),('kanto','關都','常青林道','kanto'),('johto','城都','古林與遺跡石庭','johto'),('hoenn','豐緣','雨林水道與火山岩岸','hoenn'),('sinnoh','神奧','雪原與天冠山道','sinnoh'),('unova','合眾','都會街廓與河岸公園','unova'),('kalos','卡洛斯','幾何花園與噴泉步道','kalos'),('alola','阿羅拉','熱帶沙灘與環礁','alola'),('galar','伽勒爾','曠野草原與湖畔石陣','galar'),('paldea','帕底亞','高原荒地與環形盆地','paldea')]
for i,(_,name,sub,mapid) in enumerate(cards):
    col=i%3; row=i//3; x=310+col*275; y=215+row*145; selected=name=='神奧'; rounded(dd,(x,y,x+255,y+128),'#0b1d2b','#ffd54d' if selected else '#31536a',3 if selected else 2,10)
    m=Image.open(OUT/f'maps/{mapid}.png').convert('RGB').resize((251,76),Image.Resampling.NEAREST); base.paste(m,(x+2,y+2)); text(dd,(x+12,y+87),name,16); text(dd,(x+12,y+108),sub,10,'#8eabba')
    if selected: dd.ellipse((x+218,y+8,x+243,y+33),fill='#ffd54d'); text(dd,(x+230,y+20),'✓',15,'#15212a',anchor='mm')
base.convert('RGB').save(OUT/'actual-map-picker.png')
print('Rendered actual-main.png and actual-map-picker.png')
