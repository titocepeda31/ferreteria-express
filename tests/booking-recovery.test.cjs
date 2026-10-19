// SIMULATED: actual page functions with in-memory DOM, storage and HTTP.
// No database access. Run against the base via TITO_QA_SOURCE to verify regression.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(process.env.TITO_QA_SOURCE||require('node:path').join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const submit=between('      async function submitStayRequest(){','      $("quickSearch").addEventListener');
const helpers=source.includes('function bookingDraftExtras()')?between('      function bookingDraftExtras()','      let bookingRequestSubmitting='):'';
const render=between("          if(!hasStay){$('bookingShareFromQuote')","          $('quoteSend').removeAttribute(\"href\");");
function setup(){
 const elements=new Map(),calls=[];
 const $=id=>{if(!elements.has(id)){
  const classes=new Set(id==='bookingReceipt'?['hidden']:[]),attrs={};
  elements.set(id,{value:'',disabled:false,textContent:'',innerHTML:'',attrs,
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
   setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k]});
 }return elements.get(id);};
 $('bookingCustomerName').value='QA LOCAL';$('bookingCustomerPhone').value='+56900000000';
 const env={$,AbortSignal,crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},
  stayDraft:{productId:'cabin',start:'2027-06-14',end:'2027-06-16',guests:3},products:[{id:'cabin',analyticsId:'cabin'}],quote:{},
  savedBookingRetry:null,bookingRequestSubmitting:false,bookingRequestRegisteredFingerprint:'',bookingPendingFingerprint:'',bookingPendingKey:'',
  requestRetryFingerprint:(...args)=>JSON.stringify(args),persistBookingRetry:r=>env.savedBookingRetry=r,
  SUPABASE_URL:'https://local.invalid',SUPABASE_HEADERS:{},esc:String,
  fetch:async(url,init)=>{calls.push({type:'write',body:JSON.parse(init.body)});return {ok:true,json:async()=> 'qa-id'};},
  fetchPersistedBookingReceipt:async(id,key)=>{calls.push({type:'read',id,key});throw Error('simulated read error');},
  showPersistedBookingReceipt:receipt=>{$('bookingReceipt').classList.remove('hidden');$('bookingReceipt').textContent='Comprobante registrado';$('quoteSend').disabled=true;$('quoteSend').textContent='Solicitud registrada';}};
 vm.createContext(env);vm.runInContext(helpers+submit+';this.renderAction=()=>{const hasStay=!!stayDraft;const lines=[];'+render+'};',env);
 return {env,$,calls,register:()=>env.submitStayRequest(),render:()=>env.renderAction()};
}
test('SIMULATED: registered write + failed receipt exposes read-only retry, survives reopening',async()=>{
 const t=setup();await t.register();t.$('bookingReceipt').textContent='Comprobante pendiente de consulta';t.render();
 assert.equal(t.$('quoteSend').disabled,false);assert.equal(t.$('quoteSend').textContent,'Recuperar comprobante');
 await t.register();assert.equal(t.calls.filter(x=>x.type==='write').length,1);assert.equal(t.calls.filter(x=>x.type==='read').length,2);
});
test('SIMULATED: reload with blank contact recovers same ID/key and performs zero writes',async()=>{
 const t=setup();await t.register();const saved=t.env.savedBookingRetry;t.calls.length=0;
 t.env.bookingRequestRegisteredFingerprint='';t.$('bookingReceipt').classList.add('hidden');
 t.$('bookingCustomerName').value='';t.$('bookingCustomerPhone').value='';t.render();
 assert.equal(t.$('quoteSend').textContent,'Recuperar comprobante');await t.register();
 assert.deepEqual(t.calls,[{type:'read',id:saved.id,key:saved.key}]);
});
test('SIMULATED: recovery uses original contact, never edited contact, no new request',async()=>{
 const t=setup();await t.register();t.calls.length=0;t.$('bookingCustomerName').value='DIFFERENT';
 let contact;t.env.fetchPersistedBookingReceipt=async()=>({id:'qa-id'});t.env.showPersistedBookingReceipt=(r,c)=>contact=c;
 await t.register();assert.equal(contact.name,'QA LOCAL');assert.equal(t.calls.length,0);
});
test('SIMULATED: concurrent clicks and render during recovery yield one read; success remains disabled',async()=>{
 const t=setup();await t.register();t.calls.length=0;t.$('bookingReceipt').textContent='Comprobante pendiente de consulta';
 let resolve;t.env.fetchPersistedBookingReceipt=(id,key)=>{t.calls.push({type:'read',id,key});return new Promise(r=>resolve=r);};
 const first=t.register();t.render();assert.equal(t.$('quoteSend').disabled,true);await t.register();assert.equal(t.calls.length,1);
 resolve({id:'qa-id'});await first;assert.equal(t.$('quoteSend').disabled,true);assert.equal(t.$('quoteSend').attrs['aria-disabled'],'true');
 t.render();assert.equal(t.$('quoteSend').textContent,'Solicitud registrada');assert.equal(t.$('quoteSend').disabled,true);
});
test('SIMULATED: repeated read failures preserve saved ID/key and allow retry',async()=>{
 const t=setup();await t.register();const saved=JSON.stringify(t.env.savedBookingRetry);await t.register();await t.register();
 assert.equal(JSON.stringify(t.env.savedBookingRetry),saved);assert.equal(t.$('quoteSend').disabled,false);assert.equal(t.calls.filter(x=>x.type==='write').length,1);
});
test('SIMULATED: unknown write result preserves idempotency key',async()=>{
 const t=setup();t.env.fetch=async(u,i)=>{t.calls.push(JSON.parse(i.body));throw Error('simulated timeout');};
 await t.register();await t.register();assert.equal(t.calls.length,2);assert.equal(t.calls[0].p_idempotency_key,t.calls[1].p_idempotency_key);
 assert.equal(t.$('quoteSend').disabled,false);
});
test('SIMULATED: changing stay or extras does not recover unrelated receipt or leave button disabled',async()=>{
 for(const change of [t=>t.env.stayDraft={...t.env.stayDraft,start:'2027-07-14'},t=>{t.env.products.push({id:'extra',analyticsId:'extra',catalogSection:'adicional'});t.env.quote={extra:2};}]){
  const t=setup();await t.register();change(t);t.$('quoteSend').disabled=true;t.render();
  assert.equal(t.$('quoteSend').textContent,'Registrar solicitud pendiente');assert.equal(t.$('quoteSend').disabled,false);
 }
});
test('SIMULATED: malformed saved fingerprint does not authorize receipt recovery',async()=>{
 const t=setup();t.env.savedBookingRetry={status:'registered',id:'bad',key:'bad',fingerprint:'{' };t.render();
 assert.equal(t.$('quoteSend').textContent,'Registrar solicitud pendiente');
});
