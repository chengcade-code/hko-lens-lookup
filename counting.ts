import type {LensPair} from './lens-classification';
export const hkDate = (now = new Date()) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
export type Frame = {text:string; paid:boolean; reversed:boolean};
export type RecordItem = {recordId?:string; lenses?:LensPair[];position?:{ticket:string;group:number;line:number}; noExam?:boolean; excluded?:boolean; skipReason?:'WAITING_EXAM'|'WAITING_CUSTOMER'|'AFTER_SALES'; waitingExam?:boolean; purchase:boolean; reversed:boolean; frames?:Frame[]};
export function countRecords(records:RecordItem[]) {
  const seen = new Map<string,string>();let total=0;
  for(const r of records){
    if(r.excluded||r.noExam)continue;
    if(!r.recordId||!r.frames?.length)throw Error('明細資料不完整，未提供部分總數。');
    const frames=r.frames.filter(f=>/(?:^|[^A-Z0-9])HKSP[A-Z0-9]+(?:-[A-Z0-9]+)*/i.test(f.text)&&f.paid&&!f.reversed);
    if(frames.length>1)throw Error('一張明細有多個 HKSP 商品，需人工核對。');
    const n=r.purchase&&!r.reversed&&frames.length===1?1:0;
    const signature=JSON.stringify([n,r.frames]);
    if(seen.has(r.recordId)){if(seen.get(r.recordId)!==signature)throw Error('相同明細資料改變，請重新點算。');continue;}
    seen.set(r.recordId,signature);total+=n;
  }
  return total;
}
export function validateLogin(store:unknown,code:unknown){
  if(typeof store!=='string'||!/^\d{4,8}$/.test(store))throw Error('請輸入有效店舖番號（4 至 8 位數字）。');
  if(typeof code!=='string'||!/^\d{6,9}$/.test(code))throw Error('請輸入平時在 OWNDAYS 使用的完整數字登入碼（6 至 9 位）。');
  return {store,code};
}
