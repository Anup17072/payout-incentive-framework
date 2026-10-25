
// Render unsaved Admin drafts in memory; never save illustrative template values.
if(new URLSearchParams(location.search).get('embedded')==='1'){
 ep.tab='rate';ep.month='2026-09';ep.previewTemplate='__entity_draft_preview';
 // Sample dependency evaluation is isolated from rider assignments and rate cards.
 epDependencyTemplates=function(){const selected=epTemplates(),seen=new Set();function visit(t){if(seen.has(t.structure))return;seen.add(t.structure);const s=structure(t.structure);for(const c of epEffective(t)){let tokens;try{tokens=formulaIdentifiers(parsePayoutFormula(c.formula))}catch{continue}for(const token of tokens){const target=outputTarget(token,s);if(!target||!compatibleStructure(s,target.s))continue;let matches=selected.filter(x=>x.structure===target.s.id);if(!matches.length){const candidates=state.templates.filter(x=>x.structure===target.s.id);if(candidates.length===1){selected.push(candidates[0]);matches=candidates;}}if(matches.length===1)visit(matches[0]);}}}for(const t of [...selected])visit(t);return selected;};
 const originalRecords=epRecords,originalMetrics=epMetrics;
 epRecords=function(w){const records=originalRecords(w),components=epDependencyTemplates().flatMap(epEffective);if(!components.length)return records;
 for(const [i,r] of records.entries())for(const c of components.filter(c=>c.basis==='Per Unit')){const u=state.units.find(u=>u.id===c.unit);if(!u)continue;r[u.unitId]||='UNIT-'+r.delivered_at+'-'+(i+1);r[u.date]||=r.delivered_at;
 const rates=epSortedRates(c),chosen=rates[i%rates.length];for(const [j,d] of lookupDimensions(c).entries()){const value=chosen?.keys[j];r[d.name]=value&&typeof value==='object'?Number(value.min):value??'A';}
 for(const a of u.attributes||[])if(r[a.name]==null)r[a.name]=numericType(lookupDataType(a.type))?2:a.type==='Boolean'?true:'A';
 }return records};
 epMetrics=function(w,rs){const m=originalMetrics(w,rs);for(const k of sharedKeys)if(m[k.id]==null)m[k.id]=String(k.type).toLowerCase()==='boolean'?true:['integer','float','number','percentage'].includes(String(k.type).toLowerCase())?12:'A';return m};
 window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin||e.data?.type!=='payout-draft-preview')return;const payload=e.data.payload;if(!payload?.structure||!Array.isArray(payload.template?.components))return;
 if(payload.workspace)state=clone(payload.workspace);ep.rider=payload.rider||ep.rider;const s=clone(payload.structure),t=clone(payload.template);t.structure=s.id;t.id='__entity_draft_preview';s.name||='Payout structure';
 state.units=clone(payload.units||[]).map(u=>({...u,sample:true}));for(const k of payload.keys||[])if(!sharedKeys.some(x=>x.id===k.id))sharedKeys.push(clone(k));
 state.structures=state.structures.filter(x=>x.id!==s.id);state.structures.push(s);state.templates=state.templates.filter(x=>x.id!==t.id);state.templates.push(t);ep.previewTemplate=t.id;ep.path=[];
 if(!s.components.length){epRoot.innerHTML='<p class="ep-empty">Add a component to see its preview.</p>';return}epRender();
 });
 epRender();
}
