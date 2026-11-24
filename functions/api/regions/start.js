const COUNTRIES = { NL: "Netherlands", US: "United States", DE: "Germany", SG: "Singapore", JP: "Japan" };
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*","access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type, authorization"}});}
function validPublicTarget(value){
 if(typeof value!=="string"||value.length>253)return false;
 const target=value.trim().toLowerCase();
 if(!target||target.includes("://")||target.includes("/")||target.includes("@")||/^(localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(target))return false;
 const m=target.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
 if(m){const [a,b,c,d]=m.slice(1).map(Number);if([a,b,c,d].some(n=>n>255))return false;
 if(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===0||b===2||b===168))||(a===198&&(b===18||b===19||b===51))||(a===203&&b===0&&c===113)||(a===255&&b===255&&c===255&&d===255))return false;return true;}
 return target.includes(".")&&target.split(".").every(label=>label.length>=1&&label.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
}
export async function onRequest({request,env}){
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type, authorization"}});
 if(request.method!=="POST")return json({ok:false,error:"Method not allowed"},405);
 if(!env.VPN_SUPER_API_KEY)return json({ok:false,error:"Configure VPN_SUPER_API_KEY in Cloudflare Pages Secrets."},503);
 if((request.headers.get("authorization")||"")!=="Bearer "+env.VPN_SUPER_API_KEY)return json({ok:false,error:"Unauthorized"},401);
 let body;try{body=await request.json();}catch{return json({ok:false,error:"Invalid JSON body"},400);}
 const target=typeof body.target==="string"?body.target.trim().toLowerCase():"",countries=Array.isArray(body.countries)?[...new Set(body.countries)]:[];
 if(!validPublicTarget(target))return json({ok:false,error:"Enter a public IPv4 address or hostname; URLs, private IPs and local hostnames are not allowed."},400);
 if(!countries.length||countries.length>5||countries.some(code=>!Object.hasOwn(COUNTRIES,code)))return json({ok:false,error:"Select between 1 and 5 supported countries.",supportedCountries:Object.keys(COUNTRIES)},400);
 const outcomes=await Promise.all(countries.map(async code=>{
  try{
   const upstream=await fetch("https://api.globalping.io/v1/measurements",{method:"POST",headers:{"content-type":"application/json","accept":"application/json","user-agent":"VPN-Super-Assistant/1.0"},body:JSON.stringify({type:"ping",target,locations:[{country:code}],limit:3,measurementOptions:{packets:3}})});
   const data=await upstream.json().catch(()=>({}));
   if(!upstream.ok||!data.id)return {failure:{country:code,name:COUNTRIES[code],status:upstream.status,error:data.error?.message||data.error||data.message||"Globalping rejected the measurement"}};
   return {created:{country:code,name:COUNTRIES[code],measurementId:String(data.id)}};
  }catch{return {failure:{country:code,name:COUNTRIES[code],error:"Globalping request failed"}};}
 }));
 const created=outcomes.filter(x=>x.created).map(x=>x.created),failures=outcomes.filter(x=>x.failure).map(x=>x.failure);
 return json({ok:created.length>0,target,created,failures,note:"Uses Globalping public distributed probes. No provider API key is required; the public API is rate-limited and probe availability varies by region."},created.length?200:502);
}