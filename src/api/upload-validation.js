import {assert} from '../core/domain.js';

function equal(a,b,offset=0){return b.every((byte,i)=>a[offset+i]===byte);}
function ascii(bytes,start,count){return String.fromCharCode(...bytes.slice(start,start+count));}

// Declared MIME is client-controlled. Reject polyglot/mismatched signatures before R2 storage.
export function matchesUploadSignature(mime,bytes){
  if(mime==='image/png')return bytes.length>=8&&equal(bytes,[137,80,78,71,13,10,26,10]);
  if(mime==='image/jpeg')return bytes.length>=4&&equal(bytes,[255,216,255]);
  if(mime==='image/gif')return bytes.length>=6&&['GIF87a','GIF89a'].includes(ascii(bytes,0,6));
  if(mime==='image/webp')return bytes.length>=12&&ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,4)==='WEBP';
  if(mime==='video/webm')return bytes.length>=12&&equal(bytes,[26,69,223,163])&&ascii(bytes,0,Math.min(bytes.length,512)).includes('webm');
  if(mime==='video/mp4')return bytes.length>=12&&ascii(bytes,4,4)==='ftyp'&&ascii(bytes,8,4)!=='qt  ';
  if(mime==='video/quicktime')return bytes.length>=12&&((ascii(bytes,4,4)==='ftyp'&&ascii(bytes,8,4)==='qt  ')||ascii(bytes,4,4)==='moov');
  return false;
}

export async function validateUploadSignature(file){
  const bytes=new Uint8Array(await file.slice(0,512).arrayBuffer());
  assert(matchesUploadSignature(file.type,bytes),'O conteúdo do arquivo não corresponde ao formato informado.',415);
}
