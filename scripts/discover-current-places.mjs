import fs from 'node:fs/promises';
const key = process.env.GOOGLE_MAPS_API_KEY;
if (!key) throw new Error('GOOGLE_MAPS_API_KEY required');
const queries = ['朝炭 Asasumi 台北','久時拌麵 台北','如嫦 港式雞煲 台北','台北 新開 親子館','台北 幼兒 室內遊戲場','台北 特色公園 幼兒'];
const results = [];
for (const textQuery of queries) {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method:'POST', headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,
    'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.rating,places.userRatingCount,places.businessStatus'},
    body:JSON.stringify({textQuery,languageCode:'zh-TW',regionCode:'TW',pageSize:5})
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  results.push({query:textQuery,...await response.json()});
}
await fs.writeFile('discovery-report.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
console.log(results.map(r=>({query:r.query,places:r.places?.map(p=>({name:p.displayName.text,rating:p.rating,status:p.businessStatus}))})));
