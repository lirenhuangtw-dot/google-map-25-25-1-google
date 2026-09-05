import fs from 'node:fs/promises';
import vm from 'node:vm';

const key = process.env.GOOGLE_MAPS_API_KEY;
if (!key) throw new Error('GOOGLE_MAPS_API_KEY required');
const files = ['restaurant-data.js','restaurant-extra-near.js','restaurant-more-local.js','restaurant-google-places.js','restaurant-bars.js','restaurant-taipei-google.js','restaurant-threads.js','official-near-parks.js','google-baby-places.js','baby-taipei-google.js','baby-user-recommended.js'];
const records = [];
for (const file of files) {
  const src = await fs.readFile(file, 'utf8');
  const variable = src.match(/const\s+(\w+)\s*=/)[1];
  records.push(...vm.runInNewContext(src + `;${variable}`).map(p => ({...p, file})));
}
const base = await fs.readFile('script.js','utf8');
records.push(...vm.runInNewContext(base.slice(0,base.indexOf('const allSpotsRaw'))+';spots').map(p=>({...p,file:'script.js'})));
const unique = [...new Map(records.map(p=>[p.destination,p])).values()];
const normalized = s => String(s).normalize('NFKC').toLowerCase().replace(/臺/g,'台').replace(/[\s\p{P}\p{S}]/gu,'');
const cid = s => { try { return new URL(s).searchParams.get('cid'); } catch { return null; } };
const report = {checkedAt:new Date().toISOString(), matched:[], closed:[], unresolved:[], errors:[]};
let cursor=0;
async function worker(){
  while(cursor<unique.length){
    const p=unique[cursor++];
    try {
      const response=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.businessStatus,places.location,places.rating,places.userRatingCount'},body:JSON.stringify({textQuery:p.destination,languageCode:'zh-TW',regionCode:'TW',pageSize:3})});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const match=(data.places||[]).find(q=>cid(p.mapUrl)&&cid(p.mapUrl)===cid(q.googleMapsUri)) || (data.places||[]).find(q=>normalized(q.displayName.text)===normalized(p.name));
      if(!match){report.unresolved.push({name:p.name,destination:p.destination,file:p.file,candidates:(data.places||[]).map(q=>({name:q.displayName.text,address:q.formattedAddress}))});continue;}
      const item={name:p.name,destination:p.destination,placeId:match.id,mapUrl:match.googleMapsUri,status:match.businessStatus,rating:match.rating,reviewCount:match.userRatingCount,location:match.location};
      (match.businessStatus==='CLOSED_PERMANENTLY'?report.closed:report.matched).push(item);
    }catch(e){report.errors.push({name:p.name,error:e.message});}
    if((report.matched.length+report.closed.length+report.unresolved.length+report.errors.length)%100===0) console.log(`Processed ${cursor}/${unique.length}`);
  }
}
await Promise.all(Array.from({length:4},worker));
await fs.writeFile('place-audit-report.json',JSON.stringify(report,null,2)+'\n');
const updates=Object.fromEntries([...report.matched,...report.closed].map(p=>[p.destination,p]));
await fs.writeFile('place-audit.js',`const placeAudit = ${JSON.stringify({checkedAt:report.checkedAt,updates},null,2)};\n`);
console.log(JSON.stringify({total:unique.length,matched:report.matched.length,closed:report.closed,unresolved:report.unresolved.length,errors:report.errors.length},null,2));
