import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Activity, Flame, LoaderCircle, Power, Radio, ShieldAlert } from "lucide-react";
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
  running_started_at: string | null;
};

type Worker = {
  id: string;
  full_name: string;
  email: string;
  assigned_boiler_id: number | null;
  attendance_status: "in" | "out";
  attendance_changed_at: string;
};

export function BoilerMonitor({ session, profile }: { session: Session; profile: UserProfile | null }) {
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const [boilerResult, workerResult] = await Promise.all([
      supabase.from("boilers").select("*").order("code"),
      supabase.from("workers").select("*").eq("is_active", true).order("full_name"),
    ]);
    if (boilerResult.error || workerResult.error) {
      setError(boilerResult.error?.message || workerResult.error?.message || "Monitoring data unavailable");
    } else {
      setBoilers((boilerResult.data || []) as Boiler[]);
      setWorkers((workerResult.data || []) as Worker[]);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel("steamguard-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "boilers" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = (startedAt: string | null) => {
    if (!startedAt) return "00:00:00";
    const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
      .map(value => String(value).padStart(2, "0")).join(":");
  };

  const setBoilerStatus = async (boiler: Boiler, state: "running" | "off") => {
    const action = `status-${boiler.id}`;
    setBusy(action);
    setError("");
    const { error: updateError } = await supabase.rpc("set_boiler_operational_status", {
      target_boiler_id: boiler.id,
      next_status: state,
    });
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
        const assignedWorker = workers.find(item => item.assigned_boiler_id === boiler.id);
        const canControl = profile?.role === "admin" || profile?.role === "supervisor" || assignedWorker?.email.toLowerCase() === session.user.email?.toLowerCase();
        const isBusy = busy === `status-${boiler.id}`;
        return <article className="panel boiler-status-card" key={boiler.id}>
          <div className="boiler-card-top">
            <div className={`live-boiler-icon ${boiler.operational_status}`}><Flame /></div>
            <div><b>{boiler.code}</b><h4>{boiler.name}</h4><small>{boiler.capacity_tons} ton · {boiler.boiler_type}</small></div>
            <span className={`operation-state ${boiler.operational_status}`}><i />{boiler.operational_status}</span>
          </div>
          <div className="attendance-summary">
            <span>Assigned operator</span>
            <b>{assignedWorker?.attendance_status.toUpperCase() || "—"}</b>
            <p>{assignedWorker?.full_name || "No worker assigned"}</p>
          </div>
          <div className={`runtime-clock ${boiler.operational_status}`}>
            <span>{boiler.operational_status === "running" ? "Current running time" : "Runtime stopped"}</span>
            <strong>{boiler.operational_status === "running" ? elapsed(boiler.running_started_at) : "00:00:00"}</strong>
          </div>
          <div className="monitor-controls">
            <div><small>{canControl ? "Boiler operation" : "View only · assigned operator controls this boiler"}</small><div className="switch-pair">
              <button disabled={isBusy || !canControl} className={boiler.operational_status === "running" ? "selected in" : ""} onClick={() => void setBoilerStatus(boiler, "running")}><Activity />Running</button>
              <button disabled={isBusy || !canControl} className={boiler.operational_status === "off" ? "selected out" : ""} onClick={() => void setBoilerStatus(boiler, "off")}><Power />Off</button>
            </div></div>
          </div>
          <time>Updated {new Date(boiler.status_changed_at).toLocaleString()}</time>
        </article>;
      })}
    </div>
  </section>;
}
