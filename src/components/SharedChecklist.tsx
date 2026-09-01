import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
type Item={id:number;item_text:string;is_completed:boolean};
export function SharedChecklist({notify}:{notify:(s:string)=>void}){
 const[items,setItems]=useState<Item[]>([]),[text,setText]=useState(""),[error,setError]=useState("");
 const load=useCallback(async()=>{const{data,error:e}=await supabase.from("safety_checklist_items").select("*").order("sort_order");if(e)setError(e.message);else{setItems((data||[]) as Item[]);setError("")}},[]);
 useEffect(()=>{void load();const c=supabase.channel("shared-checklist").on("postgres_changes",{event:"*",schema:"public",table:"safety_checklist_items"},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c)}},[load]);
 const add=async(e:FormEvent)=>{e.preventDefault();if(!text.trim())return;const{error:e2}=await supabase.from("safety_checklist_items").insert({item_text:text.trim(),sort_order:items.length});if(e2)setError(e2.message);else{setText("");notify("Checklist item added")}};
 const toggle=async(i:Item)=>{const{error:e}=await supabase.from("safety_checklist_items").update({is_completed:!i.is_completed}).eq("id",i.id);if(e)setError(e.message)};
 const remove=async(i:Item)=>{if(!confirm(`Remove checklist item: ${i.item_text}?`))return;const{error:e}=await supabase.from("safety_checklist_items").delete().eq("id",i.id);if(e)setError(e.message);else notify("Checklist item removed")};
 const done=items.filter(i=>i.is_completed).length;
 return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">SHARED SAFETY INSPECTION</p><h2>Safety checklist</h2><span>{done} of {items.length} checks completed · shared with all users</span></div><div className="completion-badge">{items.length?Math.round(done/items.length*100):0}%</div></div>{error&&<div className="monitor-error">{error}</div>}<form className="checklist-add panel" onSubmit={add}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Add a new checklist item"/><button className="primary"><Plus/>Add item</button></form><div className="checklist-list panel">{items.map((item,i)=><label key={item.id} className={item.is_completed?"checked":""}><button type="button" onClick={()=>void toggle(item)}><CheckCircle2/></button><span><b>{String(i+1).padStart(2,"0")}</b>{item.item_text}</span><em>{item.is_completed?"Completed":"Pending"}</em><button type="button" className="check-delete" onClick={()=>void remove(item)}><Trash2/></button></label>)}<div className="form-actions"><button className="primary" onClick={()=>notify(`Checklist submitted with ${items.length-done} pending item(s)`)}><ShieldCheck/>Submit checklist</button></div></div></section>;
}

export function ChecklistSummary({open}:{open:()=>void}){
 const[items,setItems]=useState<Item[]>([]);
 const load=useCallback(async()=>{const{data}=await supabase.from("safety_checklist_items").select("id,item_text,is_completed").order("sort_order");setItems((data||[]) as Item[])},[]);
 useEffect(()=>{void load();const c=supabase.channel("checklist-summary").on("postgres_changes",{event:"*",schema:"public",table:"safety_checklist_items"},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c)}},[load]);
 const done=items.filter(i=>i.is_completed).length,percent=items.length?Math.round(done/items.length*100):0;
 return <article className="panel dashboard-checklist-card"><div className="progress-ring" style={{"--progress":`${percent}%`} as React.CSSProperties}><div><b>{percent}%</b><span>Complete</span></div></div><div><p className="eyebrow">SAFETY CHECKLIST</p><h3>{done} of {items.length} checks complete</h3><p>{items.length-done} pending item(s). Submission is allowed with pending items.</p><button onClick={open}>Open safety checklist →</button></div></article>;
}
