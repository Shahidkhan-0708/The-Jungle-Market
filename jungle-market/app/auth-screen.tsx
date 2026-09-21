"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  LockKeyhole,
  MailCheck,
  MapPin,
  Pause,
  Play,
  ShieldCheck,
  ShoppingBag,
  Sprout,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { AuthError, AuthSession, AccountRole, login, signup, resendConfirmation } from "@/lib/auth";

type AuthMode = "login" | "signup";

const roles: Array<{
  id: AccountRole;
  label: string;
  detail: string;
  icon: typeof ShoppingBag;
}> = [
  { id: "BUYER", label: "Buyer", detail: "Discover meaningful craft", icon: ShoppingBag },
  { id: "ARTISAN", label: "Artisan", detail: "Share and sell your work", icon: Sprout },
  { id: "AMBASSADOR", label: "Ambassador", detail: "Support makers · Approval required", icon: ShieldCheck },
];

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<AccountRole>("BUYER");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [emailNotice, setEmailNotice] = useState("");
  const [resendWait, setResendWait] = useState(0);
  const [videoPaused, setVideoPaused] = useState(true);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!resendWait) return;
    const timer = setTimeout(() => setResendWait(resendWait - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendWait]);

  async function resendEmail() {
    if (busy || resendWait) return;
    setBusy(true); setError(""); setEmailNotice("");
    setResendWait(60);
    try {
      await resendConfirmation(confirmationEmail);
      setEmailNotice("Confirmation requested. Check your inbox and spam folder; delivery may take a few minutes. If you already confirmed this address, sign in instead.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request another email. Please try again later.");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const allowed = !preference.matches;
      setMotionAllowed(allowed);
      if (!allowed) videoRef.current?.pause();
      else void videoRef.current?.play().catch(() => setVideoPaused(true));
    };
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (mode === "signup" && password !== confirmPassword) {
      setError("Enter the same password in both fields.");
      confirmPasswordRef.current?.focus();
      return;
    }

    setBusy(true);
    try {
      const email = String(form.get("email") || "");
      if (mode === "login") {
        onAuthenticated(await login(email, password));
      } else {
        const result = await signup({
          full_name: String(form.get("fullName") || ""),
          email,
          password,
          role,
        });
        if (result.session) onAuthenticated(result.session);
        else if (result.confirmationRequired) { setConfirmationEmail(email.trim().toLowerCase()); setResendWait(60); }
      }
    } catch (requestError) {
      if (requestError instanceof AuthError && requestError.message === "Confirm your email before signing in.") {
        setConfirmationEmail(String(form.get("email") || "").trim().toLowerCase());
      }
      setError(
        requestError instanceof AuthError
          ? requestError.message
          : `Unable to ${mode === "login" ? "sign in" : "create the account"}. Check your connection and try again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setConfirmationEmail("");
    setEmailNotice("");
  }

  function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setVideoPaused(true));
    } else {
      video.pause();
      setVideoPaused(true);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="About Jungle Market">
        <video ref={videoRef} className="auth-story-video" autoPlay={motionAllowed} loop muted playsInline poster="/forest.png" aria-hidden="true"
          onPlay={() => setVideoPaused(false)} onPause={() => setVideoPaused(true)}>
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>
        <button className="auth-video-toggle" type="button" onClick={toggleVideo} aria-label={videoPaused ? "Play background video" : "Pause background video"}>
          {videoPaused ? <Play /> : <Pause />}
          <span>{videoPaused ? "Play film" : "Pause film"}</span>
        </button>
        <div className="auth-story-glow" />
        <a className="auth-brand" href="#" aria-label="Jungle Market">
          <span><Leaf size={24} /></span>
          <strong>jungle <i>market</i><small>ROOTED IN PEOPLE</small></strong>
        </a>
        <div className="auth-story-copy">
          <span className="auth-kicker"><i /> CRAFT, COMMUNITY, CONNECTION</span>
          <h2>Every craft carries<br />a place within it.</h2>
          <p>
            Meet the hands behind India&apos;s living craft traditions. Buy directly,
            sell fairly, and keep every story rooted in its source.
          </p>
          <div className="auth-trust-row">
            <span><ShieldCheck /> Field verified</span>
            <span><MapPin /> Rooted locally</span>
            <span><Check /> Fairer earnings</span>
          </div>
        </div>
        <div className="auth-craft-card">
          <img src="/basket.png" alt="Handwoven wild grass and bamboo basket" />
          <div>
            <small>MADE IN MANDLA</small>
            <strong>Wild Grass Bamboo Basket</strong>
            <span>by Devki Bai Marawi</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-shell">
          <div className="auth-mobile-brand"><Leaf /> jungle market</div>
          <div className="auth-heading">
            <span className="auth-kicker">WELCOME TO THE CLEARING</span>
            <h1>{mode === "login" ? "Welcome back." : "Create your place here."}</h1>
            <p>
              {mode === "login"
                ? "Sign in to continue your Jungle Market journey."
                : "Join a marketplace where the person behind the craft stays visible."}
            </p>
          </div>

          <div className="auth-tabs" aria-label="Account access">
            <button type="button" aria-pressed={mode === "login"} onClick={() => switchMode("login")}>Sign in</button>
            <button type="button" aria-pressed={mode === "signup"} onClick={() => switchMode("signup")}>Create account</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {confirmationEmail ? (
              <div className="auth-confirmation" role="status">
                <span><MailCheck /></span>
                <h3>Check your email.</h3>
                <p>Check <strong>{confirmationEmail}</strong> for a confirmation link. We cannot verify inbox delivery.</p>
                <small>Check Spam and Promotions too. After confirming, return here and sign in. If you already have a confirmed account, sign in directly.</small>
                {emailNotice && <p>{emailNotice}</p>}
                {error && <div className="auth-error" role="alert">{error}</div>}
                <button type="button" className="auth-submit" disabled={busy || resendWait > 0} onClick={resendEmail}>
                  {busy ? "Requesting email…" : resendWait > 0 ? `Resend available in ${resendWait}s` : "Resend confirmation email"}
                </button>
                <button type="button" className="auth-submit" onClick={() => switchMode("login")}>
                  Back to sign in <ArrowRight />
                </button>
              </div>
            ) : <>
            {mode === "signup" && (
              <>
                <label>
                  <span>Full name</span>
                  <Input name="fullName" autoComplete="name" placeholder="Your name" minLength={2} required />
                </label>
                <fieldset className="auth-role-fieldset">
                  <legend>I&apos;m joining as</legend>
                  <div className="auth-roles">
                    {roles.map(({ id, label, detail, icon: Icon }) => (
                      <button
                        type="button"
                        key={id}
                        className={role === id ? "selected" : ""}
                        aria-pressed={role === id}
                        onClick={() => setRole(id)}
                      >
                        <Icon />
                        <span><strong>{label}</strong><small>{detail}</small></span>
                        {role === id && <Check className="role-check" />}
                      </button>
                    ))}
                  </div>
                  {role === "AMBASSADOR" && <p className="auth-fineprint">Your Ambassador request is saved with your account. You can browse as a Buyer until the project owner approves your access to review crafts.</p>}
                </fieldset>
                {(role === "ARTISAN" || role === "AMBASSADOR") && (
                  <div>
                    <button type="button" className="auth-submit" disabled aria-describedby="aadhaar-registration-status">
                      <ShieldCheck /> Register with Aadhaar
                    </button>
                    <p id="aadhaar-registration-status" className="auth-fineprint">
                      Aadhaar registration is not available yet. You can register with email below while we connect identity verification.
                    </p>
                  </div>
                )}
              </>
            )}

            <label>
              <span>Email address</span>
              <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </label>
            <label>
              <span>Password</span>
              <div className="auth-password">
                <LockKeyhole />
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "login" ? "Your password" : "8+ characters, with a letter and number"}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            {mode === "signup" && (
              <label>
                <span>Confirm password</span>
                <Input ref={confirmPasswordRef} name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Enter it once more" minLength={8} aria-invalid={!!error && error.includes("same password")} aria-describedby={error ? "auth-error" : undefined} required />
              </label>
            )}

            {error && <div id="auth-error" className="auth-error" role="alert">{error}</div>}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? <Loader2 className="spin" /> : mode === "login" ? "Sign in" : "Create my account"}
              {!busy && <ArrowRight />}
            </button>
            </>}
          </form>

          <p className="auth-switch">
            {mode === "login" ? "New to Jungle Market?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => switchMode(mode === "login" ? "signup" : "login")}> 
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="auth-switch"><button type="button" onClick={()=>location.assign("/?browse=1")}>Browse published crafts</button></p>
          <p className="auth-fineprint">
            By continuing, you agree to protect maker stories and use the marketplace with care.
          </p>
        </div>
      </section>
    </main>
  );
}
