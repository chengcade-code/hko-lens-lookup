import type {RecordItem} from './counting';
export type PendingItem={ticket:string;group:number;line:number|null;attempts:number;reason:string};
type IO={
  listLines:(ticket:string)=>Promise<string[]>;
  readRow:(ticket:string,line:string,expected:string[])=>Promise<RecordItem>;
  assertScope:()=>Promise<void>;
  check:()=>void;
  progress:(message:string)=>void;
};
// Only a page-load timeout is recoverable. Authentication, scope changes,
// cancellation, browser disconnection and the run deadline always stop the run.
export async function scanRows(tickets:string[],io:IO){
  const records:RecordItem[]=[];
  const pending:PendingItem[]=[];
  type Task={ticket:string;group:number;line:number|null;run:()=>Promise<void>;attempts:number};
  const deferred:Task[]=[];
  async function attempt(task:Task,limit:number){
    for(let n=0;n<limit;n++){
      io.check();await io.assertScope();task.attempts++;
      try{await task.run();await io.assertScope();return true;}
      catch(error){
        if((error as {code?:string})?.code!=='PAGE_TIMEOUT')throw error;
        // A timeout must not hide an expired login or a changed list.
        await io.assertScope();
        io.progress(`第 ${task.group} 組${task.line===null?'':`第 ${task.line} 副`}載入逾時，${n+1<limit?'正在重試…':'先繼續核對其餘紀錄…'}`);
      }
    }
    return false;
  }
  async function visitGroup(ticket:string,index:number,allowDefer:boolean){
    const lines=await io.listLines(ticket);
    if(!lines.length||lines.some(l=>!l)||new Set(lines).size!==lines.length)throw Error('眼鏡列表編號不完整。');
    for(let j=0;j<lines.length;j++){
      const task:Task={ticket,group:index+1,line:j+1,attempts:0,run:async()=>{
        io.progress(`正在核對第 ${index+1}／${tickets.length} 組，第 ${j+1}／${lines.length} 副…`);
        const record=await io.readRow(ticket,lines[j],lines);
        records.push({...record,position:{ticket,group:index+1,line:j+1}});
      }};
      if(!await attempt(task,allowDefer?2:1)){
        if(allowDefer)deferred.push(task);
        else pending.push({ticket:task.ticket,group:task.group,line:task.line,attempts:task.attempts,reason:'眼鏡明細載入逾時'});
      }
    }
  }
  for(let i=0;i<tickets.length;i++){
    const task:Task={ticket:tickets[i],group:i+1,line:null,attempts:0,run:()=>visitGroup(tickets[i],i,true)};
    // readRow timeouts are handled inside visitGroup, so this retries only
    // a group whose initial list never loaded; verified rows are not repeated.
    if(!await attempt(task,2))deferred.push({...task,run:()=>visitGroup(tickets[i],i,false)});
  }
  for(const task of deferred){
    io.progress(`其餘紀錄已掃描，正在補試第 ${task.group} 組${task.line===null?'':`第 ${task.line} 副`}…`);
    if(!await attempt(task,1))pending.push({ticket:task.ticket,group:task.group,line:task.line,attempts:task.attempts,reason:task.line===null?'眼鏡列表載入逾時':'眼鏡明細載入逾時'});
  }
  io.check();await io.assertScope();
  return{records,pending,lines:records.length,complete:pending.length===0};
}
