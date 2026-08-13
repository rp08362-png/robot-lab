import { CONFIG } from './config.js';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const id = () => crypto.randomUUID();
const esc = (v='') => String(v).replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
const fmtDate = (v) => new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v));
const now = () => new Date().toISOString();

const STORAGE = {session:'robotlab.session.v1', cache:'robotlab.cache.v1'};
let session = JSON.parse(localStorage.getItem(STORAGE.session)||'null');
let data = JSON.parse(localStorage.getItem(STORAGE.cache)||'null') || seedData();
let rowId = null;
let page = 'home';
let projectTab = 'overview';
let controlTab = 'manual';
let moreTab = 'ideas';
let libraryTab = 'all';
let modal = null;
let saveTimer = null;
let syncState = 'local';
let installPrompt = null;
let toastTimer = null;

function seedData(){
  return {
    schemaVersion:1,
    updatedAt:now(),
    settings:{mode:'simulator',robotEndpoint:'',autoSync:true,lockTimeout:30,featureFlags:{viewer3d:false,camera:false,voice:false,autonomy:false,aiBrain:false,landscapeControl:false,advancedMotion:false}},
    robot:{name:'HUMANOID 180',version:'V1',dof:12,status:'development',battery:82,voltage:7.6,temperature:23,emergency:false},
    servos:Array.from({length:12},(_,i)=>({id:`servo-${i+1}`,channel:i,label:`Servo ${String(i+1).padStart(2,'0')}`,group:'Por atribuir',angle:90,neutral:90,min:20,max:160,reversed:false,enabled:true})),
    poses:[{id:id(),name:'Stand Neutral',angles:Array(12).fill(90),createdAt:now()}],
    sequences:[],
    sensors:{imu:'OK',gyro:0.01,accel:0.02,pitch:0,roll:0,connection:'Simulator',lastUpdate:now()},
    projects:[{id:'humanoid-180',name:'HUMANOID 180',version:'V1',status:'Em desenvolvimento',note:'Robot humanoide modular, 12 DOF, arquitetura preparada para autonomia e IA.',updatedAt:now()}],
    bom:[
      {id:id(),name:'TowerPro MG90S 180°',qty:'7',status:'COMPRADO',category:'Servos',note:'Servos já encomendados.'},
      {id:id(),name:'ESP32 KS0413',qty:'1',status:'COMPRADO',category:'Eletrónica',note:'Controlador principal.'},
      {id:id(),name:'PCA9685 KS0065',qty:'1',status:'COMPRADO',category:'Eletrónica',note:'Driver PWM de servos.'},
      {id:id(),name:'MPU6050 KS0170',qty:'1',status:'COMPRADO',category:'Sensores',note:'IMU.'},
      {id:id(),name:'DFR1154',qty:'1',status:'COMPRADO',category:'Eletrónica',note:''},
      {id:id(),name:'XL4015',qty:'2',status:'COMPRADO',category:'Potência',note:'Conversores DC-DC.'},
      {id:id(),name:'MP1482',qty:'1',status:'COMPRADO',category:'Potência',note:''},
      {id:id(),name:'Kit breadboard 830 pontos',qty:'1',status:'COMPRADO',category:'Bancada',note:'Prototipagem e aprendizagem; fora da potência dos servos.'},
      {id:id(),name:'Contraplacado 3 mm',qty:'A definir',status:'A COMPRAR',category:'Estrutura',note:'Estrutura inicial.'}
    ],
    ideas:[
      {id:id(),title:'Auto Balance',category:'Feature',note:'Usar IMU para melhorar estabilidade.',status:'Research',createdAt:now()},
      {id:id(),title:'Voice Commands',category:'AI',note:'Interface futura de voz.',status:'Idea',createdAt:now()},
      {id:id(),title:'Vision Tracking',category:'Vision',note:'Câmara e tracking numa fase futura.',status:'Idea',createdAt:now()}
    ],
    resources:[],tests:[],problems:[],decisions:[],files:[],notes:[]
  };
}

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
async function loadRemote(){
  if(!session) return;
  syncState='syncing'; drawHeaderState();
  try{
    const r=await api(`${CONFIG.supabaseUrl}/rest/v1/development_projects?slug=eq.${encodeURIComponent(CONFIG.rowSlug)}&select=id,data,updated_at&limit=1`);
    if(!r.ok) throw new Error(await r.text());
    const rows=await r.json();
    if(rows.length){rowId=rows[0].id; const remote=rows[0].data; if(remote?.schemaVersion){data=mergeData(seedData(),remote);cache();}}
    else{
      const payload={user_id:session.user.id,slug:CONFIG.rowSlug,name:'ROBOT LAB',category:'Robotics',version:CONFIG.appVersion,status:'active',progress:'V1',data};
      const cr=await api(`${CONFIG.supabaseUrl}/rest/v1/development_projects`,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
      if(!cr.ok) throw new Error(await cr.text()); const made=await cr.json(); rowId=made[0]?.id;
    }
    syncState='synced';
  }catch(e){console.warn(e);syncState='local';toast('Modo local: sincronização indisponível.');}
  render();
}
function mergeData(base,remote){
  const out={...base,...remote};
  out.settings={...base.settings,...(remote.settings||{}),featureFlags:{...base.settings.featureFlags,...(remote.settings?.featureFlags||{})}};
  out.robot={...base.robot,...(remote.robot||{})};
  if(!Array.isArray(out.servos)||out.servos.length!==12) out.servos=base.servos;
  for(const k of ['poses','sequences','projects','bom','ideas','resources','tests','problems','decisions','files','notes']) if(!Array.isArray(out[k])) out[k]=base[k];
  return out;
}
async function saveRemote(){
  if(!session||!rowId||!navigator.onLine) return;
  syncState='syncing';drawHeaderState();
  try{
    const r=await api(`${CONFIG.supabaseUrl}/rest/v1/development_projects?id=eq.${rowId}`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({data,updated_at:now(),status:'active',progress:'V1'})});
    if(!r.ok) throw new Error(await r.text());syncState='synced';
  }catch(e){console.warn(e);syncState='local';}
  drawHeaderState();
}

function icon(name){const m={home:'⌂',projects:'▣',control:'⌘',library:'▤',more:'•••',idea:'◇',tool:'⌁',diag:'◉',cal:'⊕',file:'▧',video:'▶',test:'✓',problem:'!',decision:'◆',pose:'◎',motion:'↝',settings:'⚙',backup:'⇄'};return m[name]||'•';}
function badge(status){let cls=status==='COMPRADO'||status==='PASS'?'green':status==='A COMPRAR'||status==='Research'?'amber':status==='ADIADO'||status==='OPEN'?'coral':'';return `<span class="badge ${cls}">${esc(status)}</span>`;}
function sectionHead(kicker,title,desc=''){return `<section class="sectionHead"><p class="eyebrow">${esc(kicker)}</p><h2>${esc(title)}</h2>${desc?`<p>${esc(desc)}</p>`:''}</section>`;}
function tabs(items,active,kind){return `<div class="tabs">${items.map(([key,label])=>`<button class="tab ${active===key?'active':''}" data-tabkind="${kind}" data-tab="${key}">${esc(label)}</button>`).join('')}</div>`;}
function row(title,sub='',action='',extra=''){return `<button class="rowcard" ${action?`data-action="${action}"`:''}><div><strong>${esc(title)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</div>${extra||'<div class="right">›</div>'}</button>`;}
function tile(title,sub,ico,tone='',action=''){return `<button class="tile ${tone}" ${action?`data-action="${action}"`:''}><span class="iconbubble">${icon(ico)}</span><div><strong>${esc(title)}</strong><span>${esc(sub)}</span></div></button>`;}
function nav(){const n=[['home','Home','home'],['projects','Projects','projects'],['control','Control','control'],['library','Library','library'],['more','More','more']];return `<nav class="nav">${n.map(([k,l,i])=>`<button class="${page===k?'active':''}" data-nav="${k}"><b>${icon(i)}</b><span>${l}</span></button>`).join('')}</nav>`;}
function drawHeaderState(){const s=$('#syncState');if(!s)return;s.className=`syncLine ${syncState==='synced'?'':'local'}`;s.innerHTML=`<i></i>${syncState==='synced'?'Synced':syncState==='syncing'?'A sincronizar…':navigator.onLine?'Local':'Offline'}`;document.body.classList.toggle('offline',!navigator.onLine);}
function shell(body,title){return `<div class="shell"><header class="topbar"><div><div class="brand">ROBOT LAB</div><h1>${esc(title)}</h1></div><div><div class="statusdot"></div><div id="syncState" class="syncLine ${syncState==='synced'?'':'local'}"><i></i>${syncState==='synced'?'Synced':syncState==='syncing'?'A sincronizar…':navigator.onLine?'Local':'Offline'}</div></div></header><main class="content">${body}</main>${nav()}${modalHTML()}</div>`;}

function loginHTML(){return `<main class="login"><section class="loginCard"><div class="brand">ROBOT LAB</div><div class="loginVisual"><img src="./robot-main.jpg" alt="Robot visual ROBOT LAB"></div><h1>Build. Control. Evolve.</h1><p>Laboratório privado de robótica. A autenticação usa a mesma conta única protegida do teu arquivo pessoal.</p><form id="loginForm"><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" minlength="8" autocomplete="current-password" required autofocus placeholder="••••••••••••"></div><div id="loginError" class="tiny danger"></div><button class="btn primary full" type="submit">Entrar</button></form></section></main>`;}

function homePage(){
  const purchased=data.bom.filter(x=>x.status==='COMPRADO').length;
  return `<section class="hero"><div class="heroText"><div class="eyebrow">${esc(data.robot.name)} · ${esc(data.robot.version)}</div><h2>Ready to build.</h2><span class="chip">● ${data.settings.mode==='simulator'?'Simulator':'Real Robot'}</span></div><img src="./robot-main.jpg" alt="ROBOT LAB robot"><div class="metrics"><div class="metric"><b>${data.robot.battery}%</b><span>Battery</span></div><div class="metric"><b>${data.robot.dof}</b><span>DOF</span></div><div class="metric"><b>${purchased}</b><span>Comprado</span></div></div></section>
  ${installPrompt?`<div class="installBanner"><span>A ROBOT LAB está pronta para instalar como aplicação.</span><button class="btn soft" data-action="install">Instalar</button></div>`:''}
  <h3 class="sectionLabel">Quick access</h3><div class="grid2">
    ${tile('HUMANOID 180','Project hub','projects','lav','go-project')}${tile('Control','12-servo simulator','control','blue','go-control')}${tile('Idea Vault',`${data.ideas.length} ideias`,'idea','amber','go-ideas')}${tile('Library',`${data.resources.length} recursos`,'library','coral','go-library')}${tile('Diagnostics','Sensors & system','diag','','go-diagnostics')}${tile('Calibration','Servo limits','cal','','go-calibration')}
  </div>
  <h3 class="sectionLabel">System</h3><div class="statgrid"><div class="stat"><b class="ok">${data.robot.emergency?'STOP':'OK'}</b><span>Safety state</span></div><div class="stat"><b>${data.servos.filter(s=>s.enabled).length}/12</b><span>Servos enabled</span></div></div>`;
}

function projectsPage(){
  const tabItems=[['overview','Overview'],['bom','Parts & BOM'],['tests','Tests'],['problems','Problems'],['decisions','Decisions'],['files','Files']];
  let content='';
  if(projectTab==='overview') content=`<div class="panel"><div class="split"><div><span class="eyebrow">ACTIVE PROJECT</span><h3>${esc(data.robot.name)}</h3></div>${badge('V1')}</div><p>${esc(data.projects[0]?.note||'')}</p><div class="progress"><i style="width:34%"></i></div><p class="tiny">V1 · eletrónica, estrutura, calibração e software em desenvolvimento.</p></div><div class="grid2">${tile('Build Guide','Step by step','tool','lav','noop')}${tile('Electronics','Wiring & power','tool','amber','noop')}${tile('Software','Firmware & app','projects','blue','noop')}${tile('Notes','Project notes','file','','add-note')}</div>`;
  if(projectTab==='bom') content=`<div class="actions"><button class="btn soft" data-action="add-bom">+ Componente</button></div><br>${data.bom.map(x=>`<div class="listitem"><div class="grow"><b>${esc(x.name)}</b><span>${esc(x.category)} · Qtd: ${esc(x.qty)}</span><small>${esc(x.note||'')}</small></div>${badge(x.status)}<button class="xbtn" data-delete="bom:${x.id}">×</button></div>`).join('')||'<div class="empty">Sem componentes.</div>'}`;
  if(projectTab==='tests') content=listCRUD('tests','Testes','add-test');
  if(projectTab==='problems') content=listCRUD('problems','Problemas','add-problem');
  if(projectTab==='decisions') content=listCRUD('decisions','Decisões','add-decision');
  if(projectTab==='files') content=`<div class="panel"><h3>Project files</h3><p>Uploads usam o storage privado já protegido por RLS. Os ficheiros ficam numa pasta exclusiva da ROBOT LAB.</p><label class="btn soft">+ Upload<input id="fileUpload" type="file" hidden></label></div>${data.files.map(x=>`<div class="listitem"><span class="iconbubble">${icon('file')}</span><div class="grow"><b>${esc(x.name)}</b><span>${esc(x.type||'file')} · ${fmtDate(x.createdAt)}</span></div><button class="btn" data-openfile="${x.id}">Abrir</button><button class="xbtn" data-delete="files:${x.id}">×</button></div>`).join('')}`;
  return `${sectionHead('PROJECT','HUMANOID 180','Fonte de verdade do projeto, componentes, testes e decisões.')}${tabs(tabItems,projectTab,'project')}${content}`;
}
function listCRUD(key,title,addAction){const arr=data[key];return `<div class="actions"><button class="btn soft" data-action="${addAction}">+ ${esc(title.slice(0,-1)||title)}</button></div><br>${arr.map(x=>`<div class="listitem"><span class="iconbubble">${icon(key==='tests'?'test':key==='problems'?'problem':'decision')}</span><div class="grow"><b>${esc(x.title)}</b><span>${esc(x.note||'')} · ${fmtDate(x.createdAt)}</span></div>${x.status?badge(x.status):''}<button class="xbtn" data-delete="${key}:${x.id}">×</button></div>`).join('')||`<div class="empty">Ainda não existem ${esc(title.toLowerCase())}.</div>`}`;}

function controlPage(){
  const t=[['manual','Manual'],['poses','Poses'],['motion','Motion'],['calibration','Calibration'],['diagnostics','Diagnostics'],['autonomy','Autonomy']];
  let content='';
  if(controlTab==='manual') content=`<div class="panel"><div class="split"><div><h3>12 Servo Simulator</h3><p>${data.robot.emergency?'E-STOP ativo. Movimentos bloqueados.':'Ajusta os canais individualmente. O hardware real permanece isolado.'}</p></div><span class="chip">${data.settings.mode==='simulator'?'Simulator':'Real'}</span></div><div class="actions"><button class="btn soft" data-action="center-servos">Center all</button><button class="btn" data-action="toggle-mode">${data.settings.mode==='simulator'?'Real Robot':'Simulator'}</button></div></div>${data.servos.map(servoHTML).join('')}<button class="estop ${data.robot.emergency?'active':''}" data-action="estop">${data.robot.emergency?'RESET EMERGENCY STOP':'EMERGENCY STOP'}</button>`;
  if(controlTab==='poses') content=`<div class="actions"><button class="btn soft" data-action="save-pose">+ Guardar posição atual</button></div><br>${data.poses.map(p=>`<div class="listitem"><span class="iconbubble">${icon('pose')}</span><div class="grow"><b>${esc(p.name)}</b><span>${fmtDate(p.createdAt)}</span></div><button class="btn soft" data-pose="${p.id}">Aplicar</button>${p.name!=='Stand Neutral'?`<button class="xbtn" data-delete="poses:${p.id}">×</button>`:''}</div>`).join('')}`;
  if(controlTab==='motion') content=`<div class="panel"><h3>Motion Studio V1</h3><p>Cria sequências simples a partir das poses guardadas. A execução nesta versão é feita no simulador; o firmware real terá o seu próprio Safety Engine.</p><button class="btn soft" data-action="add-sequence">+ Nova sequência</button></div>${data.sequences.map(s=>`<div class="listitem"><span class="iconbubble">${icon('motion')}</span><div class="grow"><b>${esc(s.name)}</b><span>${s.steps.length} passos · ${s.loop?'Loop':'One shot'}</span></div><button class="btn soft" data-sequence="${s.id}">Play</button><button class="xbtn" data-delete="sequences:${s.id}">×</button></div>`).join('')||'<div class="empty">Sem sequências. Guarda poses primeiro.</div>'}`;
  if(controlTab==='calibration') content=`<div class="panel"><h3>Calibration Wizard</h3><p>Define nome, posição neutra e limites mecânicos seguros de cada canal. Estes valores limitam também o simulador.</p><div class="actions"><button class="btn soft" data-action="center-servos">Neutral all</button></div></div>${data.servos.map(calibrationHTML).join('')}`;
  if(controlTab==='diagnostics') content=diagnosticsHTML();
  if(controlTab==='autonomy') content=autonomyHTML();
  return `${sectionHead('ROBOT CONNECTION',data.settings.mode==='simulator'?'Simulator':'Real Robot','O simulador é a camada ativa da V1. Hardware real só é habilitado de forma explícita.')}${tabs(t,controlTab,'control')}${content}`;
}
function servoHTML(s){return `<div class="servo"><div class="servoTop"><div><strong>${esc(s.label)}</strong><div class="servoMeta">CH ${s.channel} · ${esc(s.group)} · neutral ${s.neutral}°</div></div><b id="angle-${s.id}">${s.angle}°</b></div><input class="servoRange" data-servo="${s.id}" type="range" min="${s.min}" max="${s.max}" value="${s.angle}" ${data.robot.emergency||!s.enabled?'disabled':''}><div class="limits"><span>${s.min}°</span><span>${s.max}°</span></div></div>`;}
function calibrationHTML(s){return `<div class="servo"><div class="servoTop"><div><strong>${esc(s.label)}</strong><div class="servoMeta">Channel ${s.channel}</div></div><button class="btn" data-calservo="${s.id}">Editar</button></div><div class="limits"><span>Min ${s.min}°</span><span>Neutral ${s.neutral}°</span><span>Max ${s.max}°</span></div></div>`;}
function diagnosticsHTML(){const sen=data.sensors;return `<div class="statgrid"><div class="stat"><b class="ok">${esc(sen.imu)}</b><span>IMU</span></div><div class="stat"><b>${Number(sen.gyro).toFixed(2)}</b><span>Gyro °/s</span></div><div class="stat"><b>${Number(sen.accel).toFixed(2)}</b><span>Accel g</span></div><div class="stat"><b>${data.robot.temperature}°C</b><span>Temperature</span></div><div class="stat"><b>${data.robot.voltage}V</b><span>Voltage</span></div><div class="stat"><b>${data.robot.battery}%</b><span>Battery</span></div></div><div class="panel"><h3 class="ok">System Health · OK</h3><p>Simulator connected. 12 canais disponíveis. Safety state: ${data.robot.emergency?'E-STOP':'normal'}.</p></div>`;}
function autonomyHTML(){return `<div class="panel"><div class="split"><div><h3>Autonomous architecture</h3><p>Preparada, mas desligada na V1.</p></div><button class="toggle ${data.settings.featureFlags.autonomy?'on':''}" data-flag="autonomy"></button></div></div>${['Safety Engine','Servo Engine','Motion Engine','Sensor Engine','Balance Engine','Behaviour Engine','Brain Interface'].map((x,i)=>row(x,i===0?'Independente do telefone':i<4?'Architecture ready':'Future module','','<span class="badge green">READY</span>')).join('')}`;}

function libraryPage(){
  const items=[['all','All'],['video','Videos'],['docs','Docs'],['article','Articles'],['product','Products']];
  const arr=libraryTab==='all'?data.resources:data.resources.filter(x=>x.type===libraryTab);
  return `${sectionHead('KNOWLEDGE','Library','Vídeos, documentação, produtos, tutoriais e referências ligados aos projetos.')}${tabs(items,libraryTab,'library')}<div class="actions"><button class="btn soft" data-action="add-resource">+ Add resource</button></div><br>${arr.map(resourceHTML).join('')||'<div class="empty">Ainda não existem recursos nesta categoria.</div>'}`;
}
function resourceHTML(r){const thumb=r.thumbnail||'';return `<div class="listitem">${thumb?`<img class="thumb" src="${esc(thumb)}" alt="">`:`<span class="iconbubble">${icon(r.type==='video'?'video':'library')}</span>`}<div class="grow"><b>${esc(r.title)}</b><span>${esc(r.type)} · ${esc(r.tags?.join(', ')||'')}</span><small>${esc(r.url)}</small></div><button class="btn" data-openurl="${esc(r.url)}">Abrir</button><button class="xbtn" data-delete="resources:${r.id}">×</button></div>`;}

function morePage(){
  const t=[['ideas','Idea Vault'],['settings','Settings'],['backup','Backup']];let content='';
  if(moreTab==='ideas') content=`<div class="actions"><button class="btn soft" data-action="add-idea">+ Nova ideia</button></div><br>${data.ideas.map(i=>`<div class="listitem"><span class="iconbubble">${icon('idea')}</span><div class="grow"><b>${esc(i.title)}</b><span>${esc(i.category)} · ${esc(i.note||'')}</span></div>${badge(i.status)}<button class="xbtn" data-delete="ideas:${i.id}">×</button></div>`).join('')}`;
  if(moreTab==='settings') content=settingsHTML();
  if(moreTab==='backup') content=backupHTML();
  return `${sectionHead('LAB','More','Ideias, preferências, segurança e backup.')}${tabs(t,moreTab,'more')}${content}`;
}
function settingsHTML(){const f=data.settings.featureFlags;return `<div class="panel"><h3>Security</h3><p>Password-only via Supabase Auth. Dados cloud protegidos por RLS; cache local mantém a app utilizável em falhas de rede.</p><button class="btn warn" data-action="logout">Terminar sessão</button></div><div class="panel"><h3>Robot connection</h3><div class="field"><label>Mode</label><select id="modeSelect"><option value="simulator" ${data.settings.mode==='simulator'?'selected':''}>Simulator</option><option value="real" ${data.settings.mode==='real'?'selected':''}>Real Robot</option></select></div><div class="field"><label>ESP32 endpoint (futuro)</label><input id="endpointInput" value="${esc(data.settings.robotEndpoint)}" placeholder="Ex.: 192.168.1.50"></div></div><div class="panel"><h3>Feature flags</h3>${Object.entries(f).map(([k,v])=>`<div class="split" style="padding:9px 0;border-top:1px solid var(--line)"><span class="tiny">${esc(k)}</span><button class="toggle ${v?'on':''}" data-flag="${k}"></button></div>`).join('')}</div><div class="panel"><h3>Application</h3><p>ROBOT LAB ${CONFIG.appVersion} · PWA · portrait/landscape adaptive.</p>${installPrompt?'<button class="btn soft" data-action="install">Instalar aplicação</button>':'<p class="tiny">No Chrome Android: menu → Adicionar ao ecrã principal / Instalar aplicação.</p>'}</div>`;}
function backupHTML(){return `<div class="panel"><h3>Backup local</h3><p>Exporta todos os dados da ROBOT LAB em JSON. O ficheiro não inclui a tua password nem tokens de autenticação.</p><div class="actions"><button class="btn soft" data-action="export-backup">Exportar JSON</button><label class="btn">Importar JSON<input id="backupImport" type="file" accept="application/json" hidden></label></div></div><div class="panel"><h3>Cloud sync</h3><p>Estado atual: <b>${syncState}</b>. Os dados são guardados no mesmo backend privado, numa entrada separada <code>${CONFIG.rowSlug}</code>.</p><button class="btn" data-action="sync-now">Sincronizar agora</button></div>`;}

function modalHTML(){if(!modal)return '';let body='';
  if(modal.type==='generic') body=`<form id="genericForm" data-kind="${modal.kind}">${modal.fields.map(f=>fieldHTML(f)).join('')}<button class="btn primary full" type="submit">Guardar</button></form>`;
  if(modal.type==='servo'){const s=data.servos.find(x=>x.id===modal.id);body=`<form id="servoForm"><div class="field"><label>Nome</label><input name="label" value="${esc(s.label)}" required></div><div class="field"><label>Grupo</label><input name="group" value="${esc(s.group)}"></div><div class="grid2"><div class="field"><label>Min</label><input name="min" type="number" min="0" max="180" value="${s.min}"></div><div class="field"><label>Neutral</label><input name="neutral" type="number" min="0" max="180" value="${s.neutral}"></div><div class="field"><label>Max</label><input name="max" type="number" min="0" max="180" value="${s.max}"></div></div><button class="btn primary full" type="submit">Guardar calibração</button></form>`;}
  if(modal.type==='sequence') body=`<form id="sequenceForm"><div class="field"><label>Nome</label><input name="name" required placeholder="Walk Forward"></div><div class="field"><label>Poses (ordem)</label>${data.poses.map(p=>`<label class="split"><span>${esc(p.name)}</span><input type="checkbox" name="poses" value="${p.id}"></label>`).join('')}</div><div class="field"><label>Duração por passo (ms)</label><input name="duration" type="number" min="100" value="700"></div><label class="split"><span>Loop</span><input type="checkbox" name="loop"></label><br><button class="btn primary full" type="submit">Criar sequência</button></form>`;
  return `<div class="modalBack" data-action="close-modal"><section class="modal" onclick="event.stopPropagation()"><div class="modalHead"><h2>${esc(modal.title)}</h2><button class="xbtn" data-action="close-modal">×</button></div>${body}</section></div>`;}
function fieldHTML(f){if(f.type==='select')return `<div class="field"><label>${esc(f.label)}</label><select name="${f.name}">${f.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>`;if(f.type==='textarea')return `<div class="field"><label>${esc(f.label)}</label><textarea name="${f.name}" ${f.required?'required':''}></textarea></div>`;return `<div class="field"><label>${esc(f.label)}</label><input name="${f.name}" type="${f.type||'text'}" ${f.required?'required':''} ${f.placeholder?`placeholder="${esc(f.placeholder)}"`:''}></div>`;}

function render(){
  if(!session){$('#app').innerHTML=loginHTML();bindLogin();return;}
  const title={home:'Home',projects:'Projects',control:'Control',library:'Library',more:'More'}[page];
  const body={home:homePage,projects:projectsPage,control:controlPage,library:libraryPage,more:morePage}[page]();
  $('#app').innerHTML=shell(body,title);bind();drawHeaderState();
}
function bindLogin(){const form=$('#loginForm');form?.addEventListener('submit',async e=>{e.preventDefault();const btn=$('button',form);const err=$('#loginError');btn.disabled=true;btn.textContent='A entrar…';err.textContent='';try{await signIn(new FormData(form).get('password'));render();}catch(ex){err.textContent=ex.message||'Não foi possível entrar.';}finally{btn.disabled=false;btn.textContent='Entrar';}});}
function bind(){
  $$('[data-nav]').forEach(b=>b.onclick=()=>{page=b.dataset.nav;render();});
  $$('[data-tabkind]').forEach(b=>b.onclick=()=>{if(b.dataset.tabkind==='project')projectTab=b.dataset.tab;if(b.dataset.tabkind==='control')controlTab=b.dataset.tab;if(b.dataset.tabkind==='more')moreTab=b.dataset.tab;if(b.dataset.tabkind==='library')libraryTab=b.dataset.tab;render();});
  $$('[data-action]').forEach(b=>b.onclick=(e)=>handleAction(b.dataset.action,e));
  $$('[data-delete]').forEach(b=>b.onclick=()=>removeItem(b.dataset.delete));
  $$('[data-pose]').forEach(b=>b.onclick=()=>applyPose(b.dataset.pose));
  $$('[data-sequence]').forEach(b=>b.onclick=()=>playSequence(b.dataset.sequence));
  $$('[data-calservo]').forEach(b=>b.onclick=()=>{modal={type:'servo',id:b.dataset.calservo,title:'Calibration'};render();});
  $$('[data-openurl]').forEach(b=>b.onclick=()=>window.open(b.dataset.openurl,'_blank','noopener'));
  $$('[data-openfile]').forEach(b=>b.onclick=()=>openStoredFile(b.dataset.openfile));
  $$('.servoRange').forEach(r=>r.oninput=()=>{const s=data.servos.find(x=>x.id===r.dataset.servo);if(!s||data.robot.emergency)return;s.angle=Number(r.value);$(`#angle-${s.id}`).textContent=`${s.angle}°`;markDirty();});
  $('#fileUpload')?.addEventListener('change',e=>{if(e.target.files?.[0])uploadFile(e.target.files[0]);});
  $('#backupImport')?.addEventListener('change',e=>{if(e.target.files?.[0])importBackup(e.target.files[0]);});
  $('#modeSelect')?.addEventListener('change',e=>{data.settings.mode=e.target.value;markDirty();render();});
  $('#endpointInput')?.addEventListener('change',e=>{data.settings.robotEndpoint=e.target.value.trim();markDirty();});
  $('#genericForm')?.addEventListener('submit',genericSubmit);
  $('#servoForm')?.addEventListener('submit',servoSubmit);
  $('#sequenceForm')?.addEventListener('submit',sequenceSubmit);
}

function genericModal(kind,title,fields){modal={type:'generic',kind,title,fields};render();}
function handleAction(a,e){
  const go=(p,t)=>{page=p;if(t){if(p==='control')controlTab=t;if(p==='more')moreTab=t;}modal=null;render();};
  if(a==='go-project')go('projects'); else if(a==='go-control')go('control'); else if(a==='go-ideas')go('more','ideas'); else if(a==='go-library')go('library'); else if(a==='go-diagnostics')go('control','diagnostics'); else if(a==='go-calibration')go('control','calibration');
  else if(a==='close-modal'){modal=null;render();}
  else if(a==='add-bom')genericModal('bom','Novo componente',[{name:'name',label:'Componente',required:true},{name:'qty',label:'Quantidade',required:true},{name:'category',label:'Categoria'},{name:'status',label:'Estado',type:'select',options:['COMPRADO','A COMPRAR','ADIADO']},{name:'note',label:'Notas',type:'textarea'}]);
  else if(a==='add-test')genericModal('tests','Novo teste',[{name:'title',label:'Teste',required:true},{name:'status',label:'Resultado',type:'select',options:['PASS','FAIL','PENDING']},{name:'note',label:'Notas',type:'textarea'}]);
  else if(a==='add-problem')genericModal('problems','Novo problema',[{name:'title',label:'Problema',required:true},{name:'status',label:'Estado',type:'select',options:['OPEN','FIXED','WATCH']},{name:'note',label:'Notas',type:'textarea'}]);
  else if(a==='add-decision')genericModal('decisions','Nova decisão',[{name:'title',label:'Decisão',required:true},{name:'note',label:'Motivo / contexto',type:'textarea'}]);
  else if(a==='add-idea')genericModal('ideas','Nova ideia',[{name:'title',label:'Ideia',required:true},{name:'category',label:'Categoria',type:'select',options:['Concept','Feature','Hardware','Software','AI','Vision','Motion']},{name:'status',label:'Estado',type:'select',options:['Idea','Research','Experiment','Feature']},{name:'note',label:'Notas',type:'textarea'}]);
  else if(a==='add-resource')genericModal('resources','Novo recurso',[{name:'title',label:'Título',required:true},{name:'url',label:'URL',required:true,placeholder:'https://...'},{name:'type',label:'Tipo',type:'select',options:['video','docs','article','product','tutorial']},{name:'tags',label:'Tags (separadas por vírgula)'},{name:'note',label:'Notas',type:'textarea'}]);
  else if(a==='add-note')genericModal('notes','Nova nota',[{name:'title',label:'Título',required:true},{name:'note',label:'Nota',type:'textarea',required:true}]);
  else if(a==='save-pose')genericModal('pose','Guardar pose',[{name:'name',label:'Nome',required:true,placeholder:'Stand Neutral'}]);
  else if(a==='add-sequence'){if(data.poses.length<1)return toast('Guarda pelo menos uma pose.');modal={type:'sequence',title:'Nova sequência'};render();}
  else if(a==='center-servos'){data.servos.forEach(s=>s.angle=s.neutral);markDirty();render();}
  else if(a==='toggle-mode'){data.settings.mode=data.settings.mode==='simulator'?'real':'simulator';markDirty();render();}
  else if(a==='estop'){data.robot.emergency=!data.robot.emergency;markDirty();render();toast(data.robot.emergency?'Emergency Stop ativado.':'Emergency Stop reposto.');}
  else if(a==='logout')logout();
  else if(a==='sync-now')saveRemote().then(()=>{render();toast(syncState==='synced'?'Sincronizado.':'Mantido localmente.');});
  else if(a==='export-backup')exportBackup();
  else if(a==='install')installApp();
  else if(a==='noop')toast('Área preparada para conteúdo do projeto.');
}
function genericSubmit(e){e.preventDefault();const form=e.currentTarget;const kind=form.dataset.kind;const fd=Object.fromEntries(new FormData(form));
  if(kind==='pose'){data.poses.push({id:id(),name:fd.name,angles:data.servos.map(s=>s.angle),createdAt:now()});}
  else {const obj={id:id(),...fd,createdAt:now()};if(kind==='resources'){obj.tags=String(fd.tags||'').split(',').map(x=>x.trim()).filter(Boolean);obj.thumbnail=youtubeThumb(fd.url);}data[kind].unshift(obj);}
  modal=null;markDirty();render();toast('Guardado.');
}
function servoSubmit(e){e.preventDefault();const s=data.servos.find(x=>x.id===modal.id);const fd=Object.fromEntries(new FormData(e.currentTarget));let mn=Number(fd.min),ne=Number(fd.neutral),mx=Number(fd.max);if(!(0<=mn&&mn<ne&&ne<mx&&mx<=180))return toast('Usa limites válidos: min < neutral < max.');Object.assign(s,{label:fd.label,group:fd.group,min:mn,neutral:ne,max:mx,angle:Math.min(mx,Math.max(mn,s.angle))});modal=null;markDirty();render();}
function sequenceSubmit(e){e.preventDefault();const fd=new FormData(e.currentTarget);const poses=fd.getAll('poses');if(!poses.length)return toast('Seleciona pelo menos uma pose.');data.sequences.push({id:id(),name:fd.get('name'),steps:poses.map(p=>({poseId:p,duration:Number(fd.get('duration'))||700})),loop:fd.get('loop')==='on',createdAt:now()});modal=null;markDirty();render();}
function removeItem(spec){const [key,itemId]=spec.split(':');if(!Array.isArray(data[key]))return;data[key]=data[key].filter(x=>x.id!==itemId);markDirty();render();}
function applyPose(poseId){if(data.robot.emergency)return toast('E-STOP ativo.');const p=data.poses.find(x=>x.id===poseId);if(!p)return;p.angles.forEach((a,i)=>{const s=data.servos[i];s.angle=Math.max(s.min,Math.min(s.max,a));});markDirty();render();toast(`Pose aplicada: ${p.name}`);}
async function playSequence(seqId){if(data.robot.emergency)return toast('E-STOP ativo.');const seq=data.sequences.find(x=>x.id===seqId);if(!seq)return;toast(`A executar ${seq.name} no simulador…`);for(const step of seq.steps){applyPose(step.poseId);await new Promise(r=>setTimeout(r,step.duration));}toast('Sequência concluída.');}
function youtubeThumb(url=''){const m=String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);return m?`https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`:'';}
function exportBackup(){const payload={exportedAt:now(),app:'ROBOT LAB',version:CONFIG.appVersion,data};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`robot-lab-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function importBackup(file){try{const j=JSON.parse(await file.text());if(!j?.data?.schemaVersion)throw new Error();data=mergeData(seedData(),j.data);cache();markDirty();render();toast('Backup importado.');}catch{toast('Ficheiro de backup inválido.');}}
async function uploadFile(file){if(!session)return;toast('A enviar ficheiro…');try{const path=`${session.user.id}/robot-lab/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const r=await api(`${CONFIG.supabaseUrl}/storage/v1/object/${CONFIG.storageBucket}/${path}`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});if(!r.ok)throw new Error(await r.text());data.files.unshift({id:id(),name:file.name,type:file.type,size:file.size,path,createdAt:now()});markDirty();render();toast('Ficheiro guardado.');}catch(e){console.warn(e);toast('Não foi possível enviar. Mantive a aplicação sem alterações.');}}
async function openStoredFile(fileId){const f=data.files.find(x=>x.id===fileId);if(!f)return;try{const r=await api(`${CONFIG.supabaseUrl}/storage/v1/object/sign/${CONFIG.storageBucket}/${f.path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});if(!r.ok)throw new Error();const j=await r.json();const signed=j.signedURL||j.signedUrl;if(!signed)throw new Error();window.open(`${CONFIG.supabaseUrl}/storage/v1${signed}`,'_blank','noopener');}catch{toast('Não foi possível abrir o ficheiro.');}}
async function installApp(){if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;render();}else toast('No Chrome: menu → Adicionar ao ecrã principal.');}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;render();});
window.addEventListener('online',()=>{drawHeaderState();if(session)loadRemote();});
window.addEventListener('offline',()=>drawHeaderState());
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
setInterval(()=>{if(!session)return;data.sensors={...data.sensors,gyro:(Math.random()-.5)*.06,accel:.01+Math.random()*.03,pitch:(Math.random()-.5)*1.4,roll:(Math.random()-.5)*1.4,lastUpdate:now()};if(page==='control'&&controlTab==='diagnostics')render();},2500);

(async()=>{if(session){if(await ensureSession())await loadRemote();else render();}else render();})();
