let payoutPreviewRider='RDR-DEMO';
function payoutPreviewSnapshot(){
 if(!['structure','template'].includes(editorType)||!draft)return null;
 const manager=editorType==='template',definition=manager?structure(draft.structure):draft;if(!definition)return null;
 const s=clone(definition),existing=manager?draft:state.templates.find(t=>t.structure===s.id);
 const components=s.components.map(c=>{const old=existing?.components.find(x=>x.id===c.id),x=clone(c);
 x.valueFormat=c.valueFormat||'Amount';x.conditionText=old?.conditionText;x.conditionTextCustom=old?.conditionTextCustom;
 x.defaultValue=old?.defaultValue??(Number(c.defaultValue)||(c.basis==='Fixed'?500:10));
 x.filters=clone(old?.filters?.filter(f=>(c.keys||[]).includes(f.key))||c.filters||[]);x.filterJoin=old?.filterJoin||c.filterJoin;x.unitFilterValue=old?.unitFilterValue??c.unitFilterValue;
 if(c.basis==='Per Unit'&&c.lookup!=='Flat'){
 const same=old&&old.lookup===c.lookup&&JSON.stringify(old.attrs)===JSON.stringify(c.attrs);
 if(same&&old.rates?.length)x.rates=clone(old.rates);
 else if(manager)x.rates=clone(old?.rates||[]);
 else {let combos=[[]];for(const d of lookupDimensions(c)){let values=numericType(d.type)?[{min:0,max:5},{min:5,max:'+'}]:categoryValues(c,d);if(!values.length)values=['A','B'];combos=combos.flatMap(row=>values.map(v=>[...row,v]));}x.rates=combos.map((keys,i)=>({keys,value:10+i*2}));}
 }return x});
 const candidates=users.filter(u=>u.lob===s.lob&&u.entity===s.entity);if(!candidates.some(u=>u.id===payoutPreviewRider))payoutPreviewRider=candidates[0]?.id||users[0]?.id;
 return {rider:payoutPreviewRider,workspace:clone(state),structure:s,template:{id:'__entity_draft_preview',structure:s.id,name:s.name||'Payout structure',components},units:clone(state.units),keys:clone(sharedKeys)};
}
function sendPayoutPreview(){const frame=document.querySelector('#payout-live-frame'),payload=payoutPreviewSnapshot();if(frame?.contentWindow&&payload)frame.contentWindow.postMessage({type:'payout-draft-preview',payload},location.origin)}
function mountPayoutPreview(){const snapshot=payoutPreviewSnapshot();if(!snapshot)return;const body=document.querySelector('#editor .dialog-body');if(body.querySelector('.payout-live-layout'))return;const layout=document.createElement('div'),fields=document.createElement('div'),preview=document.createElement('section');layout.className='payout-live-layout';fields.className='payout-config-fields';while(body.firstChild)fields.append(body.firstChild);preview.className='payout-live-panel';preview.innerHTML=`<h3>Rider preview</h3><label>Select rider<select id="payout-preview-rider">${opts(users.filter(u=>u.lob===snapshot.structure.lob&&u.entity===snapshot.structure.entity).map(u=>({id:u.id,name:u.name+' · '+u.id})),payoutPreviewRider)}</select></label><p class="quiet">${editorType==='template'?'Uses template values and sample activity. Referenced payouts use an assigned template, or the sole available template for preview only.':'Current payouts + this draft, using sample values. Referenced payouts use an assigned template, or the sole available template for preview only.'}</p><iframe id="payout-live-frame" title="Rider rate card and earnings preview" src="entity-payouts.html?embedded=1"></iframe>`;layout.append(fields,preview);body.append(layout);preview.querySelector('iframe').addEventListener('load',sendPayoutPreview)}
const structureFormBeforeLivePreview=structureForm;
structureForm=function(){structureFormBeforeLivePreview();mountPayoutPreview()};
const templateFormBeforeLivePreview=templateForm;
templateForm=function(){templateFormBeforeLivePreview();mountPayoutPreview()};
let payoutPreviewTimer;
for(const event of ['input','change'])document.addEventListener(event,e=>{if(['structure','template'].includes(editorType)&&e.target.closest('#editor')){clearTimeout(payoutPreviewTimer);payoutPreviewTimer=setTimeout(sendPayoutPreview,180)}});
document.addEventListener('change',e=>{if(e.target.id==='payout-preview-rider'){payoutPreviewRider=e.target.value;sendPayoutPreview()}});
