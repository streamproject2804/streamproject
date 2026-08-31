import { FormEvent, useCallback, useEffect, useState } from "react";
import type { UserProfile } from "./AuthGate";
import { Check, Plus, Trash2, UserCheck, UserPlus, Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Boiler = { id:number; code:string };
type Worker = { id:string; full_name:string; email:string; assigned_boiler_id:number|null; attendance_status:"in"|"out"; attendance_changed_at:string; is_active:boolean };
type PendingUser = { id:string; full_name:string; email:string; approval_status:"pending"|"rejected" };

export function WorkersList({ profile, notify }:{profile:UserProfile|null;notify:(text:string)=>void}) {
  const [workers,setWorkers]=useState<Worker[]>([]);
  const [boilers,setBoilers]=useState<Boiler[]>([]);
  const [pending,setPending]=useState<PendingUser[]>([]);
  const [assignments,setAssignments]=useState<Record<string,string>>({});
  const [show,setShow]=useState(false);
  const [form,setForm]=useState({full_name:"",email:"",assigned_boiler_id:""});
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    const [w,b,p]=await Promise.all([
      supabase.from("workers").select("*").eq("is_active",true).order("full_name"),
      supabase.from("boilers").select("id,code").order("code"),
      profile?.role==="admin"?supabase.from("profiles").select("id,full_name,email,approval_status").eq("approval_status","pending").order("created_at") : Promise.resolve({data:[],error:null}),
    ]);
    if(w.error||b.error||p.error)setError(w.error?.message||b.error?.message||p.error?.message||"Unable to load workers");
    else {setWorkers((w.data||[]) as Worker[]);setBoilers((b.data||[]) as Boiler[]);setPending((p.data||[]) as PendingUser[]);setError("");}
  },[profile?.role]);

  useEffect(()=>{void load();const channel=supabase.channel("workers-list")
    .on("postgres_changes",{event:"*",schema:"public",table:"workers"},()=>void load())
    .on("postgres_changes",{event:"*",schema:"public",table:"profiles"},()=>void load()).subscribe();
    return()=>{void supabase.removeChannel(channel)}},[load]);

  const add=async(e:FormEvent)=>{e.preventDefault();const {error:saveError}=await supabase.from("workers").insert({
    full_name:form.full_name,email:form.email.toLowerCase(),assigned_boiler_id:Number(form.assigned_boiler_id),created_by:(await supabase.auth.getUser()).data.user?.id
  });if(saveError)setError(saveError.message);else{setShow(false);setForm({full_name:"",email:"",assigned_boiler_id:""});notify("Worker assigned successfully")}};
  const remove=async(id:string)=>{const {error:removeError}=await supabase.from("workers").update({is_active:false}).eq("id",id);if(removeError)setError(removeError.message);else notify("Worker removed")};
  const attend=async(state:"in"|"out")=>{const {error:attendanceError}=await supabase.rpc("set_my_attendance",{next_status:state});if(attendanceError)setError(attendanceError.message);else notify(`Attendance marked ${state.toUpperCase()}`)};
  const approve=async(user:PendingUser)=>{const boilerId=Number(assignments[user.id]);if(!boilerId){setError("Select a boiler before approval");return}const admin=(await supabase.auth.getUser()).data.user;
    const {error:workerError}=await supabase.from("workers").insert({full_name:user.full_name,email:user.email.toLowerCase(),assigned_boiler_id:boilerId,created_by:admin?.id});
    if(workerError){setError(workerError.message);return}
    const {error:profileError}=await supabase.from("profiles").update({approval_status:"approved",is_active:true,role:"operator"}).eq("id",user.id);
    if(profileError)setError(profileError.message);else{notify("User approved and boiler assigned");void load()}};
  const reject=async(id:string)=>{const {error:rejectError}=await supabase.from("profiles").update({approval_status:"rejected",is_active:false}).eq("id",id);if(rejectError)setError(rejectError.message);else{notify("User registration rejected");void load()}};

  return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">WORKFORCE & ASSIGNMENT</p><h2>Workers list</h2><span>One active worker can be assigned to each main boiler.</span></div>{profile?.role==="admin"&&<button className="primary" onClick={()=>setShow(!show)}><Plus/>Add worker</button>}</div>
  {error&&<div className="monitor-error">{error}</div>}
  {profile?.role==="admin"&&pending.length>0&&<section className="pending-approvals"><div className="section-mini-title"><UserPlus/><div><h3>Pending approvals</h3><p>Approve an account and assign exactly one boiler.</p></div><b>{pending.length}</b></div>{pending.map(user=><article className="panel approval-row" key={user.id}><div><b>{user.full_name}</b><span>{user.email}</span></div><select value={assignments[user.id]||""} onChange={e=>setAssignments({...assignments,[user.id]:e.target.value})}><option value="">Assign boiler</option>{boilers.map(boiler=><option key={boiler.id} value={boiler.id} disabled={workers.some(worker=>worker.assigned_boiler_id===boiler.id)}>{boiler.code}</option>)}</select><button className="approve-button" onClick={()=>void approve(user)}><Check/>Approve</button><button className="reject-button" onClick={()=>void reject(user.id)}><X/>Reject</button></article>)}</section>}
  <div className="attendance-actions panel"><div><UserCheck/><span><b>My attendance</b><small>Your IN/OUT update is shared with all users.</small></span></div><button onClick={()=>void attend("in")}>IN</button><button onClick={()=>void attend("out")}>OUT</button></div>
  {show&&<form className="compact-form panel" onSubmit={add}><label>Worker name<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>Login email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Assigned boiler<select required value={form.assigned_boiler_id} onChange={e=>setForm({...form,assigned_boiler_id:e.target.value})}><option value="">Select boiler</option>{boilers.map(b=><option key={b.id} value={b.id}>{b.code}</option>)}</select></label><button className="primary">Save worker</button></form>}
  <div className="worker-grid">{workers.map(w=><article className="panel worker-card" key={w.id}><div className="worker-avatar"><Users/></div><div><h3>{w.full_name}</h3><p>{w.email}</p><span>{boilers.find(b=>b.id===w.assigned_boiler_id)?.code||"Unassigned"}</span></div><b className={`worker-state ${w.attendance_status}`}>{w.attendance_status.toUpperCase()}</b>{profile?.role==="admin"&&<button className="delete-worker" onClick={()=>void remove(w.id)}><Trash2/></button>}<time>Updated {new Date(w.attendance_changed_at).toLocaleString()}</time></article>)}</div>
  {!workers.length&&<div className="empty-panel panel"><Users/><h3>No workers assigned</h3><p>Administrator can add the three main boiler workers.</p></div>}</section>;
}
