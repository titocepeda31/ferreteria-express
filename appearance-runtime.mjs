import {normalizeAppearance,paletteTokens,vectorUrl,HERO_PATTERN_FILES,HERO_ILLUSTRATIONS} from './appearance-registry.mjs?v=artwork-1';

export function applyStoreAppearance(input,color,{businessId='',assetOrigin='',preview=false}={}){
  const appearance=normalizeAppearance(input,{businessId,allowPending:preview});
  const root=document.documentElement;
  for(const [name,value] of Object.entries(paletteTokens(appearance?.paletteId,color)))root.style.setProperty(name,value);
  for(const zone of ['hero','prefooter','footer']){
    const id=appearance?.decorations[zone];
    if(id==null)delete root.dataset['decoration'+zone];
    else root.dataset['decoration'+zone]=id;
  }
  const asset=appearance?.heroAsset;
  const artwork=appearance?.decorations.hero==='store-vector'&&HERO_ILLUSTRATIONS.find(a=>a.file===asset?.name);
  const hero=document.getElementById('hero');
  hero.classList.toggle('has-illustration',!!artwork);
  hero.style.setProperty('--hero-art',artwork?'url("'+new URL(artwork.image,import.meta.url).href+'")':'none');
  const url=preview&&asset?.svg?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(asset.svg):vectorUrl(asset,assetOrigin,businessId);
  const visual=document.getElementById('heroDecoration');
  visual.classList.toggle('hidden',!!artwork||appearance?.decorations.hero!=='store-vector'||!url);
  visual.classList.toggle('hero-pattern',appearance?.decorations.hero==='store-vector'&&HERO_PATTERN_FILES.includes(asset?.name));
  visual.style.setProperty('--hero-vector',url?'url("'+url.replaceAll('"','%22')+'")':'none');
}

export function previewOrigin(){
  const query=new URLSearchParams(location.search),raw=query.get('previewOrigin');
  if(query.get('appearancePreview')!=='1'||window.parent===window||!raw)return null;
  try{
    const u=new URL(raw);
    const known=['catalogo-admin-seven.vercel.app','catalogo-admin-titocepeda31s-projects.vercel.app','catalogo-admin-git-main-titocepeda31s-projects.vercel.app'];
    if(u.origin!==raw)return null;
    if(u.protocol==='https:'&&(known.includes(u.hostname)||/^catalogo-admin-[a-z0-9-]+-titocepeda31s-projects\.vercel\.app$/.test(u.hostname)))return raw;
    if(u.protocol==='http:'&&u.hostname==='localhost'&&u.port==='5173')return raw;
  }catch{}
  return null;
}

export function connectAppearancePreview(config,assetOrigin){
  const origin=previewOrigin();
  if(!origin)return;
  // Preview remains local: no actions, storage writes or analytics events.
  document.body.inert=true;
  window.addEventListener('message',event=>{
    if(event.origin!==origin||event.source!==window.parent||event.data?.type!=='catalog-appearance-draft'||event.data.businessId!==config.id)return;
    try{
      const checked=normalizeAppearance(event.data.appearance,{strict:true,businessId:config.id,allowPending:true});
      applyStoreAppearance(checked,event.data.color,{businessId:config.id,assetOrigin,preview:true});
    }catch{ /* Invalid or unavailable drafts never reach the catalog. */ }
  });
  window.parent.postMessage({type:'catalog-appearance-ready',businessId:config.id},origin);
}
