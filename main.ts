import {pageAgent} from './page-agent';
import {readLensProducts} from './lens-products';
import {hkDate} from './counting';
import {LENS_CATEGORIES} from './lens-classification';
import {runLocalCount,LocalFault} from './runner';
import type {LocalResult} from './runner';

export function mount(){
 if(location.origin!=='https://staging.front.owndays.net'||!/^\/front_app\/build\/queue\/?$/.test(location.pathname)){
  alert('請先照常登入 OWNDAYS，開啟「當日列表」，再按「OWNDAYS 統計」收藏夾。');return;
 }
 const id='owndays-local-counter-v1',old=document.getElementById(id);
 if(old?.getAttribute('data-counter-version')==='online-1.6.1'){old.dispatchEvent(new Event('owndays-show'));return;}
 old?.remove();
 document.getElementById('owndays-bookmarklet-test-v1')?.remove();
 const host=document.createElement('div');host.id=id;
 host.setAttribute('data-counter-version','online-1.6.1');
 host.style.cssText='all:initial!important;position:fixed!important;top:16px!important;right:16px!important;z-index:2147483647!important;display:block!important;width:min(390px,calc(100vw - 32px))!important;';
 const root=host.attachShadow({mode:'closed'});
 const style=document.createElement('style');style.textContent=`
 :host{color-scheme:light}*{box-sizing:border-box}section{font:14px/1.7 Arial,"Microsoft JhengHei",sans-serif;color:#183f35;background:#f6faf3;border:2px solid #257456;border-radius:16px;box-shadow:0 14px 48px #0004;max-height:calc(100vh - 32px);overflow:auto;padding:20px}h2{font-size:20px;margin:0 0 4px}p{margin:10px 0}small{color:#647569}button{font:inherit;cursor:pointer;border:1px solid #adc7b6;border-radius:8px;background:white;color:#174c3a;padding:8px 13px}button:disabled{opacity:.5;cursor:default}.primary{background:#1d604b;color:white;border-color:#1d604b}.bar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.status{padding:10px;background:#e8f0e4;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere}.big{font-size:27px;font-weight:bold;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.cell{border:1px solid #d1dfcd;border-radius:8px;padding:9px;background:white}.cell b{display:block;font-size:23px}.warn{color:#8b4a10;background:#fff1d8;padding:10px;border-radius:8px}.notes{font-size:12px;color:#627367}.pending{max-height:210px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}summary{cursor:pointer;font-weight:bold}hr{border:0;border-top:1px solid #d5e1d0;margin:16px 0}
 `;
 style.textContent+='[hidden]{display:none!important}';
 const box=document.createElement('section');box.setAttribute('role','dialog');box.setAttribute('aria-label','OWNDAYS 本機統計');
 const el=(tag:string,text?:string,cls?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const title=el('h2','OWNDAYS 本機統計');
 const subtitle=el('small','自動更新版 1.6.1 · HKSP＋全店鏡片');
 const help=el('p','確認目前分店正確、開單日期為今日，並只保留今日日期篩選。掃描期間請留喺呢個分頁，暫停操作原網站。');
 const status=el('div','準備好後，按「開始統計」。','status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const bar=el('div',undefined,'bar');
 const start=el('button','開始統計','primary') as HTMLButtonElement;
 const stop=el('button','停止') as HTMLButtonElement;stop.disabled=true;
 const minimise=el('button','收起') as HTMLButtonElement;
 const close=el('button','關閉') as HTMLButtonElement;
 const result=el('div');
 const foot=el('p','照常登入原網站；本工具不讀取或保存密碼，不連接 Cloudflare。只讀取統計需要的商品、狀態及明細編號；關閉或重新整理即清除本次結果。','notes');
 bar.append(start,stop,minimise,close);box.append(title,subtitle,help,status,bar,result,foot);root.append(style,box);document.documentElement.appendChild(host);
 let running=false,cancelled=false,compact=false,started=0;
 const toggle=()=>{compact=!compact;for(const n of [subtitle,help,status,bar,result,foot])n.hidden=compact;title.textContent=compact?'OWNDAYS 統計 · 按此展開':'OWNDAYS 本機統計';title.style.cursor=compact?'pointer':'default';};
 title.onclick=()=>{if(compact)toggle();};minimise.onclick=toggle;
 host.addEventListener('owndays-show',()=>{if(compact)toggle();});
 const check=()=>{
  if(cancelled||!host.isConnected)throw new LocalFault('CANCELLED','已停止；已讀取數字保留作參考，並非全店總數。');
  if(location.origin!=='https://staging.front.owndays.net'||!/^\/front_app\/build\/queue\/?$/.test(location.pathname))throw new LocalFault('PAGE_CHANGED','已離開當日列表，掃描已停止。');
  if(Date.now()-started>30*60*1000)throw new LocalFault('TIME_LIMIT','掃描超過 30 分鐘，請重新點算。');
 };
 const pause=async(ms:number)=>{check();await new Promise(resolve=>setTimeout(resolve,ms));check();};
 const messages:Record<string,string>={ORIGIN:'請在 OWNDAYS 原網站使用。',VERIFICATION:'原網站要求驗證，已停止。請先自行完成驗證。',ACCESS_DENIED:'原網站拒絕存取，已停止。',LIST_CHANGED:'訂單列表已改變，請重新掃描。'};
 const agent=(a:any)=>{check();const v=pageAgent(a,readLensProducts);if(v?.error)throw new LocalFault(v.error,(messages[v.error]??'未能辨識原網站頁面，請確認仍然登入。')+`（步驟：${a.cmd}${a.ticket?'；組別：'+a.ticket:''}${a.line?'；眼鏡：'+a.line:''}）`);return v;};
 const render=(r:LocalResult)=>{
  result.replaceChildren();
  result.append(el('hr'),el('p',`${r.shop} · ${r.date}`,'notes'));
  result.append(el('p',r.confirmedTotal===null?'HKSP 數字待核對':r.complete?`今日售出 ${r.confirmedTotal} 副`:`已讀取 HKSP ${r.confirmedTotal} 副`,'big'));
  if(!r.complete)result.append(el('p',r.live?'掃描中；目前數字並非全店總數。':'掃描未完成；以下保留已讀取數字，並非全店總數。','warn'));
  if(r.frameError)result.append(el('p',r.frameError,'warn'));
  result.append(el('p','以上為 HKSP 鏡框；以下為全店鏡片分類。','notes'));
  const lensComplete=r.complete&&r.lenses.complete;
  result.append(el('p',lensComplete?'鏡片分類統計完成':'鏡片分類尚有待核對',lensComplete?'':'warn'));
  if(r.lensError)result.append(el('p',r.lensError,'warn'));
  else{const grid=el('div',undefined,'grid');for(const category of LENS_CATEGORIES){const c=el('div',category,'cell');c.append(el('b',String(r.lenses.counts[category])));grid.append(c);}result.append(grid);}
  result.append(el('p',`已識別鏡片 ${r.lenses.confirmedPairs} 副；只讀 R 眼，每副計一次。「其他」按功能項目累加，可多於副數。蔡司只計「蔡司」。`,'notes'));
  if(r.pending.length||r.lenses.unknown.length){
   const d=el('details'),s=el('summary',`待核對：${r.pending.length} 項載入問題／${r.lenses.unknown.length} 項鏡片問題`),p=el('div',undefined,'pending');
   for(const item of r.pending)p.append(el('p',`第 ${item.group} 組${item.line===null?'':`第 ${item.line} 副`}（${item.ticket}）：${item.reason}，已嘗試 ${item.attempts} 次。`));
   for(const item of r.lenses.unknown)p.append(el('p',`第 ${item.group} 組第 ${item.line} 副（${item.ticket}）：${item.reason}${item.names.length?'\n'+[...new Set(item.names)].join(' ／ '):''}`));
   d.append(s,p);result.append(d);
  }
  result.append(el('p',`列表共 ${r.groups} 組；已讀取 ${r.lines} 副，當中略過 ${r.skipped} 副指定狀態。用時 ${r.durationSeconds} 秒。${r.live?'更新':'結束'}於 ${new Date().toLocaleTimeString('zh-HK',{timeZone:'Asia/Hong_Kong',hour12:false})}。`,'notes'));
  if(!lensComplete)result.append(el('p','未完成項目不當作零；卡片只顯示已確認數字。','warn'));
 };
 start.onclick=async()=>{
  if(running)return;running=true;cancelled=false;started=Date.now();start.disabled=true;stop.disabled=false;result.replaceChildren();help.hidden=true;
  let last:LocalResult|undefined;
  try{const r=await runLocalCount({agent,check,pause,progress:s=>{status.textContent=s;},snapshot:r=>{last=r;render(r);}});check();last=r;render(r);status.textContent=r.complete&&r.lenses.complete?'統計完成。':'掃描結束，請查看待核對項目。';}
  catch(e){if(last)render({...last,complete:false,live:false});status.textContent=e instanceof Error?e.message:'未能完成統計，請重新再試。';}
  finally{running=false;start.disabled=false;stop.disabled=true;start.textContent='重新統計';}
 };
 stop.onclick=()=>{cancelled=true;status.textContent='正在停止…';};
 close.onclick=()=>{cancelled=true;host.remove();};
 status.textContent=`香港日期：${hkDate()}。準備好後，按「開始統計」。`;
}
mount();
