// Payouts have two calculation types. Registry keys remain available as inputs.
function fixedMigration(){
 if(state.fixedUnitVersion)return;
 state.retiredPayouts={structures:[],templates:[],assignments:[]};
 const retired=new Set();
 for(const s of state.structures){
  // Keep unsupported target/MG definitions intact outside the active configuration.
  if(s.components.some(c=>c.rules?.length)&&s.id!=='fm'){retired.add(s.id);continue;}
  for(const c of s.components)normaliseFixed(c,s.id);
 }
 state.retiredPayouts.structures=state.structures.filter(s=>retired.has(s.id));
 state.structures=state.structures.filter(s=>!retired.has(s.id));
 state.retiredPayouts.templates=state.templates.filter(t=>retired.has(t.structure));
 state.templates=state.templates.filter(t=>!retired.has(t.structure));
 for(const t of state.templates)for(const c of t.components)normaliseFixed(c,t.structure);
 const ids=new Set(state.templates.map(t=>t.id));
 state.retiredPayouts.assignments=state.assignments.filter(a=>!ids.has(a.template));
 state.assignments=state.assignments.filter(a=>ids.has(a.template));
 state.fixedUnitVersion=1;save();
}
function normaliseFixed(c,sid){
 if(c.basis==='Performance'){
  if(sid==='fm'&&c.id==='attendance_pay'){c.defaultValue=c.rules[0]?.value??c.defaultValue;c.formula='value * attendance_days';}
  c.basis='Fixed';c.rules=[];
 }
 c.uiType=c.basis==='Per Unit'?'Unit-based':'Fixed';
 if(c.basis==='Fixed'){c.primary='';c.unit='';c.attrs=[];c.unitFilterKey='';c.lookup='Flat';
  c.keys=(c.keys||[]).filter(k=>new RegExp('\\b'+k+'\\b').test(c.formula)||(c.filters||[]).some(f=>f.key===k));}
}
fixedMigration();
// Retire stored exclusions as well as the control.
for(const item of [...state.structures,...state.templates])for(const c of item.components)c.skip=0;
const previousFixedComp=comp;
comp=function(...args){const c=previousFixedComp(...args);if(c.basis==='Fixed'&&!args[3]){c.keys=[];c.primary='';c.unit='';c.attrs=[];}return c;};
const unitComponentForm=componentForm;
componentForm=function(c,i){
 if(c.basis==='Per Unit')return unitComponentForm(c,i);
 return `<section class="panel component"><div class="panel-head"><h3>${esc(c.name)}</h3>${btn('Remove','remove-component',i)}</div><div class="panel-body"><div class="grid">${input('Name',`components.${i}.name`,c.name)}<label>Type<select data-simple-type="${i}">${opts(payoutTypes,'Fixed')}</select></label>${select('Operator',`components.${i}.effect`,['Add','Deduct'],c.effect)}</div>${availableKeysDropdown(c,i)}${formulaControl(c,i)}<p class="quiet">Use value for one amount, or value × a selected key for a fixed rate. The Manager enters the value and optional conditions. All keys use the ${esc(draft.period.toLowerCase())} evaluation period.</p></div></section>`;
};
function fixedConditionForm(c,i){const keys=sharedKeys.filter(k=>(c.keys||[]).includes(k.id));return `<div class="section-gap"><div class="actions"><h3>Conditions <span class="quiet">Optional</span></h3>${keys.length?`<button data-fixed-add="${i}">+ Add condition</button>`:''}</div>${!keys.length?'<p class="quiet">No condition keys enabled in this structure.</p>':!c.filters.length?'<p class="quiet">No conditions. Apply the formula to every eligible entity.</p>':''}${c.filters.length?select('Match',`components.${i}.filterJoin`,[{id:'AND',name:'All conditions'},{id:'OR',name:'Any condition'}],c.filterJoin||'AND'):''}${c.filters.map((f,j)=>{const k=keys.find(k=>k.id===f.key);return `<div class="grid3 section-gap">${select('Key',`components.${i}.filters.${j}.key`,[{id:'',name:'Select key'},...keys],f.key)}${select('Comparison',`components.${i}.filters.${j}.op`,numericType(k?.type)?['=','!=','>','>=','<','<=']:['=','!='],f.op)}${input('Condition value',`components.${i}.filters.${j}.value`,f.value,numericType(k?.type)?'number':'text')}<button data-fixed-remove="${i}|${j}">Remove condition</button></div>`}).join('')}${c.filters.length?'<p class="quiet">If the conditions do not match, this component contributes zero.</p>':''}</div>`;}
templateForm=function(){const s=structure(draft.structure);modal(draft.name||'Create template',`<div class="grid">${input('Template name','name',draft.name)}${select('Payout structure','structure',[{id:'',name:'Select structure'},...current(state.structures).filter(s=>s.status==='Live')],draft.structure)}</div>${s?`<p class="quiet section-gap">${esc(s.lob)} / ${esc(s.entity)} · ${s.period}</p>${draft.components.map((c,i)=>`<section class="panel"><div class="panel-head"><h3>${esc(c.name)}</h3><span class="tag">${payoutType(c)} · ${c.effect}</span></div><div class="panel-body">${c.basis==='Per Unit'&&c.lookup!=='Flat'?lookupTable(c,i):input(c.valueType==='Percentage'?'Value (%)':'Value',`components.${i}.defaultValue`,c.defaultValue,'number')}<div class="formula">${esc(c.formula)}</div>${c.basis==='Fixed'?fixedConditionForm(c,i):`${c.unitFilterKey?input('Unit filter · '+c.unitFilterKey+' '+c.unitFilterOp,`components.${i}.unitFilterValue`,c.unitFilterValue):''}`}</div></section>`).join('')}${entityFilterForm()}`:''}`,btn('Save template','save-template','',true));};
const fixedSync=syncTemplateDefinitions;
syncTemplateDefinitions=function(s){const existing=new Map(state.templates.filter(t=>t.structure===s.id).map(t=>[t.id,clone(t.components)]));fixedSync(s);for(const t of state.templates.filter(t=>t.structure===s.id))for(const c of t.components)if(c.basis==='Fixed'){const old=existing.get(t.id)?.find(x=>x.id===c.id);c.filters=clone(old?.filters||[]);c.filterJoin=old?.filterJoin||'AND';}};
const fixedValidate=validateStructure;
validateStructure=function(s){for(const c of s.components){bindFormulaKeys(c);if(!['Fixed','Per Unit'].includes(c.basis)||c.rules.length)throw Error('Only Fixed and Unit-based payout components are supported.');if(c.basis==='Fixed'){for(const f of c.filters||[]){const key=sharedKeys.find(k=>k.id===f.key);if(!key||!c.keys.includes(f.key))throw Error('Select an available condition key.');if(!(numericType(key.type)?['=','!=','>','>=','<','<=']:['=','!=']).includes(f.op))throw Error('Choose a valid condition comparison.');if(!String(f.value).trim()||!Number.isFinite(Number(f.value))&&numericType(key.type)||key.type==='Integer'&&!Number.isInteger(Number(f.value)))throw Error('Enter a valid condition value.');}
 if(editorType==='structure')for(const t of state.templates.filter(t=>t.structure===s.id)){const old=t.components.find(x=>x.id===c.id);if(old?.filters?.some(f=>!c.keys.includes(f.key)))throw Error('This key is used by a template condition. Remove that condition before disabling the key.');}
 }}fixedValidate(s);};
document.addEventListener('click',e=>{const add=e.target.closest('[data-fixed-add]'),remove=e.target.closest('[data-fixed-remove]');if(add){const c=draft.components[Number(add.dataset.fixedAdd)];c.filters||=[];c.filters.push({key:c.keys[0]||'',op:'>=',value:''});templateForm();}if(remove){const [i,j]=remove.dataset.fixedRemove.split('|');draft.components[i].filters.splice(Number(j),1);templateForm();}});
document.addEventListener('change',e=>{if(e.target.dataset.simpleType!==undefined){const c=draft.components[Number(e.target.dataset.simpleType)];if(c.basis==='Fixed'){c.keys=[];c.primary='';c.unit='';c.attrs=[];}structureForm();}if(editorType==='template'&&/\.filters\.\d+\.key$/.test(e.target.dataset.k||'')){const parts=e.target.dataset.k.split('.'),f=draft.components[Number(parts[1])].filters[Number(parts[3])];f.op='=';f.value='';templateForm();}});
render();save();
