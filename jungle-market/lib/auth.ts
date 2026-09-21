"use client";

export type AccountRole = "BUYER" | "ARTISAN" | "AMBASSADOR";

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

type SupabaseSession = {
  access_token: string;
  user: SupabaseUser;
};

export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: AccountRole;
};

export type AuthSession = {
  access_token: string;
  user: AuthUser;
};

export type SignupPayload = {
  full_name: string;
  email: string;
  password: string;
  role: AccountRole;
};

export type SignupResult = {
  session: AuthSession | null;
  confirmationRequired: boolean;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000")).replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export class AuthError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
    this.name = "AuthError";
  }
}

async function supabase() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new AuthError(
      "Supabase Auth is not configured. Add the public project URL and publishable key to .env.",
    );
  }
  const { getSupabaseBrowserClient } = await import("./supabase-browser");
  return getSupabaseBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

function accountRole(user: SupabaseUser): AccountRole {
  const role = String(user.app_metadata?.account_role || "").toUpperCase();
  if (role === "ARTISAN" || role === "AMBASSADOR" || role === "BUYER") return role;
  return user.user_metadata?.account_role === "ARTISAN" ? "ARTISAN" : "BUYER";
}

function authUser(user: SupabaseUser): AuthUser {
  const email = user.email || "";
  return {
    id: user.id,
    full_name: String(user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0]),
    email,
    role: accountRole(user),
  };
}

function authSession(session: SupabaseSession): AuthSession {
  return {
    access_token: session.access_token,
    user: authUser(session.user),
  };
}

function friendlyError(message: string): string {
  if (/email rate limit exceeded|over_email_send_rate_limit/i.test(message)) return "The email sending limit has been reached. Wait before retrying, or ask the project owner to configure an email provider.";
  if (/email address not authorized|email_address_not_authorized/i.test(message)) return "This project's email service cannot send to this address yet. The project owner needs to configure an email provider.";
  if (/invalid login credentials/i.test(message)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(message)) return "Confirm your email before signing in.";
  if (/user already registered/i.test(message)) return "This email is already registered.";
  if (/password should be/i.test(message)) return "Use a password with at least 8 characters.";
  return message;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const client = await supabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new AuthError(friendlyError(error.message), error.status);
  if (!data.session) throw new AuthError("Supabase did not create a session. Please try again.");
  return authSession(data.session);
}

export async function signup(payload: SignupPayload): Promise<SignupResult> {
  const client = await supabase();
  const { data, error } = await client.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: {
      emailRedirectTo: typeof window === "undefined" ? undefined : window.location.origin,
      data: {
        full_name: payload.full_name.trim(),
        account_role: payload.role,
      },
    },
  });
  if (error) throw new AuthError(friendlyError(error.message), error.status);
  return {
    session: data.session ? authSession(data.session) : null,
    confirmationRequired: !data.session,
  };
}

export async function resendConfirmation(email: string): Promise<void> {
  const client = await supabase();
  const { error } = await client.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw new AuthError(friendlyError(error.message), error.status);
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const auth = (await supabase()).auth;
  const { data: sessionData, error: sessionError } = await auth.getSession();
  if (sessionError) throw new AuthError(friendlyError(sessionError.message), sessionError.status);
  if (!sessionData.session) return null;

  const { data: userData, error: userError } = await auth.getUser();
  if (userError) {
    if (userError.status === 401 || userError.status === 403) {
      await auth.signOut({ scope: "local" });
      return null;
    }
    throw new AuthError(friendlyError(userError.message), userError.status);
  }
  if (!userData.user) return null;
  return authSession({ ...sessionData.session, user: userData.user });
}

export async function onAuthStateChange(
  callback: (session: AuthSession | null) => void,
): Promise<() => void> {
  const { data } = (await supabase()).auth.onAuthStateChange((_event, session) => {
    callback(session ? authSession(session) : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const { error } = await (await supabase()).auth.signOut({ scope: "local" });
  if (error) throw new AuthError(friendlyError(error.message), error.status);
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AuthError("We could not reach the Jungle Market API.");
  }
  const data = (await response.json().catch(() => null)) as AuthUser | { detail?: string } | null;
  if (!response.ok) {
    const message = data && "detail" in data ? data.detail : null;
    throw new AuthError(message || "Your session could not be verified.", response.status);
  }
  return data as AuthUser;
}
