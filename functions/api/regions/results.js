const COUNTRIES={NL:"Netherlands",US:"United States",DE:"Germany",SG:"Singapore",JP:"Japan"};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*","access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"authorization"}});}
export async function onRequest({request,env}){
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"authorization"}});
 if(request.method!=="GET")return json({ok:false,error:"Method not allowed"},405);
 if(!env.VPN_SUPER_API_KEY)return json({ok:false,error:"Server setup required"},503);
 if((request.headers.get("authorization")||"")!=="Bearer "+env.VPN_SUPER_API_KEY)return json({ok:false,error:"Unauthorized"},401);
 const url=new URL(request.url),ids=(url.searchParams.get("ids")||"").split(",").filter(Boolean),countries=(url.searchParams.get("countries")||"").split(",");
 if(!ids.length||ids.length>5||ids.some(id=>!/^[a-zA-Z0-9_-]{4,80}$/.test(id))||countries.length!==ids.length||countries.some(c=>!Object.hasOwn(COUNTRIES,c)))return json({ok:false,error:"Provide matching measurement ids and country codes."},400);
 const results=await Promise.all(ids.map(async(id,index)=>{
  try{
   const response=await fetch("https://api.globalping.io/v1/measurements/"+encodeURIComponent(id),{headers:{"accept":"application/json","user-agent":"VPN-Super-Assistant/1.0"}});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)return {measurementId:id,country:countries[index],countryName:COUNTRIES[countries[index]],ready:false,error:"Globalping returned HTTP "+response.status};
   const entries=Array.isArray(data.results)?data.results:[],probes=entries.map((entry,i)=>{
    const stats=entry.result?.stats||entry.stats||{},avg=Number.isFinite(stats.avg)?stats.avg:(Number.isFinite(stats.average)?stats.average:null);
    return {probeId:entry.probe?.id||entry.probe?.network||String(i+1),city:entry.probe?.city||null,country:entry.probe?.country||null,averageRttMs:avg,packetLoss:Number.isFinite(stats.loss)?stats.loss:null,rawOutput:entry.result?.rawOutput||null};
   });
   const values=probes.map(p=>p.averageRttMs).filter(Number.isFinite);
   return {measurementId:id,country:countries[index],countryName:COUNTRIES[countries[index]],status:data.status||"unknown",ready:data.status!=="in-progress"&&entries.length>0,probeCount:entries.length,averageRttMs:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*100)/100:null,probes};
  }catch{return {measurementId:id,country:countries[index],countryName:COUNTRIES[countries[index]],ready:false,error:"Unable to retrieve Globalping results"};}
 }));
 return json({ok:true,checkedAt:new Date().toISOString(),results,note:"RTT is measured from Globalping volunteer probes to the target. It does not measure the user's iPhone VPN tunnel or a VPN provider's private nodes."});
}