// src/pages/Login.tsx
import { LogoMark } from "@/components/AppSidebar";
import { GoogleIcon } from "@/components/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import { Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
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
  const { signIn, signInWithGoogle, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true); // default checked for convenience
  // Which sign-in is in flight, so only that button shows a spinner.
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2">
        <LogoMark size={40} />
        <span className="text-xl font-semibold text-foreground">
          When IELTS?
        </span>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle asChild>
            <h1 className="text-center text-3xl font-bold text-primary">
              Welcome back
            </h1>
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Sign in to continue
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Social Sign In */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleGoogle}
              className="w-full"
            >
              {pending === "google" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span>Continue with Google</span>
            </Button>
            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-5" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-card-foreground"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={busy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  aria-invalid={error?.field === "email"}
                  aria-describedby={error ? "login-error" : undefined}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-card-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={busy}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                  aria-invalid={error?.field === "password"}
                  aria-describedby={error ? "login-error" : undefined}
                  required
                  minLength={6}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    {showPassword ? "Hide password" : "Show password"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="remember"
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
              >
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={busy}
                  id="remember"
                />
                <span className="text-foreground font-medium">Remember me</span>
              </label>
              <Link
                to="/register"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Create account
              </Link>
            </div>

            {error && (
              <div
                id="login-error"
                className="text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2"
                role="alert"
                aria-live="assertive"
              >
                {error.message}
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full font-semibold">
              {pending === "email" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <KeyRound />
              )}
              Sign In
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            This site uses cookies only for authentication persistence when you
            select
            <span className="mx-1 font-medium">Remember me</span>. No tracking
            cookies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
