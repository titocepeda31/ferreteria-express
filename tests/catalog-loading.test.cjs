const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const gate=html.slice(html.indexOf('      function catalogReady()'),html.indexOf('\n\n\n    </script>',html.indexOf('      function catalogReady()')));
function boot(){
 const nodes={catalogLoading:{hidden:false},catalogLoadMessage:{textContent:'Cargando catálogo…'},catalogRetry:{hidden:true,addEventListener(type,fn){this.retry=fn;}}};
 let resolve,reject,clearance=0,reloads=0;const pending=new Promise((a,b)=>{resolve=a;reject=b;});
 const document={documentElement:{dataset:{catalogState:'loading'}},body:{setAttribute(k,v){this[k]=v;}},title:'Cargando catálogo…'};
 vm.runInNewContext(gate,{document,$:id=>nodes[id],init:()=>pending,syncCatalogClearance:()=>clearance++,setTimeout:()=>1,clearTimeout:()=>{},console:{error(){}},location:{reload(){reloads++;}}});
 return {nodes,document,resolve,reject,get clearance(){return clearance;},get reloads(){return reloads;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('first paint hides the whole uninitialized catalog and keeps an accessible loading state',()=>{
 assert.match(html,/<html lang="es" data-catalog-state="loading">/);
 assert.match(html,/html:not\(\[data-catalog-state="ready"\]\) body >.*display:none!important/);
 assert.match(html,/id="catalogLoadMessage" role="status" aria-live="polite"/);
 const app=boot();assert.equal(app.document.documentElement.dataset.catalogState,'loading');assert.equal(app.nodes.catalogLoading.hidden,false);assert.equal(app.clearance,0);
});
test('catalog becomes visible only after initialization, including appearance, completes',async()=>{
 const app=boot();app.resolve();await tick();assert.equal(app.document.documentElement.dataset.catalogState,'ready');assert.equal(app.document.body['aria-busy'],'false');assert.equal(app.nodes.catalogLoading.hidden,true);assert.equal(app.clearance,1);
});
test('failed initialization keeps demo hidden and offers a working retry',async()=>{
 const app=boot();app.reject(new Error('offline'));await tick();assert.equal(app.document.documentElement.dataset.catalogState,'error');assert.equal(app.nodes.catalogLoading.hidden,false);assert.equal(app.nodes.catalogRetry.hidden,false);assert.match(app.nodes.catalogLoadMessage.textContent,/No pudimos cargar/);app.nodes.catalogRetry.retry();assert.equal(app.reloads,1);
});
test('unavailable requested shops do not fall back to another store',async()=>{
 const source=html.slice(html.indexOf('      async function init()'),html.indexOf('        if (new URLSearchParams(location.search).get("preview") === "1")'))+'\n}';
 for(const load of [async()=>false,async()=>{throw new Error('offline');}]){
  const scope={fetch:async()=>({ok:true,json:async()=>({nombre:'Demo'})}),loadRemoteCatalog:load,URLSearchParams,location:{search:'?catalogo=real-shop'},console};
  vm.runInNewContext(source+';this.run=init;',scope);await assert.rejects(scope.run());
 }
});
test('public inline scripts parse after bootstrap changes',()=>{
 for(const [,code]of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))if(code.trim())new vm.Script(code);
});

