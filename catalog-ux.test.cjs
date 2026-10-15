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
  for (const id of ['quotePanel','quoteClose','quoteFab','quoteCount','quoteItems','quoteSend','quoteClear','page']) {
    nodes[id] = {id, tagName:'DIV', inert:false, isConnected:true, classList:classes(id === 'quotePanel' ? ['hidden'] : []),
      focus(){document.activeElement=this;}};
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
  assert.match(url.searchParams.get('text'),/Pino dimensionado 1 × 10, 3.20 mts — Cantidad: 2/);
  assert.match(url.searchParams.get('text'),/Cantidad: 0,5 kg/);
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
