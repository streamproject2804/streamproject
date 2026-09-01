import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarClock, CheckCircle2, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Task={id:number;equipment:string;boiler_name:string;due_date:string;priority:string;status:string};

export function NotificationCenter(){
 const[tasks,setTasks]=useState<Task[]>([]),[open,setOpen]=useState(false);
 const load=useCallback(async()=>{const{data}=await supabase.from("maintenance_tasks").select("id,equipment,boiler_name,due_date,priority,status").neq("status","Completed").order("due_date");setTasks((data||[]) as Task[])},[]);
 useEffect(()=>{void load();const c=supabase.channel("maintenance-notifications").on("postgres_changes",{event:"*",schema:"public",table:"maintenance_tasks"},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c)}},[load]);
 return <div className="notification-wrap"><button className="icon-button" onClick={()=>setOpen(!open)}><Bell size={20}/>{tasks.length>0&&<i>{tasks.length}</i>}</button>{open&&<div className="notification-panel panel"><div className="notification-head"><div><b>Maintenance notifications</b><span>{tasks.length} pending task(s)</span></div><button onClick={()=>setOpen(false)}><X/></button></div>{tasks.map(task=><article key={task.id}><CalendarClock/><div><b>{task.equipment}</b><span>{task.boiler_name||"General"} · Due {task.due_date}</span></div><em>{task.priority}</em></article>)}{!tasks.length&&<div className="notification-empty"><CheckCircle2/><p>No pending maintenance</p></div>}</div>}</div>;
}
