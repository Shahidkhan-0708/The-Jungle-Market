"use client";
import {useEffect,useRef,useState} from 'react';
import {Btn,Field} from './jungle-market';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {costStatement} from '@/lib/publish-stages';
import {CostItem,Draft,send} from '@/lib/workflow';

type Estimate={items:(CostItem&{per_craft:number|null})[];missing:string[];suggested_price:number|null;production_cost?:number;profit?:number;delivery_network:number};
export default function CostPricing({draft,token,update,onBusy}:{draft:Draft;token:string;update:(d:Partial<Draft>)=>void;onBusy:(busy:boolean)=>void}){
  const [estimate,setEstimate]=useState<Estimate|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const items=draft.cost_items||[];
  const recordedStatement=costStatement(draft);
  const story=[recordedStatement,draft.cost_notes].filter(Boolean).join('\n\n');
  const previousStory=useRef(story);
  const costKey=JSON.stringify(items);
  function apply(result:Estimate,replacePrice:boolean){
    setEstimate(result);
    update({cost_items:result.items.map(({per_craft,...item})=>item),
      ...(result.suggested_price!==null&&(replacePrice||!draft.price)?{price:result.suggested_price}:{})});
  }
  async function calculate(extract:boolean){
    setLoading(true);onBusy(true);setError('');setEstimate(null);
    try{apply(await send<Estimate>('/v1/pricing/suggest',token,{story,items:extract?null:items,
      markup_percent:draft.cost_markup_percent??20,processing_consent:draft.processing_consent}),true);}
    catch(e){setError(e instanceof Error?e.message:'Could not calculate the price.');}
    finally{setLoading(false);onBusy(false);}
  }
  useEffect(()=>{
    if(!token||!draft.processing_consent)return;
    let active=true;
    const timer=setTimeout(()=>{
    const storyChanged=previousStory.current!==story;
    previousStory.current=story;
    setLoading(true);onBusy(true);setError('');
    send<Estimate>('/v1/pricing/suggest',token,{story,items:storyChanged?null:items.length?items:null,
      markup_percent:draft.cost_markup_percent??20,processing_consent:draft.processing_consent})
      .then(result=>{if(active)apply(result,true);})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:'Could not calculate the price.');})
      .finally(()=>{if(active){setLoading(false);onBusy(false);}});
    },700);
    return()=>{active=false;clearTimeout(timer);setLoading(false);onBusy(false);};
    // Only cost inputs trigger recalculation, not the price written by the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[token,story,costKey,draft.cost_markup_percent,draft.processing_consent]);
  function edit(index:number,change:Partial<CostItem>){setEstimate(null);update({cost_items:items.map((item,i)=>i===index?{...item,...change,quote:''}:item)});}
  return <div className="stack">
    <div className="cost-formula" aria-label="Price calculation"><span>Making costs</span><b>+</b><span>Your profit</span><b>+</b><span>₹113 delivery/network</span></div>
    <details className="workflow-help"><summary>How your price is calculated</summary><p>Costs come from your recording and notes. Shared equipment and batch costs are divided across the crafts they serve, then your profit markup and the delivery/network allowance are added.</p></details>
    {loading&&<p role="status">Reading your costs and calculating a price…</p>}
    {error&&<div className="notice error" role="alert">{error}</div>}
    {recordedStatement&&<details><summary>Your recorded cost statement</summary><p>{recordedStatement}</p></details>}
    <Field label="Additional cost details" hint="Example: Materials ₹200 per basket, labour ₹300, a ₹1,000 tool used for 100 baskets, packaging ₹40."><Textarea value={draft.cost_notes||''} onChange={e=>{setEstimate(null);update({cost_notes:e.target.value});}}/></Field>
    <Btn tone="secondary" disabled={loading||!token||!story.trim()} onClick={()=>calculate(true)}>Read story and rebuild cost breakdown</Btn>
    <small>Rebuilding replaces the rows below with costs stated in your story and notes. Missing amounts are left for you to confirm.</small>
    {items.map((item,i)=><div className="stack workflow-cost-item" key={i}>
      <Field label={`Cost ${i+1}`}><Input value={item.label} maxLength={120} onChange={e=>edit(i,{label:e.target.value})}/></Field>
      <Field label="Cost type"><select value={item.category} onChange={e=>edit(i,{category:e.target.value as CostItem['category']})}>{['materials','labour','equipment','packaging','other'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <div className="two-col"><Field label="Total cost (₹)"><Input type="number" min="0" max="1000000" step=".01" value={item.amount??''} onChange={e=>edit(i,{amount:e.target.value===''?null:Number(e.target.value)})}/></Field>
      <Field label="Crafts this cost covers" hint={item.category==='equipment'?'For a purchased tool: expected lifetime craft count. For per-craft rental: 1.':'Use 1 for a per-craft cost; use batch size for a batch total.'}><Input type="number" min="1" max="1000000" step="1" value={item.units??''} onChange={e=>edit(i,{units:e.target.value===''?null:Number(e.target.value)})}/></Field></div>
      {item.quote&&<small>From your story: “{item.quote}”</small>}
      {item.amount!==null&&item.units&&<strong>₹{(item.amount/item.units).toFixed(2)} per craft</strong>}
      <Btn tone="secondary" onClick={()=>{setEstimate(null);update({cost_items:items.filter((_,n)=>n!==i)});}}>Remove this cost</Btn>
    </div>)}
    <Btn tone="secondary" disabled={items.length>=30} onClick={()=>{setEstimate(null);update({cost_items:[...items,{label:'New cost',category:'other',amount:null,units:1,quote:''}]});}}>Add material, labour or equipment cost</Btn>
    <Field label="Profit markup on production cost (%)" hint="20% is a starting setting, not an inferred cost. You can change it."><Input type="number" min="0" max="200" step="1" value={draft.cost_markup_percent??20} onChange={e=>{setEstimate(null);update({cost_markup_percent:Number(e.target.value)});}}/></Field>
    <Btn disabled={loading||!token||!items.length} onClick={()=>calculate(false)}>Calculate and use suggested price</Btn>
    {!estimate&&items.length>0&&!loading&&<small>The suggested price updates automatically after cost changes.</small>}
    {estimate?.missing.length? <div className="notice warning">{estimate.items.length?'Complete these costs: '+estimate.missing.join(', ')+'.':'No production costs were stated. Add amounts in Additional cost details or add cost rows.'} Include labour and equipment use, or explicitly enter zero where there is no cost.</div>:null}
    {estimate?.suggested_price!==null&&estimate?.suggested_price!==undefined&&<div className="notice"><p>Production: ₹{estimate.production_cost?.toFixed(2)} + profit: ₹{estimate.profit?.toFixed(2)} + delivery/network: ₹{estimate.delivery_network}</p><strong>Suggested selling price: ₹{estimate.suggested_price}</strong><p>Cost-based suggestion, rounded up to the next rupee. Check that every production cost is included.</p></div>}
  </div>;
}
