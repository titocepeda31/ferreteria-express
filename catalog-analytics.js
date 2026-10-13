/* Anonymous aggregate measurement: no names, messages, phone numbers or IPs stored here. */
function createCatalogAnalytics({url,headers,getBusinessId,storage=window.sessionStorage,send=window.fetch.bind(window),uuid=()=>crypto.randomUUID(),now=()=>Date.now()}) {
  let session=null,lastRoute='',lastClick=-Infinity;
  function sessionId(){
    const timestamp=now(),key='titolabs_metrics_v1:'+getBusinessId();
    if(!session){try{session=JSON.parse(storage.getItem(key));}catch{session=null;}}
    if(!session||! /^[0-9a-f-]{36}$/i.test(session.id||'')||!Number.isFinite(session.activity)||timestamp-session.activity>=30*60*1000){session={id:uuid(),activity:timestamp};lastRoute='';}
    session.activity=timestamp;
    try{storage.setItem(key,JSON.stringify(session));}catch{}
    return session.id;
  }
  function emit(events){
    const businessId=getBusinessId();
    if(!businessId)return;
    try{
      const id=sessionId();
      const body=JSON.stringify(events.map(e=>({...e,business_id:businessId,session_id:id})));
      Promise.resolve(send(url+'/rest/v1/catalog_events',{
        method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},body,keepalive:true
      })).catch(()=>{});
    }catch{}
  }
  return {
    route(page,productId=null){
      if(!getBusinessId())return;
      try{sessionId();}catch{return;}
      const key=page+':'+(productId||'');
      if(key===lastRoute)return;
      lastRoute=key;
      const events=[{event_type:'page_view',page,product_id:productId}];
      if(productId)events.push({event_type:'product_view',page:'producto',product_id:productId});
      emit(events);
    },
    whatsapp(page,productId=null){
      if(!getBusinessId()||now()-lastClick<1000)return;
      lastClick=now();
      emit([{event_type:'whatsapp_click',page,product_id:productId}]);
    }
  };
}
