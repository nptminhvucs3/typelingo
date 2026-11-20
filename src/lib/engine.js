// Bộ gõ Telex/VNI + chuẩn hoá tiếng Việt (thuần, không phụ thuộc DOM)
const VOW='aeiouy';
const MODCH={'a^':'â','a(':'ă','e^':'ê','o^':'ô','o+':'ơ','u+':'ư','d-':'đ'};
const TONEMARK=['','\u0301','\u0300','\u0309','\u0303','\u0323'];
const TONEOF={'\u0301':1,'\u0300':2,'\u0309':3,'\u0303':4,'\u0323':5};
function chOf(L){return MODCH[L.b+L.m]||L.b}
function isVow(L){return VOW.indexOf(L.b)>=0}
function toneIndex(L){
  const n=L.length;
  const isV=L.map((l,i)=>{
    if(!isVow(l))return false;
    if(l.b==='u'&&i>0&&L[i-1].b==='q'&&!L[i-1].m)return false;
    if(l.b==='i'&&i===1&&L[0].b==='g'&&n>2&&isVow(L[2]))return false;
    return true;
  });
  const idx=[];isV.forEach((v,i)=>{if(v)idx.push(i)});
  if(!idx.length)return -1;
  if(idx.length===1)return idx[0];
  const mod=idx.filter(i=>L[i].m&&L[i].m!=='-');
  if(mod.length)return mod[mod.length-1];
  if(idx.length>=3)return idx[1];
  const hasFinal=idx[idx.length-1]<n-1;
  return hasFinal?idx[1]:idx[0];
}
function decompVi(c){
  if(c==='đ')return{b:'d',m:'-',t:0};
  const d=c.normalize('NFD');const b=d[0];let m='',t=0;
  if(VOW.indexOf(b)<0)return null;
  for(const x of d.slice(1)){if(x==='\u0302')m='^';else if(x==='\u0306')m='(';else if(x==='\u031B')m='+';else if(TONEOF[x])t=TONEOF[x]}
  return{b,m,t};
}
function findBack(L,set){for(let i=L.length-1;i>=0;i--){if(set.indexOf(L[i].b)>=0&&!L[i].m)return i}return -1}
function composeWord(raw,method){
  const L=[];let tone=0;
  const hasV=()=>L.some(isVow);
  const lit=c=>L.push({b:c,m:''});
  const setTone=(t,c)=>{if(!hasV()){lit(c);return}if(tone===t){tone=0;lit(c)}else tone=t};
  const uoPair=()=>{const n=L.length;return n>=2&&L[n-2].b==='u'&&L[n-1].b==='o'&&!L[n-2].m&&!L[n-1].m&&!(n>=3&&L[n-3].b==='q')};
  for(const c of raw){
    if(c.charCodeAt(0)>127){const d=decompVi(c);if(d){L.push({b:d.b,m:d.m});if(d.t)tone=d.t;continue}}
    const n=L.length,last=L[n-1];
    if(method==='telex'){
      if(c==='w'){
        if(uoPair()){L[n-2].m='+';last.m='+';continue}
        if(last&&!last.m&&last.b==='a'){last.m='(';continue}
        if(last&&!last.m&&(last.b==='o'||last.b==='u')){last.m='+';continue}
        if(last&&(last.m==='+'||last.m==='(')&&'aou'.indexOf(last.b)>=0){last.m='';lit('w');continue}
        L.push({b:'u',m:'+'});continue;
      }
      const T={s:1,f:2,r:3,x:4,j:5,z:0}[c];
      if(T!==undefined){
        if(T===0){if(hasV()&&tone)tone=0;else lit(c)}else setTone(T,c);
        continue;
      }
      if((c==='a'||c==='e'||c==='o')&&last&&last.b===c){
        if(!last.m){last.m='^';continue}
        if(last.m==='^'){last.m='';lit(c);continue}
      }
      if(c==='d'&&last&&last.b==='d'){
        if(!last.m){last.m='-';continue}
        if(last.m==='-'){last.m='';lit(c);continue}
      }
      lit(c);
    }else{
      if(c>='1'&&c<='5'){setTone(+c,c);continue}
      if(c==='0'){if(hasV()&&tone)tone=0;else lit(c);continue}
      if(c==='6'){const i=findBack(L,'aeo');if(i>=0)L[i].m='^';else lit(c);continue}
      if(c==='7'){
        if(uoPair()){L[n-2].m='+';last.m='+';continue}
        const i=findBack(L,'ou');if(i>=0)L[i].m='+';else lit(c);continue;
      }
      if(c==='8'){const i=findBack(L,'a');if(i>=0)L[i].m='(';else lit(c);continue}
      if(c==='9'){const i=findBack(L,'d');if(i>=0)L[i].m='-';else lit(c);continue}
      lit(c);
    }
  }
  const ti=tone?toneIndex(L):-1;
  return L.map((l,i)=>{let ch=chOf(l);if(i===ti)ch=(ch+TONEMARK[tone]).normalize('NFC');return ch}).join('');
}
export function compose(raw,method){return raw.toLowerCase().split(' ').map(w=>composeWord(w,method)).join(' ')}
export function plain(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()}
export function splitTone(s){let t=0,o='';for(const ch of s.normalize('NFD')){if(TONEOF[ch])t=TONEOF[ch];else o+=ch}return{base:o.normalize('NFC'),tone:t}}

