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

function integration(){
 const t=setup();
 const storage=new Map();
 Object.assign(t.env,{
  BOOKING_RETRY_KEY:'qa-only',
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  formatCLP:n=>'$'+n,formatQuoteQty:String,
  bookingShareLink:text=>{t.env.preparedMessage=text;return 'https://wa.me/56900000000?text='+encodeURIComponent(text);},
  window:{open:()=>{throw Error('No WhatsApp permitted in this simulated test');}}
 });
 vm.runInContext(
  between('      function persistBookingRetry(', '      function requestRetryFingerprint(')+
  between('      async function fetchPersistedBookingReceipt(', '      async function submitStayRequest('),t.env
 );
 return {...t,storage};
}
const receipt={id:'qa-id',status:'pendiente',product_name:'Cabana QA',start_date:'2027-06-14',end_date:'2027-06-16',guests:3,nightly_price:69000,estimated_total:146000,extras:[{name:'Carbon',quantity:2,unit:'kg',unit_price:3000},{name:'Hielo',quantity:2,unit:'unidad',unit_price:1000}]};
test('INTEGRATION SIMULATED: actual storage, receipt parser and rendering recover after reload without another write',async()=>{
 const t=integration(),requests=[];
 t.env.fetch=async(url,init)=>{requests.push({url,body:JSON.parse(init.body)});if(url.endsWith('booking_public_request_v2'))return {ok:true,json:async()=> 'qa-id'};throw Error('read connection failed');};
 await t.register();
 const stored=JSON.parse(t.storage.get('qa-only'));
 assert.equal(stored.status,'registered');assert.equal(stored.id,'qa-id');
 t.env.savedBookingRetry=JSON.parse(t.storage.get('qa-only'));
 t.env.bookingRequestRegisteredFingerprint='';t.env.bookingPendingKey=null;t.env.bookingPendingFingerprint='';
 t.$('bookingCustomerName').value='';t.$('bookingCustomerPhone').value='';
 t.env.fetch=async(url,init)=>{requests.push({url,body:JSON.parse(init.body)});return {ok:true,json:async()=>receipt};};
 await t.register();
 assert.equal(requests.filter(x=>x.url.endsWith('booking_public_request_v2')).length,1);
 const reads=requests.filter(x=>x.url.endsWith('booking_public_receipt'));
 assert.equal(reads.length,2);assert.equal(reads[1].body.p_request,stored.id);assert.equal(reads[1].body.p_idempotency_key,stored.key);
 assert.ok(t.$('bookingReceipt').innerHTML.includes('146000'));assert.ok(t.$('bookingReceipt').innerHTML.includes('no acredita un pago'));
 assert.ok(t.$('bookingReceipt').innerHTML.includes('Pendiente de confirmación'));
 assert.equal(t.$('quoteSend').disabled,true);
});
test('INTEGRATION SIMULATED: unknown write result and reload retry reuse stored key',async()=>{
 const t=integration(),keys=[];
 t.env.fetch=async(url,init)=>{keys.push(JSON.parse(init.body).p_idempotency_key);throw Error('lost response');};
 await t.register();t.env.bookingPendingKey=null;t.env.bookingPendingFingerprint='';
 t.env.savedBookingRetry=JSON.parse(t.storage.get('qa-only'));await t.register();
 assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
 // This proves key reuse, not database idempotency or actual network loss.
});
test('INTEGRATION SIMULATED: wrong receipt ID is rejected without presenting a receipt',async()=>{
 const t=integration();t.env.fetch=async()=>({ok:true,json:async()=>({...receipt,id:'wrong-id'})});
 await assert.rejects(t.env.fetchPersistedBookingReceipt('qa-id','qa-key'),/autorizado/);
 assert.equal(t.$('bookingReceipt').classList.contains('hidden'),true);
});
test('INTEGRATION SIMULATED: prepared message uses persisted total and original contact after edits',async()=>{
 const t=integration();t.env.fetch=async(url)=>({ok:true,json:async()=>url.endsWith('booking_public_request_v2')?'qa-id':receipt});
 await t.register();t.$('bookingCustomerName').value='Changed contact';
 await t.register();
 const text=t.$('bookingReceipt').innerHTML;
 assert.ok(text.includes('146000'));assert.ok(text.includes('QA LOCAL'));assert.ok(!text.includes('Changed contact'));
 assert.equal(t.$('bookingShareFromQuote').textContent,'Preparar WhatsApp con comprobante');
 assert.ok(t.env.preparedMessage.includes('146000'));assert.ok(t.env.preparedMessage.includes('QA LOCAL'));assert.ok(!t.env.preparedMessage.includes('Changed contact'));assert.ok(t.env.preparedMessage.includes('no acredita un pago')); 
 // No browser or WhatsApp is opened.
});
