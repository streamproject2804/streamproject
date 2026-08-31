import { useEffect, useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";

export function SharedShift() {
  const [shift, setShift] = useState("Shift A");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("plant_state").select("current_shift").eq("id", 1).single();
    if (data?.current_shift) setShift(data.current_shift);
  };

  useEffect(() => {
    void load();
    const channel = supabase.channel("shared-shift")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "plant_state" }, payload => {
        const next = payload.new as { current_shift?: string };
        if (next.current_shift) setShift(next.current_shift);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const change = async (next: string) => {
    setShift(next);
    setSaving(true);
    await supabase.from("plant_state").update({
      current_shift: next,
      changed_at: new Date().toISOString(),
    }).eq("id", 1);
    setSaving(false);
  };

  return <label className="shift-select">
    <CalendarClock size={18}/>
    <select value={shift} disabled={saving} onChange={e => void change(e.target.value)}>
      <option>Shift A</option><option>Shift B</option><option>Shift C</option>
    </select>
    <ChevronDown size={15}/>
  </label>;
}
