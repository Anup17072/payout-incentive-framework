// Parse formulas into an expression tree; never execute user-authored JavaScript.
function parsePayoutFormula(source){
 const text=String(source),tokens=text.match(/\d*\.\d+|\d+\.?\d*|[A-Za-z_]\w*|>=|<=|!=|==|&&|\|\||[()%,+*/<>=!-]/g)||[];
 if(tokens.join('')!==text.replace(/\s/g,''))throw Error('Unsupported formula character.');
 if(tokens.length>1000)throw Error('Formula is too long.');
 let p=0,depth=0;const peek=()=>String(tokens[p]||'').toUpperCase();
 function atom(){
  if(++depth>60)throw Error('Formula nesting is too deep.');
  const t=tokens[p++];let node;
  if(['-','+','!','NOT'].includes(String(t).toUpperCase()))node={kind:'unary',op:t.toUpperCase(),arg:atom()};
  else if(t==='('){node=expression();if(tokens[p++]!==')')throw Error('Missing closing parenthesis.');}
  else if(/^\d|^\./.test(t||''))node={kind:'number',value:Number(t)};
  else if(/^[A-Za-z_]\w*$/.test(t||'')){
   const name=t.toUpperCase();
   if(tokens[p]==='('){
    if(!['MIN','MAX','MOD','IF'].includes(name))throw Error('Unknown formula function: '+t);
    p++;const args=[];if(tokens[p]!==')'){args.push(expression());while(tokens[p]===','){p++;args.push(expression());}}
    if(tokens[p++]!==')')throw Error('Missing closing function parenthesis.');
    if(args.length!==(name==='IF'?3:2))throw Error(name+(name==='IF'?' requires condition, true value and false value.':' requires two inputs.'));
    node={kind:'call',name,args};
   }else node=['TRUE','FALSE'].includes(name)?{kind:'number',value:name==='TRUE'?1:0}:{kind:'key',name:t};
  }else throw Error('Expected a value, key or parenthesis.');
  depth--;return node;
 }
 function binary(next,ops){let node=next();while(ops.includes(peek())){const op=peek();p++;node={kind:'binary',op,left:node,right:next()};}return node;}
 const term=()=>binary(atom,['*','/','%']);const sum=()=>binary(term,['+','-']);
 const comparison=()=>binary(sum,['>','>=','<','<=','=','==','!=']);
 const and=()=>binary(comparison,['AND','&&']);const expression=()=>binary(and,['OR','||']);
 const ast=expression();if(p!==tokens.length)throw Error('Unexpected formula token: '+tokens[p]);return ast;
}
function formulaIdentifiers(ast,out=new Set()){
 if(ast.kind==='key')out.add(ast.name);
 if(ast.left){formulaIdentifiers(ast.left,out);formulaIdentifiers(ast.right,out);}
 if(ast.arg)formulaIdentifiers(ast.arg,out);
 for(const a of ast.args||[])formulaIdentifiers(a,out);return out;
}
function evaluatePayoutTree(ast,vars){
 const run=n=>{
  if(n.kind==='number')return n.value;
  if(n.kind==='key'){
   let value;if(Object.hasOwn(vars,n.name))value=vars[n.name];
   else if(n.name.startsWith('output_')&&vars.__resolveOutput)value=vars.__resolveOutput(n.name);
   else throw Error('Unknown formula input: '+n.name);
   if(value==null||value===''||!Number.isFinite(Number(value)))throw Error(sharedKeys.some(k=>k.formulaKey===n.name)?'No sample data for registered key: '+n.name+'. Live SQL execution is not connected.':'Missing numeric input: '+n.name);
   return Number(value);
  }
  if(n.kind==='unary'){const v=run(n.arg);return n.op==='-'?-v:n.op==='+'?v:Number(!v);}
  if(n.kind==='call'){
   if(n.name==='IF')return run(n.args[0])?run(n.args[1]):run(n.args[2]);
   const a=run(n.args[0]),b=run(n.args[1]);if(n.name==='MOD'){if(b===0)throw Error('Modulo by zero.');return a%b;}
   return n.name==='MIN'?Math.min(a,b):Math.max(a,b);
  }
  const a=run(n.left);
  if(['AND','&&'].includes(n.op))return a?Number(Boolean(run(n.right))):0;
  if(['OR','||'].includes(n.op))return a?1:Number(Boolean(run(n.right)));
  const b=run(n.right);
  if((n.op==='/'||n.op==='%')&&b===0)throw Error(n.op==='/'?'Division by zero.':'Modulo by zero.');
  switch(n.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '%':return a%b;case '>':return Number(a>b);case '>=':return Number(a>=b);case '<':return Number(a<b);case '<=':return Number(a<=b);case '=':case '==':return Number(a===b);case '!=':return Number(a!==b);}
 };
 const result=run(ast);if(!Number.isFinite(result))throw Error('Formula result must be a finite number.');return result;
}
formulaEval=function(source,vars){return evaluatePayoutTree(parsePayoutFormula(source),vars);};
function validateFormula(source,vars){for(const name of formulaIdentifiers(parsePayoutFormula(source)))if(!Object.hasOwn(vars,name))throw Error('Unknown formula input: '+name);}

const outputSlug=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'unnamed';
function ensureOutputNames(s){
 const reserved=new Set(['value','running_payout',...sharedKeys.flatMap(k=>[k.id,k.formulaKey]),...s.components.map(c=>c.id)]);
 for(const c of s.components){
  if(c.outputKey&&!reserved.has(c.outputKey)){reserved.add(c.outputKey);continue;}
  const stem='output_'+outputSlug(c.name);let name=stem,n=2;
  while(reserved.has(name)||name.startsWith('output_payout_')){name='output_component_'+outputSlug(c.name)+'_'+n++;}
  c.outputKey=name;reserved.add(name);
 }
 if(!s.outputKey||state.structures.some(x=>x.id!==s.id&&x.outputKey===s.outputKey)){
  const stem='output_payout_'+outputSlug(s.name);let name=stem,n=2;
  while(state.structures.some(x=>x.id!==s.id&&x.outputKey===name)||reserved.has(name))name=stem+'_'+n++;
  s.outputKey=name;
 }
}
function componentOutputKey(c){return c.outputKey||'output_'+outputSlug(c.name);}
function structureOutputPlaceholders(s){return Object.fromEntries(state.structures.filter(x=>x.id!==s.id&&x.lob===s.lob&&x.entity===s.entity&&x.period===s.period).map(x=>[x.outputKey,1000]));}
for(const s of state.structures)ensureOutputNames(s);
for(const t of state.templates){const s=structure(t.structure);for(const c of t.components)c.outputKey=s?.components.find(x=>x.id===c.id)?.outputKey||componentOutputKey(c);}

function formulaKeyRows(c,i){
 ensureOutputNames(draft);
 const rows=[{token:'value',label:'Template value',description:'The amount or rate entered by the Manager.'},...sharedKeys.filter(k=>(c.keys||[]).includes(k.id)).map(k=>({token:formulaKey(k.id),label:k.name,description:'Registered key · '+k.type}))];
 if(c.basis==='Per Unit')for(const a of state.units.find(u=>u.id===c.unit)?.attributes||[])if(numericType(a.type)||a.type==='Boolean')rows.push({token:a.name,label:a.name.replaceAll('_',' '),description:'Attribute of the current unit · '+a.type});
 rows.push({token:'running_payout',label:'Running payout',description:'Payout evaluated till this step. Net total before this component, in this evaluation period.'});
 for(const x of draft.components.slice(0,i))rows.push({token:componentOutputKey(x),label:'Output component · '+x.name,description:'Calculated amount of this earlier component, before its Add / Deduct operator.'});
 for(const x of state.structures.filter(x=>x.id!==draft.id&&x.lob===draft.lob&&x.entity===draft.entity&&x.period===draft.period))rows.push({token:x.outputKey,label:'Output payout structure · '+x.name,description:'Net output for this user and evaluation period. Requires one applicable assigned template.'});
 return rows;
}
function availableKeysDropdown(c,i){
 const selected=sharedKeys.filter(k=>(c.keys||[]).includes(k.id));
 return `<div class="section-gap key-picker"><label id="key-label-${i}">Available keys</label><details data-key-dropdown="${i}"><summary aria-labelledby="key-label-${i}"><span data-key-count="${i}">${selected.length?selected.length+' keys selected':'Select keys'}</span><span aria-hidden="true">▾</span></summary><div class="key-options"><input type="search" data-key-search="${i}" placeholder="Search keys" aria-label="Search available keys">${sharedKeys.map(k=>`<label class="key-option" data-key-search-text="${esc((k.name+' '+formulaKey(k.id)).toLowerCase())}"><input type="checkbox" data-key-pick="${i}|${esc(k.id)}" ${(c.keys||[]).includes(k.id)?'checked':''}><span>${esc(k.name)}<small>${esc(formulaKey(k.id))}</small></span></label>`).join('')}</div></details><p class="quiet">Selected keys can be used in the formula and Manager conditions.</p></div>`;
}
formulaControl=function(c,i,path='formula',formula=c.formula){return `<div class="section-gap"><div class="formula-heading"><label for="formula-${i}">Formula</label><button type="button" class="link" data-show-formula-keys="${i}" aria-expanded="false" aria-controls="formula-keys-${i}">View available keys</button></div><input id="formula-${i}" data-k="components.${i}.${path}" value="${esc(formula)}" spellcheck="false"><div id="formula-keys-${i}" class="formula-key-panel" hidden></div><details class="formula-operators"><summary>Operators available</summary>${table(['Operator','Usage'],[['( )','Group calculations: (value + 5) * 2'],['+ − * /','Add, subtract, multiply, divide'],['MIN(a, b) / MAX(a, b)','Smaller / larger of two values'],['MOD(a, b) or a % b','Remainder after division'],['IF(condition, then, else)','Example: IF(running_payout > 0, value, 0)'],['= != > >= < <=','Compare values in conditions'],['AND / OR / NOT','Combine or reverse conditions']].map(row))}<p class="quiet">Function names are case-insensitive. IF evaluates only the chosen result. Use * for multiplication. Component and structure outputs use the same evaluation period.</p></details></div>`;};
function renderFormulaKeys(i){const c=draft.components[i];return table(['Name','Formula key',''],formulaKeyRows(c,i).map(k=>row([`<strong>${esc(k.label)}</strong><small>${esc(k.description)}</small>`,`<code>${esc(k.token)}</code>`,`<button type="button" data-insert-formula="${i}" data-formula-token="${esc(k.token)}">Insert</button>`])));}
document.addEventListener('input',e=>{if(e.target.dataset.keySearch!==undefined){const box=e.target.closest('details'),q=e.target.value.toLowerCase();for(const option of box.querySelectorAll('[data-key-search-text]'))option.hidden=!option.dataset.keySearchText.includes(q);}});
document.addEventListener('change',e=>{
 if(e.target.dataset.keyPick){const [i,key]=e.target.dataset.keyPick.split('|'),c=draft.components[Number(i)];c.keys=e.target.checked?[...new Set([...c.keys,key])]:c.keys.filter(k=>k!==key);const count=$(`[data-key-count="${i}"]`);count.textContent=c.keys.length?c.keys.length+' keys selected':'Select keys';const panel=$('#formula-keys-'+i);if(panel&&!panel.hidden)panel.innerHTML=renderFormulaKeys(Number(i));}
});
document.addEventListener('click',e=>{
 const show=e.target.closest('[data-show-formula-keys]');if(show){const i=Number(show.dataset.showFormulaKeys),panel=$('#formula-keys-'+i);panel.hidden=!panel.hidden;if(!panel.hidden)panel.innerHTML=renderFormulaKeys(i);show.setAttribute('aria-expanded',String(!panel.hidden));}
 const insert=e.target.closest('[data-insert-formula]');if(insert){const i=Number(insert.dataset.insertFormula),field=$('#formula-'+i),token=insert.dataset.formulaToken,start=field.selectionStart??field.value.length,end=field.selectionEnd??start;field.value=field.value.slice(0,start)+token+field.value.slice(end);setPath(draft,field.dataset.k,field.value);field.focus();field.setSelectionRange(start+token.length,start+token.length);}
});

function checkOutputDependencies(candidate){
 const all=state.structures.filter(s=>s.id!==candidate.id).concat(candidate),byKey=new Map(all.map(s=>[s.outputKey,s])),visiting=new Set(),done=new Set();
 function walk(s){if(visiting.has(s.id))throw Error('Circular payout structure reference: '+s.name);if(done.has(s.id))return;visiting.add(s.id);
  for(const c of s.components)for(const id of formulaIdentifiers(parsePayoutFormula(c.formula))){
   if(!id.startsWith('output_payout_'))continue;const target=byKey.get(id);if(!target)throw Error('Unknown payout structure output: '+id);
   if(target.id===s.id)throw Error('A payout structure cannot reference its own output.');
   if(target.lob!==s.lob||target.entity!==s.entity||target.period!==s.period)throw Error('Referenced payout structures must use the same entity, business line and evaluation period.');walk(target);
  }visiting.delete(s.id);done.add(s.id);
 }walk(candidate);
}
const beforeOutputValidate=validateStructure;
validateStructure=function(s){ensureOutputNames(s);checkOutputDependencies(s);beforeOutputValidate(s);};
const beforeOutputCalculate=calculate;let payoutEvaluation=null;
calculate=function(t,u){
 const root=!payoutEvaluation;if(root)payoutEvaluation={active:new Set(),cache:new Map()};const context=payoutEvaluation,key=u.id+'|'+t.structure+'|'+t.id;
 try{
  if(context.active.has(key))throw Error('Circular payout structure reference.');if(context.cache.has(key))return context.cache.get(key);
  context.active.add(key);const s=structure(t.structure);if(!s)throw Error('Structure not found.');
  const result=beforeOutputCalculate({...t,__resolveOutput:token=>{
   const target=state.structures.find(x=>x.outputKey===token);if(!target)throw Error('Unknown payout structure output: '+token);
   if(target.id===s.id)throw Error('A payout structure cannot reference its own output.');
   if(target.period!==s.period||target.lob!==s.lob||target.entity!==s.entity)throw Error('Payout structure output requires the same entity and evaluation period.');
   const matches=[...new Set(assignmentsForUser(u).filter(a=>template(a.template)?.structure===target.id).map(a=>a.template))];
   if(matches.length!==1)throw Error(target.name+': '+(matches.length?'multiple assigned templates match this user.':'no applicable template is assigned to this user.'));
   return calculate(template(matches[0]),u).total;
  }},u);context.cache.set(key,result);return result;
 }finally{context.active.delete(key);if(root)payoutEvaluation=null;}
};
render();save();
