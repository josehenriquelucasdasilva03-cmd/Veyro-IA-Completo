let tail=Promise.resolve();
export async function acquireGpu(){let release;const gate=new Promise(resolve=>release=resolve),previous=tail;tail=previous.then(()=>gate);await previous;return release;}
export async function withGpuLock(task){const release=await acquireGpu();try{return await task();}finally{release();}}
