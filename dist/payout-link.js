(function(){
function add(){const aside=document.querySelector('aside');if(!aside||document.getElementById('payoutWorkspaceLink'))return;const a=document.createElement('a');a.id='payoutWorkspaceLink';a.href='payouts.html';a.className='nav';a.textContent='Payout workspace ↗';a.style.cssText='display:block;text-decoration:none;margin-top:12px;border-top:1px solid #34425a;border-radius:0;padding-top:20px';a.onclick=()=>{try{sessionStorage.setItem('payout-shared-registry',JSON.stringify({fields:fields,mappings:entityMappings.filter(m=>m.enabled).map(m=>({lob:m.lob,entity:m.entity}))}))}catch{}};const footer=aside.querySelector('.admin');aside.insertBefore(a,footer)}
new MutationObserver(add).observe(document.querySelector('aside'),{childList:true,subtree:true});add();
})();
