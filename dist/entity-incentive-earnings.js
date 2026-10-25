/* Earnings-only fixture for the demo rider. No template or assignment is created. */
function epIncentiveRows(){
 if(ep.rider!=='RDR-DEMO')return [];
 const incentive={name:'Diwali Bonus',primary:'shipments',others:['hours'],payout:'shipments',slabBehaviour:'TOP_ONLY',rateBehaviour:'ALL_UNITS',earningCap:5000,rows:[{targets:{shipments:50,hours:5},flat:500,rate:0},{targets:{shipments:70,hours:7},flat:700,rate:0},{targets:{shipments:90,hours:9},flat:800,rate:0}]};
 return [{day:'17',shipments:60,hours:6},{day:'18',shipments:95,hours:8},{day:'19',shipments:100,hours:10}].map(activity=>{
 const date=ep.month+'-'+activity.day,metrics={shipments:activity.shipments,hours:activity.hours},result=MilestoneEngine.calculate(incentive,metrics);
 return {kind:'incentive',c:{id:'diwali-bonus',name:incentive.name},t:{id:'incentive-diwali'},s:{period:'Daily'},w:{start:date,end:date},amount:result.total,error:'',incentive,metrics,result};
 }).filter(r=>r.w.end<=epToday);
}
const epPayoutData=epData;
epData=function(){return [...epPayoutData(),...epIncentiveRows()]};
const epPayoutDetail=epDetail;
epDetail=function(r){if(r.kind!=='incentive')return epPayoutDetail(r);const {incentive:p,result,metrics}=r;
 const labels={shipments:'Shipments',hours:'Logged-in hours'};
 return `<div class="ep-section"><span class="ep-eyebrow">${esc(epRange(r.w.start,r.w.end))} · Daily</span><h2>${esc(p.name)}</h2><div class="ep-big">${epMoney(r.amount)}</div><p>Only the highest qualifying milestone pays. Both targets must be met.</p><div class="ep-pair"><span>Lump sum earned</span><b>${epMoney(r.amount)}</b></div><p>Maximum incentive per day: ${epMoney(p.earningCap)}.</p><h3>Your performance</h3>${Object.entries(metrics).map(([key,value])=>`<div class="ep-pair"><span>${esc(labels[key])}</span><b>${esc(value)}</b></div>`).join('')}<h3>Slabs and earnings</h3>${p.rows.map((slab,i)=>{const achieved=result.matches[i],blocked=metrics[p.primary]>=slab.targets[p.primary]&&!achieved,status=achieved?(i===result.highest?'Earned':'Achieved · higher slab pays'):blocked?'Condition not met':'Not reached';return `<details class="ep-condition" ${blocked||i===result.highest?'open':''}><summary><span>Slab ${i+1} · ${epMoney(slab.flat)}<small>${esc(status)}</small></span><b>${epMoney(result.contributions[i])}</b></summary>${Object.entries(slab.targets).map(([key,target])=>`<div class="ep-pair"><span>${esc(labels[key])} ≥ ${target}<small>Actual: ${metrics[key]}</small></span><span class="${metrics[key]>=target?'met':'negative'}">${metrics[key]>=target?'Met':'Not met'}</span></div>`).join('')}</details>`}).join('')}</div>`;
};
epRender();
