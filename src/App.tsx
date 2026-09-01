"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Bell, BookOpen, CalendarClock, CheckCircle2, ChevronDown, ClipboardCheck, Database, FileText, Flame, Fuel, Gauge, LayoutDashboard, LogOut, Megaphone, Menu, Settings, ShieldCheck, Siren, Thermometer, Users, Waves, Wrench, X, Zap } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { AuthGate, type UserProfile } from "./components/AuthGate";
import { BoilerMonitor } from "./components/BoilerMonitor";
import { SharedShift } from "./components/SharedShift";
import { WorkersList } from "./components/WorkersList";
import { OperationalModule } from "./components/OperationalModules";
import { NotificationCenter } from "./components/NotificationCenter";
import { DataStore } from "./components/DataStore";
import { RuntimeHistory } from "./components/RuntimeHistory";
import { FuelUsage } from "./components/FuelUsage";
import { Announcements } from "./components/Announcements";
import { ChecklistSummary, SharedChecklist } from "./components/SharedChecklist";
import { BoilerHero } from "./components/BoilerHero";
import { supabase } from "./lib/supabase";

type Section = "Dashboard" | "Boiler Logbook" | "Safety Checklist" | "Workers List" | "Data Store" | "Run History" | "Fuel Calculation" | "Announcements" | "Shift Handover" | "Maintenance" | "Incidents" | "Documents" | "Reports" | "Admin Panel";
type Severity = "Normal" | "Warning" | "Critical";
const nav: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard }, { label: "Boiler Logbook", icon: BookOpen },
  { label: "Safety Checklist", icon: ClipboardCheck }, { label: "Shift Handover", icon: Users },
  { label: "Workers List", icon: Users },
  { label: "Data Store", icon: Database },
  { label: "Run History", icon: CalendarClock },
  { label: "Fuel Calculation", icon: Fuel },
  { label: "Announcements", icon: Megaphone },
  { label: "Maintenance", icon: Wrench }, { label: "Incidents", icon: Siren },
  { label: "Documents", icon: FileText }, { label: "Reports", icon: Activity }, { label: "Admin Panel", icon: Settings },
];
const limits = { pressure:{min:6,max:12,warning:10.5}, waterLevel:{min:40,max:80,warning:45}, steamTemp:{min:150,max:200,warning:190}, flueTemp:{min:110,max:220,warning:200} };
const points=[8.7,9,8.9,9.3,9.1,9.5,9.2,9.6,9.4,9.6,9.7,9.6];
const bars=[56,61,64,59,70,73,68,54,50,57,62,58];
function severity(value:number,key:keyof typeof limits):Severity { const l=limits[key]; if(value<l.min||value>l.max)return "Critical"; if((key==="waterLevel"&&value<=l.warning)||(key!=="waterLevel"&&value>=l.warning))return "Warning"; return "Normal"; }
function StatusPill({status}:{status:string}) { const tone=["Normal","Running","Completed","Scheduled"].includes(status)?"green":["Critical","Overdue"].includes(status)?"red":"amber"; return <span className={`pill ${tone}`}><span className="pill-dot"/>{status}</span>; }

export default function Home(){
  return <AuthGate>{(session, profile) => <AuthenticatedApp session={session} profile={profile} />}</AuthGate>;
}

function AuthenticatedApp({session, profile}:{session:Session;profile:UserProfile|null}){
  const[active,setActive]=useState<Section>("Dashboard"),[mobile,setMobile]=useState(false),[alert,setAlert]=useState(true),[toast,setToast]=useState("");
  const[readings,setReadings]=useState({pressure:9.6,waterLevel:62,steamTemp:184,flueTemp:228});
  const warningCount=useMemo(()=>Object.entries(readings).filter(([k,v])=>severity(v,k as keyof typeof limits)!=="Normal").length,[readings]);
  const notify=(m:string)=>{setToast(m);window.setTimeout(()=>setToast(""),2500)};
  const go=(s:Section)=>{setActive(s);setMobile(false)};
  const visibleNav=profile?.role==="admin"?nav:nav.filter(item=>item.label!=="Admin Panel");
  const displayName=profile?.full_name||session.user.user_metadata.full_name||session.user.email?.split("@")[0]||"SteamGuard User";
  const role=(profile?.role||"operator").replace(/^./,letter=>letter.toUpperCase());
  const initials=displayName.split(" ").map((part:string)=>part[0]).join("").slice(0,2).toUpperCase();
  return <div className="app-shell">
    <aside className={`sidebar ${mobile?"open":""}`}><div className="brand"><div className="brand-mark"><ShieldCheck/><Flame/></div><div><strong>SteamGuard</strong><span>Operations & Maintenance</span></div><button className="mobile-close" onClick={()=>setMobile(false)}><X/></button></div>
      <nav>{visibleNav.map(({label,icon:Icon})=><button key={label} className={active===label?"active":""} onClick={()=>go(label)}><Icon size={19}/><span>{label}</span>{label==="Incidents"&&<b className="nav-count">2</b>}</button>)}</nav>
      <div className="sidebar-foot"><div className="system-health"><span/><div><b>System Online</b><small>Connected securely</small></div></div><button onClick={()=>void supabase.auth.signOut()}><LogOut size={18}/>Sign out</button></div>
    </aside>
    <div className="main-column"><header><button className="menu-button" onClick={()=>setMobile(true)}><Menu/></button><div className="header-title"><h1>{active}</h1><p>Boiler Operations & Maintenance</p></div><div className="header-actions"><SharedShift/><NotificationCenter/><div className="profile"><div className="avatar">{initials}</div><div><b>{displayName}</b><span>{role}</span></div></div></div></header>
      <main>{active==="Dashboard"&&<Dashboard session={session} profile={profile} readings={readings} warningCount={warningCount} alert={alert} acknowledge={()=>{setAlert(false);notify("Warning acknowledged and recorded")}} go={go}/>} {active==="Boiler Logbook"&&<Logbook readings={readings} setReadings={setReadings} notify={notify}/>} {active==="Safety Checklist"&&<SharedChecklist notify={notify}/>} {active==="Workers List"&&<WorkersList profile={profile} notify={notify}/>} {active==="Data Store"&&<DataStore session={session} profile={profile} notify={notify}/>} {active==="Run History"&&<RuntimeHistory/>} {active==="Fuel Calculation"&&<FuelUsage session={session} notify={notify}/>} {active==="Announcements"&&<Announcements session={session} profile={profile} notify={notify}/>} {(["Shift Handover","Maintenance","Incidents","Documents","Reports"] as Section[]).includes(active)&&<OperationalModule title={active as "Shift Handover"|"Maintenance"|"Incidents"|"Documents"|"Reports"} notify={notify}/>} {active==="Admin Panel"&&<ModulePage title={active} notify={notify}/>}</main>
    </div>{mobile&&<button className="backdrop" onClick={()=>setMobile(false)}/>} {toast&&<div className="toast"><CheckCircle2 size={19}/>{toast}</div>}
  </div>;
}

function Dashboard({session,profile,readings,warningCount,alert,acknowledge,go}:{session:Session;profile:UserProfile|null;readings:{pressure:number;waterLevel:number;steamTemp:number;flueTemp:number};warningCount:number;alert:boolean;acknowledge:()=>void;go:(s:Section)=>void}){
 return <>{alert&&<div className="alert-banner"><AlertTriangle/><div><b>Warning:</b> Flue gas temperature is above the configured limit.</div><button onClick={acknowledge}>Acknowledge</button></div>}
 <div className="page-heading"><div><p className="eyebrow">PLANT 01 · BOILER SG-01</p><h2>Operations overview</h2><span>Last reading recorded today at 10:00 AM</span></div><button className="primary" onClick={()=>go("Boiler Logbook")}><Zap size={17}/>Add reading</button></div>
 <BoilerHero/>
 <BoilerMonitor session={session} profile={profile}/>
 <ChecklistSummary open={()=>go("Safety Checklist")}/>
 <p className="disclaimer"><ShieldCheck size={16}/>Dashboard displays stored operational status only. SteamGuard does not replace certified controls, alarms, safety interlocks, or approved operating procedures.</p></>;
}
function Metric({icon:Icon,label,value,sub,status}:{icon:typeof Flame;label:string;value:string;sub:string;status:string}){return <article className="metric"><div className={`metric-icon ${status.toLowerCase()}`}><Icon/></div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div><StatusPill status={status}/></article>}
function PanelHead({title,tag}:{title:string;tag:string}){return <div className="panel-head"><h3>{title}</h3><span>{tag}</span></div>}
function Reading({icon:Icon,label,value}:{icon:typeof Flame;label:string;value:string}){return <div><Icon/><span>{label}</span><b>{value}</b></div>}
function MaintenanceRow({icon:Icon,title,desc,date,status}:{icon:typeof Flame;title:string;desc:string;date:string;status:string}){return <div className="maintenance-row"><div className="task-icon"><Icon/></div><div><b>{title}</b><span>{desc}</span></div><time>{date}</time><StatusPill status={status}/></div>}

function Logbook({readings,setReadings,notify}:{readings:{pressure:number;waterLevel:number;steamTemp:number;flueTemp:number};setReadings:(v:{pressure:number;waterLevel:number;steamTemp:number;flueTemp:number})=>void;notify:(s:string)=>void}){
 const[form,setForm]=useState(readings); const submit=(e:React.FormEvent)=>{e.preventDefault();setReadings(form);notify("Boiler reading saved successfully")};
 const fields=[["pressure","Steam pressure","bar"],["waterLevel","Water level","%"],["steamTemp","Steam temperature","°C"],["flueTemp","Flue gas temperature","°C"]] as const;
 return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">DIGITAL OPERATIONS RECORD</p><h2>New logbook entry</h2><span>Values are checked against administrator-approved limits.</span></div><StatusPill status="Shift A"/></div><form className="entry-form panel" onSubmit={submit}><div className="form-intro"><div><h3>Boiler SG-01</h3><p>Fire-tube boiler · Plant 01</p></div><span>26 Aug 2026 · 10:00 AM</span></div><div className="form-grid">{fields.map(([key,label,unit])=><label key={key}><span>{label}</span><div className="input-unit"><input type="number" step="0.1" value={form[key]} onChange={e=>setForm({...form,[key]:Number(e.target.value)})}/><b>{unit}</b></div><StatusPill status={severity(form[key],key)}/></label>)}<label><span>Feed-water temperature</span><div className="input-unit"><input type="number" defaultValue="78"/><b>°C</b></div></label><label><span>Furnace temperature</span><div className="input-unit"><input type="number" defaultValue="820"/><b>°C</b></div></label></div><label className="notes"><span>Operator remarks</span><textarea placeholder="Add observations, unusual noises, leakage, or pending actions…"/></label><div className="form-actions"><button type="button" className="secondary">Save draft</button><button className="primary"><CheckCircle2 size={18}/>Submit reading</button></div></form></section>;
}
function Checklist({values,setValues,notify}:{values:boolean[];setValues:(v:boolean[])=>void;notify:(s:string)=>void}){
 const items=["Boiler area is clean and accessible","Water level has been verified","Pressure gauge is in good condition","Safety valve condition has been checked","Feed-water pump is operating normally","Fuel supply is stable","Furnace condition has been inspected","No visible steam or water leakage","Alarm system status has been checked","Shift handover notes have been reviewed"],done=values.filter(Boolean).length;
 return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">SHIFT A · PRE-START INSPECTION</p><h2>Safety checklist</h2><span>{done} of {items.length} checks completed</span></div><div className="completion-badge">{done*10}%</div></div><div className="checklist-list panel">{items.map((item,i)=><label key={item} className={values[i]?"checked":""}><button type="button" onClick={()=>{const c=[...values];c[i]=!c[i];setValues(c)}}><CheckCircle2/></button><span><b>{String(i+1).padStart(2,"0")}</b>{item}</span><em>{values[i]?"Completed":"Pending"}</em></label>)}<div className="form-actions"><button className="primary" onClick={()=>notify(`Checklist submitted with ${items.length-done} pending item(s)`)}><ShieldCheck size={18}/>Submit checklist</button></div></div></section>;
}
function Maintenance({notify}:{notify:(s:string)=>void}){return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">ASSET RELIABILITY</p><h2>Maintenance schedule</h2><span>Preventive and corrective work for registered equipment.</span></div><button className="primary" onClick={()=>notify("New work order form opened")}><Wrench size={17}/>New work order</button></div><div className="maintenance-table panel"><div className="table-head"><span>Equipment</span><span>Work type</span><span>Due date</span><span>Priority</span><span>Status</span></div><MaintenanceRow icon={Waves} title="Feed water pump" desc="FWP-01" date="28 Aug" status="Scheduled"/><MaintenanceRow icon={ShieldCheck} title="Safety valve" desc="SV-102" date="30 Aug" status="Due soon"/><MaintenanceRow icon={Flame} title="Main burner" desc="BR-01" date="02 Sep" status="Planned"/><MaintenanceRow icon={Gauge} title="Pressure gauge" desc="PG-04" date="24 Aug" status="Overdue"/></div></section>}
function ModulePage({title,notify}:{title:Section;notify:(s:string)=>void}){const data:Record<string,{e:string;d:string;c:string[]}>= {"Shift Handover":{e:"OPERATOR CONTINUITY",d:"Transfer boiler condition, outstanding work, and safety information between shifts.",c:["Current boiler condition","Pending maintenance","Outgoing operator notes"]},"Incidents":{e:"SAFETY & CORRECTIVE ACTION",d:"Record faults, alarms, leaks, root causes, and corrective actions.",c:["Open incidents","Under investigation","Verified resolutions"]},"Documents":{e:"CONTROLLED DOCUMENT LIBRARY",d:"Manage approved procedures, certificates, inspections, and calibration records.",c:["Operating procedures","Certificates","Inspection reports"]},"Reports":{e:"OPERATIONAL ANALYTICS",d:"Generate filtered operational, maintenance, safety, and consumption reports.",c:["Daily operations","Fuel & steam","Safety compliance"]},"Admin Panel":{e:"SYSTEM CONFIGURATION",d:"Manage users, shifts, boiler records, checklists, and approved operational limits.",c:["Users & roles","Operational limits","Audit trail"]}};const d=data[title];return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">{d.e}</p><h2>{title}</h2><span>{d.d}</span></div><button className="primary" onClick={()=>notify(`${title} action created`)}>Create new</button></div><div className="module-cards">{d.c.map((c,i)=><article className="panel" key={c}><div className="module-card-icon">{i===0?<FileText/>:i===1?<Activity/>:<ShieldCheck/>}</div><h3>{c}</h3><p>Review and manage structured {c.toLowerCase()} records for Boiler SG-01.</p><button onClick={()=>notify(`${c} opened`)}>Open module →</button></article>)}</div></section>}
