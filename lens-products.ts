// Read the R product once per pair. L is not required or used for matching.
export function readLensProducts(root:Element){
 const clean=(s:string|null)=>String(s??'').replace(/\s+/g,' ').trim();
 const visible=(e:Element)=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 const eye=(h:Element)=>{
  for(const s of Array.from(h.querySelectorAll('span'))){const t=clean(s.textContent);if(t==='R'||t==='L')return t;}
  return clean(h.textContent).match(/^([RL])\s+/)?.[1]??'';
 };
 const headingText=(h:Element)=>{
  const clone=h.cloneNode(true) as Element;
  for(const s of Array.from(clone.querySelectorAll('span'))){
   const t=clean(s.textContent);
   // R and L badges may have no surrounding text-node whitespace in a shared
   // heading. Pad both boundary markers, then retain only the R substring.
   if(t==='R'||t==='L')s.textContent=` ${t} `;
   else if(['已結帳','使用折扣','未結帳'].includes(t))s.textContent=' ';
  }
  return clean(clone.textContent).replace(/^R\s+/,'').split(/\s+L\s+/)[0].trim();
 };
 const products=[];
 for(const h of Array.from(root.querySelectorAll('h5')).filter(visible)){
  if(eye(h)!=='R')continue;
  let container:Element|null=h.closest('li');
  if(!container||!root.contains(container)){
   container=null;let parent=h.parentElement;
   for(let n=0;parent&&n<4&&parent!==root;n++,parent=parent.parentElement){
    const hs=Array.from(parent.querySelectorAll('h5')).filter(visible);
    if(hs.filter(x=>eye(x)==='R').length!==1||hs.some(x=>!eye(x)))break;
    container=parent;
    const statuses=Array.from(parent.querySelectorAll('span')).filter(visible).map(s=>clean(s.textContent));
    if(statuses.includes('已結帳')||statuses.includes('未結帳'))break;
   }
  }
  if(!container)continue;
  const right=headingText(h);if(!right)continue;
  const statuses=Array.from(container.querySelectorAll('span')).filter(visible).map(s=>clean(s.textContent));
  products.push({right,paid:statuses.includes('已結帳'),reversed:statuses.some(s=>/退款|退貨|已取消|已作廢|取消訂單/.test(s))});
 }
 return products;
}
