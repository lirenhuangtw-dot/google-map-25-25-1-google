import fs from 'node:fs/promises';
import vm from 'node:vm';
const key = process.env.GOOGLE_MAPS_API_KEY;
if (!key) throw new Error('GOOGLE_MAPS_API_KEY required');
const files = ['restaurant-data.js','restaurant-extra-near.js','restaurant-more-local.js','restaurant-google-places.js','restaurant-bars.js','restaurant-taipei-google.js','restaurant-threads.js'];
const records = [];
for (const file of files) {
  const src = await fs.readFile(file,'utf8');
  const variable = src.match(/const\s+(\w+)\s*=/)[1];
  records.push(...vm.runInNewContext(src+`;${variable}`));
}
const gourmet = await fs.readFile('restaurant-gourmet.js','utf8');
const all = vm.runInNewContext(gourmet+';applyGourmetRecommendations(items)',{items:records});
const audit = vm.runInNewContext(await fs.readFile('place-audit.js','utf8')+';placeAudit');
const normalize = s => String(s).normalize('NFKC').toLowerCase().replace(/臺/g,'台').replace(/[\s\p{P}\p{S}]/gu,'');
const report = {attemptedAt:new Date().toISOString(),updated:[],unresolved:[],errors:[],stopped:false};
const unique = [...new Map(all.map(p=>[p.destination,p])).values()];
for (const p of unique) {
  const old = audit.updates[p.destination];
  const detail = Boolean(old?.placeId || p.placeId);
  const mask = 'id,displayName,formattedAddress,googleMapsUri,businessStatus,location,rating,userRatingCount';
  const url = detail ? `https://places.googleapis.com/v1/places/${old?.placeId || p.placeId}?languageCode=zh-TW` : 'https://places.googleapis.com/v1/places:searchText';
  try {
    const response = await fetch(url,{method:detail?'GET':'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':detail?mask:mask.split(',').map(f=>'places.'+f).join(',')},...(detail?{}:{body:JSON.stringify({textQuery:p.destination,languageCode:'zh-TW',regionCode:'TW',pageSize:3})})});
    if (!response.ok) {
      const error = await response.json();
      report.errors.push({name:p.name,status:response.status,code:error.error?.status,reason:error.error?.details?.find(d=>d.reason)?.reason});
      if ([401,403,429].includes(response.status)) {report.stopped=true;break;}
      continue;
    }
    const data = await response.json();
    const match = detail ? data : data.places?.find(q=>normalize(q.displayName.text)===normalize(p.name) && q.formattedAddress?.match(/臺北|台北/));
    if (!match) {report.unresolved.push(p.name);continue;}
    audit.updates[p.destination]={name:p.name,destination:p.destination,placeId:match.id,mapUrl:match.googleMapsUri,status:match.businessStatus,rating:match.rating,reviewCount:match.userRatingCount,location:match.location,checkedAt:new Date().toISOString()};
    report.updated.push(p.name);
  } catch (error) {report.errors.push({name:p.name,code:'NETWORK_ERROR'});report.stopped=true;break;}
  if (report.updated.length%50===0) console.log(`Updated ${report.updated.length}/${unique.length}`);
}
if (report.updated.length) await fs.writeFile('place-audit.js',`const placeAudit = ${JSON.stringify(audit,null,2)};\n`);
await fs.writeFile('restaurant-refresh-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,updated:report.updated.length,unresolved:report.unresolved.length,total:unique.length},null,2));
