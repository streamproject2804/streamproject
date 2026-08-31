import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, Clock3, Flame, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export type UserProfile = {
  id: string;
  full_name: string;
  role: "admin" | "supervisor" | "operator" | "technician";
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected";
};

export function AuthGate({ children }: { children: (session: Session, profile: UserProfile | null) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

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
    setProfileLoading(true);
    supabase.from("profiles").select("id, full_name, role, is_active, approval_status").eq("id", session.user.id).single()
      .then(({ data }) => {
        setProfile(data as UserProfile | null);
        setProfileLoading(false);
      });
  }, [session]);

  if (loading) return <div className="auth-loading"><LoaderCircle /><span>Opening SteamGuard…</span></div>;
  if (!session) return <LoginPage />;
  if (profileLoading || !profile) return <div className="auth-loading"><LoaderCircle /><span>Checking account access…</span></div>;
  if (profile.approval_status !== "approved" || !profile.is_active) return <ApprovalStatus profile={profile}/>;
  return <>{children(session, profile)}</>;
}

function LoginPage() {
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setSubmitting(false);
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) setError(signUpError.message);
      else {
        setSuccess(data.session ? "Account created. Waiting for administrator approval." : "Account created. Check your email to verify the address, then sign in.");
        setFullName(""); setEmail(""); setPassword(""); setConfirmPassword("");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    }
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
      <form className="login-card" onSubmit={submit}>
        <div className="login-mobile-logo"><ShieldCheck /><b>SteamGuard</b></div>
        <div className="auth-tabs"><button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");setSuccess("")}}>Sign in</button><button type="button" className={mode==="signup"?"active":""} onClick={()=>{setMode("signup");setError("");setSuccess("")}}>Create account</button></div>
        <p className="eyebrow">{mode==="login"?"AUTHORIZED PERSONNEL ONLY":"NEW OPERATOR REGISTRATION"}</p>
        <h2>{mode==="login"?"Welcome back":"Create account"}</h2>
        <span>{mode==="login"?"Sign in using your approved account.":"Register first; the administrator will approve and assign your boiler."}</span>
        {error && <div className="auth-error"><AlertCircle />{error}</div>}
        {success && <div className="auth-success"><CheckCircle2 />{success}</div>}
        {mode==="signup"&&<label><span>Full name</span><div><UserRound/><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Enter your full name" required/></div></label>}
        <label><span>Email address</span><div><Mail /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operator@company.com" required /></div></label>
        <label><span>Password</span><div><LockKeyhole /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" minLength={6} required /></div></label>
        {mode==="signup"&&<label><span>Confirm password</span><div><LockKeyhole/><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter your password" minLength={6} required/></div></label>}
        <button className="primary login-button" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" />Please wait…</> : mode==="login"?"Sign in securely":"Create account"}</button>
        <p className="login-help">{mode==="login"?"Only administrator-approved users can enter SteamGuard.":"Your account cannot control a boiler until administrator approval."}</p>
      </form>
      <p className="login-disclaimer">SteamGuard is an operational record-management and decision-support system. It does not replace certified boiler controls, alarms, safety interlocks, PLC systems, safety valves, emergency shutdown systems, manufacturer instructions, approved operating procedures, or decisions made by qualified personnel.</p>
    </section>
  </main>;
}

function ApprovalStatus({profile}:{profile:UserProfile}) {
  const rejected=profile.approval_status==="rejected";
  return <main className="approval-page"><section className="approval-card panel">
    <div className={`approval-icon ${rejected?"rejected":""}`}>{rejected?<XCircle/>:<Clock3/>}</div>
    <p className="eyebrow">STEAMGUARD ACCESS CONTROL</p>
    <h1>{rejected?"Access request rejected":"Approval pending"}</h1>
    <p>{rejected?"Your registration was not approved. Contact the SteamGuard administrator for assistance.":"Your account has been created successfully. The administrator must approve your account and assign one of the three boilers before access is enabled."}</p>
    <div><b>{profile.full_name}</b><span>{profile.role}</span></div>
    <button className="secondary" onClick={()=>void supabase.auth.signOut()}>Sign out</button>
  </section></main>;
}
