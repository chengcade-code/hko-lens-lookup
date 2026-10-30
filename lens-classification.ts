// Bookmarklet-only classification; web deployment remains unchanged.
import {lensCatalog} from './lens-catalog';
import {lensAliases} from './lens-aliases';
import type {RecordItem as SharedRecordItem} from './counting';
export const LENS_CATEGORIES=['3K','變色','DAS','其他','PAL','蔡司'] as const;
export type LensCategory=typeof LENS_CATEGORIES[number];
export type LensPair={right:string;left?:string;paid:boolean;reversed:boolean};
type RecordItem=Omit<SharedRecordItem,'lenses'>&{lenses?:LensPair[]};
export function canonicalLensName(value:string){
 return value.normalize('NFKC').trim().replace(/\s+[^\s/]+\s*\/.*$/,'').toUpperCase().replace(/^(?:(?:HKO|SEIKO|ZEISS)\s+)+/,'').replace(/\(JPN\)/g,'').replace(/\s+/g,'');
}
export function deriveLensCategories(name:string,cats:string):LensCategory[]{
 if(name.startsWith('ZEISS '))return ['蔡司'];
 const result=cats.split(',').filter(c=>c!=='其他') as LensCategory[];
 const upper=name.toUpperCase();
 if(upper.includes('PHOTOSHADE')&&!result.includes('變色'))result.push('變色');
 if(/\bBC\b/.test(upper)&&!result.includes('3K'))result.push('3K');
 const other=[upper.includes('ANTI SCR'),/\bWH\b/.test(upper),/\bCOL(?:\s|$)/.test(upper),/\bPOL\b/.test(upper),upper.includes('MYOPIA CONTROL')].filter(Boolean).length;
 result.push(...Array(other).fill('其他'));return result;
}
const names=new Map<string,{name:string;cats:LensCategory[];ambiguous:boolean}>();
for(const [,name,cats] of lensCatalog){
 const key=canonicalLensName(name),categories=deriveLensCategories(name,cats),old=names.get(key);
 const signature=(a:LensCategory[])=>JSON.stringify([...a].sort());
 names.set(key,{name,cats:categories,ambiguous:!!old&&(old.ambiguous||signature(old.cats)!==signature(categories))});
}
const productsByJan=new Map(lensCatalog.map(([jan,name])=>[jan,name]));
for(const [alias,jan] of lensAliases){
 const product=productsByJan.get(jan),found=product?names.get(canonicalLensName(product)):undefined;
 if(!found)throw Error('鏡片舊型號對照缺少商品。');
 const key=canonicalLensName(alias),existing=names.get(key);
 const conflict=!!existing&&(existing.ambiguous||canonicalLensName(existing.name)!==canonicalLensName(found.name));
 names.set(key,{...found,ambiguous:found.ambiguous||conflict});
}
// User-confirmed ordinary lenses; no manufacturer or JAN is assumed.
for(const index of [160,167,174]){const name=`OD UP2 ${index}`;names.set(canonicalLensName(name),{name,cats:[],ambiguous:false});}
export function identifyLens(name:string){const found=names.get(canonicalLensName(name));return found&&!found.ambiguous?found:null;}
export function countLenses(records:RecordItem[]){
 const counts=Object.fromEntries(LENS_CATEGORIES.map(c=>[c,0])) as Record<LensCategory,number>;
 const unknown:{ticket:string;group:number;line:number;names:string[];reason:string}[]=[];
 const seen=new Map<string,string>();let confirmedPairs=0,paidPairs=0;
 for(const r of records){
  if(r.excluded||r.noExam||r.reversed)continue;
  if(!r.recordId)throw Error('鏡片明細識別資料缺漏。');
  const signature=JSON.stringify(r.lenses?.map(l=>({right:l.right,paid:l.paid,reversed:l.reversed})));
  if(seen.has(r.recordId)){if(seen.get(r.recordId)!==signature)throw Error('相同鏡片明細在掃描期間改變。');continue;}
  seen.set(r.recordId,signature);
  const pending=(reason:string,lensNames:string[]=[])=>unknown.push({...r.position??{ticket:'',group:0,line:0},names:lensNames,reason});
  if(!r.lenses?.length){pending('未能辨識鏡片商品欄');continue;}
  const paid=r.lenses.filter(l=>l.paid&&!l.reversed);
  if(!paid.length)continue;
  if(paid.length!==1){pending('同一副有多組已結帳鏡片，需要核對');continue;}
  paidPairs++;
  const pair=paid[0],right=identifyLens(pair.right);
  if(!right){pending('R 眼商品名稱未能唯一對應 HKO 資料庫',[pair.right]);continue;}
  confirmedPairs++;for(const c of right.cats)counts[c]++;
 }
 return{counts,confirmedPairs,paidPairs,unknown,complete:unknown.length===0};
}
