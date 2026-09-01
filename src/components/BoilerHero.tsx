import { useCallback, useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { supabase } from "../lib/supabase";

type Boiler={id:number;code:string;name:string;operational_status:"running"|"off"};
export function BoilerHero(){
 const[boilers,setBoilers]=useState<Boiler[]>([]);
 const load=useCallback(async()=>{const{data}=await supabase.from("boilers").select("id,code,name,operational_status").order("code");setBoilers((data||[]) as Boiler[])},[]);
 useEffect(()=>{void load();const c=supabase.channel("boiler-hero").on("postgres_changes",{event:"*",schema:"public",table:"boilers"},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c)}},[load]);
 return <article className="panel boiler-hero"><div className="hero-boiler-art"><div className="hero-chimney"/><div className="hero-tank"><Flame/></div><div className="hero-feet"><i/><i/></div></div><div><p className="eyebrow">LIVE BOILER PLANT</p><h3>Main boiler status</h3><div className="hero-status-list">{boilers.map(b=><div key={b.id}><span>{b.code} · {b.name}</span><b className={`operation-state ${b.operational_status}`}><i/>{b.operational_status}</b></div>)}</div></div></article>;
}
