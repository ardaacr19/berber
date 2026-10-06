(function(){
"use strict";
/* ---------- Dükkan ayarları (buradan değiştir) ---------- */
const CFG=window.SHOP_CONFIG||{};
const SERVICES=CFG.services||[
  {id:"sac",name:"Saç Kesimi",min:30,price:400,desc:"Yıkama ve şekillendirme dahil"},
  {id:"sakal",name:"Sakal Tıraşı",min:30,price:250,desc:"Ustura, sıcak havlu"},
  {id:"sacsakal",name:"Saç + Sakal",min:60,price:600,desc:"En çok tercih edilen"},
  {id:"cocuk",name:"Çocuk Kesimi",min:30,price:300,desc:"12 yaş altı"},
  {id:"cilt",name:"Cilt Bakımı",min:30,price:350,desc:"Maske, buhar, siyah nokta"},
  {id:"damat",name:"Damat Paketi",min:120,price:2500,desc:"Saç, sakal, cilt bakımı, fön"}
];
// getDay(): 0=Pazar ... 6=Cumartesi. null = kapalı. [açılış, kapanış] saat
const HOURS=CFG.hours||{0:[10,18],1:null,2:[9,21],3:[9,21],4:[9,21],5:[9,21],6:[9,21]};
const STEP=CFG.step||30, DAYS_AHEAD=CFG.daysAhead||14;
const DAY_NAMES=["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const DAY_SHORT=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
const MONTHS=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

/* ---------- yardımcılar ---------- */
const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseYmd=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const keyOf=(date,time)=>date+"_"+time.replace(":","-");
const toMin=t=>{const [h,m]=t.split(":").map(Number);return h*60+m};
const fromMin=m=>pad(Math.floor(m/60))+":"+pad(m%60);
const tl=n=>n.toLocaleString("tr-TR")+" ₺";
const fmtDate=s=>{const d=parseYmd(s);return d.getDate()+" "+MONTHS[d.getMonth()]+" "+DAY_NAMES[d.getDay()]};
const el=(tag,props,...kids)=>{const e=document.createElement(tag);if(props)for(const k in props){if(k==="class")e.className=props[k];else if(k==="text")e.textContent=props[k];else if(k.startsWith("on"))e.addEventListener(k.slice(2),props[k]);else if(props[k]!==false&&props[k]!=null)e.setAttribute(k,props[k]===true?"":props[k]);}for(const c of kids)if(c!=null)e.append(c);return e};
let toastT;function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200)}

function daySlots(date){
  const h=HOURS[parseYmd(date).getDay()];if(!h)return[];
  const out=[];for(let m=h[0]*60;m<h[1]*60;m+=STEP)out.push(fromMin(m));return out;
}
function nowMin(){const n=new Date();return n.getHours()*60+n.getMinutes()}
function isPast(date,time){const today=ymd(new Date());return date<today||(date===today&&toMin(time)<=nowMin()+15)}
function upcomingDays(){const out=[];const d=new Date();d.setHours(0,0,0,0);for(let i=0;i<DAYS_AHEAD;i++){out.push(ymd(d));d.setDate(d.getDate()+1)}return out}
function neededKeys(date,time,min){
  const h=HOURS[parseYmd(date).getDay()];if(!h)return null;
  const start=toMin(time),n=Math.ceil(min/STEP),keys=[];
  if(start+n*STEP>h[1]*60)return null;
  for(let i=0;i<n;i++)keys.push(keyOf(date,fromMin(start+i*STEP)));
  return keys;
}

/* ---------- durum ---------- */
const S={slots:{},svc:SERVICES[0],date:null,time:null,canBook:false,ready:false,done:null,busy:false,mine:[],admin:[],pDate:ymd(new Date())};
const API=window.API;

function slotFree(date,time,min){
  const keys=neededKeys(date,time,min);if(!keys)return false;
  if(isPast(date,time))return false;
  return keys.every(k=>!S.slots[k]);
}

/* ---------- çizim ---------- */
function renderBoard(){
  const b=$("#board");b.replaceChildren();
  for(const s of SERVICES)b.append(el("div",{class:"item"},
    el("div",{class:"l"},el("h3",{text:s.name}),el("span",{class:"dots"}),el("span",{class:"price",text:tl(s.price)})),
    el("p",{},el("span",{class:"dur",text:s.min+" dk"}),el("span",{text:s.desc}))));
}
function renderHours(){
  const t=$("#hoursTbl");t.replaceChildren();const today=new Date().getDay();
  for(const i of [1,2,3,4,5,6,0]){const h=HOURS[i];
    t.append(el("tr",{class:i===today?"today":null},el("td",{text:DAY_NAMES[i]+(i===today?" (bugün)":"")}),el("td",{text:h?pad(h[0])+":00 – "+pad(h[1])+":00":"Kapalı"})));}
  const h=HOURS[today];$("#todayHours").textContent=h?pad(h[0])+":00 – "+pad(h[1])+":00":"Kapalı";
  const n=nowMin(),open=h&&n>=h[0]*60&&n<h[1]*60;const c=$("#openChip");c.className="chip "+(open?"open":"closed");c.textContent=open?"Şu an açık":"Şu an kapalı";
}
function renderNextFree(){
  if(!S.ready){return}
  for(const d of upcomingDays())for(const t of daySlots(d))if(slotFree(d,t,30)){
    const lbl=d===ymd(new Date())?"Bugün":fmtDate(d).split(" ").slice(0,3).join(" ");
    $("#nextFree").textContent=lbl+" "+t;return;}
  $("#nextFree").textContent="2 hafta dolu";
}
function renderServices(){
  const box=$("#svcOpts");box.replaceChildren();
  for(const s of SERVICES)box.append(el("button",{type:"button",class:"opt","aria-pressed":String(S.svc.id===s.id),onclick:()=>{S.svc=s;S.time=null;renderAll()}},s.name,el("small",{text:s.min+" dk · "+tl(s.price)})));
}
function renderDays(){
  const box=$("#dayOpts");box.replaceChildren();
  for(const d of upcomingDays()){const dt=parseYmd(d);const closed=!HOURS[dt.getDay()];
    const anyFree=!closed&&daySlots(d).some(t=>slotFree(d,t,S.svc.min));
    box.append(el("button",{type:"button",class:"opt day","aria-pressed":String(S.date===d),disabled:closed||(S.ready&&!anyFree),title:closed?"Kapalı":(!anyFree?"Dolu":""),onclick:()=>{S.date=d;S.time=null;renderAll()}},
      el("small",{text:DAY_SHORT[dt.getDay()]}),el("b",{text:String(dt.getDate())}),el("small",{text:closed?"kapalı":MONTHS[dt.getMonth()]})));}
}
function renderTimes(){
  const box=$("#timeOpts");box.replaceChildren();const note=$("#timeNote");
  if(!S.date){note.textContent="Önce bir gün seç.";return}
  const list=daySlots(S.date);let free=0;
  for(const t of list){const ok=slotFree(S.date,t,S.svc.min);if(ok)free++;
    box.append(el("button",{type:"button",class:"opt","aria-pressed":String(S.time===t),disabled:!ok,onclick:()=>{S.time=t;renderAll()}},t));}
  note.textContent=!S.ready?"Saatler yükleniyor…":free?(S.svc.min>STEP?S.svc.name+" "+S.svc.min+" dk sürer; arka arkaya boş saatler gösteriliyor.":""):"Bu günde boş saat kalmadı, başka bir gün seç.";
}
function renderSummary(){
  const a=$("#summary");a.replaceChildren();
  if(S.done){const b=S.done;
    a.append(el("div",{class:"hd",text:"Randevun Alındı"}),el("div",{class:"ticket"},
      el("div",{class:"eyebrow",text:"Randevu No"}),el("div",{class:"no",text:b.code}),
      el("div",{},el("b",{text:fmtDate(b.date)+" · "+b.time})),el("div",{class:"muted",text:b.serviceName+" · "+tl(b.price)}),
      el("p",{class:"note",text:"Randevu saatinden 5 dk önce gelmen yeterli. İptal için 'Randevularım' bölümünü kullan."}),
      el("button",{class:"btn btn-ghost",type:"button",onclick:()=>{S.done=null;renderAll()}},"Yeni randevu")));return;}
  const ready=S.svc&&S.date&&S.time;
  const dl=el("dl",{},
    row("Hizmet",S.svc.name),row("Süre",S.svc.min+" dk"),row("Gün",S.date?fmtDate(S.date):"—"),
    row("Saat",S.time?S.time+" – "+fromMin(toMin(S.time)+S.svc.min):"—"));
  const tot=row("Toplam",tl(S.svc.price));tot.className="total";dl.append(tot);
  const btn=el("button",{class:"btn btn-brass",type:"button",disabled:!ready||!S.canBook||S.busy,onclick:submit},S.busy?"Kaydediliyor…":"Randevuyu Onayla");
  a.append(el("div",{class:"hd",text:"Özet"}),dl,el("div",{class:"ft"},btn,el("p",{class:"note",text:"Ödeme dükkânda, nakit veya kart."})));
  function row(k,v){return el("div",{},el("dt",{text:k}),el("dd",{text:v}))}
}
function bookingRow(b,acts){
  const d=parseYmd(b.date);
  return el("div",{class:"bk"},
    el("div",{class:"when"},b.time,el("small",{text:d.getDate()+" "+MONTHS[d.getMonth()]+" "+DAY_SHORT[d.getDay()]})),
    el("div",{class:"what"},el("b",{},b.serviceName,el("span",{class:"pill "+(b.status==="iptal"?"iptal":b.status==="tamamlandı"?"tamam":"onay"),text:b.status})),
      el("span",{text:[b.name,b.phone,b.note].filter(Boolean).join(" · ")+" · No: "+b.code})),
    el("div",{class:"acts"},...acts));
}
function renderMine(){
  const box=$("#mine");box.replaceChildren();
  const today=ymd(new Date());
  const list=S.mine.filter(b=>b.date>=today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  if(!list.length){box.append(el("div",{class:"empty",text:"Henüz yaklaşan randevun yok. İlk randevunu yukarıdan alabilirsin."}));return}
  for(const b of list){
    const acts=[];
    if(b.status==="onaylı"){const c=el("button",{class:"mini bad",type:"button"},"İptal et");
      c.onclick=()=>{if(c.dataset.sure){c.disabled=true;API.cancelMine(b).then(()=>toast("Randevu iptal edildi")).catch(e=>{c.disabled=false;toast(e.message||"İptal edilemedi")})}else{c.dataset.sure="1";c.textContent="Emin misin? Tekrar dokun"}};acts.push(c);}
    box.append(bookingRow(b,acts));
  }
}
function renderAll(){renderServices();renderDays();renderTimes();renderSummary();renderNextFree();renderPanel()}

/* ---------- gönder ---------- */
async function submit(){
  const err=$("#formErr");err.hidden=true;
  const name=$("#fName").value.trim(),phoneRaw=$("#fPhone").value.trim(),note=$("#fNote").value.trim().slice(0,200);
  const digits=phoneRaw.replace(/\D/g,"").replace(/^90/,"").replace(/^(?!0)/,"0");
  if(name.length<3){return fail("Ad soyad en az 3 harf olmalı.",$("#fName"))}
  if(!/^05\d{9}$/.test(digits)){return fail("Telefonu 05xx xxx xx xx biçiminde yaz.",$("#fPhone"))}
  if(!slotFree(S.date,S.time,S.svc.min)){S.time=null;renderAll();return fail("Bu saat az önce doldu, başka bir saat seç.")}
  const phone=digits.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/,"$1 $2 $3 $4");
  S.busy=true;renderSummary();
  try{
    const b=await API.book({serviceId:S.svc.id,serviceName:S.svc.name,price:S.svc.price,min:S.svc.min,date:S.date,time:S.time,name,phone,note,
      slots:neededKeys(S.date,S.time,S.svc.min)});
    S.done=b;S.time=null;$("#bookForm").reset();toast("Randevun kaydedildi");
  }catch(e){fail(e.message||"Randevu kaydedilemedi, tekrar dene.")}
  S.busy=false;renderAll();
  function fail(m,f){err.textContent=m;err.hidden=false;if(f)f.focus()}
}

/* ---------- panel ---------- */
let adminOn=false;
function renderPanel(){
  if(!adminOn)return;
  const today=ymd(new Date());
  const act=S.admin.filter(b=>b.status!=="iptal");
  const weekEnd=new Date();weekEnd.setDate(weekEnd.getDate()+6);const we=ymd(weekEnd);
  const todays=act.filter(b=>b.date===today);
  const week=act.filter(b=>b.date>=today&&b.date<=we);
  const st=$("#stats");st.replaceChildren();
  const next=act.filter(b=>b.status==="onaylı"&&(b.date>today||(b.date===today&&toMin(b.time)>=nowMin()-30))).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0];
  for(const [k,v] of [["Bugün",todays.length+" randevu"],["Bugün ciro",tl(todays.reduce((s,b)=>s+b.price,0))],["7 gün",week.length+" randevu"],["Sıradaki",next?(next.date===today?"":fmtDate(next.date).split(" ").slice(0,2).join(" ")+" ")+next.time:"—"]])
    st.append(el("div",{class:"stat"},el("div",{class:"k",text:k}),el("div",{class:"v",text:v})));
  const pd=$("#pDays");pd.replaceChildren();
  for(const d of upcomingDays()){const dt=parseYmd(d);const c=act.filter(b=>b.date===d).length;
    pd.append(el("button",{type:"button",class:"opt day","aria-pressed":String(S.pDate===d),onclick:()=>{S.pDate=d;renderPanel()}},el("small",{text:DAY_SHORT[dt.getDay()]}),el("b",{text:String(dt.getDate())}),el("small",{text:HOURS[dt.getDay()]?c+" rnd":"kapalı"})));}
  const pl=$("#pList");pl.replaceChildren();
  const dayList=S.admin.filter(b=>b.date===S.pDate).sort((a,b)=>a.time.localeCompare(b.time));
  if(!dayList.length)pl.append(el("div",{class:"empty",text:fmtDate(S.pDate)+" için randevu yok."}));
  for(const b of dayList){const acts=[];
    if(b.status==="onaylı"){
      acts.push(el("button",{class:"mini okb",type:"button",onclick:()=>API.setStatus(b,"tamamlandı").then(()=>toast("Tamamlandı olarak işaretlendi")).catch(e=>toast(e.message))},"Geldi"));
      const c=el("button",{class:"mini bad",type:"button"},"İptal");
      c.onclick=()=>{if(c.dataset.sure){API.setStatus(b,"iptal").then(()=>toast("Randevu iptal edildi, saat açıldı")).catch(e=>toast(e.message))}else{c.dataset.sure="1";c.textContent="Emin misin?"}};acts.push(c);}
    pl.append(bookingRow(b,acts));}
  const pt=$("#pTimes");pt.replaceChildren();
  const ts=daySlots(S.pDate);if(!ts.length)pt.append(el("p",{class:"note",text:"Bu gün kapalı."}));
  for(const t of ts){const s=S.slots[keyOf(S.pDate,t)];
    const cls="opt"+(s&&s.blocked?" blocked":s?" taken":"");
    pt.append(el("button",{type:"button",class:cls,title:s&&s.blocked?"Kapalı — açmak için dokun":s?"Dolu":"Boş — kapatmak için dokun",disabled:!!(s&&!s.blocked)||isPast(S.pDate,t),
      onclick:()=>API.toggleBlock(S.pDate,t,!!(s&&s.blocked)).catch(e=>toast(e.message))},s&&s.blocked?"✕ "+t:t));}
}
function showLogin(){
  const box=$("#panelLogin");box.hidden=false;box.replaceChildren();
  const inp=el("input",{id:"pw",type:"password",placeholder:"Panel şifresi",autocomplete:"current-password"});
  const e=el("p",{class:"err",hidden:true});
  const f=el("form",{class:"login"},el("label",{for:"pw"},"Şifre",inp),e,el("button",{class:"btn btn-brass",type:"submit"},"Giriş yap"));
  f.addEventListener("submit",async ev=>{ev.preventDefault();e.hidden=true;
    try{await API.adminLogin(inp.value);box.hidden=true;startAdmin()}catch(x){e.textContent=x.message||"Şifre yanlış";e.hidden=false}});
  box.append(f);
}
function startAdmin(){adminOn=true;$("#panelBody").hidden=false;API.onAdmin(list=>{S.admin=list;renderPanel()})}

/* ---------- başlat ---------- */
async function start(){
  $("#yr").textContent=new Date().getFullYear();
  renderBoard();renderHours();
  const days=upcomingDays();S.date=days.find(d=>HOURS[parseYmd(d).getDay()])||days[0];
  renderAll();
  $("#copyPhone").onclick=async()=>{try{await navigator.clipboard.writeText($("#phoneTxt").textContent);toast("Telefon kopyalandı")}catch(_){const r=document.createRange();r.selectNodeContents($("#phoneTxt"));const s=getSelection();s.removeAllRanges();s.addRange(r);toast("Numara seçildi, kopyalayabilirsin")}};
  const st=await API.init();
  const ban=$("#bookBanner");
  if(!st.ok){ban.textContent=st.reason||"Randevu sistemi şu an yüklenemedi. Telefonla randevu alabilirsin.";ban.hidden=false;$("#nextFree").textContent="Telefonla sor";return}
  S.canBook=st.canBook;
  if(!st.canBook){ban.textContent=st.reason||"Bu görünümde randevu oluşturulamıyor.";ban.hidden=false}
  API.onSlots(map=>{S.slots=map;S.ready=true;if(S.time&&!slotFree(S.date,S.time,S.svc.min))S.time=null;
    const ds=upcomingDays();if(!S.done&&S.date&&!daySlots(S.date).some(t=>slotFree(S.date,t,S.svc.min))){const nd=ds.find(d=>daySlots(d).some(t=>slotFree(d,t,S.svc.min)));if(nd)S.date=nd}
    renderAll()});
  API.onMine(list=>{S.mine=list;renderMine()});
  if(st.admin!=="no"){$("#navPanel").hidden=false;$("#panel").hidden=false;
    if(st.admin==="yes")startAdmin();else showLogin();}
  setInterval(()=>{renderHours();renderAll()},60000);
}
start();
})();
