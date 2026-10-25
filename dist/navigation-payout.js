(function(){
const q=new URLSearchParams(location.search);
const link=(text,url,active=false)=>`<a class="menu-link ${active?'active':''}" ${active?'aria-current="page"':''} href="${url}">${text}</a>`;
const group=(title,body)=>`<details class="menu-group" open><summary>${title}</summary><div>${body}</div></details>`;
const local=(text,page)=>`<button class="menu-link ${view===page?'active':''}" ${view===page?'aria-current="page"':''} data-workspace-page="${page}">${text}</button>`;
const indexURL=page=>'index.html?'+new URLSearchParams({role:role==='Admin'?'admin':'manager',view:page,lob,entity}).toString();
const oldRenderNav=render;
render=function(){const allowed=role==='Admin'?['units','structures']:['templates','users'];if(view==='triggers')view=role==='Admin'?'structures':'templates';if(!allowed.includes(view))view=allowed[0];oldRenderNav();const nav=$('#nav');nav.className='engine-nav';nav.setAttribute('aria-label','Workspace navigation');nav.innerHTML=role==='Admin'?group('Registry',local('Unit','units')+link('Keys',indexURL('registry')))+link('Incentive Config',indexURL('config'))+group('Payout Config',local('Config','structures')):link('Incentive Config',indexURL('manager'))+group('Payout Config',local('Create template','templates')+local('Map template to users','users'));const paths={units:'Registry / Unit',structures:'Payout Config / Config',templates:'Payout Config / Create template',centers:'Payout Config / Map template to centers',users:'Payout Config / Map template to users'};$('#crumb').textContent=paths[view];document.querySelector('.return')?.remove();const p=[...document.querySelector('#role').options].find(o=>o.value==='Payout Manager'||o.textContent==='Payout Manager');if(p){p.value='Payout Manager';p.textContent='Manager';}};
// Route only to currently visible workspace sections.
document.addEventListener('click',e=>{const b=e.target.closest('[data-workspace-page]');if(b){view=b.dataset.workspacePage;render();}});
if(q.get('role'))role=q.get('role')==='admin'?'Admin':'Payout Manager';if(q.get('view'))view=q.get('view');if(q.get('lob')&&mappings.some(m=>m.lob===q.get('lob')&&m.entity===q.get('entity'))){lob=q.get('lob');entity=q.get('entity');}$('#role').value=role;
render();
})();
