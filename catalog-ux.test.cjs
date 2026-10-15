const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

function fixture() {
  const nodes = {};
  const document = {activeElement:null, body:{children:[], classList:classes()}};
  function classes(initial = []) {
    const set = new Set(initial);
    return {contains:x=>set.has(x), add:x=>set.add(x), remove:x=>set.delete(x),
      toggle:(x, enabled)=>enabled ? set.add(x) : set.delete(x)};
  }
  for (const id of ['quotePanel','quoteClose','quoteFab','quoteCount','quoteItems','quoteSummary','quoteSend','quoteClear','page']) {
    nodes[id] = {id, tagName:'DIV', inert:false, isConnected:true, classList:classes(id === 'quotePanel' ? ['hidden'] : []),
      focus(){document.activeElement=this;}, removeAttribute(key){delete this[key];}};
  }
  document.body.children = [nodes.page,nodes.quoteFab,nodes.quotePanel];
  nodes.page.inert = true; // Previously inert content must stay inert after closing.
  nodes.quoteFab.focus();
  const saved = new Map();
  const context = vm.createContext({document, localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
    $:id=>nodes[id], esc:s=>String(s), config:{whatsapp:'+56 9 1234 5678'},
    products:[{id:'timber',nombre:'Pino dimensionado 1 × 10, 3.20 mts'}, {id:'bulk',nombre:'Material',unidad:'kg'}]});
  const start = html.indexOf("      const QUOTE_KEY =");
  const end = html.indexOf("      document.addEventListener('click', e =>", start);
  vm.runInContext(html.slice(html.indexOf('      function parsePrice('), html.indexOf('      function uiIcon(')),context);
  vm.runInContext(html.slice(start,end),context);
  return {nodes,document,context,run:code=>vm.runInContext(code,context)};
}

test('Adding products preserves integer/decimal steps, count and quotation WhatsApp message',()=>{
  const f=fixture();
  f.run("addQuote('timber'); addQuote('timber'); addQuote('bulk');");
  assert.equal(f.run("quote.timber"),2);
  assert.equal(f.run("quote.bulk"),0.5);
  assert.equal(f.nodes.quoteCount.textContent,'2,5');
  const url=new URL(f.nodes.quoteSend.href);
  assert.equal(url.pathname,'/56912345678');
  assert.match(url.searchParams.get('text'),/Pino dimensionado 1 × 10, 3.20 mts\n2 · Precio por confirmar/);
  assert.match(url.searchParams.get('text'),/0,5 kg · Precio por confirmar/);
  assert.equal(f.nodes.quotePanel.classList.contains('hidden'),false);
});

test('Dialog locks background, closes and returns focus to the original opener',()=>{
  const f=fixture();
  f.run('openQuote()');
  assert.equal(f.nodes.quoteFab.inert,true);
  assert.equal(f.document.activeElement,f.nodes.quoteClose);
  f.run('openQuote(); closeQuote()'); // Reopening must not replace opener or inert snapshots.
  assert.equal(f.nodes.quoteFab.inert,false);
  assert.equal(f.nodes.page.inert,true);
  assert.equal(f.document.activeElement,f.nodes.quoteFab);
  assert.equal(f.document.body.classList.contains('quote-open'),false);
});

test('Empty quotation hides send/clear and removed or invalid products are not sent',()=>{
  const f=fixture();
  f.run("quote={missing:2,timber:-1,bulk:'invalid'}; renderQuote()");
  assert.equal(f.nodes.quoteCount.textContent,'0');
  assert.equal(f.nodes.quoteSend.classList.contains('hidden'),true);
  assert.equal(f.nodes.quoteClear.classList.contains('hidden'),true);
  assert.equal(f.nodes.quoteFab.classList.contains('is-empty'),true);
});

test('Quotation remains available while its empty/filled theme state follows visible items',()=>{
  const f=fixture();
  f.run('renderQuote()');
  assert.equal(f.nodes.quoteFab.classList.contains('is-empty'),true);
  f.run("addQuote('timber')");
  assert.equal(f.nodes.quoteFab.classList.contains('is-empty'),false);
  f.run('quote={};saveQuote()');
  assert.equal(f.nodes.quoteFab.classList.contains('is-empty'),true);
  assert.equal(f.nodes.quoteCount.textContent,'0');
  assert.equal(f.nodes.quoteFab.classList.contains('hidden'),false);
});

test('Quantity rerender restores focus on the same action',()=>{
  const f=fixture();
  const row={};
  const control={closest:()=>row,hasAttribute:()=>false,
    getAttribute:key=>({'data-quote-change':'timber','data-delta':'1'}[key])};
  const replacement={getAttribute:control.getAttribute,focus(){f.document.activeElement=this;}};
  f.nodes.quoteItems.children=[row];
  f.nodes.quoteItems.querySelectorAll=()=>[replacement];
  f.context.control=control;
  f.run('updateQuoteFromControl(control)');
  assert.equal(f.document.activeElement,replacement);
});

function setQuote(f, products, quote) {
  f.context.products = products;
  f.context.selection = quote;
  f.run('quote = selection; renderQuote()');
  return new URL(f.nodes.quoteSend.href).searchParams.get('text');
}

test('Known prices, sale prices and totals are identical on screen and WhatsApp',()=>{
  const f=fixture();
  const message=setQuote(f,[
    {id:'a',nombre:'Madera 1 x 10, 3.20 mts',precio:'$3.500'},
    {id:'b',nombre:'Oferta',precio:2500,precioRebajado:'2.000'}
  ],{a:2,b:3});
  assert.match(f.nodes.quoteItems.innerHTML,/\$3\.500/);
  assert.match(f.nodes.quoteItems.innerHTML,/\$7\.000/);
  assert.match(f.nodes.quoteItems.innerHTML,/\$2\.000/);
  assert.match(f.nodes.quoteItems.innerHTML,/\$6\.000/);
  assert.match(message,/Subtotal: \$13\.000/);
  assert.doesNotMatch(message,/Total referencial|Precio unitario|Unidades seleccionadas/);
  assert.match(message,/Oferta\n3 × \$2\.000 = \$6\.000/);
  const model=f.run("quoteEconomy([{p:products[0],qty:2},{p:products[1],qty:3}])");
  for(const [label,value] of model.rows) {
    assert.ok(f.nodes.quoteSummary.innerHTML.includes(value));
  }
  assert.match(f.nodes.quoteSummary.innerHTML,/<h3>Resumen<\/h3>/);
  assert.match(f.nodes.quoteSummary.innerHTML,/<dt>Unidades<\/dt>/);
  assert.match(f.nodes.quoteSummary.innerHTML,/<dt>Subtotal<\/dt><dd>\$13\.000<\/dd>/);
  assert.doesNotMatch(f.nodes.quoteSummary.innerHTML,/precios pendientes/);
});

test('Mixed prices show only a known subtotal, pending count and no total',()=>{
  const f=fixture();
  const message=setQuote(f,[{id:'a',nombre:'Con precio',precio:3500},{id:'b',nombre:'Sin precio',precio:null}],{a:2,b:4});
  assert.match(f.nodes.quoteItems.innerHTML,/<p class="quote-price-pending">Sin precio<\/p>/);
  assert.doesNotMatch(f.nodes.quoteItems.innerHTML,/Precio por confirmar/);
  assert.match(f.nodes.quoteSummary.innerHTML,/<dt>Subtotal conocido<\/dt><dd>\$7\.000<\/dd>/);
  assert.match(f.nodes.quoteSummary.innerHTML,/<dt>Sin precio<\/dt><dd>1<\/dd>/);
  assert.match(f.nodes.quoteSummary.innerHTML,/El negocio confirmará los precios pendientes/);
  assert.match(message,/Subtotal conocido: \$7\.000/);
  assert.match(message,/Pendiente de precio: 1 producto/); // Product lines, not four units.
  assert.match(message,/Sin precio\n4 · Precio por confirmar/);
  assert.doesNotMatch(message,/Total referencial|\$0/);
  assert.doesNotMatch(f.nodes.quoteSummary.innerHTML,/Total referencial/);
});

test('All prices missing or invalid stay unknown, rather than zero',()=>{
  const f=fixture();
  const values=[null,'',0,-5,'consultar',Infinity];
  const message=setQuote(f,values.map((precio,i)=>({id:String(i),nombre:'Producto '+i,precio})),Object.fromEntries(values.map((_,i)=>[String(i),1])));
  assert.doesNotMatch(message,/Subtotal:/);
  assert.match(message,/Pendiente de precio: 6 productos/);
  assert.doesNotMatch(message,/Total referencial|\$0/);
  assert.doesNotMatch(f.nodes.quoteItems.innerHTML,/\$/);
  assert.match(f.nodes.quoteSummary.innerHTML,/<dt>Subtotal conocido<\/dt><dd>—<\/dd>/);
  assert.doesNotMatch(f.nodes.quoteItems.innerHTML,/Precio por confirmar|<dl/);
});

test('Quantity changes, removal and empty state recalculate without a stale send URL',()=>{
  const f=fixture();
  setQuote(f,[{id:'a',nombre:'Material',precio:3500},{id:'b',nombre:'Pendiente'}],{a:1,b:1});
  f.run('quote.a=3; saveQuote()');
  assert.match(decodeURIComponent(f.nodes.quoteSend.href),/Subtotal conocido: \$10\.500/);
  f.run('delete quote.b; saveQuote()');
  assert.match(f.nodes.quoteSummary.innerHTML,/Total referencial/);
  assert.match(f.nodes.quoteSummary.innerHTML,/\$10\.500/);
  f.run('quote={}; saveQuote()');
  assert.equal(f.nodes.quoteSummary.innerHTML,'');
  assert.equal(f.nodes.quoteSummary.classList.contains('hidden'),true);
  assert.equal(f.nodes.quoteSend.href,undefined);
});

test('Decimal quantities use published whole CLP and sum displayed line subtotals',()=>{
  const f=fixture();
  const message=setQuote(f,[{id:'a',nombre:'Granel',unidad:'kg',precio:3500.5},{id:'b',nombre:'Otro',precio:'1.001'}],{a:0.5,b:0.5});
  assert.match(message,/0,5 kg × \$3\.501 = \$1\.751/);
  assert.match(message,/Subtotal: \$2\.252/);
  assert.match(f.nodes.quoteItems.innerHTML,/\$1\.751/);
});

test('From prices remain indicative and sale fallback matches the catalog',()=>{
  const f=fixture();
  assert.equal(f.run("publishedPrice({precio:3500,precioRebajado:4000})"),3500);
  assert.equal(f.run("publishedPrice({precio:null,precioRebajado:'2.000'})"),2000);
  const message=setQuote(f,[{id:'a',nombre:'Desde',precio:'3.500',precioDesde:true}],{a:2});
  assert.match(message,/2 × Desde \$3\.500 = Desde \$7\.000/);
  assert.match(message,/Subtotal: Desde \$7\.000/);
  assert.ok(message.endsWith('¿Me confirman disponibilidad y precio final?'));
  assert.match(f.nodes.quoteSummary.innerHTML,/<dt>Subtotal<\/dt><dd>Desde \$7\.000<\/dd>/);
});
