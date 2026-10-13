const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(__dirname+'/catalog-analytics.js','utf8'),context);
function setup({business='business-1',storage}={}){
  let time=1000,n=0;const requests=[];
  const values=new Map();
  const tracker=context.createCatalogAnalytics({url:'https://example.test',headers:{apikey:'public'},getBusinessId:()=>business,
    storage:storage||{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},now:()=>time,
    uuid:()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`,
    send:(url,options)=>{requests.push({url,options,events:JSON.parse(options.body)});return Promise.resolve({ok:true});}});
  return {tracker,requests,advance:ms=>time+=ms};
}
test('product detail emits one page view and one product view; consecutive duplicate routes do not count',()=>{
  const {tracker,requests}=setup();tracker.route('producto','product-uuid');tracker.route('producto','product-uuid');
  assert.equal(requests.length,1);assert.deepEqual(requests[0].events.map(e=>e.event_type),['page_view','product_view']);
  assert.equal(requests[0].events[1].product_id,'product-uuid');assert.equal(requests[0].options.keepalive,true);
});
test('new navigation counts, uses same session, then expires after inactivity',()=>{
  const {tracker,requests,advance}=setup();tracker.route('inicio');tracker.route('catalogo');
  assert.equal(requests[0].events[0].session_id,requests[1].events[0].session_id);
  advance(30*60*1000);tracker.route('catalogo');
  assert.notEqual(requests[1].events[0].session_id,requests[2].events[0].session_id);
});
test('WhatsApp double click is suppressed and quotation counts once without assigning every product',()=>{
  const {tracker,requests,advance}=setup();tracker.whatsapp('cotizacion');tracker.whatsapp('cotizacion');
  assert.equal(requests.length,1);assert.equal(requests[0].events[0].product_id,null);
  advance(1000);tracker.whatsapp('producto','product-uuid');assert.equal(requests.length,2);
});
test('no events for offline/demo fallback without a remote business',()=>{
  const {tracker,requests}=setup({business:null});tracker.route('inicio');tracker.whatsapp('inicio');assert.equal(requests.length,0);
});
test('storage restriction does not prevent navigation tracking',()=>{
  const {tracker,requests}=setup({storage:{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}}});
  tracker.route('inicio');tracker.route('catalogo');assert.equal(requests.length,2);
});
