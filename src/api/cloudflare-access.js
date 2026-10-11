const encoder=new TextEncoder();
export async function cloudflareAccessUser(ctx){
 if(!ctx?.access||typeof ctx.access.getIdentity!=='function')return null;
 let identity;
 try{identity=await ctx.access.getIdentity();}catch{return null;}
 const email=typeof identity?.email==='string'?identity.email.trim().toLowerCase():'';
 if(!email||email.length>254||!email.includes('@'))return null;
 const digest=await crypto.subtle.digest('SHA-256',encoder.encode(email));
 return 'cf-'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

