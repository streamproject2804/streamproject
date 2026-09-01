import { useCallback, useEffect, useState } from "react";
import { CalendarClock, LoaderCircle, Timer } from "lucide-react";
import { supabase } from "../lib/supabase";

type RuntimeSession = { id:number; started_at:string; stopped_at:string|null; duration_seconds:number|null; boilers:{code:string;name:string}|null };
const clock=(seconds:number)=>{const safe=Math.max(0,Math.floor(seconds));return [Math.floor(safe/3600),Math.floor((safe%3600)/60),safe%60].map(v=>String(v).padStart(2,"0")).join(":")};

export function RuntimeHistory(){
 const[records,setRecords]=useState<RuntimeSession[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[now,setNow]=useState(Date.now());
 const load=useCallback(async()=>{const{data,error:loadError}=await supabase.from("boiler_runtime_sessions").select("id,started_at,stopped_at,duration_seconds,boilers(code,name)").order("started_at",{ascending:false});if(loadError)setError(loadError.message);else{setRecords((data||[]) as unknown as RuntimeSession[]);setError("")}setLoading(false)},[]);
 useEffect(()=>{void load();const channel=supabase.channel("runtime-history").on("postgres_changes",{event:"*",schema:"public",table:"boiler_runtime_sessions"},()=>void load()).subscribe();const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>{window.clearInterval(timer);void supabase.removeChannel(channel)}},[load]);
 const duration=(r:RuntimeSession)=>r.duration_seconds??Math.max(0,(now-new Date(r.started_at).getTime())/1000);
 return <section className="module-wrap"><div className="page-heading"><div><p className="eyebrow">BOILER UTILIZATION RECORD</p><h2>Run history</h2><span>Stored start, stop, and total running time for every boiler.</span></div></div>{error&&<div className="monitor-error">{error}</div>}{loading?<div className="panel monitor-loading"><LoaderCircle className="spin"/>Loading runtime history…</div>:records.length===0?<div className="panel empty-panel"><Timer/><h3>No runtime records yet</h3><p>Turn a boiler Running to begin its first stored session.</p></div>:<div className="runtime-list">{records.map(r=><article className="panel runtime-record" key={r.id}><div className="runtime-record-icon"><CalendarClock/></div><div><span>{r.boilers?.code||"Boiler"}</span><h3>{r.boilers?.name||"Registered boiler"}</h3><p>{new Date(r.started_at).toLocaleDateString()}</p></div><dl><div><dt>Start time</dt><dd>{new Date(r.started_at).toLocaleTimeString()}</dd></div><div><dt>Stop time</dt><dd>{r.stopped_at?new Date(r.stopped_at).toLocaleTimeString():"Running now"}</dd></div><div><dt>Total runtime</dt><dd>{clock(duration(r))}</dd></div></dl><span className={`operation-state ${r.stopped_at?"off":"running"}`}><i/>{r.stopped_at?"Stopped":"Running"}</span></article>)}</div>}</section>;
}
