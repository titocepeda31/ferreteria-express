import test from 'node:test';
import assert from 'node:assert/strict';
import {applyStoreAppearance,connectAppearancePreview,previewOrigin} from './appearance-runtime.mjs';

function fixture(){
  const tokens={},classes={},posts=[];let listener;
  const parent={postMessage:(...args)=>posts.push(args)};
  globalThis.location={search:'?appearancePreview=1&previewOrigin=https%3A%2F%2Fcatalogo-admin-seven.vercel.app'};
  globalThis.window={parent,addEventListener:(name,fn)=>{listener=fn;}};
  globalThis.document={documentElement:{dataset:{},style:{setProperty:(k,v)=>tokens[k]=v}},body:{inert:false},getElementById:()=>({classList:{toggle:(k,v)=>{classes[k]=v;}},style:{setProperty:(k,v)=>tokens[k]=v}})};
  return{tokens,classes,posts,parent,event:data=>listener(data)};
}
test('Preview requires an allowed origin and an embedded frame',()=>{
  fixture();assert.equal(previewOrigin(),'https://catalogo-admin-seven.vercel.app');
  location.search='?appearancePreview=1&previewOrigin=https://attacker.test';assert.equal(previewOrigin(),null);
  location.search='?appearancePreview=1&previewOrigin=https://catalogo-admin-seven.vercel.app.evil.test';assert.equal(previewOrigin(),null);
  location.search='?appearancePreview=1&previewOrigin=https://catalogo-admin-seven.vercel.app';window.parent=window;assert.equal(previewOrigin(),null);
});
test('Preview ignores forged origins, sources and business IDs; valid drafts remain local',()=>{
  const f=fixture(),origin='https://catalogo-admin-seven.vercel.app';
  connectAppearancePreview({id:'a'},'https://project.supabase.co');
  assert.equal(document.body.inert,true);assert.equal(f.posts.length,1);
  const data={type:'catalog-appearance-draft',businessId:'a',appearance:{version:1,paletteId:'rose',decorations:{hero:'none',footer:'soft-waves'}}};
  f.event({origin:'https://evil.test',source:f.parent,data});
  f.event({origin,source:{},data});
  f.event({origin,source:f.parent,data:{...data,businessId:'b'}});
  assert.deepEqual(f.tokens,{});
  f.event({origin,source:f.parent,data});
  assert.equal(f.tokens['--primary'],'#ad3862');assert.equal(document.documentElement.dataset.decorationhero,'none');assert.equal(document.documentElement.dataset.decorationfooter,'soft-waves');
});
test('Invalid stored settings safely keep legacy colors without rendering unknown assets',()=>{
  const f=fixture();applyStoreAppearance({version:99,paletteId:'rose'},'#287a4b',{businessId:'a'});
  assert.equal(f.tokens['--primary'],'#287a4b');assert.equal(f.classes.hidden,true);assert.deepEqual(document.documentElement.dataset,{});
});
test('Saved pattern tiles repeat; illustrations and empty designs reset the pattern mode',()=>{
  const f=fixture(),businessId='11111111-1111-4111-8111-111111111111';
  const value={version:1,paletteId:'purple',decorations:{hero:'store-vector'},heroAsset:{name:'tito-patron-rombos.svg',path:businessId+'/decorations/22222222-2222-4222-8222-222222222222.svg'}};
  applyStoreAppearance(value,null,{businessId,assetOrigin:'https://project.supabase.co'});
  assert.equal(f.classes['hero-pattern'],true);assert.equal(f.classes.hidden,false);assert.equal(f.tokens['--primary'],'#71427f');
  applyStoreAppearance({...value,heroAsset:{...value.heroAsset,name:'tito-calavera.svg'}},null,{businessId});
  assert.equal(f.classes['hero-pattern'],false);
  applyStoreAppearance({...value,decorations:{hero:'none'}},null,{businessId});
  assert.equal(f.classes['hero-pattern'],false);assert.equal(f.classes.hidden,true);
});
