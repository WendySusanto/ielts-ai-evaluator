// src/pages/Login.tsx
import { AuthInput, AuthShell, PasswordInput } from "@/components/AuthShell";
import { GoogleIcon } from "@/components/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authErrorCode } from "../lib/auth";
import { auth } from "../lib/firebase";

// Simple email regex for client-side validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// Which field an error belongs to, so only that input is marked invalid.
type AuthError = { field?: "email" | "password"; message: string };

// Map Firebase error codes to user friendly messages
const mapAuthError = (code: string): AuthError => {
  switch (code) {
    case "auth/invalid-email":
      return { field: "email", message: "Invalid email format." };
    case "auth/user-disabled":
      return { message: "Account disabled. Contact support." };
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return { message: "Incorrect email or password." };
    case "auth/too-many-requests":
      return { message: "Too many attempts. Please try again later." };
    case "auth/popup-closed-by-user":
      return { message: "Google sign-in was closed." };
    default:
      return { message: "Authentication failed. Please try again." };
  }
};

export default function Login() {
  const { signIn, signInWithGoogle, sendPasswordReset, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true); // default checked for convenience
  // Which request is in flight, so only that button shows a spinner.
  const [pending, setPending] = useState<"email" | "google" | "reset" | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || "/";

  const busy = pending !== null;

  // If already authenticated redirect
  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, from, navigate]);

  const validate = (): boolean => {
    setError(null);
    setNotice(null);
    if (!email) {
      setError({ field: "email", message: "Email is required." });
      return false;
    }
    if (!emailRegex.test(email)) {
      setError({
        field: "email",
        message: "Please enter a valid email address.",
      });
      return false;
    }
    if (!password) {
      setError({ field: "password", message: "Password is required." });
      return false;
    }
    return true;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setPending("email");
      // Set persistence according to Remember Me
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence,
      );
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(mapAuthError(authErrorCode(err)));
    } finally {
      setPending(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    try {
      setPending("google");
      // Google sign-in uses LOCAL to persist unless user unchecks remember
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence,
      );
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(mapAuthError(authErrorCode(err)));
    } finally {
      setPending(null);
    }
  };

  // Sends the reset link to whatever is typed in Email, so there is no separate page to build.
  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);
    const address = email.trim();
    if (!emailRegex.test(address)) {
      setError({
        field: "email",
        message: "Enter your email above, then tap Forgot password.",
      });
      return;
    }
    // Same answer whether or not the address has an account, so the form can't be used to probe.
    const sent = `If ${address} has an account, a password reset link is on its way. Check your inbox.`;
    try {
      setPending("reset");
      await sendPasswordReset(address);
      setNotice(sent);
    } catch (err) {
      const code = authErrorCode(err);
      if (code === "auth/user-not-found") setNotice(sent);
      else setError(mapAuthError(code));
    } finally {
      setPending(null);
    }
  };

  return (
    <AuthShell title="Sign in">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={handleGoogle}
        className="h-12 w-full rounded-full bg-card font-semibold"
      >
        {pending === "google" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">or with email</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <AuthInput
            id="email"
            type="email"
            autoComplete="email"
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={error?.field === "email"}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              {pending === "reset" && <Loader2 className="size-3.5 animate-spin" />}
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            disabled={busy}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error?.field === "password"}
            aria-describedby={error ? "login-error" : undefined}
            required
            minLength={6}
          />
        </div>

        <label
          htmlFor="remember"
          className="flex w-fit cursor-pointer select-none items-center gap-2.5 text-sm"
        >
          <Checkbox
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={busy}
            id="remember"
          />
          <span className="text-foreground">Remember me</span>
        </label>

        {error && (
          <div
            id="login-error"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error.message}
          </div>
        )}
        {notice && (
          <div
            className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
            role="status"
          >
            {notice}
          </div>
        )}

        <Button type="submit" disabled={busy} className="h-12 w-full rounded-full font-semibold">
          {pending === "email" && <Loader2 className="animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
          Create a free account
        </Link>
      </p>
    </AuthShell>
  );
}
