const fs=require('fs'),vm=require('vm');
const node={innerHTML:'',value:'',textContent:'',options:[],setAttribute(){},prepend(){},remove(){},showModal(){},close(){}};
const ctx=vm.createContext({structuredClone,Intl,URLSearchParams,console,setTimeout,clearTimeout,location:{search:''},window:{},sessionStorage:{getItem(k){return k==='payout-shared-registry'?JSON.stringify({fields:[{id:'query-123:count_weight',name:'Count Weight',kind:'Float',valueColumn:'count_weight'},{id:'field-987',name:'Custom Quantity',kind:'Integer'}]}):null},setItem(){}},document:{addEventListener(){},querySelector(){return node},querySelectorAll(){return []}}});
for(const f of ['payouts','payout-simple','payout-values','payout-matrix','payout-policy','payout-fixed','payout-formula'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../dist',f+'.js'),'utf8').replaceAll('render();',''),ctx,{filename:f});

for(const f of ['payout-visibility-config','payout-rider-config','payout-output-scope','entity-payouts'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../dist',f+'.js'),'utf8'),ctx,{filename:f});

vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../dist/payout-live-preview.js'),'utf8'),ctx);
vm.runInContext(`
{
 const assert=(v,m)=>{if(!v)throw Error(m)},reject=(s,m)=>{let failed=false;try{validateStructure(s)}catch{failed=true}assert(failed,m)};
 const source=clone(template('tpl-lma').components[0]);source.id='source';source.name='Shipment base';source.outputKey='output_shipment_base';
 const deduction=clone(source);deduction.id='deduct';deduction.name='Shipment fee';deduction.outputKey='output_shipment_fee';deduction.effect='Deduct';deduction.lookup='Flat';deduction.defaultValue=50;deduction.formula='output_unit_shipment_base * value / 100';
 const s={id:'unit-test',name:'Unit test',lob:'Last Mile',entity:'Rider',period:'Daily',status:'Live',userType:'All',components:[source,deduction]};ensureOutputNames(s);editorType='structure';validateStructure(s);state.structures.push(s);const t={id:'unit-template',name:'Unit template',structure:s.id,components:clone(s.components)};state.templates.push(t);
 const r=calculate(t,users[0]);assert(r.total===r.lines[0].amount/2,'same-unit deduction sums correctly');for(const id of Object.keys(r.unitOutputs.source))assert(r.unitOutputs.deduct[id]===r.unitOutputs.source[id]/2,'backend matches exact unit IDs');
 const trace=epEvaluate(t,{start:'2026-10-19',end:'2026-10-19'});assert(!trace.some(x=>x.error),'entity unit outputs available');for(const unit of trace[1].records)assert(unit.amount===-trace[0].unitOutputs[unit.id]/2,'entity matches unit rather than day total');
 draft=clone(s);let rows=formulaKeyRows(draft.components[1],1);assert(rows.some(r=>r.token===unitComponentKey(source)&&r.scope==='Per unit'),'per-unit input offered');assert(!rows.some(r=>r.token===periodComponentKey(s,source)),'aggregate not offered to unit component');assert(availableKeysDropdown(draft.components[1],1).includes('Payout outputs'),'output selector discoverable');
 const fixed=clone(s);fixed.components[1].basis='Fixed';reject(fixed,'unit output into Fixed blocked');
 const mismatched=clone(s);mismatched.components[1].unit='different-unit';reject(mismatched,'different registered unit blocked');
 const aggregate=clone(s);aggregate.components[1].formula=periodComponentKey(s,source)+' * value';reject(aggregate,'day total into unit blocked');
 const forward=clone(s);forward.components.reverse();reject(forward,'forward unit output blocked');
 const external=clone(s);external.id='external-unit';external.name='External unit';external.outputKey='output_payout_external_unit';external.components=[clone(deduction)];external.components[0].formula=externalUnitComponentKey(s,source)+' * value / 100';ensureOutputNames(external);validateStructure(external);state.structures.push(external);const et={id:'external-unit-template',structure:external.id,components:clone(external.components)};state.templates.push(et);state.assignments.push({id:'unit-test-assign',kind:'User',target:users[0].id,template:t.id},{id:'unit-test-demo',kind:'User',target:'RDR-DEMO',template:t.id});
 const ext=calculate(et,users[0]);assert(ext.lines[0].amount===r.lines[0].amount/2,'cross-structure unit result');const etrace=epEvaluate(et,{start:'2026-10-19',end:'2026-10-19'});assert(!etrace[0].error&&etrace[0].amount===trace[1].amount,'entity cross-structure result');
 const wrongPeriod=clone(external);wrongPeriod.period='Weekly';reject(wrongPeriod,'different evaluation window blocked');
 const circular=clone(s);circular.components[0].formula=externalUnitComponentKey(external,external.components[0]);reject(circular,'cross-structure unit cycle blocked');
 const originalFilter=t.components[0].unitFilterKey;t.components[0].unitFilterKey='shipment_type';t.components[0].unitFilterOp='IN';t.components[0].unitFilterValue='COD';const filtered=calculate(t,users[0]);assert(Object.values(filtered.unitOutputs.source).some(v=>v===0),'ineligible source unit contributes zero');assert(filtered.total===filtered.lines[0].amount/2,'filtered source unit identity retained');
 let missing=false;try{readUnitOutput({},'missing')}catch{missing=true}assert(missing,'missing source output is not silently zero');
 console.log('PASS: same-unit and cross-structure outputs, ID matching, filtered records, scope validation, cycles and discoverability');
}
`,ctx);
