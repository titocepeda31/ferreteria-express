// Versioned contract, mirrored verbatim in the public catalog. No store data here.
export const PALETTES = [
  {id:'forest',name:'Verde bosque',primary:'#17733a'},
  {id:'petrol',name:'Azul petróleo',primary:'#1f6f78'},
  {id:'wood',name:'Café madera',primary:'#7a4e2d'},
  {id:'burgundy',name:'Burdeo',primary:'#8b3a62'},
  {id:'graphite',name:'Gris grafito',primary:'#4b5563'},
  {id:'rose',name:'Rosa delicado',primary:'#ad3862',soft:'#f5dce6',background:'#fff9fc',ink:'#30252b',border:'#e9d5df'},
  {id:'rose-lavender',name:'Rosa Lavanda',primary:'#8456A6',soft:'#F6E9F5',background:'#FFFAFD',ink:'#653D85',border:'#E8D6EC'},
  {id:'purple',name:'Morado creativo',primary:'#71427f',soft:'#ede0f1',background:'#fcf8fe',ink:'#302735',border:'#e3d5e8'},
  {id:'elegant',name:'Oscuro elegante',primary:'#29262e',soft:'#e5dce9',background:'#faf7fb',ink:'#29262e',border:'#ddd3e2'}
];
export const ZONES = [{id:'hero',name:'Hero'},{id:'prefooter',name:'Pre-footer'},{id:'footer',name:'Footer'}];
export const DESIGNS = [
  {id:'none',name:'Sin decoración',zones:ZONES.map(z=>z.id),industries:['all'],resources:[],available:true},
  {id:'soft-waves',name:'Ondas suaves',zones:ZONES.map(z=>z.id),industries:['all'],resources:[{type:'css',name:'soft-waves'}],available:true}
];
export const HERO_ILLUSTRATIONS = [{file:'tito-ilustracion-calavera.svg',image:'assets/decorations/calavera-rosas.webp'}];
export const HERO_PATTERN_FILES = ['tito-patron-rombos.svg','tito-patron-puntos.svg','tito-patron-arcos.svg'];
const hex = value => typeof value==='string' && /^#[\da-f]{6}$/i.test(value);
const plain = value => value && typeof value==='object' && !Array.isArray(value);
export function paletteTokens(id, color) {
  const palette=PALETTES.find(p=>p.id===id);
  const primary=palette?.primary || (hex(color)?color:'#17733a');
  return {'--primary':primary,'--primary-contrast':'#ffffff','--background':palette?.background||'#f7f8f6','--ink':palette?.ink||'#202820','--border':palette?.border||'#e3e8e2','--primary-soft':palette?.soft||`color-mix(in srgb, ${primary} 10%, white)`,'--primary-hover':`color-mix(in srgb, ${primary} 85%, black)`};
}
export function normalizeAppearance(value,{strict=false,businessId='',allowPending=false}={}) {
  const fail=message=>{if(strict)throw new Error(message);return null;};
  if(value==null)return null;
  if(!plain(value)||value.version!==1)return fail('Versión de apariencia no compatible.');
  const paletteId=value.paletteId??null;
  if(paletteId!==null&&!PALETTES.some(p=>p.id===paletteId))return fail('La paleta seleccionada no está disponible.');
  if(value.decorations!=null&&!plain(value.decorations))return fail('La decoración no es válida.');
  const decorations={};
  for(const zone of ZONES){
    const id=value.decorations?.[zone.id]??null;
    if(id!==null&&!(id==='store-vector'&&zone.id==='hero'&&value.heroAsset)&&!DESIGNS.some(d=>d.id===id&&d.available&&d.zones.includes(zone.id)))return fail('El diseño seleccionado no está disponible.');
    decorations[zone.id]=id;
  }
  let heroAsset=null;
  if(value.heroAsset!=null){
    const asset=value.heroAsset;
    if(allowPending&&plain(asset)&&typeof asset.svg==='string'&&typeof asset.name==='string'&&asset.name.length<=80){
      heroAsset={name:asset.name,svg:sanitizeVector(asset.svg)};
    }else{
    if(!plain(asset)||typeof asset.path!=='string'||!businessId||!asset.path.startsWith(businessId+'/decorations/')||!new RegExp('^[a-f0-9-]+/decorations/[a-f0-9-]+\\.svg$','i').test(asset.path))return fail('El vector debe pertenecer a esta tienda.');
    if(typeof asset.name!=='string'||asset.name.length<1||asset.name.length>80)return fail('Nombre de vector no válido.');
    heroAsset={name:asset.name,path:asset.path};
    }
  }
  return {version:1,paletteId,decorations,heroAsset};
}
export function vectorUrl(asset,baseUrl,businessId) {
  if(!asset)return '';
  const checked=normalizeAppearance({version:1,heroAsset:asset},{businessId});
  return checked?.heroAsset?baseUrl.replace(/\/$/,'')+'/storage/v1/object/public/catalog-assets/'+checked.heroAsset.path:'';
}
export function sanitizeVector(source,Parser=globalThis.DOMParser) {
  if(typeof source!=='string'||new TextEncoder().encode(source).length>65536)throw new Error('El SVG no puede superar 64 KB.');
  const input=source.replace(/^\s*<\?xml[^?]*\?>/,'');
  if(/<!|<\?/i.test(input))throw new Error('SVG no compatible: contiene declaraciones o entidades.');
  if(!Parser)throw new Error('No se pudo validar el SVG en este navegador.');
  const doc=new Parser().parseFromString(input,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw new Error('El archivo no es un SVG válido.');
  const tags=new Set(['svg','g','path','circle','ellipse','rect','line','polyline','polygon']);
  const attrs=new Set(['xmlns','viewBox','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','transform','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','fill-rule','clip-rule','opacity','fill-opacity','stroke-opacity','preserveAspectRatio']);
  const elements=[doc.documentElement,...doc.documentElement.querySelectorAll('*')];
  if(elements.length>1000)throw new Error('El SVG contiene demasiados elementos.');
  for(const el of elements){
    if(!tags.has(el.localName)||el.namespaceURI!=='http://www.w3.org/2000/svg')throw new Error('Usa un SVG simple de trazados y formas, sin scripts, imágenes, estilos ni recursos externos.');
    for(const attr of [...el.attributes]){
      if(!attrs.has(attr.name)||/url\s*\(|javascript:|data:|https?:/i.test(attr.value)&&attr.name!=='xmlns')throw new Error('El SVG contiene atributos o recursos no permitidos.');
      if(attr.name==='xmlns'&&attr.value!=='http://www.w3.org/2000/svg')throw new Error('El espacio de nombres SVG no es válido.');
      if(['fill','stroke'].includes(attr.name)&&attr.value!=='none')el.setAttribute(attr.name,'white');
    }
  }
  const root=doc.documentElement;
  if(!root.hasAttribute('viewBox')){
    const w=Number(root.getAttribute('width')),h=Number(root.getAttribute('height'));
    if(!(w>0&&h>0))throw new Error('El vector necesita viewBox o dimensiones numéricas.');
    root.setAttribute('viewBox',`0 0 ${w} ${h}`);
  }
  root.setAttribute('fill',root.getAttribute('fill')==='none'?'none':'white');
  return new XMLSerializer().serializeToString(root);
}
