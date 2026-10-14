let tail=Promise.resolve();
export async function acquireGpu(signal){
 signal?.throwIfAborted();
 let release;
 const gate=new Promise(resolve=>release=resolve),previous=tail;
 tail=previous.then(()=>gate);
 let abort;
 try{
  if(signal){
   const cancelled=new Promise((_,reject)=>{abort=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
   await Promise.race([previous,cancelled]);
   signal.throwIfAborted();
  }else await previous;
  return release;
 }catch(error){release();throw error;}
 finally{if(abort)signal.removeEventListener('abort',abort);}
}
export async function withGpuLock(task){const release=await acquireGpu();try{return await task();}finally{release();}}
