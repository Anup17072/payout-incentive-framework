/* Pure milestone calculation shared by the form and entity surface. */
const MilestoneEngine=(()=>{
const params=p=>[p.primary,...p.others];
function calculate(p,metrics=p.metrics,eligible=true){
 const missing=params(p).some(k=>!Number.isFinite(metrics[k]))||(p.rows.some(r=>r.rate>0)&&!Number.isFinite(metrics[p.payout]));
 const matches=p.rows.map(r=>!missing&&eligible&&params(p).every(k=>metrics[k]>=r.targets[k]));
 const highest=matches.lastIndexOf(true),x=Number(metrics[p.payout]||0);
 const terms=p.rows.map((r,i)=>{if(!matches[i]||(p.slabBehaviour==='TOP_ONLY'&&i!==highest))return {flat:0,rate:0,quantity:0,amount:0};
 let quantity=x;
 if(p.rateBehaviour==='THIS_SLAB'){const next=p.rows[i+1];const upper=p.slabBehaviour==='ALL_CROSSED'&&matches[i+1]?next.targets[p.payout]:x;quantity=Math.max(0,upper-r.targets[p.payout]);}
 if(!r.rate)quantity=0;
 return {flat:r.flat,rate:r.rate,quantity,amount:r.flat+r.rate*quantity};});
 const uncappedTotal=terms.reduce((n,t)=>n+t.amount,0),cap=p.earningCap==null||p.earningCap===''?null:Number(p.earningCap);if(cap!==null&&(!Number.isFinite(cap)||cap<0))throw Error('Incentive cap must be a non-negative amount.');const total=cap===null?uncappedTotal:Math.min(uncappedTotal,cap);let remaining=total;const contributions=terms.map(t=>{const amount=Math.min(t.amount,remaining);remaining-=amount;return amount});return {missing,eligible,matches,highest,terms,contributions,uncappedTotal,cap,capReached:cap!==null&&!missing&&eligible&&uncappedTotal>=cap,total};
}
function validate(p,measure){
 const errors=[],warnings=[],ps=params(p),rate=p.rows.some(r=>r.rate>0);
 if(!p.rows.length)errors.push('Add at least one milestone.');
 if(rate&&p.slabBehaviour==='ALL_CROSSED'&&p.rateBehaviour==='ALL_UNITS')errors.push('Every milestone crossed cannot apply rates from the first unit.');
 if(rate&&p.rateBehaviour==='THIS_SLAB'&&p.payout!==p.primary)errors.push('From this milestone requires the payout parameter to match the main parameter.');
 p.rows.forEach((r,i)=>{
  for(const k of ps){const n=r.targets[k];if(!Number.isFinite(n)||n<0)errors.push(`M${i+1}: enter a non-negative ${measure(k).label} target.`);else if(measure(k).integer&&!Number.isInteger(n))errors.push(`M${i+1}: ${measure(k).label} requires a whole number.`);if(i&&n<p.rows[i-1].targets[k])errors.push(`M${i+1}: ${measure(k).label} ${n} is below M${i}'s ${p.rows[i-1].targets[k]}.`);}
  if(i&&r.flat<p.rows[i-1].flat)errors.push(`M${i+1}: lump sum must be greater than or equal to the previous milestone.`);
  if(i&&r.rate<p.rows[i-1].rate)errors.push(`M${i+1}: rate must be greater than or equal to the previous milestone.`);
  if(!Number.isFinite(r.flat)||r.flat<0||!Number.isFinite(r.rate)||r.rate<0)errors.push(`M${i+1}: enter non-negative lump sum and rate values.`);
 });
 if(errors.length)return {errors:[...new Set(errors)],warnings};
 if(p.slabBehaviour==='ALL_CROSSED'&&p.rows.some(r=>r.flat>0))warnings.push('Lump sums stack: every qualifying milestone adds its own amount.');
 if(p.slabBehaviour==='TOP_ONLY')for(let i=1;i<p.rows.length;i++){
  const prev=p.rows[i-1],cur=p.rows[i],floor=cur.targets[p.primary],step=measure(p.primary).integer?1:0.000001;
  if(floor===0)continue;
  const amount=(r,x)=>r.flat+r.rate*Math.max(0,x-(p.rateBehaviour==='THIS_SLAB'?r.targets[p.payout]:0));
  if(p.payout===p.primary){
   const before=amount(prev,Math.max(prev.targets[p.primary],floor-step)),after=amount(cur,floor);
   if(after+1e-7<before)errors.push(`M${i+1}: earnings fall from ₹${before.toFixed(2)} to ₹${after.toFixed(2)} at ${floor} ${measure(p.primary).plural}.`);
   if(after-before>300)warnings.push(`M${i+1}: crossing adds ₹${(after-before).toFixed(2)} (above the ₹300 warning threshold).`);
   if(p.others.some(k=>cur.targets[k]>prev.targets[k])&&(amount(cur,floor)<amount(prev,floor)||cur.rate<prev.rate))errors.push(`M${i+1}: meeting a secondary gate can reduce earnings. Increase its lump sum or rate.`);
  }else{
   const min=cur.targets[p.payout]||0;
   if(amount(cur,min)<amount(prev,min)||cur.rate<prev.rate)errors.push(`M${i+1}: this cross-parameter reward can reduce earnings as a gate is met.`);
  }
 }
 const cpu=p.metrics?.[p.payout]>0?calculate(p).total/p.metrics[p.payout]:0;
 if(cpu>4)warnings.push(`Sample cost per ${measure(p.payout).unit}: ₹${cpu.toFixed(2)}, above the ₹4 warning threshold.`);
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
return {params,calculate,validate};
})();
if(typeof module!=='undefined')module.exports=MilestoneEngine;
