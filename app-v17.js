import { CONFIG } from './config-v17.js';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const id = () => crypto.randomUUID();
const esc = (v='') => String(v).replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
const fmtDate = (v) => new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v));
const now = () => new Date().toISOString();

const SERVO_LAYOUT = [
  {channel:0,label:'Hip L',group:'Left Leg',groupKey:'left-leg'},
  {channel:1,label:'Knee L',group:'Left Leg',groupKey:'left-leg'},
  {channel:2,label:'Ankle L',group:'Left Leg',groupKey:'left-leg'},
  {channel:3,label:'Hip R',group:'Right Leg',groupKey:'right-leg'},
  {channel:4,label:'Knee R',group:'Right Leg',groupKey:'right-leg'},
  {channel:5,label:'Ankle R',group:'Right Leg',groupKey:'right-leg'},
  {channel:6,label:'Shoulder L',group:'Arms',groupKey:'arms'},
  {channel:7,label:'Elbow L',group:'Arms',groupKey:'arms'},
  {channel:8,label:'Shoulder R',group:'Arms',groupKey:'arms'},
  {channel:9,label:'Elbow R',group:'Arms',groupKey:'arms'},
  {channel:10,label:'Head Pan',group:'Head',groupKey:'head'},
  {channel:11,label:'Head Tilt',group:'Head',groupKey:'head'}
];

const STORAGE = {session:'robotlab.session.v1', cache:'robotlab.cache.v1'};
let session = JSON.parse(localStorage.getItem(STORAGE.session)||'null');
let data = JSON.parse(localStorage.getItem(STORAGE.cache)||'null') || seedData();
let rowId = null;
let page = 'home';
let projectTab = 'overview';
let activeProjectId = null;
let controlTab = 'manual';
let manualGroup = 'left-leg';
let moreTab = 'settings';
let libraryTab = 'all';
let modal = null;
let saveTimer = null;
let syncState = 'local';
let installPrompt = null;
let toastTimer = null;
let bundleImportState = {active:false,phase:'',message:'',done:0,total:0,error:'',projectId:null,summary:null};
let cadModelObjectUrl = null;
let cadLocalFile = null;
let cadState = {
  url:'',
  name:'',
  source:'',
  size:0,
  theme:'light',
  grid:true,
  dimensions:null,
  center:null,
  projectId:null,
  arStatus:'unknown'
};


function seedData(){
  return {
    schemaVersion:7,
    updatedAt:now(),
    settings:{mode:'simulator',robotEndpoint:'',autoSync:true,lockTimeout:30,featureFlags:{viewer3d:true,camera:false,voice:false,autonomy:false,aiBrain:false,landscapeControl:false,advancedMotion:false}},
    robot:{name:'HUMANOID 180',version:'V1',dof:12,status:'development',battery:82,voltage:7.6,temperature:23,emergency:false},
    servos:SERVO_LAYOUT.map((m,i)=>({id:`servo-${i+1}`,channel:i,label:m.label,group:m.group,groupKey:m.groupKey,angle:90,neutral:90,min:0,max:180,reversed:false,enabled:true})),
    poses:[{id:id(),name:'Stand Neutral',angles:Array(12).fill(90),createdAt:now()}],
    sequences:[],
    sensors:{imu:'OK',gyro:0.01,accel:0.02,pitch:0,roll:0,connection:'Simulator',lastUpdate:now()},
    projects:[{id:'humanoid-180',name:'HUMANOID 180',version:'V1',status:'Em desenvolvimento',note:'Humanoide modular de 12 DOF. ESP32 como Robot Core, PCA9685 para servos, MPU6050 para orientação e Safety Engine independente do telefone.',updatedAt:now()}],
    bom:[
      {id:'bom-mg90s-7',name:'TowerPro MG90S 180°',qty:'7',status:'COMPRADO',category:'Servos',note:'Servos já encomendados para a V1.'},
      {id:'bom-mg90s-5',name:'TowerPro MG90S 180°',qty:'5',status:'A COMPRAR',category:'Servos',note:'Faltam 5 unidades para completar os 12 DOF.'},
      {id:'bom-esp32',name:'ESP32 KS0413',qty:'1',status:'COMPRADO',category:'Controlo',note:'Controlador principal / Robot Core.'},
      {id:'bom-pca',name:'PCA9685 KS0065',qty:'1',status:'COMPRADO',category:'Controlo',note:'Driver PWM dos servos.'},
      {id:'bom-imu',name:'MPU6050 KS0170',qty:'1',status:'COMPRADO',category:'Sensores',note:'IMU para orientação, quedas e balanceamento.'},
      {id:'bom-dfr',name:'DFR1154',qty:'1',status:'COMPRADO',category:'Eletrónica',note:'Módulo confirmado na arquitetura V1.'},
      {id:'bom-xl4015',name:'XL4015',qty:'2',status:'COMPRADO',category:'Potência',note:'Conversores DC-DC da distribuição de potência.'},
      {id:'bom-mp1482',name:'MP1482',qty:'1',status:'COMPRADO',category:'Potência',note:'Regulação auxiliar.'},
      {id:'bom-breadboard',name:'Kit de prototipagem + breadboard 830 pontos',qty:'1',status:'COMPRADO',category:'Bancada',note:'Aprendizagem e prototipagem; não altera a arquitetura de potência dos servos.'},
      {id:'bom-plywood',name:'Contraplacado 3 mm',qty:'A definir',status:'A COMPRAR',category:'Estrutura',note:'Material da primeira estrutura funcional.'},
      {id:'bom-battery',name:'Bateria Gens Ace',qty:'1',status:'A COMPRAR',category:'Potência',note:'Referência de bateria definida para a configuração V1; confirmar aquisição antes de marcar como comprado.'}
    ],
    roadmap:[
      {id:'r1',title:'Eletrónica de bancada',status:'IN PROGRESS',note:'Validar alimentação, ESP32, PCA9685 e MPU6050 sem servos ligados à carga.',progress:65},
      {id:'r2',title:'Completar 12 servos',status:'NEXT',note:'Adicionar as 5 unidades MG90S em falta.',progress:58},
      {id:'r3',title:'Estrutura V1 em contraplacado 3 mm',status:'NEXT',note:'Cortar, montar e validar amplitude mecânica sem forçar os servos.',progress:20},
      {id:'r4',title:'Calibração dos 12 DOF',status:'WAITING',note:'Definir neutral, min, max e inversão por articulação.',progress:0},
      {id:'r5',title:'Stand Neutral estável',status:'WAITING',note:'Primeira pose mecânica segura e repetível.',progress:0},
      {id:'r6',title:'Motion Engine',status:'WAITING',note:'Executar poses e sequências localmente no ESP32.',progress:0},
      {id:'r7',title:'Balance + Safety',status:'WAITING',note:'IMU, deteção de queda, low-battery e watchdog.',progress:0},
      {id:'r8',title:'Primeiro movimento autónomo',status:'WAITING',note:'Comando de alto nível executado pelo Robot Core sem streaming contínuo do telefone.',progress:0}
    ],
    architecture:[
      {id:'a1',name:'App / PWA',role:'Projeto, calibração, comandos de alto nível e diagnóstico',state:'READY'},
      {id:'a2',name:'ESP32 KS0413',role:'Robot Core e coordenação em tempo real',state:'READY'},
      {id:'a3',name:'PCA9685 KS0065',role:'PWM para os 12 servos',state:'READY'},
      {id:'a4',name:'MPU6050 KS0170',role:'Orientação, queda e balanceamento',state:'READY'},
      {id:'a5',name:'Safety Engine',role:'Limites, E-STOP, watchdog e estados seguros',state:'DESIGNED'},
      {id:'a6',name:'Brain Interface',role:'Ponto de ligação futuro a voz, visão e IA',state:'FUTURE'}
    ],
    ideas:[
      {id:id(),title:'Auto Balance',category:'Feature',note:'Usar IMU para melhorar estabilidade.',status:'Research',createdAt:now()},
      {id:id(),title:'Voice Commands',category:'AI',note:'Interface futura de voz.',status:'Idea',createdAt:now()},
      {id:id(),title:'Vision Tracking',category:'Vision',note:'Câmara e tracking numa fase futura.',status:'Idea',createdAt:now()}
    ],
    resources:[],
    tests:[],
    problems:[],
    decisions:[
      {id:'d-12dof',title:'Arquitetura V1 fechada em 12 DOF',note:'A V1 mantém 12 articulações e o body map definido na aplicação.',createdAt:now()},
      {id:'d-sim-first',title:'Simulator first',note:'Toda a lógica de controlo é validada primeiro no simulador antes do hardware real.',createdAt:now()},
      {id:'d-robot-core',title:'ESP32 executa movimentos localmente',note:'A app envia comandos de alto nível; o telefone não faz streaming contínuo de cada servo.',createdAt:now()},
      {id:'d-safety',title:'Safety Engine independente',note:'Limites, queda, perda de ligação e bateria baixa devem continuar a funcionar sem o telefone.',createdAt:now()},
      {id:'d-local-first',title:'ROBOT LAB local-first + sync privado',note:'A PWA mantém cache local e sincroniza dados privados com o backend já usado pelo arquivo de móveis.',createdAt:now()},
      {id:'d-structure',title:'Primeira estrutura em contraplacado 3 mm',note:'Material inicial para iterar rapidamente na mecânica da V1.',createdAt:now()}
    ],
    files:[],
    notes:[],
    projectAssets:[],
    releases:[],
    bundleImports:[],
    motionLog:[],
    safety:{realControlArmed:false,lastStopReason:'',watchdogMs:1500,maxCommandRateHz:20},
    connection:{lastCheck:null,status:'SIMULATOR',latencyMs:null,firmware:'not connected'}
  };
}

function normalizeData(src){
  const base=seedData();
  const out={...base,...(src||{})};
  out.schemaVersion=7;
  out.settings={...base.settings,...(src?.settings||{}),featureFlags:{...base.settings.featureFlags,...(src?.settings?.featureFlags||{})}};
  out.robot={...base.robot,...(src?.robot||{})};
  const existing=Array.isArray(src?.servos)&&src.servos.length===12?src.servos:[];
  out.servos=SERVO_LAYOUT.map((meta,i)=>({
    ...base.servos[i],
    ...(existing[i]||{}),
    id:(existing[i]?.id)||`servo-${i+1}`,
    channel:i,
    label:meta.label,
    group:meta.group,
    groupKey:meta.groupKey
  }));
  for(const k of ['poses','sequences','projects','bom','ideas','resources','tests','problems','decisions','files','notes','roadmap','architecture','motionLog','projectAssets','releases','bundleImports']){
    if(!Array.isArray(out[k])) out[k]=base[k];
  }
  out.safety={...base.safety,...(src?.safety||{})};
  out.connection={...base.connection,...(src?.connection||{})};
  out.schemaVersion=7;

  // V1.4 migration: content that previously lived implicitly inside HUMANOID 180
  // becomes explicitly project-scoped. New ideas/resources may remain global.
  const humanoidId='humanoid-180';
  out.projects=(out.projects||[]).map((p,i)=>({
    type:p.type||(p.id===humanoidId?'Robotics':'Other'),
    status:p.status||'Idea',
    createdAt:p.createdAt||p.updatedAt||now(),
    updatedAt:p.updatedAt||now(),
    ...p
  }));
  for(const key of ['bom','tests','problems','decisions','files','notes']){
    out[key]=(out[key]||[]).map(x=>({...x,projectId:x.projectId===undefined?humanoidId:x.projectId}));
  }
  out.ideas=(out.ideas||[]).map(x=>({...x,projectId:x.projectId===undefined?humanoidId:x.projectId}));
  out.resources=(out.resources||[]).map(x=>({
    ...x,
    projectIds:Array.isArray(x.projectIds)?x.projectIds:(x.projectId?[x.projectId]:[])
  }));
  out.projectAssets=(out.projectAssets||[]).map(x=>({...x,category:x.category||'other'}));
  out.releases=(out.releases||[]).map(x=>({...x,status:x.status||'release'}));
  out.bundleImports=(out.bundleImports||[]).map(x=>({...x}));
  return out;
}

data=normalizeData(data);

function cache(){ data.updatedAt=now(); localStorage.setItem(STORAGE.cache,JSON.stringify(data)); }
function markDirty(){ cache(); syncState='local'; drawHeaderState(); if(data.settings.autoSync && session){clearTimeout(saveTimer);saveTimer=setTimeout(saveRemote,700);} }
function toast(msg){ let t=$('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),2600); }

function authHeaders(){return {'apikey':CONFIG.supabasePublishableKey,'Authorization':`Bearer ${session?.access_token||''}`};}
async function refreshSession(){
  if(!session?.refresh_token) throw new Error('Sessão expirada');
  const r=await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{'apikey':CONFIG.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  if(!r.ok) throw new Error('Sessão expirada');
  const next=await r.json(); session={...session,...next,expires_at:next.expires_at||Math.floor(Date.now()/1000)+(next.expires_in||3600)}; localStorage.setItem(STORAGE.session,JSON.stringify(session)); return session;
}
async function ensureSession(){ if(!session) return false; if((session.expires_at||0)*1000 < Date.now()+60000){try{await refreshSession();}catch{logout(false);return false;}} return true; }
async function api(url, options={}, retry=true){
  await ensureSession();
  const headers={...authHeaders(),...(options.headers||{})};
  const r=await fetch(url,{...options,headers});
  if(r.status===401 && retry && session?.refresh_token){await refreshSession(); return api(url,options,false);} return r;
}
async function signIn(password){
  const r=await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:{'apikey':CONFIG.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:CONFIG.ownerEmail,password})});
  if(!r.ok) throw new Error('Password incorreta.');
  const s=await r.json(); session={...s,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600)}; localStorage.setItem(STORAGE.session,JSON.stringify(session));
  await loadRemote();
}
async function logout(remote=true){
  if(remote && session){try{await api(`${CONFIG.supabaseUrl}/auth/v1/logout`,{method:'POST'});}catch{}}
  session=null;rowId=null;localStorage.removeItem(STORAGE.session);page='home';render();
}
function projectJsonPath(){
  return `${session.user.id}/development/${CONFIG.rowSlug}/project.json`;
}
async function loadRemote(){
  if(!session) return;
  syncState='syncing'; drawHeaderState();
  try{
    const path=projectJsonPath();
    const r=await api(`${CONFIG.supabaseUrl}/storage/v1/object/authenticated/${CONFIG.storageBucket}/${path}`,{method:'GET'});
    if(r.status===404 || r.status===400){
      rowId='storage';
      await saveRemote();
      syncState='synced';
    }else{
      if(!r.ok) throw new Error(await r.text());
      const remote=await r.json();
      if(remote?.schemaVersion){data=mergeData(seedData(),remote);cache();}
      rowId='storage';
      syncState='synced';
    }
  }catch(e){
    console.warn('ROBOT LAB sync:',e);
    syncState='local';
    toast('Dados locais ativos. A sincronização será tentada novamente.');
  }
  render();
}
function mergeData(base,remote){
  return normalizeData({...base,...remote});
}
async function saveRemote(){
  if(!session||!navigator.onLine) return;
  syncState='syncing';drawHeaderState();
  try{
    const path=projectJsonPath();
    const r=await api(`${CONFIG.supabaseUrl}/storage/v1/object/${CONFIG.storageBucket}/${path}`,{
      method:'POST',
      headers:{'Content-Type':'application/json','x-upsert':'true'},
      body:JSON.stringify(data)
    });
    if(!r.ok) throw new Error(await r.text());
    rowId='storage';
    syncState='synced';
  }catch(e){
    console.warn('ROBOT LAB save:',e);
    syncState='local';
  }
  drawHeaderState();
}

function icon(name){const m={home:'⌂',projects:'▣',control:'⌘',library:'▤',more:'•••',idea:'◇',tool:'⌁',diag:'◉',cal:'⊕',file:'▧',video:'▶',test:'✓',problem:'!',decision:'◆',pose:'◎',motion:'↝',settings:'⚙',backup:'⇄'};return m[name]||'•';}
function badge(status){let cls=status==='COMPRADO'||status==='PASS'?'green':status==='A COMPRAR'||status==='Research'?'amber':status==='ADIADO'||status==='OPEN'?'coral':'';return `<span class="badge ${cls}">${esc(status)}</span>`;}
function sectionHead(kicker,title,desc=''){return `<section class="sectionHead"><p class="eyebrow">${esc(kicker)}</p><h2>${esc(title)}</h2>${desc?`<p>${esc(desc)}</p>`:''}</section>`;}
function tabs(items,active,kind){return `<div class="tabs">${items.map(([key,label])=>`<button class="tab ${active===key?'active':''}" data-tabkind="${kind}" data-tab="${key}">${esc(label)}</button>`).join('')}</div>`;}
function row(title,sub='',action='',extra=''){return `<button class="rowcard" ${action?`data-action="${action}"`:''}><div><strong>${esc(title)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</div>${extra||'<div class="right">›</div>'}</button>`;}
function tile(title,sub,ico,tone='',action=''){return `<button class="tile ${tone}" ${action?`data-action="${action}"`:''}><span class="iconbubble">${icon(ico)}</span><div class="tileCopy"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div></button>`;}
function projectById(pid=activeProjectId){return data.projects.find(p=>p.id===pid)||null;}
function projectManageBar(project){
  if(!project)return '';
  return `<div class="projectManageBar">
    <button class="btn soft" data-action="edit-project">Edit Project</button>
    <button class="btn dangerSoft" data-action="delete-project">Delete Project</button>
  </div>`;
}
function projectDeleteStats(pid){
  const ownedFiles=(data.files||[]).filter(f=>f.projectId===pid);
  const counts={
    files:ownedFiles.length,
    bom:scoped('bom',pid).length,
    tests:scoped('tests',pid).length,
    problems:scoped('problems',pid).length,
    decisions:scoped('decisions',pid).length,
    notes:scoped('notes',pid).length,
    ideas:projectIdeas(pid).length,
    resources:projectResources(pid).length,
    assets:(data.projectAssets||[]).filter(x=>x.projectId===pid).length,
    releases:(data.releases||[]).filter(x=>x.projectId===pid).length,
    imports:(data.bundleImports||[]).filter(x=>x.projectId===pid).length
  };
  return {counts,ownedFiles};
}
function uniqueStoragePathsForProject(pid){
  return [...new Set((data.files||[]).filter(f=>f.projectId===pid&&f.path).map(f=>String(f.path)))];
}

function projectLabel(pid){return pid?projectById(pid)?.name||'Project':'Global';}
function scoped(key,pid=activeProjectId){return (data[key]||[]).filter(x=>x.projectId===pid);}
function projectResources(pid=activeProjectId){return (data.resources||[]).filter(r=>(r.projectIds||[]).includes(pid));}
function projectIdeas(pid=activeProjectId){return (data.ideas||[]).filter(i=>i.projectId===pid);}
function globalIdeas(){return (data.ideas||[]).filter(i=>!i.projectId);}
function globalResources(){return (data.resources||[]).filter(r=>(r.projectIds||[]).length===0);}
function projectOptions(includeGlobal=true){
  const arr=data.projects.map(p=>({value:p.id,label:p.name}));
  return includeGlobal?[{value:'',label:'Global / Unassigned'},...arr]:arr;
}
function typeTone(t){return t==='Robotics'?'lav':t==='Electronics'?'amber':t==='Software'?'blue':t==='Research'?'coral':'';}
function recentProjects(){return [...data.projects].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt)).slice(0,4);}
function baseName(path=''){return String(path).split('/').filter(Boolean).pop()||'';}
function extName(path=''){const m=baseName(path).toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:'';}
function cleanBundlePath(path=''){return String(path).replace(/\\/g,'/').replace(/^\/+/,'').replace(/\.\.(\/|$)/g,'');}
function safeStoragePart(v=''){return String(v).normalize('NFKD').replace(/[^\w.\-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,120)||'file';}
function bundleMime(path=''){
  const e=extName(path);
  return ({
    json:'application/json',csv:'text/csv',txt:'text/plain',md:'text/markdown',
    glb:'model/gltf-binary',gltf:'model/gltf+json',stl:'model/stl',step:'application/step',stp:'application/step',
    ino:'text/plain',cpp:'text/plain',c:'text/plain',h:'text/plain',hpp:'text/plain',py:'text/x-python',
    jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',
    pdf:'application/pdf',zip:'application/zip'
  })[e]||'application/octet-stream';
}
function bundleCategory(path=''){
  const p=cleanBundlePath(path).toLowerCase();
  const b=baseName(p);
  const e=extName(p);
  if(/^tp7_radio_project_source_of_truth_v0_13\.json$/i.test(b)||/_project_source_of_truth_.*\.json$/i.test(b))return 'source-truth';
  if(/(^|\/)(procurement|purchasing|suppliers?|sourcing)(\/|_|-|$)/i.test(p)||/procurement|purchase|supplier|sourcing/i.test(b))return 'procurement';
  if(/(^|\/)(bench[_ -]?tests?|tests?)(\/|_|-|$)/i.test(p)||/bench[_ -]?test|test[_ -]?report|validation[_ -]?test/i.test(b))return 'bench-tests';
  if(/(^|\/)(firmware|fw)(\/|_|-|$)/i.test(p)||['ino','cpp','c','h','hpp','py','bin','elf','hex'].includes(e))return 'firmware';
  if(/(^|\/)(releases?|versions?)(\/|_|-|$)/i.test(p)||/(^|[_ -])v\d+(?:[._-]\d+)+/i.test(b))return 'releases';
  if(e==='glb'||e==='gltf')return '3d-models';
  if(['step','stp','stl'].includes(e))return 'mechanical-cad';
  if(e==='csv'||/bom|bill[_ -]?of[_ -]?materials/i.test(b))return 'bom';
  if(['jpg','jpeg','png','webp','gif','svg'].includes(e))return 'references';
  return 'other';
}
function bundleCategoryLabel(cat){
  return ({
    'source-truth':'Source of Truth','3d-models':'3D Models','mechanical-cad':'Mechanical / CAD',
    bom:'BOM',firmware:'Firmware','bench-tests':'Bench Tests',procurement:'Procurement',
    references:'References',releases:'Releases','bundle-backup':'Bundle Backup',other:'Files'
  })[cat]||cat;
}
function bundleAssetIcon(cat){return ['3d-models','mechanical-cad'].includes(cat)?'tool':cat==='references'?'image':cat==='firmware'?'projects':cat==='bench-tests'?'test':cat==='procurement'?'library':'file';}
function bundleAssets(pid,cat=null){
  return (data.projectAssets||[]).filter(a=>a.projectId===pid&&(!cat||a.category===cat));
}
function releaseFromPath(path=''){
  const s=String(path).replace(/_/g,'.').replace(/-/g,'.');
  const m=s.match(/\bv(\d+(?:\.\d+)+)\b/i);
  return m?`V${m[1]}`:null;
}
function sourceTruthVersionFromName(name=''){
  const m=String(name).match(/_V(\d+(?:_\d+)*)\.json$/i);
  return m?`V${m[1].replace(/_/g,'.')}`:null;
}
function deepPick(obj,paths=[]){
  for(const path of paths){
    const parts=path.split('.');
    let v=obj;
    for(const k of parts){if(v==null||typeof v!=='object'||!(k in v)){v=undefined;break;}v=v[k];}
    if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;
  }
  return null;
}
function inferBundleProject(source,path){
  const exact=/^TP7_RADIO_PROJECT_SOURCE_OF_TRUTH_V0_13\.json$/i.test(baseName(path));
  const projectName=exact?'TP-7 RADIO V1':String(deepPick(source,[
    'project.name','project.project_name','project.title','projectName','project_name','name','title'
  ])||baseName(path).replace(/_PROJECT_SOURCE_OF_TRUTH_.*$/i,'').replace(/_/g,' ')).trim();
  const currentRelease=exact?'V0.13':String(deepPick(source,[
    'release.current','release.version','currentRelease','current_release','currentVersion','current_version','version'
  ])||sourceTruthVersionFromName(baseName(path))||'V1').replace(/^v/i,'V');
  return {projectName,currentRelease,exactTP7:exact};
}
function parseCsvLine(line){
  const out=[];let cur='',q=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}
    else if(ch===','&&!q){out.push(cur.trim());cur='';}
    else cur+=ch;
  }
  out.push(cur.trim());return out;
}
function csvToObjects(text=''){
  const lines=String(text).replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
  if(lines.length<2)return [];
  const headers=parseCsvLine(lines[0]).map(h=>h.trim());
  return lines.slice(1).map(line=>{
    const vals=parseCsvLine(line),o={};
    headers.forEach((h,i)=>o[h]=vals[i]??'');
    return o;
  });
}
function bomFromCsvRows(rows,projectId,bundleId,sourceFile){
  const norm=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
  const find=(row,names)=>{
    const keys=Object.keys(row),wanted=names.map(norm);
    const k=keys.find(k=>wanted.includes(norm(k)));
    return k?row[k]:'';
  };
  return rows.filter(r=>Object.values(r).some(v=>String(v).trim())).map((r,i)=>({
    id:id(),projectId,bundleId,importedFromBundle:true,sourceFile,
    name:String(find(r,['name','item','component','part','part name','description','designator'])||`BOM item ${i+1}`),
    qty:String(find(r,['qty','quantity','count','units'])||'1'),
    category:String(find(r,['category','group','type'])||'Imported BOM'),
    status:String(find(r,['status','state'])||'IMPORTED'),
    note:String(find(r,['note','notes','remarks','supplier','reference','part number','mpn'])||''),
    raw:r
  }));
}
function bundleSummaryFromEntries(entries){
  const counts={};
  entries.forEach(x=>counts[x.category]=(counts[x.category]||0)+1);
  return counts;
}
function setBundleProgress(message,done=bundleImportState.done,total=bundleImportState.total,phase=bundleImportState.phase){
  bundleImportState={...bundleImportState,message,done,total,phase};
  const msg=$('#bundleProgressMessage');if(msg)msg.textContent=message;
  const bar=$('#bundleProgressBar');if(bar)bar.style.width=`${total?Math.min(100,(done/total)*100):0}%`;
  const num=$('#bundleProgressNumber');if(num)num.textContent=total?`${done}/${total}`:'';
  const ph=$('#bundleProgressPhase');if(ph)ph.textContent=phase||'';
}
function bundleImportHTML(){
  if(!bundleImportState.active&&!bundleImportState.summary&&!bundleImportState.error)return '';
  if(bundleImportState.error)return `<div class="panel bundleImportStatus error"><div class="eyebrow">IMPORT PROJECT BUNDLE</div><h3>Import failed</h3><p>${esc(bundleImportState.error)}</p><button class="btn soft" data-action="bundle-dismiss">Dismiss</button></div>`;
  if(bundleImportState.active)return `<div class="panel bundleImportStatus"><div class="split"><div><span class="eyebrow" id="bundleProgressPhase">${esc(bundleImportState.phase||'IMPORT')}</span><h3>Importing project bundle…</h3></div><b id="bundleProgressNumber">${bundleImportState.total?`${bundleImportState.done}/${bundleImportState.total}`:''}</b></div><p id="bundleProgressMessage">${esc(bundleImportState.message||'Preparing…')}</p><div class="progress bundleProgress"><i id="bundleProgressBar" style="width:${bundleImportState.total?Math.min(100,(bundleImportState.done/bundleImportState.total)*100):0}%"></i></div><p class="tiny">ZIP extraction and classification happen locally in this browser. Files are uploaded only to the private project storage during import.</p></div>`;
  const s=bundleImportState.summary||{};
  return `<div class="panel bundleImportStatus success"><div class="split"><div><span class="eyebrow">IMPORT COMPLETE</span><h3>${esc(s.projectName||'Project imported')}</h3></div>${badge(s.release||'Release')}</div><p>${Number(s.files||0)} files imported · original ZIP saved as private backup.</p><button class="btn soft" data-action="bundle-dismiss">Dismiss</button></div>`;
}

function isGlbName(name=''){return /\.glb(?:$|\?)/i.test(String(name));}
function cadFormatBytes(bytes=0){
  const n=Number(bytes)||0;
  if(n<1024)return `${n} B`;
  if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(1)} MB`;
}
function cadMetricSet(d){
  if(!d)return {x:'—',y:'—',z:'—',unit:''};
  const max=Math.max(Math.abs(d.x||0),Math.abs(d.y||0),Math.abs(d.z||0));
  let factor=1,unit='m',digits=3;
  if(max<1){factor=1000;unit='mm';digits=1;}
  const f=v=>(Number(v||0)*factor).toFixed(digits);
  return {x:f(d.x),y:f(d.y),z:f(d.z),unit};
}
function cadCenterSet(c){
  if(!c)return {x:'—',y:'—',z:'—',unit:''};
  const max=Math.max(Math.abs(c.x||0),Math.abs(c.y||0),Math.abs(c.z||0));
  let factor=1,unit='m',digits=3;
  if(max<1){factor=1000;unit='mm';digits=1;}
  const f=v=>(Number(v||0)*factor).toFixed(digits);
  return {x:f(c.x),y:f(c.y),z:f(c.z),unit};
}
function clearCadObjectUrl(){
  if(cadModelObjectUrl){URL.revokeObjectURL(cadModelObjectUrl);cadModelObjectUrl=null;}
}
function openCadModel(url,name='3D model',source='url',size=0,projectId=null,localFile=null){
  if(source!=='local')clearCadObjectUrl();
  cadLocalFile=localFile||null;
  cadState={...cadState,url,name,source,size:Number(size)||0,dimensions:null,center:null,projectId,arStatus:'unknown'};
  page='cad';
  render();
}
function clearCadModel(){
  clearCadObjectUrl();
  cadLocalFile=null;
  cadState={...cadState,url:'',name:'',source:'',size:0,dimensions:null,center:null,projectId:null,arStatus:'unknown'};
  render();
}


function nav(){const n=[['home','Home','home'],['projects','Projects','projects'],['ideas','Ideas','idea'],['library','Library','library'],['more','More','more']];const active=page==='cad'?(activeProjectId?'projects':'more'):page;return `<nav class="nav">${n.map(([k,l,i])=>`<button class="${active===k?'active':''}" data-nav="${k}"><b>${icon(i)}</b><span>${l}</span></button>`).join('')}</nav>`;}
function drawHeaderState(){const s=$('#syncState');if(!s)return;s.className=`syncLine ${syncState==='synced'?'':'local'}`;s.innerHTML=`<i></i>${syncState==='synced'?'Synced':syncState==='syncing'?'A sincronizar…':navigator.onLine?'Local':'Offline'}`;document.body.classList.toggle('offline',!navigator.onLine);}
function shell(body,title){return `<div class="shell"><header class="topbar"><div><div class="brand">ROBOT LAB</div><h1>${esc(title)}</h1></div><div><div class="statusdot"></div><div id="syncState" class="syncLine ${syncState==='synced'?'':'local'}"><i></i>${syncState==='synced'?'Synced':syncState==='syncing'?'A sincronizar…':navigator.onLine?'Local':'Offline'}</div></div></header><main class="content">${body}</main>${nav()}${modalHTML()}</div>`;}

function loginHTML(){return `<main class="login"><section class="loginCard"><div class="brand">ROBOT LAB</div><div class="loginVisual"><img src="./robot-main.jpg" alt="Robot visual ROBOT LAB"></div><h1>Build. Control. Evolve.</h1><p>Laboratório privado de robótica. A autenticação usa a mesma conta única protegida do teu arquivo pessoal.</p><form id="loginForm"><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" minlength="8" autocomplete="current-password" required autofocus placeholder="••••••••••••"></div><div id="loginError" class="tiny danger"></div><button class="btn primary full" type="submit">Entrar</button></form></section></main>`;}

function homePage(){
  const rp=recentProjects();
  const unassignedIdeas=globalIdeas().length;
  const globalRes=globalResources().length;
  return `<section class="labHero">
    <div><span class="eyebrow">ROBOT LAB</span><h2>Your project workspace.</h2><p>Projetos, ideias, investigação, recursos e robots num único laboratório privado.</p></div>
    <div class="labStats"><div><b>${data.projects.length}</b><span>Projects</span></div><div><b>${data.ideas.length}</b><span>Ideas</span></div><div><b>${data.resources.length}</b><span>Resources</span></div></div>
  </section>
  ${installPrompt?`<div class="installBanner"><span>A ROBOT LAB está pronta para instalar como aplicação.</span><button class="btn soft" data-action="install">Instalar</button></div>`:''}
  <h3 class="sectionLabel">Create</h3>
  <div class="grid3">
    ${tile('New Project','Start from an idea','projects','lav','add-project')}
    ${tile('New Idea',`${unassignedIdeas} unassigned`,'idea','amber','add-global-idea')}
    ${tile('Add Resource',`${globalRes} global`,'library','blue','add-global-resource')}
    ${tile('3D / CAD Viewer','Open .GLB on phone','tool','coral','open-cad')}
  </div>
  <div class="split sectionSplit"><h3 class="sectionLabel">Recent projects</h3><button class="textBtn" data-action="all-projects">View all</button></div>
  <div class="projectDeck">${rp.map(projectCard).join('')||'<div class="empty">Ainda não existem projetos.</div>'}</div>
  <div class="split sectionSplit"><h3 class="sectionLabel">Inbox</h3><button class="textBtn" data-action="go-ideas">Open ideas</button></div>
  <div class="inboxGrid">
    <div class="miniStat"><b>${unassignedIdeas}</b><span>Ideias sem projeto</span></div>
    <div class="miniStat"><b>${globalRes}</b><span>Recursos globais</span></div>
  </div>`;
}

function projectCard(p){
  const humanoid=p.id==='humanoid-180';
  return `<button class="projectCard ${typeTone(p.type)}" data-project="${p.id}">
    <div class="projectCardTop"><span class="projectType">${esc(p.type||'Project')}</span>${badge(p.status||'Active')}</div>
    <div class="projectArt">${humanoid?'<img src="./robot-main.jpg" alt="">':`<span>${icon(p.type==='Software'?'projects':p.type==='Research'?'idea':'tool')}</span>`}</div>
    <div><strong>${esc(p.name)}</strong><span>${esc(p.note||'')}</span></div>
  </button>`;
}

function projectsPage(){
  if(!activeProjectId){
    return `${sectionHead('WORKSPACE','Projects','Cria projetos independentes. O HUMANOID 180 é apenas o primeiro projeto especializado da ROBOT LAB.')}
      <div class="actions projectActions"><button class="btn primary" data-action="add-project">+ New Project</button><label class="btn soft bundleImportButton">Import Project Bundle<input id="projectBundleInput" type="file" accept=".zip,application/zip" hidden></label></div>
      ${bundleImportHTML()}
      <div class="filterSummary"><span>${data.projects.length} projects</span><span>${data.projects.filter(p=>p.status!=='Archived').length} active</span></div>
      <div class="projectDeck">${data.projects.map(projectCard).join('')||'<div class="empty">Cria o primeiro projeto.</div>'}</div>`;
  }
  return projectWorkspacePage(projectById());
}

function projectWorkspacePage(project){
  if(!project){activeProjectId=null;return projectsPage();}
  const humanoid=project.id==='humanoid-180';
  if(humanoid) return humanoidProjectPage(project);
  if(project.bundleProfile) return bundleProjectPage(project);
  const tabsGeneric=[['overview','Overview'],['notes','Notes'],['ideas','Ideas'],['resources','Resources'],['files','Files']];
  let content='';
  if(projectTab==='overview') content=`<div class="panel projectOverview"><div class="split"><div><span class="eyebrow">${esc(project.type||'PROJECT')}</span><h3>${esc(project.name)}</h3></div>${badge(project.status||'Active')}</div><p>${esc(project.note||'Sem descrição.')}</p><p class="tiny">Criado ${fmtDate(project.createdAt||project.updatedAt||now())}</p></div>
    <div class="grid2">${tile('Ideas',`${projectIdeas(project.id).length} linked`,'idea','amber','project-ideas')}${tile('Resources',`${projectResources(project.id).length} linked`,'library','blue','project-resources')}${tile('3D / CAD','Open GLB viewer','tool','lav','open-cad')}${tile('Notes',`${scoped('notes',project.id).length} notes`,'file','','project-notes')}${tile('Files',`${scoped('files',project.id).length} files`,'file','coral','project-files')}</div>`;
  if(projectTab==='notes') content=projectNotesHTML(project.id);
  if(projectTab==='ideas') content=projectIdeasHTML(project.id);
  if(projectTab==='resources') content=projectResourcesHTML(project.id);
  if(projectTab==='files') content=projectFilesHTML(project.id);
  return `<button class="backBtn" data-action="back-projects">← All Projects</button>${projectManageBar(project)}${sectionHead(project.type||'PROJECT',project.name,project.note||'Project workspace')}${tabs(tabsGeneric,projectTab,'project')}${content}`;
}


function bundleAssetListHTML(projectId,category,empty='No files in this section.'){
  const arr=bundleAssets(projectId,category);
  return arr.map(a=>`<div class="listitem bundleAsset"><span class="iconbubble">${icon(bundleAssetIcon(category))}</span><div class="grow"><b>${esc(a.name)}</b><span>${esc(a.originalPath||a.name)}</span><small>${cadFormatBytes(a.size||0)}${a.release?` · ${esc(a.release)}`:''}</small></div><button class="btn" data-openfile="${a.fileId}">${category==='3d-models'?'Open 3D':'Open'}</button></div>`).join('')||`<div class="empty">${esc(empty)}</div>`;
}
function bundleProjectPage(project){
  const tabsBundle=[
    ['overview','Overview'],['models','3D Models'],['mechanical','Mechanical / CAD'],['bom','BOM'],
    ['firmware','Firmware'],['bench','Bench Tests'],['procurement','Procurement'],['references','References'],
    ['releases','Releases'],['files','Files']
  ];
  let content='';
  const pid=project.id;
  const counts=project.importSummary||{};
  if(projectTab==='overview'){
    content=`<div class="panel bundleHero"><div class="split"><div><span class="eyebrow">IMPORTED PROJECT BUNDLE</span><h3>${esc(project.name)}</h3></div>${badge(project.currentRelease||project.version||'Release')}</div><p>${esc(project.note||'Project imported from a private bundle.')}</p><div class="bundleMeta"><span>Source of Truth: ${esc(project.sourceTruthFile||'—')}</span><span>Imported: ${fmtDate(project.importedAt||project.updatedAt||now())}</span></div></div>
      <div class="bundleCategoryGrid">
        ${bundleCategoryCard('3D Models',counts['3d-models']||0,'models','lav')}
        ${bundleCategoryCard('Mechanical / CAD',counts['mechanical-cad']||0,'mechanical','blue')}
        ${bundleCategoryCard('BOM',scoped('bom',pid).length,'bom','amber')}
        ${bundleCategoryCard('Firmware',counts.firmware||0,'firmware','')}
        ${bundleCategoryCard('Bench Tests',counts['bench-tests']||0,'bench','coral')}
        ${bundleCategoryCard('Procurement',counts.procurement||0,'procurement','amber')}
        ${bundleCategoryCard('References',counts.references||0,'references','blue')}
        ${bundleCategoryCard('Releases',(data.releases||[]).filter(r=>r.projectId===pid).length,'releases','lav')}
      </div>
      <div class="panel"><div class="split"><div><span class="eyebrow">PRIVATE BACKUP</span><h3>Original Project Bundle</h3></div>${project.bundleBackupFileId?badge('SAVED') : badge('MISSING')}</div><p>The original ZIP is kept as a private project backup in the same authenticated storage used by ROBOT LAB.</p>${project.bundleBackupFileId?`<button class="btn soft" data-openfile="${project.bundleBackupFileId}">Open backup</button>`:''}</div>`;
  }
  if(projectTab==='models') content=`<div class="panel"><h3>3D Models</h3><p>GLB/glTF assets imported from the bundle. GLB files open directly in the ROBOT LAB 3D Viewer.</p></div>${bundleAssetListHTML(pid,'3d-models','No GLB/glTF models found in this bundle.')}`;
  if(projectTab==='mechanical') content=`<div class="panel"><h3>Mechanical / CAD</h3><p>STEP / STP / STL mechanical files imported from the project bundle.</p></div>${bundleAssetListHTML(pid,'mechanical-cad','No STEP/STL mechanical files found.')}`;
  if(projectTab==='bom'){
    const bom=scoped('bom',pid);
    const sources=bundleAssets(pid,'bom');
    content=`<div class="panel"><h3>Bill of Materials</h3><p>CSV BOM files are parsed locally during import. Original BOM source files remain available below.</p></div>
      ${bom.map(x=>`<div class="listitem"><div class="grow"><b>${esc(x.name)}</b><span>${esc(x.category||'BOM')} · Qty: ${esc(x.qty||'1')}</span><small>${esc(x.note||'')}${x.sourceFile?` · ${esc(x.sourceFile)}`:''}</small></div>${badge(x.status||'IMPORTED')}</div>`).join('')||'<div class="empty">No structured BOM rows were found.</div>'}
      <h3 class="sectionLabel">BOM source files</h3>${sources.map(a=>`<div class="listitem"><span class="iconbubble">${icon('file')}</span><div class="grow"><b>${esc(a.name)}</b><span>${esc(a.originalPath)}</span></div><button class="btn" data-openfile="${a.fileId}">Open</button></div>`).join('')||'<div class="empty">No BOM source files.</div>'}`;
  }
  if(projectTab==='firmware') content=`<div class="panel"><h3>Firmware</h3><p>Firmware sources and build artifacts identified automatically by path and file extension.</p></div>${bundleAssetListHTML(pid,'firmware','No firmware files found.')}`;
  if(projectTab==='bench') content=`<div class="panel"><h3>Bench Tests</h3><p>Bench, validation and test artifacts imported from the bundle.</p></div>${bundleAssetListHTML(pid,'bench-tests','No bench-test files found.')}`;
  if(projectTab==='procurement') content=`<div class="panel"><h3>Procurement</h3><p>Supplier, purchase, sourcing and procurement material.</p></div>${bundleAssetListHTML(pid,'procurement','No procurement files found.')}`;
  if(projectTab==='references') content=`<div class="panel"><h3>References</h3><p>Images and visual references imported from the bundle.</p></div>${bundleAssetListHTML(pid,'references','No reference images found.')}`;
  if(projectTab==='releases'){
    const rel=(data.releases||[]).filter(r=>r.projectId===pid).sort((a,b)=>String(b.version).localeCompare(String(a.version),undefined,{numeric:true}));
    content=`<div class="panel"><div class="split"><div><span class="eyebrow">CURRENT RELEASE</span><h3>${esc(project.currentRelease||'—')}</h3></div>${badge('CURRENT')}</div><p>Release history detected from the Source of Truth and versioned bundle paths.</p></div>
      ${rel.map(r=>`<div class="listitem"><span class="iconbubble">${icon('decision')}</span><div class="grow"><b>${esc(r.version)}</b><span>${esc(r.note||'Imported release')}</span><small>${fmtDate(r.createdAt||project.importedAt||now())}</small></div>${badge(r.version===project.currentRelease?'CURRENT':'RELEASE')}</div>`).join('')||'<div class="empty">No releases found.</div>'}
      <h3 class="sectionLabel">Release files</h3>${bundleAssetListHTML(pid,'releases','No version-specific files found.')}`;
  }
  if(projectTab==='files') content=projectFilesHTML(pid);
  return `<button class="backBtn" data-action="back-projects">← All Projects</button>${projectManageBar(project)}${sectionHead('PROJECT BUNDLE',project.name,`${project.currentRelease||''} · Private imported workspace`)}${tabs(tabsBundle,projectTab,'project')}${content}`;
}
function bundleCategoryCard(title,count,tab,tone=''){
  return `<button class="bundleCategoryCard ${tone}" data-bundle-tab="${tab}"><b>${Number(count)||0}</b><strong>${esc(title)}</strong><span>Open section</span></button>`;
}

function humanoidProjectPage(project){
  const tabItems=[['overview','Overview'],['build','Build'],['electronics','Electronics'],['software','Software'],['bom','Parts & BOM'],['control','Control'],['tests','Tests'],['problems','Problems'],['decisions','Decisions'],['ideas','Ideas'],['resources','Resources'],['files','Files']];
  let content='';
  if(projectTab==='overview') content=`<div class="panel"><div class="split"><div><span class="eyebrow">ROBOT PROJECT</span><h3>${esc(project.name)}</h3></div>${badge('V1')}</div><p>${esc(project.note||'')}</p><div class="progress"><i style="width:42%"></i></div><p class="tiny">V1 · eletrónica principal definida, 7/12 servos comprados, estrutura e calibração ainda por fechar fisicamente.</p></div>
    <div class="grid2">${tile('Control','Simulator / Robot','control','blue','project-control')}${tile('Calibration','12 DOF limits','cal','lav','project-calibration')}${tile('3D / CAD','Open GLB viewer','tool','coral','open-cad')}${tile('Build Guide','Sequência V1','tool','','show-build')}${tile('Electronics','Arquitetura & potência','tool','amber','show-electronics')}</div>
    <h3 class="sectionLabel">Roadmap</h3><div class="roadmap">${data.roadmap.map(r=>`<div class="roadStep"><div class="split"><b>${esc(r.title)}</b>${badge(r.status)}</div><span>${esc(r.note)}</span><div class="progress"><i style="width:${Number(r.progress)||0}%"></i></div></div>`).join('')}</div>
    <h3 class="sectionLabel">Architecture</h3>${data.architecture.map(a=>`<div class="listitem"><div class="grow"><b>${esc(a.name)}</b><span>${esc(a.role)}</span></div>${badge(a.state)}</div>`).join('')}`;
  if(projectTab==='build') content=`<div class="panel"><h3>Build Guide · V1</h3><p>Ordem segura de construção para reduzir erros mecânicos e elétricos.</p></div>${[
      ['01','Bancada sem carga','ESP32 + PCA9685 + MPU6050. Confirmar alimentação e comunicação antes de ligar servos à estrutura.'],
      ['02','Um servo de teste','Ligar apenas um MG90S, centrar a 90° e confirmar sentido / alimentação.'],
      ['03','Completar os 12 servos','Não fechar movimentos finais enquanto faltarem as 5 unidades para o body map completo.'],
      ['04','Estrutura 3 mm','Montar articulações com o servo desligado, verificar folgas e colisões.'],
      ['05','Neutral mecânico','Montar braços dos servos o mais próximo possível da posição neutra física.'],
      ['06','Calibração','Definir min / neutral / max por junta; nunca usar 0–180° como limite mecânico por defeito.'],
      ['07','Stand Neutral','Validar uma pose estável antes de qualquer sequência dinâmica.'],
      ['08','Motion + Safety','Só depois avançar para sequências, balanceamento e autonomia.']
    ].map(x=>`<div class="buildStep"><b>${x[0]}</b><div><strong>${x[1]}</strong><span>${x[2]}</span></div></div>`).join('')}`;
  if(projectTab==='electronics') content=`<div class="panel"><h3>Electronics V1</h3><p>Separação lógica entre controlo, potência e sensores.</p></div><div class="architectureFlow"><div><b>Battery / Power</b><span>Gens Ace → XL4015 / MP1482</span></div><i>↓</i><div><b>ESP32 KS0413</b><span>Robot Core + communications</span></div><i>↔</i><div><b>PCA9685 KS0065</b><span>12 canais de servo PWM</span></div><i>↔</i><div><b>MPU6050 KS0170</b><span>IMU / balance / fall detection</span></div></div><div class="panel warningPanel"><h3>Power rule</h3><p>Os servos não devem ser alimentados pelo 5 V do ESP32. Potência dos servos e lógica devem ter regulação adequada e massa comum.</p></div>`;
  if(projectTab==='software') content=`<div class="panel"><h3>Robot Core V1</h3><p>A app está preparada para Simulator / Real Robot. O firmware starter continua seguro, com servo output real desligado.</p></div>${['Communication','Servo Engine','Motion Engine','Sensor Engine','Balance Engine','Behaviour Engine','Safety Engine','Brain Interface'].map((x,i)=>row(x,i<4?'V1 core':'Prepared architecture','','<span class="badge green">'+(i<4?'CORE':'READY')+'</span>')).join('')}`;
  if(projectTab==='bom') content=`<div class="actions"><button class="btn soft" data-action="add-bom">+ Componente</button></div><br>${scoped('bom',project.id).map(x=>`<div class="listitem"><div class="grow"><b>${esc(x.name)}</b><span>${esc(x.category)} · Qtd: ${esc(x.qty)}</span><small>${esc(x.note||'')}</small></div>${badge(x.status)}<button class="xbtn" data-delete="bom:${x.id}">×</button></div>`).join('')||'<div class="empty">Sem componentes.</div>'}`;
  if(projectTab==='control') content=`<div class="panel"><h3>Robot Control</h3><p>O controlo pertence a este projeto, não à navegação global.</p><div class="actions"><button class="btn primary" data-action="project-control">Open Control</button><button class="btn soft" data-action="project-calibration">Calibration</button></div></div>${diagnosticsHTML()}`;
  if(projectTab==='tests') content=listCRUD('tests','Testes','add-test');
  if(projectTab==='problems') content=listCRUD('problems','Problemas','add-problem');
  if(projectTab==='decisions') content=listCRUD('decisions','Decisões','add-decision');
  if(projectTab==='ideas') content=projectIdeasHTML(project.id);
  if(projectTab==='resources') content=projectResourcesHTML(project.id);
  if(projectTab==='files') content=projectFilesHTML(project.id);
  return `<button class="backBtn" data-action="back-projects">← All Projects</button>${projectManageBar(project)}${sectionHead('ROBOT PROJECT',project.name,'HUMANOID 180 workspace · 12 DOF · Simulator / Real Robot')}${tabs(tabItems,projectTab,'project')}${content}`;
}

function projectNotesHTML(pid){const arr=scoped('notes',pid);return `<div class="actions"><button class="btn soft" data-action="add-note">+ New Note</button></div><br>${arr.map(x=>`<div class="listitem"><span class="iconbubble">${icon('file')}</span><div class="grow"><b>${esc(x.title)}</b><span>${esc(x.note||'')}</span></div><button class="xbtn" data-delete="notes:${x.id}">×</button></div>`).join('')||'<div class="empty">Sem notas neste projeto.</div>'}`;}
function projectIdeasHTML(pid){const arr=projectIdeas(pid);return `<div class="actions"><button class="btn soft" data-action="add-project-idea">+ Project Idea</button></div><br>${arr.map(ideaHTML).join('')||'<div class="empty">Sem ideias ligadas a este projeto.</div>'}`;}
function projectResourcesHTML(pid){const arr=projectResources(pid);return `<div class="actions"><button class="btn soft" data-action="add-project-resource">+ Project Resource</button></div><br>${arr.map(resourceHTML).join('')||'<div class="empty">Sem recursos ligados a este projeto.</div>'}`;}
function projectFilesHTML(pid){const arr=scoped('files',pid);return `<div class="panel"><h3>Project files</h3><p>Private files for this project. Project Bundle imports keep the original ZIP plus every classified source file here.</p><label class="btn soft">+ Upload<input id="fileUpload" type="file" hidden></label></div>${arr.map(x=>`<div class="listitem"><span class="iconbubble">${icon(isGlbName(x.name)?'tool':'file')}</span><div class="grow"><b>${esc(x.name)}</b><span>${x.category?esc(bundleCategoryLabel(x.category))+' · ':''}${esc(x.type||'file')} · ${fmtDate(x.createdAt)}</span>${x.originalPath&&x.originalPath!==x.name?`<small>${esc(x.originalPath)}</small>`:''}</div><button class="btn" data-openfile="${x.id}">${isGlbName(x.name)?'Open 3D':'Open'}</button><button class="xbtn" data-delete="files:${x.id}">×</button></div>`).join('')||'<div class="empty">No files.</div>'}`;}
function listCRUD(key,title,addAction){const arr=scoped(key,activeProjectId);return `<div class="actions"><button class="btn soft" data-action="${addAction}">+ ${esc(title.slice(0,-1)||title)}</button></div><br>${arr.map(x=>`<div class="listitem"><span class="iconbubble">${icon(key==='tests'?'test':key==='problems'?'problem':'decision')}</span><div class="grow"><b>${esc(x.title)}</b><span>${esc(x.note||'')} · ${fmtDate(x.createdAt)}</span></div>${x.status?badge(x.status):''}<button class="xbtn" data-delete="${key}:${x.id}">×</button></div>`).join('')||`<div class="empty">Ainda não existem ${esc(title.toLowerCase())}.</div>`}`;}
function controlPage(){
  const t=[['manual','Manual'],['poses','Poses'],['motion','Motion'],['calibration','Calibration'],['diagnostics','Diagnostics'],['autonomy','Autonomy']];
  let content='';
  if(controlTab==='manual'){
    const groups=[['left-leg','Left Leg'],['right-leg','Right Leg'],['arms','Arms'],['head','Head']];
    const visible=data.servos.filter(s=>s.groupKey===manualGroup);
    content=`<div class="manualIntro"><div><div class="eyebrow">MANUAL CONTROL</div><h3>Adjust servos in real time</h3></div><span class="chip">${data.settings.mode==='simulator'?'Simulator':'Real Robot'}</span></div>
      <div class="segmentTabs">${groups.map(([key,label])=>`<button class="${manualGroup===key?'active':''}" data-servo-group="${key}">${label}</button>`).join('')}</div>
      <div class="manualServoList">${visible.map(servoHTML).join('')}</div>
      <button class="btn soft full centerAll" data-action="center-servos">Center All Servos</button>
      <button class="estop ${data.robot.emergency?'active':''}" data-action="estop">${data.robot.emergency?'RESET EMERGENCY STOP':'EMERGENCY STOP'}</button>`;
  }
  if(controlTab==='poses') content=`<div class="actions"><button class="btn soft" data-action="save-pose">+ Guardar posição atual</button></div><br>${data.poses.map(p=>`<div class="listitem"><span class="iconbubble">${icon('pose')}</span><div class="grow"><b>${esc(p.name)}</b><span>${fmtDate(p.createdAt)}</span></div><button class="btn soft" data-pose="${p.id}">Aplicar</button>${p.name!=='Stand Neutral'?`<button class="xbtn" data-delete="poses:${p.id}">×</button>`:''}</div>`).join('')}`;
  if(controlTab==='motion') content=`<div class="panel"><h3>Motion Studio V1</h3><p>Cria sequências simples a partir das poses guardadas. A execução nesta versão é feita no simulador; o firmware real terá o seu próprio Safety Engine.</p><button class="btn soft" data-action="add-sequence">+ Nova sequência</button></div>${data.sequences.map(s=>`<div class="listitem"><span class="iconbubble">${icon('motion')}</span><div class="grow"><b>${esc(s.name)}</b><span>${s.steps.length} passos · ${s.loop?'Loop':'One shot'}</span></div><button class="btn soft" data-sequence="${s.id}">Play</button><button class="xbtn" data-delete="sequences:${s.id}">×</button></div>`).join('')||'<div class="empty">Sem sequências. Guarda poses primeiro.</div>'}`;
  if(controlTab==='calibration') content=`<div class="panel"><h3>Calibration Wizard</h3><p>Os 12 canais já estão atribuídos ao HUMANOID 180. Aqui ajustas apenas posição neutra, limites mecânicos seguros e inversão, sem alterar o body map.</p><div class="actions"><button class="btn soft" data-action="center-servos">Neutral all</button></div></div>${data.servos.map(calibrationHTML).join('')}`;
  if(controlTab==='diagnostics') content=diagnosticsHTML();
  if(controlTab==='autonomy') content=autonomyHTML();
  const back=activeProjectId?`<button class="backBtn" data-action="return-active-project">← ${esc(projectLabel(activeProjectId))}</button>`:'';
  return `${back}${sectionHead('ROBOT CONNECTION',data.settings.mode==='simulator'?'Simulator':'Real Robot','O simulador é a camada ativa da V1. Hardware real só é habilitado de forma explícita.')}${tabs(t,controlTab,'control')}${content}`;
}

function servoHTML(s){
  const pct=Math.max(0,Math.min(1,(s.angle-s.min)/Math.max(1,s.max-s.min)));
  const rot=-135+(pct*270);
  const disabled=data.robot.emergency||!s.enabled;
  return `<div class="servo wheelServo ${disabled?'disabled':''}">
    <div class="wheelIdentity">
      <span class="jointIcon">${jointIcon(s)}</span>
      <div><strong>${esc(s.label)}</strong><div class="servoMeta">CH ${s.channel} · neutral ${s.neutral}°</div></div>
      <b id="angle-${s.id}">${s.angle}°</b>
    </div>
    <div class="wheelControl">
      <button class="stepBtn" data-servo-step="${s.id}:-1" ${disabled?'disabled':''} aria-label="Diminuir ${esc(s.label)}">−</button>
      <div class="knobWrap">
        <div class="knob" data-knob="${s.id}" data-min="${s.min}" data-max="${s.max}" style="--knob-rot:${rot}deg;--knob-pct:${pct*100}%;" role="slider" aria-label="${esc(s.label)}" aria-valuemin="${s.min}" aria-valuemax="${s.max}" aria-valuenow="${s.angle}" tabindex="${disabled?'-1':'0'}">
          <div class="knobArc"></div><div class="knobFace"></div><i class="knobPointer"></i>
        </div>
        <div class="knobLimits"><span>${s.min}°</span><span>${s.max}°</span></div>
      </div>
      <button class="stepBtn" data-servo-step="${s.id}:1" ${disabled?'disabled':''} aria-label="Aumentar ${esc(s.label)}">+</button>
    </div>
  </div>`;
}
function jointIcon(s){
  if(s.groupKey==='left-leg'||s.groupKey==='right-leg') return s.label.startsWith('Hip')?'◒':s.label.startsWith('Knee')?'◉':'◌';
  if(s.groupKey==='arms') return s.label.startsWith('Shoulder')?'◐':'◇';
  return s.label.includes('Pan')?'↔':'↕';
}
function calibrationHTML(s){return `<div class="servo"><div class="servoTop"><div><strong>${esc(s.label)}</strong><div class="servoMeta">Channel ${s.channel}</div></div><button class="btn" data-calservo="${s.id}">Editar</button></div><div class="limits"><span>Min ${s.min}°</span><span>Neutral ${s.neutral}°</span><span>Max ${s.max}°</span></div></div>`;}
function diagnosticsHTML(){const sen=data.sensors;return `<div class="panel"><div class="split"><div><span class="eyebrow">${data.settings.mode==='simulator'?'SIMULATED TELEMETRY':'ROBOT TELEMETRY'}</span><h3>Diagnostics</h3></div>${badge(data.connection.status)}</div><p>${data.settings.mode==='simulator'?'Os valores abaixo são simulados até existir ligação física ao ESP32.':'Telemetria recebida do Robot Core.'}</p></div><div class="statgrid"><div class="stat"><b class="ok">${esc(sen.imu)}</b><span>IMU</span></div><div class="stat"><b>${Number(sen.gyro).toFixed(2)}</b><span>Gyro °/s</span></div><div class="stat"><b>${Number(sen.accel).toFixed(2)}</b><span>Accel g</span></div><div class="stat"><b>${data.robot.temperature}°C</b><span>Temperature</span></div><div class="stat"><b>${data.robot.voltage}V</b><span>Voltage</span></div><div class="stat"><b>${data.robot.battery}%</b><span>Battery</span></div></div><div class="panel"><h3 class="${data.robot.emergency?'danger':'ok'}">Safety · ${data.robot.emergency?'E-STOP':'OK'}</h3><p>Watchdog ${data.safety.watchdogMs} ms · command rate max ${data.safety.maxCommandRateHz} Hz · real control ${data.safety.realControlArmed?'ARMED':'LOCKED'}.</p></div><div class="panel"><h3>Connection</h3><p>Endpoint: ${esc(data.settings.robotEndpoint||'not configured')}<br>Status: ${esc(data.connection.status)}${data.connection.latencyMs!=null?` · ${data.connection.latencyMs} ms`:''}</p><button class="btn soft" data-action="test-connection">Test connection</button></div><div class="panel"><h3>Motion log</h3>${data.motionLog.slice(0,8).map(x=>`<div class="tiny logline"><b>${esc(x.type)}</b> ${esc(x.name||'')} · ${fmtDate(x.at)}</div>`).join('')||'<p class="tiny">Ainda sem eventos de movimento.</p>'}</div>`;}
function autonomyHTML(){return `<div class="panel"><div class="split"><div><h3>Autonomous architecture</h3><p>Preparada, mas desligada na V1.</p></div><button class="toggle ${data.settings.featureFlags.autonomy?'on':''}" data-flag="autonomy"></button></div></div>${['Safety Engine','Servo Engine','Motion Engine','Sensor Engine','Balance Engine','Behaviour Engine','Brain Interface'].map((x,i)=>row(x,i===0?'Independente do telefone':i<4?'Architecture ready':'Future module','','<span class="badge green">READY</span>')).join('')}`;}

function ideasPage(){
  const t=[['all','All'],['unassigned','Unassigned'],['assigned','Assigned'],['research','Research']];
  if(!window.__ideasTab)window.__ideasTab='all';
  const tab=window.__ideasTab;
  let arr=data.ideas||[];
  if(tab==='unassigned')arr=arr.filter(i=>!i.projectId);
  if(tab==='assigned')arr=arr.filter(i=>!!i.projectId);
  if(tab==='research')arr=arr.filter(i=>i.status==='Research');
  return `${sectionHead('INBOX','Ideas','Captura uma ideia primeiro. Associa-a a um projeto apenas quando fizer sentido.')}
    ${tabs(t,tab,'ideas')}
    <div class="actions"><button class="btn primary" data-action="add-global-idea">+ New Idea</button></div><br>
    ${arr.map(ideaHTML).join('')||'<div class="empty">Ainda não existem ideias neste filtro.</div>'}`;
}
function ideaHTML(i){
  return `<div class="listitem ideaItem"><span class="iconbubble">${icon('idea')}</span><div class="grow"><b>${esc(i.title)}</b><span>${esc(i.category||'Idea')} · ${esc(i.status||'Idea')}</span><small>${i.projectId?`Project: ${esc(projectLabel(i.projectId))}`:'Global / Unassigned'}${i.note?` · ${esc(i.note)}`:''}</small></div>${!i.projectId?`<button class="btn soft" data-convert-idea="${i.id}">→ Project</button>`:''}<button class="xbtn" data-delete="ideas:${i.id}">×</button></div>`;
}
function libraryPage(){
  const items=[['all','All'],['video','Videos'],['tutorial','Tutorials'],['docs','Docs'],['article','Articles'],['product','Products'],['model3d','3D Models'],['global','Unassigned']];
  let arr=data.resources;
  if(libraryTab==='global')arr=globalResources();
  else if(libraryTab!=='all')arr=data.resources.filter(x=>x.type===libraryTab);
  return `${sectionHead('KNOWLEDGE','Library','A biblioteca é global. Recursos podem ficar sem projeto ou ser ligados a projetos específicos.')}${tabs(items,libraryTab,'library')}<div class="actions"><button class="btn primary" data-action="add-global-resource">+ Add Resource</button></div><br>${arr.map(resourceHTML).join('')||'<div class="empty">Ainda não existem recursos nesta categoria.</div>'}`;
}
function resourceHTML(r){const thumb=r.thumbnail||'';const links=(r.projectIds||[]).map(projectLabel).join(', ');const is3d=r.type==='model3d'||isGlbName(r.url);return `<div class="listitem">${thumb?`<img class="thumb" src="${esc(thumb)}" alt="">`:`<span class="iconbubble">${icon(is3d?'tool':r.type==='video'?'video':'library')}</span>`}<div class="grow"><b>${esc(r.title)}</b><span>${esc(r.type)} · ${esc(r.tags?.join(', ')||'')}</span><small>${links?`Projects: ${esc(links)}`:'Global / Unassigned'}${r.url?` · ${esc(r.url)}`:''}</small></div><button class="btn" ${is3d?`data-openmodelurl="${esc(r.url)}" data-modelname="${esc(r.title)}"`:`data-openurl="${esc(r.url)}"`}>${is3d?'Open 3D':'Abrir'}</button><button class="xbtn" data-delete="resources:${r.id}">×</button></div>`;}


function cadViewerPage(){
  const has=!!cadState.url;
  const dims=cadMetricSet(cadState.dimensions);
  const center=cadCenterSet(cadState.center);
  const project=projectById(cadState.projectId||activeProjectId);
  const sourceLabel=cadState.source==='local'?'Local file':cadState.source==='project'?'Project file':cadState.source==='url'?'URL':'—';
  const backLabel=activeProjectId?projectLabel(activeProjectId):'Tools';
  return `<button class="backBtn" data-action="cad-back">← ${esc(backLabel)}</button>
    ${sectionHead('TOOLS','3D / CAD Viewer','Abre ficheiros GLB diretamente no telemóvel, roda com o dedo, faz zoom, usa vistas técnicas e consulta dimensões do bounding box.')}
    <div class="panel cadLoadPanel">
      <div class="cadLoadActions">
        <label class="btn primary cadFileBtn">Open .GLB<input id="cadFileInput" type="file" accept=".glb,model/gltf-binary" hidden></label>
        <button class="btn soft" data-action="cad-clear" ${has?'':'disabled'}>Clear</button>
      </div>
      <form id="cadUrlForm" class="cadUrlForm">
        <div class="field"><label>Or open GLB URL</label><input id="cadUrlInput" name="url" inputmode="url" placeholder="https://…/model.glb"></div>
        <button class="btn soft" type="submit">Open URL</button>
      </form>
      <p class="tiny">Um GLB escolhido no telemóvel é renderizado localmente no browser; o Viewer não o envia automaticamente para a cloud. URLs externas precisam de permitir CORS.</p>
    </div>

    <div id="cadViewerShell" class="cadViewerShell ${cadState.theme==='dark'?'dark':'light'} ${cadState.grid?'withGrid':''}">
      ${has?`<model-viewer id="cadViewer"
        src="${esc(cadState.url)}"
        alt="${esc(cadState.name||'3D model')}"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="0.9"
        tone-mapping="commerce"
        interpolation-decay="120"
        ar
        ar-scale="auto"
        ar-modes="webxr scene-viewer quick-look">
          <button slot="ar-button" id="cadArButton" class="cadArButton">View in AR</button>
        </model-viewer>
        <div class="cadAxis"><span>X</span><span>Y</span><span>Z</span></div>
        <div id="cadLoadState" class="cadLoadState">Loading 3D…</div>`:
        `<div class="cadEmpty"><span class="cadCube">${icon('tool')}</span><h3>No model loaded</h3><p>Escolhe um ficheiro <b>.GLB</b> guardado no telemóvel ou abre um URL.</p></div>`}
    </div>

    ${has?`<div class="cadToolbar">
      <button data-cad-orbit="0deg 75deg auto">Front</button>
      <button data-cad-orbit="90deg 75deg auto">Right</button>
      <button data-cad-orbit="180deg 75deg auto">Back</button>
      <button data-cad-orbit="-90deg 75deg auto">Left</button>
      <button data-cad-orbit="0deg 0deg auto">Top</button>
      <button data-cad-orbit="45deg 65deg auto">ISO</button>
    </div>
    <div class="cadToolGrid">
      <button class="cadTool" data-action="cad-reset"><b>↺</b><span>Reset camera</span></button>
      <button class="cadTool" data-action="cad-fit"><b>⌗</b><span>Fit model</span></button>
      <button class="cadTool" data-action="cad-theme"><b>◐</b><span>${cadState.theme==='dark'?'Light':'Dark'} background</span></button>
      <button class="cadTool" data-action="cad-grid"><b>▦</b><span>${cadState.grid?'Hide':'Show'} grid</span></button>
      <button class="cadTool" data-action="cad-fullscreen"><b>⛶</b><span>Fullscreen</span></button>
      <button class="cadTool" data-action="cad-snapshot"><b>▣</b><span>Snapshot PNG</span></button>
    </div>

    <div class="cadTech panel">
      <div class="split"><div><span class="eyebrow">MODEL</span><h3>${esc(cadState.name)}</h3></div>${badge(sourceLabel)}</div>
      <div class="cadMeta"><span>${cadState.size?cadFormatBytes(cadState.size):'Size unknown'}</span>${project?`<span>${esc(project.name)}</span>`:''}<span id="cadArStatus">AR: checking…</span></div>
      <h4>Bounding-box dimensions</h4>
      <div class="cadDims">
        <div><span>X · width</span><b id="cadDimX">${dims.x}</b><small>${dims.unit}</small></div>
        <div><span>Y · height</span><b id="cadDimY">${dims.y}</b><small>${dims.unit}</small></div>
        <div><span>Z · depth</span><b id="cadDimZ">${dims.z}</b><small>${dims.unit}</small></div>
      </div>
      <p class="tiny">As dimensões são calculadas pelo <code>getDimensions()</code> do model-viewer e representam a bounding box do GLB em unidades glTF (metros), convertidas aqui para leitura prática.</p>
      <div class="cadCenterLine">Center: <span id="cadCenterValue">${center.x}, ${center.y}, ${center.z} ${center.unit}</span></div>
    </div>

    ${cadLocalFile?`<div class="panel"><h3>Save in a project</h3><p>Opcional: guarda este GLB nos ficheiros privados de um projeto para o voltares a abrir diretamente pela ROBOT LAB.</p><div class="cadSaveRow"><select id="cadSaveProject"><option value="">Choose project…</option>${data.projects.map(p=>`<option value="${p.id}" ${p.id===(activeProjectId||'')?'selected':''}>${esc(p.name)}</option>`).join('')}</select><button class="btn soft" data-action="cad-save-project">Save GLB</button></div></div>`:''}

    <div class="panel cadArNote"><h3>AR</h3><p>Em Android, o model-viewer tenta WebXR primeiro e pode usar Scene Viewer como fallback. Para um GLB local, WebXR é o caminho mais direto; um visualizador externo pode precisar que o modelo esteja acessível por URL.</p></div>`:''}`;
}

function bindCadViewer(){
  const mv=$('#cadViewer');
  if(!mv)return;
  const setup=()=>{
    const loaded=()=>{
      try{
        cadState.dimensions=mv.getDimensions();
        cadState.center=mv.getBoundingBoxCenter();
        const d=cadMetricSet(cadState.dimensions),c=cadCenterSet(cadState.center);
        const put=(sel,val)=>{const el=$(sel);if(el)el.textContent=val;};
        put('#cadDimX',d.x);put('#cadDimY',d.y);put('#cadDimZ',d.z);
        $$('.cadDims small').forEach(el=>el.textContent=d.unit);
        put('#cadCenterValue',`${c.x}, ${c.y}, ${c.z} ${c.unit}`);
        put('#cadLoadState','Ready · drag to rotate · pinch to zoom');
        const ar=$('#cadArStatus');
        if(ar)ar.textContent=`AR: ${mv.canActivateAR?'available':'not available on this device'}`;
      }catch(e){console.warn('CAD metrics',e);}
    };
    mv.addEventListener('load',loaded,{once:true});
    mv.addEventListener('error',()=>{const s=$('#cadLoadState');if(s)s.textContent='Could not load this GLB.';toast('Não foi possível carregar o modelo 3D.');},{once:true});
    mv.addEventListener('ar-status',e=>{cadState.arStatus=e.detail?.status||'unknown';const ar=$('#cadArStatus');if(ar)ar.textContent=`AR: ${cadState.arStatus}`;});
    if(mv.loaded)loaded();
  };
  if(customElements.get('model-viewer'))setup();
  else customElements.whenDefined('model-viewer').then(setup).catch(console.warn);

  $$('[data-cad-orbit]').forEach(b=>b.onclick=()=>{
    mv.cameraTarget='auto auto auto';
    mv.cameraOrbit=b.dataset.cadOrbit;
    mv.jumpCameraToGoal?.();
  });
}

async function loadCadLocalFile(file){
  if(!file)return;
  if(!isGlbName(file.name))return toast('Seleciona um ficheiro .GLB.');
  clearCadObjectUrl();
  cadModelObjectUrl=URL.createObjectURL(file);
  openCadModel(cadModelObjectUrl,file.name,'local',file.size,activeProjectId||null,file);
}
function loadCadUrl(url){
  const value=String(url||'').trim();
  if(!/^https:\/\//i.test(value))return toast('Usa um URL HTTPS para o ficheiro GLB.');
  if(!isGlbName(value))toast('O URL não termina em .glb; vou tentar abrir na mesma.');
  openCadModel(value,value.split('/').pop()?.split('?')[0]||'Remote GLB','url',0,activeProjectId||null,null);
}
function cadReset(){
  const mv=$('#cadViewer');if(!mv)return;
  mv.cameraTarget='auto auto auto';mv.cameraOrbit='0deg 75deg auto';mv.fieldOfView='auto';mv.resetTurntableRotation?.();mv.jumpCameraToGoal?.();
}
function cadFit(){
  const mv=$('#cadViewer');if(!mv)return;
  mv.cameraTarget='auto auto auto';mv.updateFraming?.();mv.jumpCameraToGoal?.();
}
async function cadSnapshot(){
  const mv=$('#cadViewer');if(!mv)return;
  try{
    const blob=await mv.toBlob({mimeType:'image/png'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${(cadState.name||'model').replace(/\.glb$/i,'')}-view.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);
  }catch(e){console.warn(e);toast('Não foi possível criar o snapshot.');}
}
async function saveCadToProject(){
  const pid=$('#cadSaveProject')?.value;
  if(!pid)return toast('Escolhe um projeto.');
  if(!cadLocalFile)return toast('Abre primeiro um GLB local.');
  const ok=await uploadFile(cadLocalFile,pid,false);
  if(ok){cadState.projectId=pid;toast(`GLB guardado em ${projectLabel(pid)}.`);}
}
function morePage(){
  const t=[['tools','Tools'],['settings','Settings'],['backup','Backup']];let content='';
  if(moreTab==='tools') content=`<div class="grid2">${tile('3D / CAD Viewer','GLB · touch · dimensions · AR','tool','lav','open-cad')}</div><div class="panel"><h3>3D tools</h3><p>O visualizador é global: pode abrir um modelo do telemóvel, de um URL ou diretamente dos ficheiros privados de qualquer projeto.</p></div>`;
  if(moreTab==='settings') content=settingsHTML();
  if(moreTab==='backup') content=backupHTML();
  return `${sectionHead('ROBOT LAB','More','Ferramentas, segurança, ligação ao robot, preferências e backup.')}${tabs(t,moreTab,'more')}${content}`;
}

function settingsHTML(){const f=data.settings.featureFlags;return `<div class="panel"><h3>Security</h3><p>Password-only via Supabase Auth. Dados cloud privados; cache local mantém a app utilizável em falhas de rede.</p><button class="btn warn" data-action="logout">Terminar sessão</button></div><div class="panel"><h3>Robot connection</h3><div class="field"><label>Mode</label><select id="modeSelect"><option value="simulator" ${data.settings.mode==='simulator'?'selected':''}>Simulator</option><option value="real" ${data.settings.mode==='real'?'selected':''}>Real Robot</option></select></div><div class="field"><label>ESP32 endpoint</label><input id="endpointInput" value="${esc(data.settings.robotEndpoint)}" placeholder="Ex.: http://192.168.1.50"></div><div class="actions"><button class="btn soft" data-action="test-connection">Test connection</button><button class="btn ${data.safety.realControlArmed?'warn':'soft'}" data-action="toggle-real-arm">${data.safety.realControlArmed?'LOCK REAL CONTROL':'ARM REAL CONTROL'}</button></div><p class="tiny">O modo Real Robot continua bloqueado até existir endpoint válido e ser armado explicitamente nesta sessão.</p></div><div class="panel"><h3>Feature flags</h3>${Object.entries(f).map(([k,v])=>`<div class="split" style="padding:9px 0;border-top:1px solid var(--line)"><span class="tiny">${esc(k)}</span><button class="toggle ${v?'on':''}" data-flag="${k}"></button></div>`).join('')}</div><div class="panel"><h3>Application</h3><p>ROBOT LAB ${CONFIG.appVersion} · PWA · portrait/landscape adaptive.</p>${installPrompt?'<button class="btn soft" data-action="install">Instalar aplicação</button>':'<p class="tiny">Instalada / disponível como PWA.</p>'}</div>`;}
function backupHTML(){return `<div class="panel"><h3>Backup local</h3><p>Exporta todos os dados da ROBOT LAB em JSON. O ficheiro não inclui a tua password nem tokens de autenticação.</p><div class="actions"><button class="btn soft" data-action="export-backup">Exportar JSON</button><label class="btn">Importar JSON<input id="backupImport" type="file" accept="application/json" hidden></label></div></div><div class="panel"><h3>Cloud sync</h3><p>Estado atual: <b>${syncState}</b>. Os dados são guardados no mesmo backend privado, numa entrada separada <code>${CONFIG.rowSlug}</code>.</p><button class="btn" data-action="sync-now">Sincronizar agora</button></div>`;}

function modalHTML(){if(!modal)return '';let body='';
  if(modal.type==='generic') body=`<form id="genericForm" data-kind="${modal.kind}">${modal.fields.map(f=>fieldHTML(f)).join('')}<button class="btn primary full" type="submit">Guardar</button></form>`;
  if(modal.type==='servo'){const s=data.servos.find(x=>x.id===modal.id);body=`<form id="servoForm"><div class="panel jointSummary"><div><span class="eyebrow">${esc(s.group)}</span><h3>${esc(s.label)}</h3><p>Canal ${s.channel} · body map fixo do HUMANOID 180</p></div></div><div class="grid2"><div class="field"><label>Min</label><input name="min" type="number" min="0" max="180" value="${s.min}"></div><div class="field"><label>Neutral</label><input name="neutral" type="number" min="0" max="180" value="${s.neutral}"></div><div class="field"><label>Max</label><input name="max" type="number" min="0" max="180" value="${s.max}"></div></div><label class="split calibrationToggle"><span>Inverter sentido</span><input name="reversed" type="checkbox" ${s.reversed?'checked':''}></label><br><button class="btn primary full" type="submit">Guardar calibração</button></form>`;}
  if(modal.type==='sequence') body=`<form id="sequenceForm"><div class="field"><label>Nome</label><input name="name" required placeholder="Walk Forward"></div><div class="field"><label>Poses (ordem)</label>${data.poses.map(p=>`<label class="split"><span>${esc(p.name)}</span><input type="checkbox" name="poses" value="${p.id}"></label>`).join('')}</div><div class="field"><label>Duração por passo (ms)</label><input name="duration" type="number" min="100" value="700"></div><div class="field"><label>Interpolation</label><select name="easing"><option value="smooth">Smooth</option><option value="linear">Linear</option></select></div><label class="split"><span>Loop</span><input type="checkbox" name="loop"></label><br><button class="btn primary full" type="submit">Criar sequência</button></form>`;
  if(modal.type==='project-edit'){
    const p=projectById(modal.id);
    if(p) body=`<form id="projectEditForm">
      <div class="field"><label>Project name</label><input name="name" required value="${esc(p.name)}"></div>
      <div class="field"><label>Type</label><select name="type">${['Robotics','Electronics','Software','Research','3D / Design','Other'].map(x=>`<option value="${x}" ${p.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select name="status">${['Idea','Research','Planning','In development','Imported','On hold','Archived'].map(x=>`<option value="${x}" ${p.status===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>Description</label><textarea name="note">${esc(p.note||'')}</textarea></div>
      ${p.bundleProfile?`<div class="panel editNotice"><b>Imported Project Bundle</b><p>Editing the project does not change its Source of Truth, imported release history or private bundle backup.</p></div>`:''}
      <button class="btn primary full" type="submit">Save Project</button>
    </form>`;
  }
  if(modal.type==='project-delete'){
    const p=projectById(modal.id),stats=p?projectDeleteStats(p.id):null,c=stats?.counts||{};
    if(p) body=`<form id="projectDeleteForm" class="deleteProjectForm">
      <div class="deleteWarning">
        <b>Permanent project deletion</b>
        <p>This removes the project and its private project files. Project ideas and library resources are preserved and become global/unassigned.</p>
      </div>
      <div class="deleteStats">
        <span><b>${c.files||0}</b> private files</span>
        <span><b>${c.ideas||0}</b> ideas preserved</span>
        <span><b>${c.resources||0}</b> resources preserved</span>
        <span><b>${c.releases||0}</b> releases removed</span>
      </div>
      ${p.id==='humanoid-180'?`<div class="panel humanoidDeleteNotice"><b>HUMANOID 180 special data</b><p>Deleting this project also resets its simulator poses, sequences and robot-specific project roadmap/control history.</p></div>`:''}
      <div class="field"><label>Type the project name to confirm</label><input name="confirmName" autocomplete="off" required placeholder="${esc(p.name)}"></div>
      <label class="confirmDeleteCheck"><input type="checkbox" name="understand" required><span>I understand that private project files will be permanently deleted.</span></label>
      <button class="btn danger full" type="submit">Delete ${esc(p.name)}</button>
    </form>`;
  }

  return `<div class="modalBack" data-action="close-modal"><section class="modal" onclick="event.stopPropagation()"><div class="modalHead"><h2>${esc(modal.title)}</h2><button class="xbtn" data-action="close-modal">×</button></div>${body}</section></div>`;}
function fieldHTML(f){if(f.type==='select')return `<div class="field"><label>${esc(f.label)}</label><select name="${f.name}">${f.options.map(o=>{const v=typeof o==='object'?o.value:o,l=typeof o==='object'?o.label:o;return `<option value="${esc(v)}" ${String(f.value??'')===String(v)?'selected':''}>${esc(l)}</option>`}).join('')}</select></div>`;if(f.type==='textarea')return `<div class="field"><label>${esc(f.label)}</label><textarea name="${f.name}" ${f.required?'required':''}>${esc(f.value||'')}</textarea></div>`;return `<div class="field"><label>${esc(f.label)}</label><input name="${f.name}" type="${f.type||'text'}" ${f.required?'required':''} ${f.placeholder?`placeholder="${esc(f.placeholder)}"`:''} ${f.value!==undefined?`value="${esc(f.value)}"`:''}></div>`;}

function render(){
  if(!session){$('#app').innerHTML=loginHTML();bindLogin();return;}
  const title={home:'Home',projects:activeProjectId?projectLabel(activeProjectId):'Projects',ideas:'Ideas',control:'Control',library:'Library',cad:'3D / CAD Viewer',more:'More'}[page];
  const body={home:homePage,projects:projectsPage,ideas:ideasPage,control:controlPage,library:libraryPage,cad:cadViewerPage,more:morePage}[page]();
  $('#app').innerHTML=shell(body,title);bind();drawHeaderState();if(page==='cad')bindCadViewer();
}
function bindLogin(){const form=$('#loginForm');form?.addEventListener('submit',async e=>{e.preventDefault();const btn=$('button',form);const err=$('#loginError');btn.disabled=true;btn.textContent='A entrar…';err.textContent='';try{await signIn(new FormData(form).get('password'));render();}catch(ex){err.textContent=ex.message||'Não foi possível entrar.';}finally{btn.disabled=false;btn.textContent='Entrar';}});}
function bind(){
  $$('[data-nav]').forEach(b=>b.onclick=()=>{page=b.dataset.nav;if(page==='projects'){activeProjectId=null;projectTab='overview';}render();});
  $$('[data-tabkind]').forEach(b=>b.onclick=()=>{if(b.dataset.tabkind==='project')projectTab=b.dataset.tab;if(b.dataset.tabkind==='control')controlTab=b.dataset.tab;if(b.dataset.tabkind==='more')moreTab=b.dataset.tab;if(b.dataset.tabkind==='library')libraryTab=b.dataset.tab;if(b.dataset.tabkind==='ideas')window.__ideasTab=b.dataset.tab;render();});
  $$('[data-action]').forEach(b=>b.onclick=(e)=>handleAction(b.dataset.action,e));
  $$('[data-project]').forEach(b=>b.onclick=()=>{activeProjectId=b.dataset.project;page='projects';projectTab='overview';render();});
  $$('[data-bundle-tab]').forEach(b=>b.onclick=()=>{projectTab=b.dataset.bundleTab;render();});

  $$('[data-convert-idea]').forEach(b=>b.onclick=()=>convertIdeaToProject(b.dataset.convertIdea));

  $$('[data-delete]').forEach(b=>b.onclick=()=>removeItem(b.dataset.delete));
  $$('[data-pose]').forEach(b=>b.onclick=()=>applyPose(b.dataset.pose));
  $$('[data-sequence]').forEach(b=>b.onclick=()=>playSequence(b.dataset.sequence));
  $$('[data-calservo]').forEach(b=>b.onclick=()=>{modal={type:'servo',id:b.dataset.calservo,title:'Calibration'};render();});
  $$('[data-openurl]').forEach(b=>b.onclick=()=>window.open(b.dataset.openurl,'_blank','noopener'));
  $$('[data-openmodelurl]').forEach(b=>b.onclick=()=>openCadModel(b.dataset.openmodelurl,b.dataset.modelname||'3D model','url',0,page==='projects'?activeProjectId:null,null));

  $$('[data-openfile]').forEach(b=>b.onclick=()=>openStoredFile(b.dataset.openfile));
  $$('[data-servo-group]').forEach(b=>b.onclick=()=>{manualGroup=b.dataset.servoGroup;render();});
  $$('[data-servo-step]').forEach(b=>b.onclick=()=>{const [sid,delta]=b.dataset.servoStep.split(':');adjustServo(sid,Number(delta));});
  $$('[data-knob]').forEach(k=>bindKnob(k));
  $('#fileUpload')?.addEventListener('change',e=>{if(e.target.files?.[0])uploadFile(e.target.files[0]);});
  $('#projectBundleInput')?.addEventListener('change',e=>{if(e.target.files?.[0])importProjectBundle(e.target.files[0]);});

  $('#cadFileInput')?.addEventListener('change',e=>{if(e.target.files?.[0])loadCadLocalFile(e.target.files[0]);});
  $('#cadUrlForm')?.addEventListener('submit',e=>{e.preventDefault();loadCadUrl(new FormData(e.currentTarget).get('url'));});

  $('#backupImport')?.addEventListener('change',e=>{if(e.target.files?.[0])importBackup(e.target.files[0]);});
  $('#modeSelect')?.addEventListener('change',e=>{data.settings.mode=e.target.value;if(data.settings.mode!=='real')data.safety.realControlArmed=false;markDirty();render();});
  $('#endpointInput')?.addEventListener('change',e=>{data.settings.robotEndpoint=e.target.value.trim();markDirty();});
  $('#genericForm')?.addEventListener('submit',genericSubmit);
  $('#servoForm')?.addEventListener('submit',servoSubmit);
  $('#sequenceForm')?.addEventListener('submit',sequenceSubmit);
  $('#projectEditForm')?.addEventListener('submit',projectEditSubmit);
  $('#projectDeleteForm')?.addEventListener('submit',projectDeleteSubmit);
}

function setServoAngle(s,value,rerender=false){
  if(!s||data.robot.emergency||!s.enabled)return;
  s.angle=Math.round(Math.min(s.max,Math.max(s.min,Number(value))));
  markDirty();
  if(rerender) render();
  else updateKnobVisual(s);
}
function adjustServo(id,delta){const s=data.servos.find(x=>x.id===id);setServoAngle(s,(s?.angle||0)+delta,true);}
function updateKnobVisual(s){
  const k=document.querySelector(`[data-knob="${s.id}"]`);
  const a=document.querySelector(`#angle-${s.id}`);
  if(a)a.textContent=`${s.angle}°`;
  if(!k)return;
  const pct=Math.max(0,Math.min(1,(s.angle-s.min)/Math.max(1,s.max-s.min)));
  k.style.setProperty('--knob-rot',`${-135+pct*270}deg`);
  k.style.setProperty('--knob-pct',`${pct*100}%`);
  k.setAttribute('aria-valuenow',s.angle);
}
function bindKnob(k){
  const s=data.servos.find(x=>x.id===k.dataset.knob);
  if(!s||data.robot.emergency||!s.enabled)return;
  const fromPoint=e=>{
    const r=k.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let rot=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90;
    while(rot>180)rot-=360;while(rot<-180)rot+=360;
    rot=Math.max(-135,Math.min(135,rot));
    const value=s.min+((rot+135)/270)*(s.max-s.min);
    setServoAngle(s,value,false);
  };
  k.addEventListener('pointerdown',e=>{k.setPointerCapture?.(e.pointerId);fromPoint(e);});
  k.addEventListener('pointermove',e=>{if(k.hasPointerCapture?.(e.pointerId))fromPoint(e);});
  k.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowDown'].includes(e.key)){e.preventDefault();setServoAngle(s,s.angle-1,false);}if(['ArrowRight','ArrowUp'].includes(e.key)){e.preventDefault();setServoAngle(s,s.angle+1,false);}});
}

function genericModal(kind,title,fields){modal={type:'generic',kind,title,fields};render();}
function handleAction(a,e){
  const go=(p,t)=>{page=p;if(t){if(p==='control')controlTab=t;if(p==='more')moreTab=t;}modal=null;render();};
  if(a==='all-projects'){activeProjectId=null;projectTab='overview';go('projects');}
  else if(a==='back-projects'){activeProjectId=null;projectTab='overview';go('projects');}
  else if(a==='edit-project'){const p=projectById();if(!p)return;modal={type:'project-edit',id:p.id,title:'Edit Project'};render();}
  else if(a==='delete-project'){const p=projectById();if(!p)return;modal={type:'project-delete',id:p.id,title:'Delete Project'};render();}
  else if(a==='bundle-dismiss'){bundleImportState={active:false,phase:'',message:'',done:0,total:0,error:'',projectId:null,summary:null};render();}
  else if(a==='go-project'){activeProjectId='humanoid-180';projectTab='overview';go('projects');}
  else if(a==='go-ideas')go('ideas');
  else if(a==='go-library')go('library');
  else if(a==='open-cad'){if(page!=='projects')activeProjectId=null;page='cad';modal=null;render();}
  else if(a==='cad-back'){page=activeProjectId?'projects':'more';if(page==='more')moreTab='tools';render();}
  else if(a==='cad-clear')clearCadModel();
  else if(a==='cad-reset')cadReset();
  else if(a==='cad-fit')cadFit();
  else if(a==='cad-theme'){cadState.theme=cadState.theme==='dark'?'light':'dark';const s=$('#cadViewerShell');if(s){s.classList.toggle('dark',cadState.theme==='dark');s.classList.toggle('light',cadState.theme==='light');}const span=e?.currentTarget?.querySelector('span');if(span)span.textContent=`${cadState.theme==='dark'?'Light':'Dark'} background`;}
  else if(a==='cad-grid'){cadState.grid=!cadState.grid;const s=$('#cadViewerShell');s?.classList.toggle('withGrid',cadState.grid);const span=e?.currentTarget?.querySelector('span');if(span)span.textContent=`${cadState.grid?'Hide':'Show'} grid`;}
  else if(a==='cad-fullscreen'){const s=$('#cadViewerShell');(s?.requestFullscreen?.()||s?.webkitRequestFullscreen?.());}
  else if(a==='cad-snapshot')cadSnapshot();
  else if(a==='cad-save-project')saveCadToProject();

  else if(a==='project-control'){if(activeProjectId!=='humanoid-180')return toast('Control ainda não configurado para este projeto.');go('control','manual');}
  else if(a==='return-active-project'){page='projects';projectTab='control';render();}
  else if(a==='project-calibration'){if(activeProjectId!=='humanoid-180')return toast('Calibration ainda não configurada para este projeto.');go('control','calibration');}
  else if(a==='project-ideas'){projectTab='ideas';render();}
  else if(a==='project-resources'){projectTab='resources';render();}
  else if(a==='project-notes'){projectTab='notes';render();}
  else if(a==='project-files'){projectTab='files';render();}
  else if(a==='show-build'){projectTab='build';render();}
  else if(a==='show-electronics'){projectTab='electronics';render();}
  else if(a==='show-software'){projectTab='software';render();}
  else if(a==='close-modal'){modal=null;render();}
  else if(a==='add-project')genericModal('projects','New Project',[
    {name:'name',label:'Project name',required:true,placeholder:'Ex.: Robot Arm'},
    {name:'type',label:'Type',type:'select',options:['Robotics','Electronics','Software','Research','3D / Design','Other']},
    {name:'status',label:'Status',type:'select',options:['Idea','Research','Planning','In development','On hold']},
    {name:'note',label:'Description',type:'textarea'}
  ]);
  else if(a==='add-bom')genericModal('bom','Novo componente',[{name:'name',label:'Componente',required:true},{name:'qty',label:'Quantidade',required:true},{name:'category',label:'Categoria'},{name:'status',label:'Estado',type:'select',options:['COMPRADO','A COMPRAR','ADIADO']},{name:'note',label:'Notas',type:'textarea'}]);
  else if(a==='add-test')genericModal('tests','Novo teste',[{name:'title',label:'Teste',required:true},{name:'status',label:'Resultado',type:'select',options:['PASS','FAIL','PENDING']},{name:'note',label:'Notas',type:'textarea'}]);
  else if(a==='add-problem')genericModal('problems','Novo problema',[{name:'title',label:'Problema',required:true},{name:'status',label:'Estado',type:'select',options:['OPEN','FIXED','WATCH']},{name:'note',label:'Notas',type:'textarea'}]);
  else if(a==='add-decision')genericModal('decisions','Nova decisão',[{name:'title',label:'Decisão',required:true},{name:'note',label:'Motivo / contexto',type:'textarea'}]);
  else if(a==='add-global-idea')genericModal('ideas','New Idea',[
    {name:'title',label:'Idea',required:true},
    {name:'category',label:'Category',type:'select',options:['Concept','Feature','Hardware','Software','AI','Vision','Motion','Research','Other']},
    {name:'status',label:'Status',type:'select',options:['Idea','Research','Experiment','Feature']},
    {name:'projectId',label:'Associate with project',type:'select',options:projectOptions(true),value:''},
    {name:'note',label:'Notes',type:'textarea'}
  ]);
  else if(a==='add-project-idea')genericModal('ideas','Project Idea',[
    {name:'title',label:'Idea',required:true},
    {name:'category',label:'Category',type:'select',options:['Concept','Feature','Hardware','Software','AI','Vision','Motion','Research','Other']},
    {name:'status',label:'Status',type:'select',options:['Idea','Research','Experiment','Feature']},
    {name:'projectId',label:'Project',type:'select',options:projectOptions(false),value:activeProjectId},
    {name:'note',label:'Notes',type:'textarea'}
  ]);
  else if(a==='add-global-resource')genericModal('resources','Add Resource',[
    {name:'title',label:'Title',required:true},
    {name:'url',label:'URL',required:true,placeholder:'https://...'},
    {name:'type',label:'Type',type:'select',options:['video','tutorial','docs','article','product','model3d']},
    {name:'projectId',label:'Associate with project',type:'select',options:projectOptions(true),value:''},
    {name:'tags',label:'Tags (comma separated)'},
    {name:'note',label:'Notes',type:'textarea'}
  ]);
  else if(a==='add-project-resource')genericModal('resources','Project Resource',[
    {name:'title',label:'Title',required:true},
    {name:'url',label:'URL',required:true,placeholder:'https://...'},
    {name:'type',label:'Type',type:'select',options:['video','tutorial','docs','article','product','model3d']},
    {name:'projectId',label:'Project',type:'select',options:projectOptions(false),value:activeProjectId},
    {name:'tags',label:'Tags (comma separated)'},
    {name:'note',label:'Notes',type:'textarea'}
  ]);
  else if(a==='add-note')genericModal('notes','Nova nota',[{name:'title',label:'Título',required:true},{name:'note',label:'Nota',type:'textarea',required:true}]);
  else if(a==='save-pose')genericModal('pose','Guardar pose',[{name:'name',label:'Nome',required:true,placeholder:'Stand Neutral'}]);
  else if(a==='add-sequence'){if(data.poses.length<1)return toast('Guarda pelo menos uma pose.');modal={type:'sequence',title:'Nova sequência'};render();}
  else if(a==='center-servos'){data.servos.forEach(s=>s.angle=s.neutral);markDirty();render();}
  else if(a==='toggle-mode'){data.settings.mode=data.settings.mode==='simulator'?'real':'simulator';markDirty();render();}
  else if(a==='toggle-real-arm'){if(data.safety.realControlArmed){data.safety.realControlArmed=false;toast('Real control locked.');}else{if(!data.settings.robotEndpoint)return toast('Define primeiro o endpoint do ESP32.');data.safety.realControlArmed=true;toast('Real control ARMED. Usa apenas com o robot seguro e suspenso para testes.');}markDirty();render();}
  else if(a==='test-connection')testRobotConnection();
  else if(a==='estop'){data.robot.emergency=!data.robot.emergency;if(data.robot.emergency){data.safety.realControlArmed=false;data.safety.lastStopReason='Manual E-STOP';data.motionLog.unshift({id:id(),type:'E-STOP',name:'Manual',at:now()});}markDirty();render();toast(data.robot.emergency?'Emergency Stop ativado.':'Emergency Stop reposto.');}
  else if(a==='logout')logout();
  else if(a==='sync-now')saveRemote().then(()=>{render();toast(syncState==='synced'?'Sincronizado.':'Mantido localmente.');});
  else if(a==='export-backup')exportBackup();
  else if(a==='install')installApp();
  else if(a==='noop')toast('Área preparada para conteúdo do projeto.');
}


function projectEditSubmit(e){
  e.preventDefault();
  const p=projectById(modal?.id);
  if(!p)return;
  const fd=new FormData(e.currentTarget);
  const name=String(fd.get('name')||'').trim();
  if(!name)return toast('Project name is required.');
  const duplicate=data.projects.some(x=>x.id!==p.id&&String(x.name).trim().toLowerCase()===name.toLowerCase());
  if(duplicate)return toast('A project with this name already exists.');
  p.name=name;
  p.type=String(fd.get('type')||p.type||'Other');
  p.status=String(fd.get('status')||p.status||'Planning');
  p.note=String(fd.get('note')||'').trim();
  p.updatedAt=now();
  modal=null;
  markDirty();
  render();
  toast('Project updated.');
}
async function deleteStoragePaths(paths=[]){
  const unique=[...new Set(paths.filter(Boolean).map(String))];
  if(!unique.length)return {deleted:0};
  let deleted=0;
  for(let i=0;i<unique.length;i+=1000){
    const chunk=unique.slice(i,i+1000);
    const r=await api(`${CONFIG.supabaseUrl}/storage/v1/object/${CONFIG.storageBucket}`,{
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prefixes:chunk})
    });
    if(!r.ok)throw new Error(await r.text());
    deleted+=chunk.length;
  }
  return {deleted};
}
function removeProjectFromState(pid){
  // Preserve knowledge: project ideas/resources become global rather than disappearing.
  data.ideas=(data.ideas||[]).map(i=>i.projectId===pid?{...i,projectId:null}:i);
  data.resources=(data.resources||[]).map(r=>({...r,projectIds:(r.projectIds||[]).filter(x=>x!==pid)}));

  // Remove project-owned records.
  for(const key of ['bom','tests','problems','decisions','notes','files','projectAssets','releases','bundleImports']){
    if(Array.isArray(data[key]))data[key]=data[key].filter(x=>x.projectId!==pid);
  }
  data.projects=(data.projects||[]).filter(p=>p.id!==pid);

  // HUMANOID 180 has additional legacy/specialized data that predates generic project scoping.
  if(pid==='humanoid-180'){
    const fresh=seedData();
    data.poses=[];
    data.sequences=[];
    data.motionLog=[];
    data.roadmap=[];
    data.architecture=[];
    data.servos=fresh.servos;
    data.robot={...fresh.robot,name:'HUMANOID 180'};
    data.safety={...fresh.safety};
    data.connection={...fresh.connection};
    data.settings={...data.settings,mode:'simulator'};
  }
}
async function projectDeleteSubmit(e){
  e.preventDefault();
  const p=projectById(modal?.id);
  if(!p)return;
  const fd=new FormData(e.currentTarget);
  if(String(fd.get('confirmName')||'').trim()!==p.name)return toast('Project name does not match.');
  if(fd.get('understand')!=='on')return toast('Confirm the permanent deletion.');

  const button=e.currentTarget.querySelector('button[type="submit"]');
  if(button){button.disabled=true;button.textContent='Deleting…';}

  try{
    const paths=uniqueStoragePathsForProject(p.id);
    if(paths.length&&!navigator.onLine)throw new Error('You are offline. Connect to the internet before deleting a project with private files.');

    // Delete private storage objects first. If Storage rejects the operation, the project state is left intact.
    if(paths.length)await deleteStoragePaths(paths);

    const deletedName=p.name;
    removeProjectFromState(p.id);
    activeProjectId=null;
    page='projects';
    projectTab='overview';
    modal=null;
    markDirty();
    await saveRemote();
    render();
    toast(`${deletedName} deleted.`);
  }catch(err){
    console.error('Project delete',err);
    if(button){button.disabled=false;button.textContent=`Delete ${p.name}`;}
    toast('Project was not deleted. Private-file deletion was blocked or failed.');
  }
}

function genericSubmit(e){e.preventDefault();const form=e.currentTarget;const kind=form.dataset.kind;const fd=Object.fromEntries(new FormData(form));
  if(kind==='pose'){
    data.poses.push({id:id(),name:fd.name,angles:data.servos.map(s=>s.angle),createdAt:now()});
  } else if(kind==='projects'){
    const obj={id:id(),name:fd.name,type:fd.type,status:fd.status,note:fd.note||'',createdAt:now(),updatedAt:now()};
    data.projects.unshift(obj);activeProjectId=obj.id;page='projects';projectTab='overview';
  } else {
    const obj={id:id(),...fd,createdAt:now()};
    if(['bom','tests','problems','decisions','notes'].includes(kind)) obj.projectId=activeProjectId||'humanoid-180';
    if(kind==='ideas') obj.projectId=fd.projectId||null;
    if(kind==='resources'){
      obj.projectIds=fd.projectId?[fd.projectId]:[];
      delete obj.projectId;
      obj.tags=String(fd.tags||'').split(',').map(x=>x.trim()).filter(Boolean);
      obj.thumbnail=youtubeThumb(fd.url);
    }
    data[kind].unshift(obj);
  }
  modal=null;markDirty();render();toast('Guardado.');
}
function convertIdeaToProject(ideaId){
  const idea=data.ideas.find(i=>i.id===ideaId);if(!idea)return;
  const p={id:id(),name:idea.title,type:'Research',status:'Idea',note:idea.note||`Created from Idea Vault · ${idea.category||'Idea'}`,createdAt:now(),updatedAt:now()};
  data.projects.unshift(p);idea.projectId=p.id;activeProjectId=p.id;page='projects';projectTab='overview';markDirty();render();toast('Ideia convertida em projeto.');
}

function servoSubmit(e){e.preventDefault();const s=data.servos.find(x=>x.id===modal.id);const fd=new FormData(e.currentTarget);let mn=Number(fd.get('min')),ne=Number(fd.get('neutral')),mx=Number(fd.get('max'));if(!(0<=mn&&mn<ne&&ne<mx&&mx<=180))return toast('Usa limites válidos: min < neutral < max.');Object.assign(s,{min:mn,neutral:ne,max:mx,reversed:fd.get('reversed')==='on',angle:Math.min(mx,Math.max(mn,s.angle))});modal=null;markDirty();render();}
function sequenceSubmit(e){e.preventDefault();const fd=new FormData(e.currentTarget);const poses=fd.getAll('poses');if(!poses.length)return toast('Seleciona pelo menos uma pose.');data.sequences.push({id:id(),name:fd.get('name'),steps:poses.map(p=>({poseId:p,duration:Number(fd.get('duration'))||700,easing:fd.get('easing')||'smooth'})),loop:fd.get('loop')==='on',createdAt:now()});modal=null;markDirty();render();}
function removeItem(spec){const [key,itemId]=spec.split(':');if(!Array.isArray(data[key]))return;data[key]=data[key].filter(x=>x.id!==itemId);markDirty();render();}
function applyPose(poseId){if(data.robot.emergency)return toast('E-STOP ativo.');const p=data.poses.find(x=>x.id===poseId);if(!p)return;p.angles.forEach((a,i)=>{const s=data.servos[i];s.angle=Math.max(s.min,Math.min(s.max,a));});markDirty();render();toast(`Pose aplicada: ${p.name}`);}
async function interpolateToAngles(target,duration=700,easing='smooth'){const start=data.servos.map(s=>s.angle),t0=performance.now();return new Promise(resolve=>{const frame=(ts)=>{if(data.robot.emergency)return resolve();const p=Math.min(1,(ts-t0)/Math.max(80,duration));const k=easing==='linear'?p:(p*p*(3-2*p));target.forEach((a,i)=>{const s=data.servos[i];const safe=Math.max(s.min,Math.min(s.max,a));s.angle=Math.round(start[i]+(safe-start[i])*k);});if(page==='control'&&controlTab==='manual')data.servos.filter(s=>s.groupKey===manualGroup).forEach(updateKnobVisual);if(p<1)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});}
async function playSequence(seqId){if(data.robot.emergency)return toast('E-STOP ativo.');const seq=data.sequences.find(x=>x.id===seqId);if(!seq)return;data.motionLog.unshift({id:id(),type:'START',name:seq.name,at:now()});toast(`A executar ${seq.name} no simulador…`);for(const step of seq.steps){const pose=data.poses.find(p=>p.id===step.poseId);if(!pose)continue;await interpolateToAngles(pose.angles,step.duration,step.easing||'smooth');cache();if(data.robot.emergency)break;}data.motionLog.unshift({id:id(),type:data.robot.emergency?'STOP':'DONE',name:seq.name,at:now()});markDirty();render();toast(data.robot.emergency?'Sequência interrompida.':'Sequência concluída.');}
function youtubeThumb(url=''){const m=String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);return m?`https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`:'';}
async function testRobotConnection(){let ep=String(data.settings.robotEndpoint||'').trim();if(!ep)return toast('Define o endpoint do ESP32 em Settings.');if(!/^https?:\/\//i.test(ep))ep='http://'+ep;const started=performance.now();try{const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),2500);const r=await fetch(ep.replace(/\/$/,'')+'/status',{signal:ctrl.signal,cache:'no-store'});clearTimeout(timer);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();data.connection={...data.connection,lastCheck:now(),status:'CONNECTED',latencyMs:Math.round(performance.now()-started),firmware:j.firmware||j.version||'connected'};toast(`Robot Core ligado · ${data.connection.latencyMs} ms`);}catch(e){data.connection={...data.connection,lastCheck:now(),status:'UNREACHABLE',latencyMs:null};data.safety.realControlArmed=false;toast('Robot Core não acessível. Simulator permanece seguro.');}markDirty();render();}
function exportBackup(){const payload={exportedAt:now(),app:'ROBOT LAB',version:CONFIG.appVersion,data};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`robot-lab-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function importBackup(file){try{const j=JSON.parse(await file.text());if(!j?.data?.schemaVersion)throw new Error();data=mergeData(seedData(),j.data);cache();markDirty();render();toast('Backup importado.');}catch{toast('Ficheiro de backup inválido.');}}

async function privateUploadBlob(blob,storagePath,mime='application/octet-stream',upsert=false){
  const r=await api(`${CONFIG.supabaseUrl}/storage/v1/object/${CONFIG.storageBucket}/${storagePath}`,{
    method:'POST',
    headers:{'Content-Type':mime,'x-upsert':upsert?'true':'false'},
    body:blob
  });
  if(!r.ok)throw new Error(await r.text());
  return storagePath;
}
function bundleFileRecord({projectId,bundleId,name,originalPath,size,type,path,category,release=null,isBundleBackup=false}){
  const rec={id:id(),name,type:type||bundleMime(name),size:Number(size)||0,path,projectId,createdAt:now(),category,bundleId,originalPath,isBundleBackup};
  data.files.unshift(rec);
  data.projectAssets.unshift({id:id(),fileId:rec.id,projectId,bundleId,name,originalPath,size:Number(size)||0,type:rec.type,path,category,release,createdAt:now()});
  return rec;
}
function ensureRelease(projectId,version,note='',bundleId=null){
  if(!version)return null;
  const v=String(version).replace(/^v/i,'V');
  let r=data.releases.find(x=>x.projectId===projectId&&String(x.version).toLowerCase()===v.toLowerCase());
  if(!r){r={id:id(),projectId,version:v,note:note||'Imported from project bundle',bundleId,status:'release',createdAt:now()};data.releases.push(r);}
  return r;
}
async function importProjectBundle(file){
  if(!session)return toast('Login required.');
  if(!navigator.onLine)return toast('Project Bundle import needs a connection to save the private backup.');
  if(!/\.zip$/i.test(file.name))return toast('Select a .zip Project Bundle.');
  if(typeof JSZip==='undefined')return toast('ZIP engine is not available. Reopen ROBOT LAB online and try again.');

  bundleImportState={active:true,phase:'LOCAL SCAN',message:'Reading ZIP locally…',done:0,total:0,error:'',projectId:null,summary:null};
  activeProjectId=null;page='projects';projectTab='overview';render();

  let zip,sourceEntry,sourcePath,sourceTruth,meta,entries=[],project,bundleId=id();
  try{
    zip=await JSZip.loadAsync(file,{checkCRC32:false,createFolders:false});
    const all=Object.values(zip.files).filter(e=>!e.dir);
    bundleImportState.total=all.length+1;
    setBundleProgress('Searching for Project Source of Truth…',0,bundleImportState.total,'LOCAL SCAN');

    sourceEntry=all.find(e=>/^TP7_RADIO_PROJECT_SOURCE_OF_TRUTH_V0_13\.json$/i.test(baseName(e.name)))
      ||all.find(e=>/_PROJECT_SOURCE_OF_TRUTH_.*\.json$/i.test(baseName(e.name)));
    if(!sourceEntry)throw new Error('No *_PROJECT_SOURCE_OF_TRUTH_*.json file was found in this bundle.');

    sourcePath=cleanBundlePath(sourceEntry.name);
    const sourceText=await sourceEntry.async('string');
    try{sourceTruth=JSON.parse(sourceText);}catch{throw new Error(`Could not parse ${baseName(sourcePath)} as JSON.`);}
    meta=inferBundleProject(sourceTruth,sourcePath);

    entries=all.map(e=>({
      entry:e,
      originalPath:cleanBundlePath(e.name),
      name:baseName(e.name),
      category:bundleCategory(e.name),
      release:releaseFromPath(e.name)
    }));
    const summary=bundleSummaryFromEntries(entries);

    const existing=data.projects.find(p=>p.name===meta.projectName&&p.bundleProfile);
    project=existing||{
      id:meta.exactTP7?'tp7-radio-v1':id(),
      name:meta.projectName,
      type:'Robotics',
      status:'Imported',
      createdAt:now()
    };
    project.name=meta.projectName;
    project.note=meta.exactTP7?'TP-7 RADIO V1 imported from its private Project Bundle.':'Project created from imported Source of Truth bundle.';
    project.bundleProfile=meta.exactTP7?'tp7-radio-v1':'project-bundle';
    project.sourceTruthFile=sourcePath;
    project.sourceOfTruth=sourceTruth;
    project.currentRelease=meta.currentRelease;
    project.version=meta.currentRelease;
    project.importedAt=now();
    project.updatedAt=now();
    project.importSummary=summary;
    project.lastBundleId=bundleId;
    if(!existing)data.projects.unshift(project);

    ensureRelease(project.id,meta.currentRelease,'Current release from Project Source of Truth',bundleId);

    // Detect other release/version paths.
    entries.forEach(x=>{
      if(x.category==='releases'&&x.release)ensureRelease(project.id,x.release,`Detected in ${x.originalPath}`,bundleId);
    });

    // Parse CSV/BOM locally before uploading anything.
    const bomEntries=entries.filter(x=>x.category==='bom'&&extName(x.originalPath)==='csv');
    for(const x of bomEntries){
      try{
        const text=await x.entry.async('string');
        const rows=csvToObjects(text);
        const parsed=bomFromCsvRows(rows,project.id,bundleId,x.originalPath);
        data.bom.push(...parsed);
      }catch(e){console.warn('BOM parse',x.originalPath,e);}
    }

    cache();
    setBundleProgress(`Source of Truth loaded · ${meta.projectName} · ${meta.currentRelease}`,1,bundleImportState.total,'PRIVATE BACKUP');

    // Original ZIP is saved first as the project's immutable private backup.
    const root=`${session.user.id}/robot-lab/project-bundles/${safeStoragePart(project.id)}/${safeStoragePart(bundleId)}`;
    const backupPath=`${root}/backup/${safeStoragePart(file.name)}`;
    await privateUploadBlob(file,backupPath,'application/zip',false);
    const backupRec={id:id(),name:file.name,type:'application/zip',size:file.size,path:backupPath,projectId:project.id,createdAt:now(),category:'bundle-backup',bundleId,originalPath:file.name,isBundleBackup:true};
    data.files.unshift(backupRec);
    data.projectAssets.unshift({id:id(),fileId:backupRec.id,projectId:project.id,bundleId,name:file.name,originalPath:file.name,size:file.size,type:'application/zip',path:backupPath,category:'bundle-backup',createdAt:now()});
    project.bundleBackupFileId=backupRec.id;

    let done=1,uploaded=0,failed=[];
    setBundleProgress('Original ZIP saved privately. Importing classified files…',done,bundleImportState.total,'DISTRIBUTING');

    for(const x of entries){
      done++;
      try{
        const blob=await x.entry.async('blob');
        const relPath=x.originalPath.split('/').map(safeStoragePart).join('/');
        const storagePath=`${root}/extracted/${relPath}`;
        await privateUploadBlob(blob,storagePath,bundleMime(x.originalPath),false);
        bundleFileRecord({
          projectId:project.id,bundleId,name:x.name,originalPath:x.originalPath,size:blob.size,
          type:bundleMime(x.originalPath),path:storagePath,category:x.category,release:x.release
        });
        uploaded++;
      }catch(e){
        console.warn('Bundle file import failed',x.originalPath,e);
        failed.push(x.originalPath);
      }
      setBundleProgress(`Importing ${x.originalPath}`,done,bundleImportState.total,'DISTRIBUTING');
      if(done%4===0)await new Promise(r=>setTimeout(r,0));
    }

    const importRecord={
      id:bundleId,projectId:project.id,fileName:file.name,sourceTruthFile:sourcePath,currentRelease:meta.currentRelease,
      importedAt:now(),fileCount:entries.length,uploadedCount:uploaded,failedFiles:failed,
      summary:bundleSummaryFromEntries(entries),backupFileId:project.bundleBackupFileId
    };
    data.bundleImports.unshift(importRecord);
    project.importSummary=importRecord.summary;
    project.importedFileCount=uploaded;
    project.importWarnings=failed.length;
    project.updatedAt=now();

    markDirty();
    await saveRemote();

    bundleImportState={
      active:false,phase:'COMPLETE',message:'',done:bundleImportState.total,total:bundleImportState.total,error:'',
      projectId:project.id,
      summary:{projectName:project.name,release:project.currentRelease,files:uploaded,failed:failed.length}
    };
    activeProjectId=project.id;page='projects';projectTab='overview';render();
    toast(failed.length?`Project imported with ${failed.length} file warning(s).`:`${project.name} imported · ${project.currentRelease}`);
  }catch(e){
    console.error('Project Bundle import',e);
    bundleImportState={active:false,phase:'ERROR',message:'',done:0,total:0,error:e?.message||'Could not import this Project Bundle.',projectId:null,summary:null};
    render();
  }
}

async function uploadFile(file,projectId=activeProjectId||null,rerender=true){if(!session)return false;toast('A enviar ficheiro…');try{const path=`${session.user.id}/robot-lab/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const r=await api(`${CONFIG.supabaseUrl}/storage/v1/object/${CONFIG.storageBucket}/${path}`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});if(!r.ok)throw new Error(await r.text());data.files.unshift({id:id(),name:file.name,type:file.type,size:file.size,path,projectId:projectId||null,createdAt:now()});markDirty();if(rerender)render();toast('Ficheiro guardado.');return true;}catch(e){console.warn(e);toast('Não foi possível enviar. Mantive a aplicação sem alterações.');return false;}}
async function openStoredFile(fileId){const f=data.files.find(x=>x.id===fileId);if(!f)return;try{const r=await api(`${CONFIG.supabaseUrl}/storage/v1/object/sign/${CONFIG.storageBucket}/${f.path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});if(!r.ok)throw new Error();const j=await r.json();const signed=j.signedURL||j.signedUrl;if(!signed)throw new Error();const url=`${CONFIG.supabaseUrl}/storage/v1${signed}`;if(isGlbName(f.name)){activeProjectId=f.projectId||activeProjectId;openCadModel(url,f.name,'project',f.size,f.projectId||null,null);}else window.open(url,'_blank','noopener');}catch{toast('Não foi possível abrir o ficheiro.');}}
async function installApp(){if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;render();}else toast('No Chrome: menu → Adicionar ao ecrã principal.');}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;render();});
window.addEventListener('online',()=>{drawHeaderState();if(session){loadRemote();}});
window.addEventListener('offline',()=>drawHeaderState());
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw-v17.js').catch(console.warn));
setInterval(()=>{if(!session)return;data.sensors={...data.sensors,gyro:(Math.random()-.5)*.06,accel:.01+Math.random()*.03,pitch:(Math.random()-.5)*1.4,roll:(Math.random()-.5)*1.4,lastUpdate:now()};if(page==='control'&&controlTab==='diagnostics')render();},2500);
setInterval(()=>{if(session&&navigator.onLine&&syncState!=='syncing'&&syncState!=='synced'){loadRemote();}},30000);

(async()=>{if(session){if(await ensureSession())await loadRemote();else render();}else render();})();
