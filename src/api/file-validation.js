// Identify known media formats from bytes rather than trusting client MIME values.
// This is not antivirus scanning or a full decoding/validation pass.
const ascii=(bytes,start,n)=>String.fromCharCode(...bytes.subarray(start,start+n));
const starts=(b,...pattern)=>pattern.every((v,i)=>b[i]===v);
export function validFileSignature(mime,bytes){
 if(!(bytes instanceof Uint8Array)||!bytes.length)return false;
 if(mime==='image/png')return bytes.length>=33&&starts(bytes,137,80,78,71,13,10,26,10)&&
  starts(bytes.subarray(8),0,0,0,13,73,72,68,82)&&new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(16)>0&&
  new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(20)>0;
 if(mime==='image/jpeg')return bytes.length>=6&&starts(bytes,255,216,255)&&bytes.at(-2)===255&&bytes.at(-1)===217;
 if(mime==='image/gif')return bytes.length>=14&&['GIF87a','GIF89a'].includes(ascii(bytes,0,6))&&
  (bytes[6]!==0||bytes[7]!==0)&&(bytes[8]!==0||bytes[9]!==0)&&bytes.at(-1)===59;
 if(mime==='image/webp')return bytes.length>=20&&ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,4)==='WEBP'&&
  ['VP8 ','VP8L','VP8X'].includes(ascii(bytes,12,4))&&
  new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(4,true)+8<=bytes.length;
 if(mime==='video/webm')return bytes.length>=16&&starts(bytes,26,69,223,163)&&bytes.includes(0x42);
 if(mime==='video/mp4'||mime==='video/quicktime'){
  if(bytes.length<16||ascii(bytes,4,4)!=='ftyp')return false;
  const brand=ascii(bytes,8,4);
  if(mime==='video/quicktime')return brand==='qt  ';
  return /^(?:isom|iso[2-9]|mp4[12]|M4V |M4A |avc1|dash|MSNV|3gp[0-9]|3g2[0-9])$/.test(brand);
 }
 return false;
}
