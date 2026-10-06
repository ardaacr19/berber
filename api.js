(function(){
"use strict";
const LS_KEY="soneripek_randevular", ADMIN_KEY="soneripek_panel";
const sb=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY);
const ls={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(_){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}};
const ss={get(k){try{return sessionStorage.getItem(k)}catch(_){return null}},set(k,v){try{v?sessionStorage.setItem(k,v):sessionStorage.removeItem(k)}catch(_){}}};
const isPanel=/\/panel(?:\.html)?\/?$/.test(location.pathname);
let adminToken=ss.get(ADMIN_KEY);
const slotCbs=[],mineCbs=[],adminCbs=[];
async function rpc(fn,args){const {data,error}=await sb.rpc(fn,args||{});if(error){throw Object.assign(new Error(error.message||"Bir hata oluştu."),{status:error.code});}return data;}
async function pullSlots(){try{const m=await rpc("rpc_get_slots");slotCbs.forEach(f=>f(m||{}))}catch(_){} }
async function pullMine(){const items=ls.get(LS_KEY,[]);if(!items.length){mineCbs.forEach(f=>f([]));return}try{const list=await rpc("rpc_lookup",{p_items:items});mineCbs.forEach(f=>f(list||[]))}catch(_){} }
async function pullAdmin(){if(!adminToken)return;try{const list=await rpc("rpc_admin_bookings",{p_token:adminToken});adminCbs.forEach(f=>f(list||[]))}catch(e){if(/oturum|süre/i.test(e.message)){ss.set(ADMIN_KEY,null);adminToken=null;location.reload()}}}
function refresh(){pullSlots();pullMine();pullAdmin()}
window.API={
 async init(){let admin="no";if(isPanel){admin="login";if(adminToken){try{await rpc("rpc_admin_check",{p_token:adminToken});admin="yes"}catch(_){ss.set(ADMIN_KEY,null);adminToken=null}}}setInterval(refresh,15000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});return{ok:true,canBook:true,admin};},
 onSlots(cb){slotCbs.push(cb);pullSlots()},
 async book(p){const b=await rpc("rpc_book",{p_service_id:p.serviceId,p_date:p.date,p_time:p.time,p_name:p.name,p_phone:p.phone,p_note:p.note||""});const items=ls.get(LS_KEY,[]);items.push({id:b.id,token:b.token});ls.set(LS_KEY,items.slice(-30));refresh();return b},
 onMine(cb){mineCbs.push(cb);pullMine()},
 async cancelMine(b){const it=ls.get(LS_KEY,[]).find(x=>x.id===b.id);if(!it)throw new Error("Randevu bulunamadı.");await rpc("rpc_cancel",{p_id:b.id,p_token:it.token});refresh()},
 async adminLogin(pw){const r=await rpc("rpc_admin_login",{p_password:pw});adminToken=r.token;ss.set(ADMIN_KEY,r.token);return true},
 onAdmin(cb){adminCbs.push(cb);pullAdmin()},
 async setStatus(b,status){await rpc("rpc_admin_status",{p_token:adminToken,p_id:b.id,p_status:status});refresh()},
 async toggleBlock(date,time,isBlocked){await rpc("rpc_admin_block",{p_token:adminToken,p_date:date,p_time:time+":00",p_blocked:!isBlocked});refresh()}
};
})();
