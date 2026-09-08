import fs from 'node:fs/promises';
import vm from 'node:vm';
const key = process.env.GOOGLE_MAPS_API_KEY;
if (!key) throw new Error('GOOGLE_MAPS_API_KEY required');
const audit = vm.runInNewContext(await fs.readFile('place-audit.js','utf8')+';placeAudit');
const sources = vm.runInNewContext(await fs.readFile('restaurant-gourmet.js','utf8')+';gourmetRecommendations');
const report = {checkedAt:new Date().toISOString(),places:{},errors:[]};
for (const name of [...new Set(sources.map(p=>p.name))]) {
  const place = Object.values(audit.updates).find(p=>p.name===name && p.status!=='CLOSED_PERMANENTLY');
  if (!place) continue;
  const response=await fetch(`https://places.googleapis.com/v1/places/${place.placeId}?languageCode=zh-TW`,{headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':'id,reviews,googleMapsUri'}});
  if (!response.ok) { report.errors.push({name,status:response.status}); if([401,403,429].includes(response.status)) break; continue; }
  const data=await response.json();
  const reviews=data.reviews || [];
  const normalize=text=>text.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
  const texts=reviews.map(r=>normalize(r.originalText?.text || r.text?.text || ''));
  const repeats=new Set(texts.filter((t,i)=>t.length>=20 && texts.indexOf(t)!==i));
  const short=texts.filter(t=>t.length<10).length;
  const repeated=texts.filter(t=>repeats.has(t)).length;
  const references=reviews.filter((r,i)=>texts[i].length<10 || repeats.has(texts[i])).map(r=>({url:r.googleMapsUri || data.googleMapsUri,author:r.authorAttribution?.displayName || 'Google Maps 使用者'}));
  report.places[place.placeId]={sampleCount:reviews.length,shortCount:short,repeatedCount:repeated,substantiveCount:texts.filter(t=>t.length>=10 && !repeats.has(t)).length,references};
}
await fs.writeFile('review-signals.js',`const reviewSignals = ${JSON.stringify(report,null,2)};\n`);
console.log(JSON.stringify({checked: Object.keys(report.places).length,errors:report.errors}));
