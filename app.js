'use strict';
const $=id=>document.getElementById(id);
const KEY='forklight.workspace.v1';
const presets={
  career:{title:'Where should I take my career next?',criteria:[{id:'c1',name:'Growth potential',weight:80},{id:'c2',name:'Work-life balance',weight:65},{id:'c3',name:'Compensation',weight:50},{id:'c4',name:'Meaningful work',weight:70}],options:[{id:'o1',name:'Stay & grow',scores:{c1:6,c2:9,c3:6,c4:7}},{id:'o2',name:'Join a startup',scores:{c1:9,c2:5,c3:7,c4:9}},{id:'o3',name:'Go independent',scores:{c1:8,c2:7,c3:5,c4:8}}]},
  city:{title:'Where could my next chapter begin?',criteria:[{id:'c1',name:'Affordability',weight:75},{id:'c2',name:'Career opportunities',weight:65},{id:'c3',name:'Community',weight:85},{id:'c4',name:'Lifestyle',weight:60}],options:[{id:'o1',name:'Stay local',scores:{c1:8,c2:5,c3:9,c4:6}},{id:'o2',name:'A bigger city',scores:{c1:4,c2:9,c3:5,c4:8}},{id:'o3',name:'A quieter town',scores:{c1:9,c2:4,c3:6,c4:9}}]},
  product:{title:'Which idea deserves the next six weeks?',criteria:[{id:'c1',name:'Real user need',weight:90},{id:'c2',name:'Ease of building',weight:65},{id:'c3',name:'Revenue potential',weight:55},{id:'c4',name:'Personal excitement',weight:70}],options:[{id:'o1',name:'A focused tool',scores:{c1:7,c2:9,c3:5,c4:7}},{id:'o2',name:'A niche platform',scores:{c1:9,c2:4,c3:9,c4:9}},{id:'o3',name:'A service business',scores:{c1:8,c2:7,c3:7,c4:5}}]}
};
const clone=value=>JSON.parse(JSON.stringify(value));
let model=clone(presets.career), insightChanges=[],toastTimer,saveTimer,storageEnabled=true;
try{const saved=localStorage.getItem(KEY);if(saved)model=Forklight.validate(JSON.parse(saved));}catch{storageEnabled=false;}
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function notify(text){$('toast').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').textContent='';},4000);}
function save(){clearTimeout(saveTimer);if(!storageEnabled)return;saveTimer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(model));$('save-state').textContent='● Saved on this device';}catch{$('save-state').textContent='● Saving unavailable';notify('Browser storage is unavailable. Export your decision to keep it.');}},180);}
function update(){drawResults();save();}
function render(){
  $('title').value=model.title;
  drawCriteria();drawMatrix();drawResults();
  $('add-criterion').disabled=model.criteria.length>=8;
  $('add-option').disabled=model.options.length>=5;
}
function drawCriteria(){
  $('criteria').replaceChildren();
  model.criteria.forEach(criterion=>{
    const row=el('div','criterion'),top=el('div','criterion-top');
    const name=el('input','criterion-name');name.value=criterion.name;name.maxLength=40;name.setAttribute('aria-label','Criterion name: '+criterion.name);
    name.addEventListener('input',()=>{criterion.name=name.value;drawMatrix();update();});
    name.addEventListener('blur',()=>{criterion.name=name.value.trim()||'Untitled criterion';name.value=criterion.name;drawMatrix();update();});
    const weight=el('span','weight-label',String(criterion.weight));
    const remove=el('button','remove','×');remove.setAttribute('aria-label','Remove '+criterion.name);remove.disabled=model.criteria.length<=1;
    remove.addEventListener('click',()=>{model.criteria=model.criteria.filter(c=>c.id!==criterion.id);model.options.forEach(o=>delete o.scores[criterion.id]);render();save();});
    const slider=el('input');slider.type='range';slider.min=0;slider.max=100;slider.value=criterion.weight;slider.setAttribute('aria-label','Importance of '+criterion.name);slider.style.setProperty('--fill',criterion.weight+'%');
    slider.addEventListener('input',()=>{criterion.weight=Number(slider.value);slider.style.setProperty('--fill',slider.value+'%');weight.textContent=slider.value;update();});
    top.append(name,weight,remove);const sliderRow=el('div','slider-row');sliderRow.append(slider);row.append(top,sliderRow);$('criteria').append(row);
  });
}
function drawMatrix(){
  const head=$('matrix').querySelector('thead'),body=$('matrix').querySelector('tbody');head.replaceChildren();body.replaceChildren();
  const header=el('tr');header.append(el('th','','CRITERION'));
  model.options.forEach(option=>{
    const th=el('th');th.scope='col';const input=el('input');input.value=option.name;input.maxLength=40;input.setAttribute('aria-label','Option name: '+option.name);
    input.addEventListener('input',()=>{option.name=input.value;update();});
    input.addEventListener('blur',()=>{option.name=input.value.trim()||'Untitled option';input.value=option.name;drawMatrix();update();});
    const remove=el('button','remove','×');remove.setAttribute('aria-label','Remove option '+option.name);remove.disabled=model.options.length<=2;
    remove.addEventListener('click',()=>{model.options=model.options.filter(o=>o.id!==option.id);render();save();});th.append(input,remove);header.append(th);
  });head.append(header);
  model.criteria.forEach(c=>{
    const tr=el('tr');const title=el('td','',c.name);tr.append(title);
    model.options.forEach(o=>{const td=el('td'),input=el('input');input.type='number';input.min=0;input.max=10;input.step=.5;input.inputMode='decimal';input.value=o.scores[c.id];input.setAttribute('aria-label',o.name+': '+c.name);
      input.addEventListener('input',()=>{const n=input.valueAsNumber;if(!Number.isFinite(n)||n<0||n>10){input.setCustomValidity('Enter a score from 0 to 10.');return;}input.setCustomValidity('');o.scores[c.id]=Math.round(n*10)/10;update();});
      input.addEventListener('blur',()=>{input.value=o.scores[c.id];input.setCustomValidity('');});td.append(input);tr.append(td);
    });body.append(tr);
  });
}
function drawResults(){
  const ranking=Forklight.rank(model),total=model.criteria.reduce((s,c)=>s+c.weight,0),winner=ranking[0];
  $('weight-total').textContent=total?'100% normalized · '+total+' points':'Set at least one weight';
  $('winner').replaceChildren();$('ranking').replaceChildren();$('insight').replaceChildren();$('alternatives').replaceChildren();
  const card=el('div','winner-card');const tied=ranking.filter(o=>Math.abs(o.score-winner.score)<1e-9);
  card.append(el('small','',!total?'NO WEIGHTS SET':tied.length>1?'TOO CLOSE TO CALL':'CURRENT FRONT-RUNNER'));
  const name=el('div','winner-name');name.append(el('span','',!total?'Your priorities come first':tied.length>1?'A shared lead':winner.name),el('strong','',total?winner.score.toFixed(2):'—'));card.append(name);
  card.append(el('p','',!total?'Move a priority slider to see a meaningful result.':tied.length>1?tied.map(x=>x.name).join(' · '):(winner.score-ranking[1].score<0.01?'<0.01':'+'+(winner.score-ranking[1].score).toFixed(2))+' points ahead of '+ranking[1].name));$('winner').append(card);
  ranking.forEach((option,index)=>{const row=el('div','rank-row'),caption=el('div','rank-caption');caption.append(el('span','',String(index+1).padStart(2,'0')+'  '+option.name),el('b','',total?option.score.toFixed(2):'—'));const track=el('div','track'),bar=el('div');bar.style.width=(option.score*10)+'%';track.append(bar);row.append(caption,track);$('ranking').append(row);});
  insightChanges=Forklight.sensitivity(model);const box=el('div','insight-box');
  if(!total){box.textContent='Set at least one priority above zero. All-zero weights cannot tell your options apart.';}
  else if(tied.length>1){box.append(el('b','','Your options are tied.'),el('small','','Use more precise scores or adjust a priority. There is no unique winner under your current assumptions.'));}
  else if(insightChanges.length){
    const change=insightChanges[0];box.append(document.createTextNode('If '),el('b','',change.criterion),document.createTextNode(' moved from '),el('b','',String(change.from)),document.createTextNode(' to '),el('b','',String(change.to)),document.createTextNode(', '),el('b','',change.winner),document.createTextNode(' would take the lead.'));
    box.append(el('small','','One weight at a time, in steps of 1. All other weights and scores stay fixed.'));
    const tryIt=el('button','','Try this scenario ↗');tryIt.addEventListener('click',()=>{const criterion=model.criteria.find(c=>c.id===change.criterionId);criterion.weight=change.to;render();save();notify('Scenario applied. Adjust any slider to keep exploring.');});box.append(tryIt);
    if(insightChanges.length>1){const other=insightChanges[1];const p=el('p','alternative');p.append(document.createTextNode('Another tipping point: '),el('span','',other.criterion+' → '+other.to),document.createTextNode(' makes '+other.winner+' the leader.'));$('alternatives').append(p);}
  }else{box.append(el('b','','A resilient lead.'),el('small','','Changing any one weight from 0 to 100, in steps of 1, does not produce a different strict winner. Different scores or several weight changes together could still change the result.'));}
  $('insight').append(box);
}
function replace(next){model=Forklight.validate(clone(next));storageEnabled=true;render();save();}
$('title').addEventListener('input',()=>{model.title=$('title').value;save();});
$('nav-lab').addEventListener('click',()=>{$('title').focus();});
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{if(confirm('Replace this decision with a sample scenario? Export first if you want to keep it.')){replace(presets[button.dataset.preset]);notify('Sample loaded. These scores are illustrative, not recommendations.');}}));
$('preset').addEventListener('change',()=>{const key=$('preset').value;if(key&&confirm('Replace this decision with a sample scenario? Export first if you want to keep it.')){replace(presets[key]);notify('Sample loaded. Scores are illustrative, not recommendations.');}$('preset').value='';});
$('new').addEventListener('click',()=>{if(!confirm('Start fresh? Export your current decision first if you want to keep it.'))return;replace({title:'What am I deciding?',criteria:[{id:'c1',name:'What matters most',weight:50},{id:'c2',name:'Ease of getting there',weight:50}],options:[{id:'o1',name:'Option A',scores:{c1:5,c2:5}},{id:'o2',name:'Option B',scores:{c1:5,c2:5}}]});});
function id(prefix){return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
$('add-criterion').addEventListener('click',()=>{if(model.criteria.length>=8)return;const c={id:id('c'),name:'New criterion',weight:50};model.criteria.push(c);model.options.forEach(o=>o.scores[c.id]=5);render();save();});
$('add-option').addEventListener('click',()=>{if(model.options.length>=5)return;const scores={};model.criteria.forEach(c=>scores[c.id]=5);model.options.push({id:id('o'),name:'New option',scores});render();save();});
function download(filename,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=el('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').addEventListener('click',()=>{download('forklight-decision.json',JSON.stringify(model,null,2),'application/json');notify('Decision exported. Import it later to continue.');});
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('Choose a JSON file smaller than 100 KB.');const next=Forklight.validate(JSON.parse(await file.text()));if(confirm('Replace the current decision with this imported file?')){replace(next);notify('Decision imported successfully.');}}catch(error){notify('Could not import: '+error.message);}finally{event.target.value='';}});
$('report').addEventListener('click',()=>{const total=model.criteria.reduce((s,c)=>s+c.weight,0);const lines=['FORKLIGHT — DECISION REPORT',model.title,'','Priorities',...model.criteria.map(c=>'- '+c.name+': '+c.weight+' points ('+(total?100*c.weight/total:0).toFixed(1)+'%)'),'','Results (weighted average, out of 10)',...Forklight.rank(model).map((o,i)=>(i+1)+'. '+o.name+': '+(total?o.score.toFixed(2):'No weights set')),'','Assumptions (0–10; higher is better)',...model.options.flatMap(o=>[o.name,...model.criteria.map(c=>'  '+c.name+': '+o.scores[c.id])]),'','Sensitivity (one weight at a time, integer steps 0–100)',...insightChanges.map(c=>c.criterion+': '+c.from+' → '+c.to+'; new leader: '+c.winner),'','This report reflects subjective inputs, not objective advice.'];download('forklight-report.txt',lines.join('\n'),'text/plain;charset=utf-8');notify('Report downloaded.');});
$('clear-local').addEventListener('click',()=>{if(confirm('Delete the saved decision from this browser? The decision on screen will remain until you reload.')){clearTimeout(saveTimer);try{localStorage.removeItem(KEY);storageEnabled=false;$('save-state').textContent='● Saving paused';notify('Saved data cleared. Export to keep the on-screen decision.');}catch{notify('Storage could not be cleared in this browser.');}}});
render();if(!storageEnabled){$('save-state').textContent='● Saving unavailable';notify('Saved workspace unavailable. Use Export to keep your work.');}
