import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AlertCircle, Flame, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

export type UserProfile = {
  id: string;
  full_name: string;
  role: "admin" | "supervisor" | "operator" | "technician";
};

export function AuthGate({ children }: { children: (session: Session, profile: UserProfile | null) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("profiles").select("id, full_name, role").eq("id", session.user.id).single()
      .then(({ data }) => setProfile(data as UserProfile | null));
  }, [session]);

  if (loading) return <div className="auth-loading"><LoaderCircle /><span>Opening SteamGuard…</span></div>;
  if (!session) return <LoginPage />;
  return <>{children(session, profile)}</>;
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setSubmitting(false);
  };

  return <main className="login-page">
    <section className="login-brand">
      <div className="login-logo"><ShieldCheck /><Flame /></div>
      <p>STEAMGUARD OPERATIONS PLATFORM</p>
      <h1>Safer records.<br />Clearer decisions.</h1>
      <span>Secure operational records, shift continuity, maintenance tracking and safety oversight for qualified boiler personnel.</span>
      <div className="login-security"><LockKeyhole /><div><b>Protected operational access</b><small>Every sign-in and important activity can be audited.</small></div></div>
    </section>
    <section className="login-panel">
      <form className="login-card" onSubmit={signIn}>
        <div className="login-mobile-logo"><ShieldCheck /><b>SteamGuard</b></div>
        <p className="eyebrow">AUTHORIZED PERSONNEL ONLY</p>
        <h2>Welcome back</h2>
        <span>Sign in using the account issued by your administrator.</span>
        {error && <div className="auth-error"><AlertCircle />{error}</div>}
        <label><span>Email address</span><div><Mail /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operator@company.com" required /></div></label>
        <label><span>Password</span><div><LockKeyhole /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" minLength={6} required /></div></label>
        <button className="primary login-button" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" />Signing in…</> : "Sign in securely"}</button>
        <p className="login-help">Account creation and role assignment are controlled by the SteamGuard administrator.</p>
      </form>
      <p className="login-disclaimer">SteamGuard is an operational record-management and decision-support system. It does not replace certified boiler controls, alarms, safety interlocks, PLC systems, safety valves, emergency shutdown systems, manufacturer instructions, approved operating procedures, or decisions made by qualified personnel.</p>
    </section>
  </main>;
}
