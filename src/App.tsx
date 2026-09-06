"use client";

import { useEffect, useState } from "react";
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
import { Attendance } from "./components/Attendance";
import { LatestReadings, LogbookModule } from "./components/LogbookRecords";
import { supabase } from "./lib/supabase";

type Section = "Dashboard" | "Boiler Logbook" | "Safety Checklist" | "Workers List" | "Attendance" | "Data Store" | "Run History" | "Fuel Calculation" | "Announcements" | "Shift Handover" | "Maintenance" | "Incidents" | "Documents" | "Reports" | "Admin Panel";
const nav: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard }, { label: "Boiler Logbook", icon: BookOpen },
  { label: "Safety Checklist", icon: ClipboardCheck }, { label: "Shift Handover", icon: Users },
  { label: "Workers List", icon: Users },
  { label: "Attendance", icon: CheckCircle2 },
  { label: "Data Store", icon: Database },
  { label: "Run History", icon: CalendarClock },
  { label: "Fuel Calculation", icon: Fuel },
  { label: "Announcements", icon: Megaphone },
  { label: "Maintenance", icon: Wrench }, { label: "Incidents", icon: Siren },
  { label: "Documents", icon: FileText }, { label: "Reports", icon: Activity }, { label: "Admin Panel", icon: Settings },
];

export default function Home(){
  return <AuthGate>{(session, profile) => <AuthenticatedApp session={session} profile={profile} />}</AuthGate>;
}

function AuthenticatedApp({session, profile}:{session:Session;profile:UserProfile|null}){
  const[active,setActive]=useState<Section>("Dashboard"),[mobile,setMobile]=useState(false),[toast,setToast]=useState("");
  const[openIncidents,setOpenIncidents]=useState(0);
  const notify=(m:string)=>{setToast(m);window.setTimeout(()=>setToast(""),2500)};
  const go=(s:Section)=>{setActive(s);setMobile(false)};
  const visibleNav=profile?.role==="admin"?nav:nav.filter(item=>item.label!=="Admin Panel");
  const displayName=profile?.full_name||session.user.user_metadata.full_name||session.user.email?.split("@")[0]||"SteamGuard User";
  const role=(profile?.role||"operator").replace(/^./,letter=>letter.toUpperCase());
  const initials=displayName.split(" ").map((part:string)=>part[0]).join("").slice(0,2).toUpperCase();
  useEffect(()=>{const load=async()=>{const{count}=await supabase.from("incidents").select("id",{count:"exact",head:true}).neq("status","Resolved");setOpenIncidents(count||0)};void load();const channel=supabase.channel("incident-nav-count").on("postgres_changes",{event:"*",schema:"public",table:"incidents"},()=>void load()).subscribe();return()=>{void supabase.removeChannel(channel)}},[]);
  return <div className="app-shell">
    <aside className={`sidebar ${mobile?"open":""}`}><div className="brand"><div className="brand-mark"><ShieldCheck/><Flame/></div><div><strong>SteamGuard</strong><span>Operations & Maintenance</span></div><button className="mobile-close" onClick={()=>setMobile(false)}><X/></button></div>
      <nav>{visibleNav.map(({label,icon:Icon})=><button key={label} className={active===label?"active":""} onClick={()=>go(label)}><Icon size={19}/><span>{label}</span>{label==="Incidents"&&openIncidents>0&&<b className="nav-count">{openIncidents}</b>}</button>)}</nav>
      <div className="sidebar-foot"><div className="system-health"><span/><div><b>System Online</b><small>Connected securely</small></div></div><button onClick={()=>void supabase.auth.signOut()}><LogOut size={18}/>Sign out</button></div>
    </aside>
    <div className="main-column"><header><button className="menu-button" onClick={()=>setMobile(true)}><Menu/></button><div className="header-title"><h1>{active}</h1><p>Boiler Operations & Maintenance</p></div><div className="header-actions"><SharedShift/><NotificationCenter/><div className="profile"><div className="avatar">{initials}</div><div><b>{displayName}</b><span>{role}</span></div></div></div></header>
      <main>{active==="Dashboard"&&<Dashboard session={session} profile={profile} go={go}/>} {active==="Boiler Logbook"&&<LogbookModule session={session} notify={notify}/>} {active==="Safety Checklist"&&<SharedChecklist notify={notify}/>} {active==="Workers List"&&<WorkersList profile={profile} notify={notify}/>} {active==="Attendance"&&<Attendance session={session} notify={notify}/>} {active==="Data Store"&&<DataStore session={session} profile={profile} notify={notify}/>} {active==="Run History"&&<RuntimeHistory/>} {active==="Fuel Calculation"&&<FuelUsage session={session} notify={notify}/>} {active==="Announcements"&&<Announcements session={session} profile={profile} notify={notify}/>} {(["Shift Handover","Maintenance","Incidents","Documents","Reports"] as Section[]).includes(active)&&<OperationalModule title={active as "Shift Handover"|"Maintenance"|"Incidents"|"Documents"|"Reports"} notify={notify}/>} {active==="Admin Panel"&&<ModulePage title={active} notify={notify}/>}</main>
    </div>{mobile&&<button className="backdrop" onClick={()=>setMobile(false)}/>} {toast&&<div className="toast"><CheckCircle2 size={19}/>{toast}</div>}
  </div>;
}

function Dashboard({session,profile,go}:{session:Session;profile:UserProfile|null;go:(s:Section)=>void}){
 return <><div className="page-heading"><div><p className="eyebrow">PLANT 01 · THREE MAIN BOILERS</p><h2>Operations overview</h2><span>Live status and original submitted records only.</span></div><button className="primary" onClick={()=>go("Boiler Logbook")}><Zap size={17}/>Add reading</button></div>
 <BoilerHero/>
 <BoilerMonitor session={session} profile={profile}/>
 <LatestReadings/>
 <ChecklistSummary open={()=>go("Safety Checklist")}/>
 <p className="disclaimer"><ShieldCheck size={16}/>Dashboard displays stored operational status only. SteamGuard does not replace certified controls, alarms, safety interlocks, or approved operating procedures.</p></>;
}
function ModulePage({title,notify}:{title:Section;notify:(s:string)=>void}){const data:Record<string,{e:string;d:string;c:string[]}>= {"Shift Handover":{e:"OPERATOR CONTINUITY",d:"Transfer boiler condition, outstanding work, and safety information between shifts.",c:["Current boiler condition","Pending maintenance","Outgoing operator notes"]},"Incidents":{e:"SAFETY & CORRECTIVE ACTION",d:"Record faults, alarms, leaks, root causes, and corrective actions.",c:["Open incidents","Under investigation","Verified resolutions"]},"Documents":{e:"CONTROLLED DOCUMENT LIBRARY",d:"Manage approved procedures, certificates, inspections, and calibration records.",c:["Operating procedures","Certificates","Inspection reports"]},"Reports":{e:"OPERATIONAL ANALYTICS",d:"Generate filtered operational, maintenance, safety, and consumption reports.",c:["Daily operations","Fuel & steam","Safety compliance"]},"Admin Panel":{e:"SYSTEM CONFIGURATION",d:"Manage users, shifts, boiler records, checklists, and approved operational limits.",c:["Users & roles","Operational limits","Audit trail"]}};const d=data[title];return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">{d.e}</p><h2>{title}</h2><span>{d.d}</span></div><button className="primary" onClick={()=>notify(`${title} action created`)}>Create new</button></div><div className="module-cards">{d.c.map((c,i)=><article className="panel" key={c}><div className="module-card-icon">{i===0?<FileText/>:i===1?<Activity/>:<ShieldCheck/>}</div><h3>{c}</h3><p>Review and manage structured {c.toLowerCase()} records for Boiler SG-01.</p><button onClick={()=>notify(`${c} opened`)}>Open module →</button></article>)}</div></section>}
