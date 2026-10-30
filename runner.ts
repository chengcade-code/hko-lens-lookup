import {hkDate,countRecords} from './counting';
import {countLenses} from './lens-classification';
import {scanRows} from './scan-rows';
import type {RecordItem} from './counting';

export class LocalFault extends Error{constructor(public code:string,message:string){super(message);}}
export type LocalResult={shop:string;date:string;groups:number;lines:number;complete:boolean;confirmedTotal:number|null;lenses:ReturnType<typeof countLenses>;pending:{ticket:string;group:number;line:number|null;attempts:number;reason:string}[];skipped:number;durationSeconds:number;frameError?:string;lensError?:string;live?:boolean};
export async function runLocalCount(io:{agent:(a:any)=>any;check:()=>void;pause:(ms:number)=>Promise<void>;progress:(s:string)=>void;snapshot?:(r:LocalResult)=>void;now?:()=>number;date?:()=>string}):Promise<LocalResult>{
 const {check,pause,progress}=io,now=io.now??Date.now,date=io.date??hkDate;
 const started=now(),today=date();
 // A missing DOM row is not proof of a changed order list. Give collapse
 // animations and source refreshes time to settle, but only within the same
 // verified shop/date/staff/ticket scope.
 let fingerprint='';
 const agent=async(a:any)=>{
  const end=now()+1800;
  for(;;){
   check();
   try{return await io.agent(a);}
   catch(error){
    if((error as any)?.code!=='LIST_CHANGED'||!fingerprint||a.cmd==='scope')throw error;
    const current=await io.agent({cmd:'scope'});
    if(date()!==today||JSON.stringify(current)!==fingerprint)throw new LocalFault('LIST_CHANGED','分店、日期、登入或訂單組別已改變，已停止。');
    if(now()>=end)throw new LocalFault('PAGE_TIMEOUT',`未能找到${a.line?`第 ${a.line} 副眼鏡`:'訂單組別'}（${a.ticket}，步驟 ${a.cmd}）。`);
    await pause(180);
   }
  }
 };
 const until=async(a:any,test:(v:any)=>boolean,message:string,ms=6000)=>{
  const end=now()+ms;
  while(now()<end){check();const value=await agent(a);if(test(value))return value;await pause(180);}
  throw new LocalFault('PAGE_TIMEOUT',message);
 };
 progress('正在確認分店、今日日期及列表…');
 let scope=await until({cmd:'scope'},v=>!!v&&Array.isArray(v.tickets),'請先開啟「當日列表」，只保留今日日期篩選。');
 let stableSince=now();const deadline=now()+15000;
 while(now()-stableSince<2500){
  if(now()>deadline)throw new LocalFault('LIST_CHANGED','列表持續改變，請待載入完成後再試。');
  await pause(250);const next=await agent({cmd:'scope'});
  if(!next||!Array.isArray(next.tickets))throw new LocalFault('PAGE_CHANGED','未能確認當日列表。');
  if(JSON.stringify(next)!==JSON.stringify(scope)){scope=next;stableSince=now();}
 }
 if(scope.date!==today)throw new LocalFault('DATE','列表日期並非香港時間今日，已停止。請選擇今日開單日期。');
 if(!scope.tickets.length)throw new LocalFault('NO_LIST','未讀到可核對的訂單，今次未宣告零副。請確認列表已載入。');
 if(scope.tickets.some((t:string)=>!t)||new Set(scope.tickets).size!==scope.tickets.length)throw new LocalFault('PAGE_CHANGED','列表編號未能唯一辨識。');
 fingerprint=JSON.stringify(scope);
 const assertScope=async()=>{check();if(date()!==today||JSON.stringify(await agent({cmd:'scope'}))!==fingerprint)throw new LocalFault('LIST_CHANGED','日期、分店或列表已改變，已停止。請重新掃描。');};
 const verified:RecordItem[]=[];
 const snapshot=(complete=false,pending:LocalResult['pending']=[],live=true):LocalResult=>{
  let confirmedTotal:number|null=null,frameError:string|undefined,lensError:string|undefined;
  let lenses:ReturnType<typeof countLenses>;
  try{confirmedTotal=countRecords(verified);}catch(e){frameError=e instanceof Error?e.message:'鏡框資料需要核對。';}
  try{lenses=countLenses(verified);}catch(e){lensError=e instanceof Error?e.message:'鏡片資料需要核對。';lenses={counts:{'3K':0,'變色':0,'DAS':0,'其他':0,'PAL':0,'蔡司':0},confirmedPairs:0,paidPairs:0,unknown:[],complete:false};}
  return{shop:scope.shop,date:today,groups:scope.tickets.length,lines:verified.length,complete:complete&&!frameError,confirmedTotal,lenses,pending,skipped:verified.filter(r=>r.excluded).length,durationSeconds:Math.ceil((now()-started)/1000),frameError,lensError,live};
 };
 const commit=async(record:RecordItem,ticket:string,line:string,expected:string[])=>{
  await assertScope();
  verified.push({...record,position:{ticket,group:scope.tickets.indexOf(ticket)+1,line:expected.indexOf(line)+1}});
  io.snapshot?.(snapshot());return record;
 };
 const reset=async(ticket:string)=>{
  await agent({cmd:'group',ticket});await pause(230);await agent({cmd:'expand',ticket});
  return until({cmd:'lines',ticket},v=>v?.blank&&v.lines?.length,'眼鏡列表載入逾時。');
 };
 const scanned=await scanRows(scope.tickets,{
  assertScope,check,progress,
  listLines:async ticket=>(await reset(ticket)).lines,
  readRow:async(ticket,line,expected)=>{
   const state=await agent({cmd:'rowState',ticket,line});
   if(JSON.stringify(state?.lines)!==JSON.stringify(expected))throw new LocalFault('LIST_CHANGED','眼鏡列表已改變，請重新掃描。');
   if(state?.excluded)return commit(state,ticket,line,expected);
   const current=await reset(ticket);
   if(JSON.stringify(current.lines)!==JSON.stringify(expected))throw new LocalFault('LIST_CHANGED','眼鏡列表已改變，請重新掃描。');
   const kind=await agent({cmd:'select',ticket,line});if(kind?.excluded)return commit(kind,ticket,line,expected);
   const identity=`${ticket}/${line}`;
   await until({cmd:'detail'},v=>v?.identity===identity&&v.detail,'眼鏡明細載入逾時。');
   await pause(400);const d=await agent({cmd:'detail'});
   if(d?.identity!==identity||!d.detail)throw new LocalFault('PAGE_TIMEOUT','眼鏡明細未能穩定載入。');
   return commit({...d.detail,...kind},ticket,line,expected);
  }
 });
 await assertScope();
 return snapshot(scanned.complete,scanned.pending,false);
}
