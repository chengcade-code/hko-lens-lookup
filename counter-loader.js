(() => {
 'use strict';
 if(location.origin!=='https://staging.front.owndays.net'||!/^\/front_app\/build\/queue\/?$/.test(location.pathname)){
  alert('請先登入 OWNDAYS 並開啟當日列表，再按「OWNDAYS 自動更新統計」。');return;
 }
 const id='owndays-online-loading';
 const old=document.getElementById(id);if(old){old.dispatchEvent(new Event('cancel-loader'));}
 const box=document.createElement('section');box.id=id;
 box.style.cssText='position:fixed!important;top:20px!important;right:20px!important;z-index:2147483647!important;width:min(360px,calc(100vw - 40px))!important;padding:22px!important;border:2px solid #267357!important;border-radius:14px!important;background:#f5faf0!important;color:#193e34!important;box-shadow:0 12px 40px #0004!important;font:15px/1.8 Arial,sans-serif!important;box-sizing:border-box!important;';
 const title=document.createElement('strong');title.textContent='正在載入最新統計程式…';
 const text=document.createElement('p');text.textContent='連接獨立更新網站，最多等候 15 秒。';
 const close=document.createElement('button');close.textContent='關閉';close.type='button';
 box.append(title,text,close);document.documentElement.appendChild(box);
 const script=document.createElement('script');script.async=true;script.referrerPolicy='no-referrer';
 let finished=false,timer;
 const clean=()=>{clearTimeout(timer);document.removeEventListener('securitypolicyviolation',violation);script.onload=null;script.onerror=null;script.remove();};
 const fail=message=>{if(finished)return;finished=true;clean();title.textContent='未能載入統計程式';text.textContent=message;};
 const cancel=()=>{finished=true;clean();box.remove();};
 close.onclick=cancel;box.addEventListener('cancel-loader',cancel);
 const violation=e=>{if(e.disposition==='enforce'&&String(e.blockedURI||'').startsWith('https://hko-lens-lookup.vercel.app'))fail('原網站安全設定封鎖外部程式（'+(e.effectiveDirective||'CSP')+'）。請保留提示，不需要更改安全設定。');};
 document.addEventListener('securitypolicyviolation',violation);
 script.onload=()=>{if(finished)return;const panel=document.getElementById('owndays-local-counter-v1');if(panel?.getAttribute('data-counter-version')?.startsWith('online-'))cancel();else fail('檔案已載入，但未找到統計面板；今次未執行掃描，請重新測試。');};
 script.onerror=()=>fail('外部程式載入失敗，可能是網絡或網址存取問題。請先用「外部載入測試」檢查。');
 timer=setTimeout(()=>fail('15 秒內未完成載入。請確認店舖可以開啟獨立更新網站，再試一次。'),15000);
 script.src='https://hko-lens-lookup.vercel.app/owndays/runtime.js?ts='+Date.now();
 document.documentElement.appendChild(script);
})();
