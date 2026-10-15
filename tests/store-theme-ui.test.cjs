const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../catalog-ux.css'), 'utf8');
const helpers = html.slice(html.indexOf('      function socialIcon('), html.indexOf('      function imagePlaceholder('));
const safeLink = html.slice(html.indexOf('        const safeLink ='), html.indexOf('        let info = []'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function render(config) {
  const nodes = {};
  for (const id of ['socialLinks','socialSection','footerContact','topwa','businessHours']) {
    nodes[id] = {states:{},classList:{toggle(name,enabled){nodes[id].states[name]=enabled;if(name==='hidden')nodes[id].hidden=enabled;}}, removeAttribute(name){delete this[name];}};
  }
  nodes.topwa.href = 'https://wa.me/' + String(config.whatsapp || '').replace(/\D/g,'');
  vm.runInNewContext(helpers + safeLink + '\nrenderStoreLinks(safeLink); renderBusinessHours();', {config, $:id=>nodes[id], esc:escape, URL});
  return nodes;
}

test('Hours preserve configured text verbatim and do not invent an illustrated schedule',()=>{
  const hours='Lunes: 09:30–13:00\nSábado: solo con reserva\n<Consultar cambios>';
  assert.equal(render({horarios:hours}).businessHours.textContent,hours);
  assert.equal(render({horarios:hours}).businessHours.states['is-fallback'],false);
  assert.equal(render({}).businessHours.textContent,'Consulta nuestros horarios por WhatsApp.');
  assert.equal(render({}).businessHours.states['is-fallback'],true);
});

test('Only configured valid socials are shown, with accessible names and icons',()=>{
  const nodes=render({instagram:'https://instagram.com/example',facebook:'javascript:alert(1)',tiktok:'#'});
  assert.equal(nodes.socialSection.hidden,false);
  assert.equal((nodes.socialLinks.innerHTML.match(/<a /g)||[]).length,1);
  assert.match(nodes.socialLinks.innerHTML,/<span>Instagram<\/span>/);
  assert.match(nodes.socialLinks.innerHTML,/aria-hidden="true"/);
  assert.doesNotMatch(nodes.socialLinks.innerHTML,/javascript:|TikTok|Facebook/);
});
test('No networks or contact leaves both sections hidden without a fabricated link',()=>{
  const nodes=render({});
  assert.equal(nodes.socialSection.hidden,true);
  assert.equal(nodes.socialLinks.innerHTML,'');
  assert.equal(nodes.footerContact.hidden,true);
  assert.equal(nodes.footerContact.href,undefined);
});
test('Footer reuses the current WhatsApp destination and existing phone/email fallbacks',()=>{
  const nodes=render({whatsapp:'+56 9 1234 5678'});
  assert.equal(nodes.footerContact.href,nodes.topwa.href);
  assert.equal(render({telefono:'+56 71 123 456'}).footerContact.href,'tel:+5671123456');
  assert.equal(render({email:'contacto@example.test'}).footerContact.href,'mailto:contacto@example.test');
});

// Optional public settings snapshots enable a repeatable read-only two-store check.
const fixturePath=process.env.CATALOG_THEME_FIXTURE_PATH;
if (fixturePath) {
  const stores=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
  const token=name=>html.match(new RegExp('--'+name+':\\s*(#[0-9a-fA-F]{6})'))[1];
  const rgb=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16));
  const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
  test('Existing public store settings keep different themes and readable token pairs',()=>{
    assert.ok(stores.length>=2);
    assert.ok(new Set(stores.map(s=>s.theme_color)).size>=2);
    for(const store of stores) {
      const primary=rgb(store.theme_color), ink=rgb(token('ink')), background=rgb(token('background'));
      const soft=primary.map(v=>v*.1+255*.9), hover=primary.map(v=>v*.85);
      const ratios={active:contrast(primary,rgb(token('primary-contrast'))),hover:contrast(hover,rgb(token('primary-contrast'))),soft:contrast(ink,soft),surface:contrast(ink,background)};
      for(const [name,value] of Object.entries(ratios))assert.ok(value>=4.5,store.slug+' '+name+' '+value);
      const config={instagram:store.instagram_url,facebook:store.facebook_url,tiktok:store.tiktok_url};
      const before=JSON.stringify(config), nodes=render(config);
      assert.equal(JSON.stringify(config),before);
      const expected=Object.values(config).filter(x=>{try{return ['https:','http:'].includes(new URL(x).protocol);}catch{return false;}}).length;
      assert.equal((nodes.socialLinks.innerHTML.match(/<a /g)||[]).length,expected);
      console.log(store.slug,store.theme_color,JSON.stringify(ratios),'socials:',expected);
    }
  });
}
test('New component styles consume theme tokens, without fixed color literals',()=>{
  const themed=css.slice(css.indexOf('/* Store-themed controls:'));
  assert.doesNotMatch(themed,/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:white|black)\b/i);
});
