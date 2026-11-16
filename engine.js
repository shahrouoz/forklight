(function(root){
  'use strict';
  function rank(model, weights=model.criteria.map(c=>c.weight)) {
    const total=weights.reduce((a,b)=>a+b,0);
    return model.options.map((option,i)=>({id:option.id,name:option.name,index:i,score:total ? model.criteria.reduce((sum,c,j)=>sum+weights[j]*(Number(option.scores[c.id])||0),0)/total : 0})).sort((a,b)=>b.score-a.score||a.index-b.index);
  }
  function sensitivity(model){
    const baseline=rank(model); const leader=baseline[0];
    if(!leader || !model.criteria.some(c=>c.weight>0)) return [];
    const weights=model.criteria.map(c=>c.weight), changes=[];
    model.criteria.forEach((criterion,index)=>{
      let nearest=null;
      for(let value=0;value<=100;value++){
        const trial=[...weights]; trial[index]=value;
        if(!trial.some(Boolean)) continue;
        const result=rank(model,trial);
        if(result[0].id!==leader.id && result[0].score>result.find(x=>x.id===leader.id).score+1e-9){
          const change={criterion:criterion.name,criterionId:criterion.id,from:criterion.weight,to:value,delta:Math.abs(value-criterion.weight),winner:result[0].name};
          if(!nearest||change.delta<nearest.delta) nearest=change;
        }
      }
      if(nearest)changes.push(nearest);
    });
    return changes.sort((a,b)=>a.delta-b.delta);
  }
  function validate(value){
    if(!value||typeof value!=='object'||typeof value.title!=='string'||value.title.length>120) throw Error('Invalid decision title.');
    if(!Array.isArray(value.criteria)||value.criteria.length<1||value.criteria.length>8) throw Error('Use 1–8 criteria.');
    if(!Array.isArray(value.options)||value.options.length<2||value.options.length>5) throw Error('Use 2–5 options.');
    const ids=new Set();
    const criteria=value.criteria.map(c=>{
      if(!c||typeof c.id!=='string'||!/^c[a-z0-9]+$/i.test(c.id)||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>40||!Number.isFinite(c.weight)||c.weight<0||c.weight>100)throw Error('Invalid criterion.');
      ids.add(c.id);return {id:c.id,name:c.name.trim(),weight:Math.round(c.weight)};
    });
    const optionIds=new Set();
    const options=value.options.map(o=>{
      if(!o||typeof o.id!=='string'||!/^o[a-z0-9]+$/i.test(o.id)||optionIds.has(o.id)||typeof o.name!=='string'||!o.name.trim()||o.name.length>40||!o.scores||typeof o.scores!=='object')throw Error('Invalid option.');
      optionIds.add(o.id);const scores={};
      for(const c of criteria){const n=o.scores[c.id];if(!Number.isFinite(n)||n<0||n>10)throw Error('Scores must be between 0 and 10.');scores[c.id]=Math.round(n*10)/10;}
      return {id:o.id,name:o.name.trim(),scores};
    });
    return {title:value.title,criteria,options};
  }
  const api={rank,sensitivity,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Forklight=api;
})(typeof globalThis!=='undefined'?globalThis:this);
