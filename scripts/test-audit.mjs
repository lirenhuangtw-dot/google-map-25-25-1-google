import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('place-audit.js','utf8')+fs.readFileSync('audit-overlay.js','utf8'),context);
const result = vm.runInContext(`(() => {
 const updates = Object.values(placeAudit.updates);
 const records = updates.map(p => ({name:p.name,destination:p.destination,tags:[],why:''}));
 const visible = applyPlaceAudit(records);
 return {visible:visible.length, closed:updates.filter(p=>p.status==='CLOSED_PERMANENTLY').length,
 total:records.length, invalid:visible.some(p=>!p.mapUrl || p.businessStatus==='CLOSED_PERMANENTLY')};
})()`,context);
assert.equal(result.visible + result.closed, result.total);
assert.equal(result.invalid,false);
assert.ok(result.closed > 0);
const restaurant = fs.readFileSync('restaurant.js','utf8');
const start = restaurant.indexOf('function restaurantMatchesFilters');
const end = restaurant.indexOf('function tagLabel',start);
vm.runInContext(`let selectedRestaurantFilters=new Set(['p1','p2','far']); const DISTANCE_ORDER={near:1,mid:2,far:3}; const SOURCE_FILTERS=new Set(['google','threads','online']); const CUISINE_FILTERS=new Set(['jp','tw']);`+restaurant.slice(start,end),context);
assert.equal(vm.runInContext(`restaurantMatchesFilters({distance:'near',tags:['p1']})`,context),true);
assert.equal(vm.runInContext(`restaurantMatchesFilters({distance:'near',tags:['p3']})`,context),false);
console.log('PASS: closure overlay, map URLs, price union, distance hierarchy');
