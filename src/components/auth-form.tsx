"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, PaperPlaneTilt, SpinnerGap } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

type Method = "code" | "password";
type PasswordMode = "sign-in" | "sign-up";

export function AuthForm({ configured, initialError }: { configured: boolean; initialError?: string | null }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("code");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("sign-in");
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(initialError ?? null);

  function enterWorkspace() {
    router.push("/dashboard");
    router.refresh();
  }

  function fail(error: unknown, fallback: string) {
    setMessage(error instanceof Error ? error.message : fallback);
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!configured) return setMessage("Supabase is not configured yet. See the setup checklist.");
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setCodeSent(true);
      // Supabase only allows template edits on custom SMTP, and its default Magic Link template
      // omits {{ .Token }}. On the built-in email service the link is therefore the working path,
      // so the copy leads with it and treats the code as the fallback rather than the default.
      setMessage("Check your inbox and click the sign-in link. If your email also contains a six-digit code, you can enter it below instead.");
    } catch (error) {
      fail(error, "Could not send the sign-in email.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: "email" });
      if (error) throw error;
      enterWorkspace();
    } catch (error) {
      fail(error, "That code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!configured) return setMessage("Supabase is not configured yet. See the setup checklist.");
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      if (passwordMode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        enterWorkspace();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) enterWorkspace();
        else setMessage("Check your inbox to confirm your account, then sign in.");
      }
    } catch (error) {
      fail(error, "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const notice = message && (
    <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 text-white/60">{message}</p>
  );

  return (
    <div className="panel p-5 md:p-7">
      <div className="mb-7 grid grid-cols-2 rounded-full bg-white/5 p-1 text-sm">
        <button
          type="button"
          onClick={() => { setMethod("code"); setMessage(null); }}
          className={`rounded-full px-4 py-2.5 ${method === "code" ? "bg-white text-black" : "text-white/45"}`}
        >
          Email code
        </button>
        <button
          type="button"
          onClick={() => { setMethod("password"); setMessage(null); }}
          className={`rounded-full px-4 py-2.5 ${method === "password" ? "bg-white text-black" : "text-white/45"}`}
        >
          Password
        </button>
      </div>

      {method === "code" ? (
        codeSent ? (
          <form onSubmit={verifyCode}>
            <p className="mb-5 text-sm leading-6 text-white/45">
              Sent to <span className="text-white/75">{email}</span>. No password is needed. Signing in this way
              creates your account if you do not have one yet.
            </p>
            <label className="form-label">
              Six-digit code
              <input
                className="form-input tracking-[0.35em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={token}
                onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))}
              />
            </label>
            {notice}
            <button type="submit" disabled={busy || token.length < 6} className="primary-button mt-6 w-full">
              {busy ? <SpinnerGap className="animate-spin" size={18} /> : <ArrowRight size={18} />}
              {busy ? "Verifying" : "Verify and continue"}
            </button>
            <button
              type="button"
              onClick={() => { setCodeSent(false); setToken(""); setMessage(null); }}
              className="quiet-button mt-3 w-full justify-center"
            >
              <ArrowLeft size={16} /> Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={sendCode}>
            <label className="form-label">
              Email
              <input
                className="form-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {notice}
            <button type="submit" disabled={busy || !configured} className="primary-button mt-6 w-full">
              {busy ? <SpinnerGap className="animate-spin" size={18} /> : <PaperPlaneTilt size={18} />}
              {busy ? "Sending" : "Send sign-in code"}
            </button>
            <p className="mt-4 text-xs leading-5 text-white/30">
              We email a one-click sign-in link. No password needed. This creates your account if
              you do not have one yet.
            </p>
          </form>
        )
      ) : (
        <form onSubmit={submitPassword}>
          <div className="mb-6 flex gap-4 text-sm">
            <button
              type="button"
              onClick={() => setPasswordMode("sign-in")}
              className={passwordMode === "sign-in" ? "text-white" : "text-white/35"}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setPasswordMode("sign-up")}
              className={passwordMode === "sign-up" ? "text-white" : "text-white/35"}
            >
              Create account
            </button>
          </div>
          <div className="grid gap-4">
            <label className="form-label">
              Email
              <input
                className="form-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="form-label">
              Password
              <input
                className="form-input"
                type="password"
                minLength={8}
                autoComplete={passwordMode === "sign-in" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>
          {notice}
          <button type="submit" disabled={busy || !configured} className="primary-button mt-6 w-full">
            {busy ? <SpinnerGap className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            {busy ? "Working" : passwordMode === "sign-in" ? "Enter workspace" : "Create account"}
          </button>
        </form>
      )}
    </div>
  );
}
