const fs=require('fs'),vm=require('vm');
const node={innerHTML:'',value:'',textContent:'',options:[],setAttribute(){},prepend(){},remove(){},showModal(){},close(){}};
const ctx=vm.createContext({structuredClone,Intl,URLSearchParams,console,setTimeout,clearTimeout,location:{search:''},window:{},sessionStorage:{getItem(k){return k==='payout-shared-registry'?JSON.stringify({fields:[{id:'query-123:count_weight',name:'Count Weight',kind:'Float',valueColumn:'count_weight'},{id:'field-987',name:'Custom Quantity',kind:'Integer'}]}):null},setItem(){}},document:{addEventListener(){},querySelector(){return node},querySelectorAll(){return []}}});
for(const f of ['payouts','payout-simple','payout-values','payout-matrix','payout-policy','payout-fixed','payout-formula'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../dist',f+'.js'),'utf8').replaceAll('render();',''),ctx,{filename:f});

for(const f of ['payout-visibility-config','payout-rider-config','payout-output-scope','entity-payouts'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../dist',f+'.js'),'utf8'),ctx,{filename:f});

vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../dist/payout-live-preview.js'),'utf8'),ctx);
vm.runInContext(`
{
const check=(v,m)=>{if(!v)throw Error(m)};
ep.rider='RDR-DEMO';check(epTemplates().length===3,'demo assigned templates');
ep.rider='RDR-1042';check(epTemplates().length===0,'unassigned rider empty');
state.assignments.push({id:'rider-test',kind:'Center',target:'BLR-HSR',template:'tpl-lma'});
check(epTemplates().some(t=>t.id==='tpl-lma'),'center assignment visible');
state.assignments=state.assignments.filter(a=>a.id!=='rider-test');check(epTemplates().length===0,'removal reflected');
ep.rider='RDR-DEMO';check(epMoney(12.345)==='₹12.3','one decimal');check(epValue({valueFormat:'Percentage'},70)==='70%','percent presentation');check(epValue({valueFormat:'Amount'},10)==='₹10','amount presentation');check(epValue({valueFormat:'Number'},10)==='10','number presentation');
const base=clone(template('tpl-lma').components[0]);base.id='test_base';base.name='Base test';base.outputKey='output_base_test';
const top=comp('test_topup','Top up','Fixed',{defaultValue:2000,formula:'MAX(value - output_day_base_test, 0)',keys:[]});
const s={id:'scope-test',name:'Scope test',lob:'Last Mile',entity:'Rider',period:'Daily',status:'Live',userType:'All',components:[base,top]};ensureOutputNames(s);editorType='structure';validateStructure(s);state.structures.push(s);const t={id:'scope-template',structure:s.id,components:clone(s.components)};state.templates.push(t);
check(calculate(t,users[0]).total===2000,'aggregate unit output into fixed topup');
const trace=epEvaluate(t,{start:'2026-10-19',end:'2026-10-19'});check(!trace.some(r=>r.error)&&epSum(trace)===2000,'entity aggregate topup');
const direct=clone(s);direct.components[1].formula='MAX(value - output_base_test,0)';let failed=false;try{validateStructure(direct)}catch{failed=true}check(failed,'raw unit output blocked');
const wrong=clone(s);wrong.components[0].formula='running_payout * value';failed=false;try{validateStructure(wrong)}catch{failed=true}check(failed,'period total in unit formula blocked');
const external={id:'external-test',name:'External topup',lob:'Last Mile',entity:'Rider',period:'Daily',status:'Live',userType:'All',components:[comp('extra','Extra','Fixed',{keys:[],defaultValue:2500,formula:'MAX(value - '+externalComponentKey(s,base)+',0)'})]};ensureOutputNames(external);validateStructure(external);state.structures.push(external);const et={id:'external-template',structure:external.id,components:clone(external.components)};state.templates.push(et);state.assignments.push({id:'scope-assign',kind:'User',target:users[0].id,template:t.id});
check(calculate(et,users[0]).total===2500-calculate(t,users[0]).lines[0].amount,'external component aggregate');
const monthly=clone(external);monthly.period='Monthly';failed=false;try{validateStructure(monthly)}catch{failed=true}check(failed,'cross period output blocked');
sharedKeys.push({id:'weekly_metric',name:'Weekly metric',type:'Integer',formulaKey:'weekly_metric',evaluationPeriod:'Weekly'});const keyMismatch=clone(s);keyMismatch.components[1].formula='value * weekly_metric';failed=false;try{validateStructure(keyMismatch)}catch{failed=true}check(failed,'typed mismatched key blocked');
const weighted=clone(template('tpl-sample-day').components[2]);const markup=lookupTable(weighted,0);check(markup.includes('Maximum (optional)')&&!markup.includes('category"'),'last range optional and locked categories');check(epKey({min:2,max:5})==='2–5'&&epKey({min:5,max:'+'})==='5+','compact slabs');
const fresh=clone(base);fresh.rates=ratesFor(fresh);check(fresh.rates.length===3&&fresh.rates.some(r=>r.keys[0]==='COD'),'auto category rows');
const condition={filters:[{key:'attendance_hours',op:'>',value:5}],display:{labels:{attendance_hours:'Hours worked'}}};check(conditionCopy(condition)==='Hours worked is greater than 5','auto condition copy');condition.conditionTextCustom=true;condition.conditionText='Work at least six hours';check(conditionCopy(condition)===condition.conditionText,'custom copy retained');
draft=clone(s);const before=JSON.stringify(draft),stored=JSON.stringify(state);const snapshot=payoutPreviewSnapshot();check(snapshot.rider&&snapshot.workspace,'rider and existing assignments in draft preview');check(JSON.stringify(draft)===before&&JSON.stringify(state)===stored,'preview leaves saved and draft values intact');
check(!epData().some(r=>r.w.end>epToday),'no future earnings');
console.log('PASS: rider assignments, display formats, categories, ranges, conditions, compatible aggregate outputs and preview isolation');
}
`,ctx);
vm.runInContext(`
var previewWrites=0;sessionStorage.setItem=()=>previewWrites++;
window.parent={};window.addEventListener=(name,callback)=>{if(name==='message')window.previewMessage=callback};location.origin='https://preview.test';location.search='?embedded=1';
editorType='structure';draft=clone(structure('sample-day'));draft.name='Unsaved draft name';draft.components[0].description='Unsaved preview description';
var previewPayload=payoutPreviewSnapshot();
`,ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../dist/entity-payout-preview.js'),'utf8'),ctx);
vm.runInContext(`
window.previewMessage({source:window.parent,origin:location.origin,data:{type:'payout-draft-preview',payload:previewPayload}});
if(previewWrites!==0)throw Error('Preview persisted draft data');
if(!epRateCards().includes('Unsaved preview description'))throw Error('Draft copy missing from preview');
if(epTemplates().filter(t=>t.structure==='sample-day').length!==1)throw Error('Preview double-counts existing template');
if(epTemplates().length!==3)throw Error('Current assigned payouts missing from preview');
if(epData().some(r=>r.error))throw Error('Preview earnings failed');
console.log('PASS: live draft receiver uses selected rider, keeps applicable payouts and never saves preview values');
`,ctx);
vm.runInContext(`
{
 const assert=(v,m)=>{if(!v)throw Error(m)};
 const def=structure('sample-day').components.find(c=>c.id==='delivery');def.valueFormat='Percentage';
 editorType='template';draft=clone(template('tpl-sample-day'));const component=draft.components.find(c=>c.id==='delivery');component.valueFormat='Amount';component.rates[0].value=70;
 const before=JSON.stringify(draft),payload=payoutPreviewSnapshot(),previewComponent=payload.template.components.find(c=>c.id==='delivery');
 assert(previewComponent.valueFormat==='Percentage','Admin value format wins over Manager data');assert(previewComponent.rates[0].value===70,'Manager draft rate reaches preview');assert(JSON.stringify(draft)===before,'Manager draft is not mutated');
 window.previewMessage({source:window.parent,origin:location.origin,data:{type:'payout-draft-preview',payload}});
 const html=epRateCards();assert(html.includes('70%'),'Manager rate rendered with Admin percentage');assert(!html.includes('Last Mile')&&!html.includes('Sample'),'rider rate card has no internal context');assert(html.includes('ep-period-tag')&&html.includes('Daily'),'period tags');
 const naming=payoutDisplayKeys(def);assert(naming.includes('shipment_type')&&!naming.includes('weight_kg'),'only used attributes get naming fields');
 editorType='structure';draft=clone(structure('sample-day'));const rows=formulaKeyRows(draft.components[1],1);assert(rows.some(r=>r.scope==='Per unit'),'unit key tags');assert(rows.some(r=>r.scope==='Per day'),'daily key tags');
 console.log('PASS: Admin format ownership, Manager draft preview, rider copy and used-key naming');
}
`,ctx);
vm.runInContext(`{
const rates=[{keys:[{min:10,max:'+'}],value:3},{keys:[{min:2,max:3}],value:2},{keys:[{min:0,max:1}],value:1},{keys:[{min:1,max:2}],value:1}];
const sorted=epSortedRates({rates});if(sorted.map(r=>r.keys[0].min).join(',')!=='0,1,2,10')throw Error('Numeric slab order');if(rates[0].keys[0].min!==10)throw Error('Sorting mutated template');
}`,ctx);
console.log('PASS: numeric preview slab ordering without changing templates');
vm.runInContext(`{
const source=structure('lma');ensureOutputNames(source);
const mg={id:'preview-mg',name:'MG Payout',lob:source.lob,entity:source.entity,period:source.period,components:[comp('mg_topup','MG Payout','Fixed',{defaultValue:500,formula:'Max(value-'+source.outputKey+',0)',keys:[]})]};ensureOutputNames(mg);
editorType='structure';draft=mg;payoutPreviewRider='RDR-1042';const payload=payoutPreviewSnapshot();
window.previewMessage({source:window.parent,origin:location.origin,data:{type:'payout-draft-preview',payload}});
if(epTemplates().some(t=>t.structure===source.id))throw Error('Sample source leaked to rider rate card');
const dependency=epDependencyTemplates().find(t=>t.structure===source.id);if(!dependency)throw Error('Sample dependency missing');
const w={start:'2026-09-19',end:'2026-09-19'},result=epEvaluate(template(ep.previewTemplate),w)[0],base=epSum(epEvaluate(dependency,w));
if(result.error||result.amount!==Math.max(500-base,0))throw Error('MG preview incorrect: '+result.error);
if(previewWrites!==0)throw Error('Sample dependency persisted');
}`,ctx);
console.log('PASS: MG preview resolves unassigned sample source without modifying rider assignments');
for(const file of ['incentive-milestone-engine','entity-incentive-earnings'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../dist',file+'.js'),'utf8'),ctx);
vm.runInContext(`{
 ep.rider='RDR-DEMO';ep.month='2026-10';ep.previewTemplate=null;
 const rows=epIncentiveRows();if(rows.length!==3||epSum(rows)!==2000)throw Error('Incentive fixture total incorrect');
 if(epSum(epData())!==epSum(epPayoutData())+2000)throw Error('Incentive counted incorrectly');
 if(epRateCards().includes('Diwali Bonus'))throw Error('Incentive leaked into rate card');
 ep.path=['components'];const groups=epComponentGroups(epData()),index=groups.findIndex(rs=>rs[0].kind==='incentive');if(!epEarnings().includes('Diwali Bonus'))throw Error('Incentive row missing');
 ep.path.push(index);if(!epEarnings().includes('18 Oct'))throw Error('Day drill down missing');ep.path.push(1);const detail=epEarnings();if(!detail.includes('Condition not met')||!detail.includes('Actual: 8')||!detail.includes('₹700.0'))throw Error('Slab explanation missing');
 ep.month='2026-11';if(epIncentiveRows().length)throw Error('Future sample earnings shown');ep.rider='RDR-1042';ep.month='2026-10';if(epIncentiveRows().length)throw Error('Demo earnings leaked to other rider');
}`,ctx);
console.log('PASS: incentive total, daily/slab drilldown, blocked condition, rate-card exclusion and rider isolation');
