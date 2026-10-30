(() => {
  'use strict';
  if (location.origin !== 'https://staging.front.owndays.net' || !/^\/front_app\/build(?:\/|$)/.test(location.pathname)) {
    alert('請先開啟 OWNDAYS 系統分頁，再按「外部載入測試」收藏夾。');
    return;
  }
  const id = 'owndays-external-probe-v1';
  document.getElementById(id)?.dispatchEvent(new Event('owndays-probe-cancel'));
  const token = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const remote = 'https://hko-lens-lookup.vercel.app/owndays/probe-v1.js';
  const panel = document.createElement('section');
  panel.id = id;
  panel.style.cssText = 'position:fixed!important;top:20px!important;right:20px!important;z-index:2147483647!important;width:min(380px,calc(100vw - 40px))!important;padding:22px!important;box-sizing:border-box!important;border:2px solid #267357!important;border-radius:15px!important;background:#f4faf0!important;color:#173f34!important;box-shadow:0 12px 40px #0004!important;font:15px/1.8 Arial,sans-serif!important;text-align:left!important;';
  const title = document.createElement('strong');
  title.textContent = '正在測試外部載入…';
  title.style.cssText = 'display:block!important;font-size:21px!important;';
  const status = document.createElement('p');
  status.textContent = '正在從獨立測試網站載入程式，最多等候 15 秒。';
  const note = document.createElement('p');
  note.textContent = '只測試程式載入；不讀取客人、商品、密碼或瀏覽器儲存。測試請求不傳送本頁網址。';
  const close = document.createElement('button');
  close.type = 'button';close.textContent = '關閉測試提示';
  close.style.cssText = 'font:15px Arial,sans-serif!important;padding:10px 15px!important;border:0!important;border-radius:8px!important;background:#1d604b!important;color:white!important;cursor:pointer!important;';
  panel.append(title,status,note,close);
  document.documentElement.appendChild(panel);
  const script = document.createElement('script');
  script.dataset.owndaysTestId = token;
  script.referrerPolicy = 'no-referrer';
  script.async = true;
  let finished = false, timer, blocked = '';
  const clean = () => {
    clearTimeout(timer);
    document.removeEventListener('owndays-external-probe-executed', executed);
    document.removeEventListener('securitypolicyviolation', violation);
    script.onload = null;script.onerror = null;script.remove();
  };
  const finish = (headline, message) => {
    if (finished) return;
    finished = true;title.textContent = headline;status.textContent = message;clean();
  };
  const executed = event => {
    if (event.detail?.token !== token || event.detail?.version !== '1.0') return;
    finish('✓ 外部程式載入成功', '本次成功從測試網站下載並執行程式。可再以同一網站測試正式自動更新；今次未執行統計。');
  };
  const violation = event => {
    if (event.disposition !== 'enforce' || !String(event.blockedURI || '').startsWith(remote.split('/probe-v1.js')[0])) return;
    blocked = event.effectiveDirective || 'Content Security Policy';
    finish('外部程式被網站安全設定封鎖', '原網站回報：' + blocked + '。請保留這個提示；不需要更改安全設定。');
  };
  const cancel = () => {finished = true;clean();panel.remove();};
  panel.addEventListener('owndays-probe-cancel', cancel);
  close.onclick = cancel;
  document.addEventListener('owndays-external-probe-executed', executed);
  document.addEventListener('securitypolicyviolation', violation);
  script.onload = () => {
    if (!finished) finish('檔案已載入，但未確認執行', '可能載入了登入頁或其他回應。這不算測試成功，亦未能判斷為 OWNDAYS 封鎖。');
  };
  script.onerror = () => {
    // A generic error is not evidence of a CSP block.
    if (!finished) finish('外部程式未能載入', blocked || '未確認原因，可能是測試網址存取或網絡問題。請截圖此提示；如方便，可一併查看 F12 → Console 的錯誤。');
  };
  timer = setTimeout(() => finish('外部載入逾時', '15 秒內未確認程式執行。可能是連線或存取問題，不能單憑逾時判斷 OWNDAYS 封鎖。'), 15000);
  script.src = remote + '?test=' + encodeURIComponent(token);
  document.documentElement.appendChild(script);
})();
