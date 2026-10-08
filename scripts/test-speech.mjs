import {spawnSync} from 'node:child_process';
const command=process.platform==='win32'?'py':'python3';
const args=[...(process.platform==='win32'?['-3.11']:[]),'services/speech/test_server.py'];
const result=spawnSync(command,args,{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
