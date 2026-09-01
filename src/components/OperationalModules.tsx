import { FormEvent, useCallback, useEffect, useState } from "react";
import { BarChart3, ExternalLink, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabase";

export type OperationalSection = "Shift Handover"|"Maintenance"|"Incidents"|"Documents"|"Reports";
type RecordRow = Record<string, unknown> & {id:number;created_at:string};
type Boiler={id:number;code:string};

const settings={
  "Shift Handover":{table:"shift_handovers",eyebrow:"OPERATOR CONTINUITY",description:"Transfer boiler condition, pending work and safety information between shifts."},
  "Maintenance":{table:"maintenance_tasks",eyebrow:"ASSET RELIABILITY",description:"Create and track preventive and corrective maintenance work."},
  "Incidents":{table:"incidents",eyebrow:"SAFETY & CORRECTIVE ACTION",description:"Report incidents, severity and corrective actions."},
  "Documents":{table:"documents",eyebrow:"CONTROLLED DOCUMENT LIBRARY",description:"Store links to procedures, certificates and inspection documents."},
} as const;

export function OperationalModule({title,notify}:{title:OperationalSection;notify:(text:string)=>void}){
  if(title==="Reports")return <Reports/>;
  return <Records title={title} notify={notify}/>;
}

function Records({title,notify}:{title:Exclude<OperationalSection,"Reports">;notify:(text:string)=>void}){
  const config=settings[title],[rows,setRows]=useState<RecordRow[]>([]),[boilers,setBoilers]=useState<Boiler[]>([]),[open,setOpen]=useState(false),[editing,setEditing]=useState<RecordRow|null>(null),[error,setError]=useState("");
  const load=useCallback(async()=>{const [r,b]=await Promise.all([supabase.from(config.table).select("*").order("created_at",{ascending:false}),supabase.from("boilers").select("id,code").order("code")]);if(r.error||b.error)setError(r.error?.message||b.error?.message||"Unable to load records");else{setRows((r.data||[]) as RecordRow[]);setBoilers((b.data||[]) as Boiler[]);setError("")}},[config.table]);
  useEffect(()=>{void load();const c=supabase.channel(`records-${config.table}`).on("postgres_changes",{event:"*",schema:"public",table:config.table},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c)}},[config.table,load]);
  return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">{config.eyebrow}</p><h2>{title}</h2><span>{config.description}</span></div><button className="primary" onClick={()=>setOpen(true)}><Plus/>Create new</button></div>
  {error&&<div className="monitor-error">{error}</div>}{(open||editing)&&<RecordForm title={title} boilers={boilers} existing={editing} close={()=>{setOpen(false);setEditing(null)}} done={()=>{setOpen(false);setEditing(null);notify(`${title} record saved`)}}/>}
  <div className="records-list">{rows.map(row=><RecordCard key={row.id} title={title} row={row} boilers={boilers} edit={()=>setEditing(row)} remove={async()=>{if(!confirm("Delete this record?"))return;const{error:e}=await supabase.from(config.table).delete().eq("id",row.id);if(e)setError(e.message);else notify(`${title} record deleted`)}}/>)}</div>
  {!rows.length&&!open&&<div className="empty-panel panel"><FileText/><h3>No {title.toLowerCase()} records</h3><p>Use Create new to add the first record.</p></div>}</section>;
}

function RecordForm({title,boilers,existing,close,done}:{title:Exclude<OperationalSection,"Reports">;boilers:Boiler[];existing:RecordRow|null;close:()=>void;done:()=>void}){
  const [form,setForm]=useState<Record<string,string>>(()=>existing?Object.fromEntries(Object.entries(existing).map(([k,v])=>[k,v==null?"":String(v)])):{}),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const update=(key:string,value:string)=>setForm({...form,[key]:value});
  const submit=async(e:FormEvent)=>{e.preventDefault();setSaving(true);const user=(await supabase.auth.getUser()).data.user;if(!user){setError("Session expired");setSaving(false);return}
    let payload:Record<string,unknown>;
    if(title==="Shift Handover")payload={shift:form.shift,boiler_name:form.boiler_name,boiler_condition:form.boiler_condition,pending_work:form.pending_work||"",safety_notes:form.safety_notes||"",created_by:user.id};
    else if(title==="Maintenance")payload={boiler_name:form.boiler_name,equipment:form.equipment,work_type:form.work_type,due_date:form.due_date,priority:form.priority,status:"Scheduled",notes:form.notes||"",created_by:user.id};
    else if(title==="Incidents")payload={boiler_name:form.boiler_name,title:form.title,severity:form.severity,description:form.description,corrective_action:form.corrective_action||"",status:"Open",reported_by:user.id};
    else payload={title:form.title,category:form.category,document_url:form.document_url,expiry_date:form.expiry_date||null,notes:form.notes||"",created_by:user.id};
    const query=supabase.from(settings[title].table);const{error:saveError}=existing?await query.update(payload).eq("id",existing.id):await query.insert(payload);if(saveError)setError(saveError.message);else done();setSaving(false)};
  const BoilerInput=()=> <label>Boiler / Equipment<input required value={form.boiler_name||""} onChange={e=>update("boiler_name",e.target.value)} placeholder="Type SG-01, Main Boiler 1, pump, etc."/></label>;
  return <div className="form-overlay"><form className="record-form panel" onSubmit={submit}><div className="record-form-head"><div><p className="eyebrow">{existing?"EDIT RECORD":"NEW RECORD"}</p><h3>{title}</h3></div><button type="button" onClick={close}><X/></button></div>{error&&<div className="monitor-error">{error}</div>}
  {title==="Shift Handover"&&<><label>Shift<select required onChange={e=>update("shift",e.target.value)} defaultValue={form.shift||""}><option value="" disabled>Select</option><option>Shift A</option><option>Shift B</option><option>Shift C</option></select></label><BoilerInput/><label>Boiler condition<textarea required defaultValue={form.boiler_condition} onChange={e=>update("boiler_condition",e.target.value)}/></label><label>Pending work<textarea defaultValue={form.pending_work} onChange={e=>update("pending_work",e.target.value)}/></label><label>Safety notes<textarea defaultValue={form.safety_notes} onChange={e=>update("safety_notes",e.target.value)}/></label></>}
  {title==="Maintenance"&&<><BoilerInput/><label>Equipment<input required defaultValue={form.equipment} onChange={e=>update("equipment",e.target.value)}/></label><label>Work type<input required defaultValue={form.work_type} onChange={e=>update("work_type",e.target.value)}/></label><label>Due date<input type="date" required defaultValue={form.due_date} onChange={e=>update("due_date",e.target.value)}/></label><label>Priority<select required defaultValue={form.priority||""} onChange={e=>update("priority",e.target.value)}><option value="" disabled>Select</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><label>Notes<textarea defaultValue={form.notes} onChange={e=>update("notes",e.target.value)}/></label></>}
  {title==="Incidents"&&<><BoilerInput/><label>Incident title<input required defaultValue={form.title} onChange={e=>update("title",e.target.value)}/></label><label>Severity<select required defaultValue={form.severity||""} onChange={e=>update("severity",e.target.value)}><option value="" disabled>Select</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><label>Description<textarea required defaultValue={form.description} onChange={e=>update("description",e.target.value)}/></label><label>Corrective action<textarea defaultValue={form.corrective_action} onChange={e=>update("corrective_action",e.target.value)}/></label></>}
  {title==="Documents"&&<><label>Document title<input required defaultValue={form.title} onChange={e=>update("title",e.target.value)}/></label><label>Category<select required defaultValue={form.category||""} onChange={e=>update("category",e.target.value)}><option value="" disabled>Select</option><option>Procedure</option><option>Certificate</option><option>Inspection</option><option>Calibration</option></select></label><label>Document link<input type="url" required defaultValue={form.document_url} placeholder="https://…" onChange={e=>update("document_url",e.target.value)}/></label><label>Expiry date<input type="date" defaultValue={form.expiry_date} onChange={e=>update("expiry_date",e.target.value)}/></label><label>Notes<textarea defaultValue={form.notes} onChange={e=>update("notes",e.target.value)}/></label></>}
  <button className="primary" disabled={saving}>{saving?"Saving…":"Save record"}</button></form></div>;
}

function RecordCard({title,row,boilers,edit,remove}:{title:Exclude<OperationalSection,"Reports">;row:RecordRow;boilers:Boiler[];edit:()=>void;remove:()=>void}){
  const boiler=String(row.boiler_name||boilers.find(b=>b.id===Number(row.boiler_id))?.code||"");
  const heading=String(row.title||row.equipment||row.boiler_condition||"Operational record");
  const detail=String(row.description||row.work_type||row.category||row.pending_work||"No additional details");
  return <article className="panel record-card"><div className="module-card-icon"><FileText/></div><div><span>{boiler||String(row.shift||title)}</span><h3>{heading}</h3><p>{detail}</p><time>{new Date(row.created_at).toLocaleString()}</time></div>{title==="Documents"&&<a href={String(row.document_url)} target="_blank" rel="noreferrer">Open <ExternalLink/></a>}<div className="record-actions"><button onClick={edit}><Pencil/>Edit</button><button onClick={remove}><Trash2/>Delete</button></div></article>;
}

function Reports(){
 const [counts,setCounts]=useState({handovers:0,maintenance:0,incidents:0,documents:0});
 useEffect(()=>{void Promise.all(["shift_handovers","maintenance_tasks","incidents","documents"].map(table=>supabase.from(table).select("*",{count:"exact",head:true}))).then(([a,b,c,d])=>setCounts({handovers:a.count||0,maintenance:b.count||0,incidents:c.count||0,documents:d.count||0}))},[]);
 return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">OPERATIONAL ANALYTICS</p><h2>Reports</h2><span>Live summary generated from saved operational records.</span></div></div><div className="report-grid">{Object.entries(counts).map(([key,value])=><article className="panel" key={key}><BarChart3/><span>{key}</span><strong>{value}</strong><small>Total saved records</small></article>)}</div></section>;
}
