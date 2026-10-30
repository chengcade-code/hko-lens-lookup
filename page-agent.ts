// This self-contained function runs only inside a new, isolated cloud browser.
// It never reads browser storage, cookies, clinical input values or customer names.
export function pageAgent(a:any,lensReader?:(root:Element)=>unknown):any {
  const clean=(v:any)=>String(v??'').replace(/\s+/g,' ').trim();
  const txt=(el:any)=>clean(el?.textContent);
  const all=(s:string)=>Array.from(document.querySelectorAll(s)) as HTMLElement[];
  const visible=(el:any)=>!!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
  if(location.origin!=='https://staging.front.owndays.net')return{error:'ORIGIN'};
  const verification=all('h1,h2,h3,[role="dialog"]').filter(visible).some(el=>/驗證碼|認証コード|verification code|verify your device|verify you are human|CAPTCHA/i.test(txt(el)));
  if(verification)return{error:'VERIFICATION'};
  if(/^(403 Forbidden|Access Denied)$/i.test(clean(document.querySelector('h1')?.textContent)))return{error:'ACCESS_DENIED'};
  const staff=all('span.rounded-full.bg-gray-300.text-gray-900 > span').find(el=>visible(el.parentElement)&&/^\d{2,10}$/.test(txt(el)));
  if(a.cmd==='loggedIn')return{ready:!!staff&&txt(staff)===a.staff&&location.pathname.endsWith('/queue')};
  const panelTab=all('[role="tab"][aria-selected="true"]').find(el=>txt(el)==='當日列表');
  const panel=panelTab?document.getElementById(panelTab.getAttribute('aria-controls')||''):null;
  const groups=()=>panel?Array.from(panel.querySelectorAll('.van-collapse-item')) as HTMLElement[]:[];
  const ticket=(g:any)=>txt(g.querySelector('.van-collapse-item__title .text-xl'));
  const scope=()=>{
    if(!panel||!visible(panel)||!staff)return null;
    const dates=all('span').filter(el=>visible(el)&&/^\d{4}\/\d{2}\/\d{2}$/.test(txt(el))&&el.parentElement?.querySelector(':scope > button'));
    if(dates.length!==1||dates[0].parentElement?.parentElement?.children.length!==1)return null;
    const shop=all('span.text-md.font-medium.text-gray-100').find(visible);
    return shop?{shop:txt(shop),staff:txt(staff),date:txt(dates[0]).replaceAll('/','-'),tickets:groups().map(ticket)}:null;
  };
  const identity=()=>{
    for(const h of all('h3').filter(visible)){
      const p=h.parentElement?.parentElement?.parentElement;
      const t=txt(p?.querySelector('.text-xl')),n=txt(p?.querySelector('span.h-5.w-5'));
      if(t&&n)return `${t}/${n}`;
    }return '';
  };
  const detail=()=>{
    const label=all('dt').find(el=>visible(el)&&txt(el)==='驗光號碼');
    if(!label)return all('h3').some(el=>visible(el)&&txt(el)==='尚未填寫驗光資訊')?{noExam:true}:null;
    const root=label.closest('dl')?.parentElement?.parentElement;
    const id=txt(label.parentElement?.querySelector('dd'));
    if(!root||!id)return null;
    const frames=Array.from(root.querySelectorAll('h5')).filter(visible).map(h=>({text:txt(h),paid:Array.from(h.querySelectorAll('span')).some(s=>txt(s)==='已結帳'),reversed:/退款|退貨|已取消|已作廢|取消訂單/.test(txt(h))}));
    return frames.length?{recordId:id,frames,lenses:lensReader?lensReader(root):undefined}:null;
  };
  if(a.cmd==='scope')return scope();
  if(a.cmd==='group'){
    const g=groups().find(g=>ticket(g)===a.ticket);if(!g)return{error:'LIST_CHANGED'};
    const h=g.querySelector('.van-collapse-item__title') as HTMLElement;
    if(h.getAttribute('aria-expanded')==='true')h.click();
    return{ok:true};
  }
  if(a.cmd==='expand'){
    const g=groups().find(g=>ticket(g)===a.ticket);if(!g)return{error:'LIST_CHANGED'};
    const h=g.querySelector('.van-collapse-item__title') as HTMLElement;
    if(h.getAttribute('aria-expanded')!=='true')h.click();return{ok:true};
  }
  if(a.cmd==='lines'){
    const g=groups().find(g=>ticket(g)===a.ticket);
    return{blank:!identity()&&!detail(),lines:g?Array.from(g.querySelectorAll('li[id="subList"]')).filter(visible).map(row=>txt(row.querySelector('span.h-5.w-5'))):[]};
  }
  if(a.cmd==='rowState'||a.cmd==='select'){
    const g=groups().find(g=>ticket(g)===a.ticket);
    const row=g?Array.from(g.querySelectorAll('li[id="subList"]')).find(row=>visible(row)&&txt(row.querySelector('span.h-5.w-5'))===a.line):null;
    if(!row)return{error:'LIST_CHANGED'};
    const lines=Array.from(g!.querySelectorAll('li[id="subList"]')).filter(visible).map(row=>txt(row.querySelector('span.h-5.w-5')));
    const badges=Array.from(row.querySelectorAll('span')).filter(visible).map(txt);
    const skipReason=badges.includes('售後服務')?'AFTER_SALES':badges.some(s=>['等待顧客資料','等待註冊顧客資料'].includes(s))?'WAITING_CUSTOMER':badges.includes('等待驗光')?'WAITING_EXAM':null;
    if(skipReason)return{excluded:true,skipReason,noExam:skipReason!=='AFTER_SALES',waitingExam:skipReason==='WAITING_EXAM',purchase:false,reversed:false,lines};
    if(a.cmd==='rowState')return{waitingExam:false,lines};
    const text=txt(row);(row as HTMLElement).click();
    return{purchase:/購買/.test(text)&&!/鏡片交換/.test(text),reversed:/退款|退貨|已取消|已作廢|取消訂單/.test(text)};
  }
  if(a.cmd==='detail')return{identity:identity(),detail:detail()};
  return{error:'COMMAND'};
}
