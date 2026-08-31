import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Activity, Flame, LoaderCircle, LogIn, LogOut, Power, Radio, ShieldAlert } from "lucide-react";
import type { UserProfile } from "./AuthGate";
import { supabase } from "../lib/supabase";

type Boiler = {
  id: number;
  code: string;
  name: string;
  boiler_type: string;
  capacity_tons: number;
  operational_status: "running" | "off";
  status_changed_at: string;
};

type Presence = {
  id: string;
  boiler_id: number;
  user_id: string;
  operator_name: string;
  presence_status: "in" | "out";
  changed_at: string;
};

export function BoilerMonitor({ session, profile }: { session: Session; profile: UserProfile | null }) {
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [boilerResult, presenceResult] = await Promise.all([
      supabase.from("boilers").select("*").order("code"),
      supabase.from("operator_presence").select("*").order("changed_at", { ascending: false }),
    ]);
    if (boilerResult.error || presenceResult.error) {
      setError(boilerResult.error?.message || presenceResult.error?.message || "Monitoring data unavailable");
    } else {
      setBoilers((boilerResult.data || []) as Boiler[]);
      setPresence((presenceResult.data || []) as Presence[]);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel("steamguard-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "boilers" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "operator_presence" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const setPresenceStatus = async (boiler: Boiler, state: "in" | "out") => {
    const action = `presence-${boiler.id}`;
    setBusy(action);
    setError("");
    const operatorName = profile?.full_name || session.user.user_metadata.full_name || session.user.email?.split("@")[0] || "Operator";
    const { error: updateError } = await supabase.from("operator_presence").upsert({
      boiler_id: boiler.id,
      user_id: session.user.id,
      operator_name: operatorName,
      presence_status: state,
      changed_at: new Date().toISOString(),
    }, { onConflict: "boiler_id,user_id" });
    if (updateError) setError(updateError.message);
    setBusy(null);
  };

  const setBoilerStatus = async (boiler: Boiler, state: "running" | "off") => {
    const action = `status-${boiler.id}`;
    setBusy(action);
    setError("");
    const { error: updateError } = await supabase.from("boilers").update({
      operational_status: state,
      status_changed_by: session.user.id,
      status_changed_at: new Date().toISOString(),
    }).eq("id", boiler.id);
    if (updateError) setError(updateError.message);
    setBusy(null);
  };

  if (loading) return <article className="panel monitor-loading"><LoaderCircle className="spin" />Loading live boiler status…</article>;

  return <section className="boiler-monitor">
    <div className="monitor-heading">
      <div><p className="eyebrow">LIVE PLANT MONITORING</p><h3>Boiler status & operator attendance</h3></div>
      <span><Radio />Realtime</span>
    </div>
    {error && <div className="monitor-error"><ShieldAlert />{error}</div>}
    <div className="boiler-status-grid">
      {boilers.map(boiler => {
        const activeOperators = presence.filter(item => item.boiler_id === boiler.id && item.presence_status === "in");
        const myPresence = presence.find(item => item.boiler_id === boiler.id && item.user_id === session.user.id)?.presence_status || "out";
        const isBusy = busy === `presence-${boiler.id}` || busy === `status-${boiler.id}`;
        return <article className="panel boiler-status-card" key={boiler.id}>
          <div className="boiler-card-top">
            <div className={`live-boiler-icon ${boiler.operational_status}`}><Flame /></div>
            <div><b>{boiler.code}</b><h4>{boiler.name}</h4><small>{boiler.capacity_tons} ton · {boiler.boiler_type}</small></div>
            <span className={`operation-state ${boiler.operational_status}`}><i />{boiler.operational_status}</span>
          </div>
          <div className="attendance-summary">
            <span>Operators currently IN</span>
            <b>{activeOperators.length}</b>
            <p>{activeOperators.length ? activeOperators.map(item => item.operator_name).join(", ") : "No operator checked in"}</p>
          </div>
          <div className="monitor-controls">
            <div><small>My attendance</small><div className="switch-pair">
              <button disabled={isBusy} className={myPresence === "in" ? "selected in" : ""} onClick={() => void setPresenceStatus(boiler, "in")}><LogIn />IN</button>
              <button disabled={isBusy} className={myPresence === "out" ? "selected out" : ""} onClick={() => void setPresenceStatus(boiler, "out")}><LogOut />OUT</button>
            </div></div>
            <div><small>Boiler operation</small><div className="switch-pair">
              <button disabled={isBusy} className={boiler.operational_status === "running" ? "selected in" : ""} onClick={() => void setBoilerStatus(boiler, "running")}><Activity />Running</button>
              <button disabled={isBusy} className={boiler.operational_status === "off" ? "selected out" : ""} onClick={() => void setBoilerStatus(boiler, "off")}><Power />Off</button>
            </div></div>
          </div>
          <time>Updated {new Date(boiler.status_changed_at).toLocaleString()}</time>
        </article>;
      })}
    </div>
  </section>;
}
