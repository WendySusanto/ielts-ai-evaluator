// src/pages/Register.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authErrorCode } from "../lib/auth";
import { auth } from "../lib/firebase";
import {
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  UserPlus,
  User,
  Check,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/AppSidebar";
import { GoogleIcon } from "@/components/GoogleIcon";

// Simple email regex for client-side validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// Which field an error belongs to, so only that input is marked invalid.
type AuthError = {
  field?: "displayName" | "email" | "password" | "confirmPassword";
  message: string;
};

// Password strength. Every rule scored here is also shown to the user, so the
// meter, the checklist and the error message can never disagree.
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  {
    label: "Symbol (!, ?, #…)",
    test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
] as const;

const validatePassword = (password: string) => {
  const passed = PASSWORD_RULES.map((rule) => rule.test(password));
  const score = passed.filter(Boolean).length;
  // Length is required; any two further rules are enough.
  return { passed, score, isValid: passed[0] && score >= 3 };
};

const PasswordStrength = ({ password }: { password: string }) => {
  // Nothing typed yet: an empty meter is noise, not feedback.
  if (!password) return null;

  const { passed, score } = validatePassword(password);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1" aria-hidden="true">
        {PASSWORD_RULES.map((rule, i) => (
          <div
            key={rule.label}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score
                ? score >= 4
                  ? "bg-primary"
                  : score >= 3
                    ? "bg-tip"
                    : "bg-destructive"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {PASSWORD_RULES.map((rule, i) => (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 ${
              passed[i] ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {passed[i] ? (
              <Check className="size-3 shrink-0" strokeWidth={3} />
            ) : (
              <X className="size-3 shrink-0" strokeWidth={3} />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Map Firebase error codes to user friendly messages
const mapAuthError = (code: string): AuthError => {
  switch (code) {
    case "auth/invalid-email":
      return { field: "email", message: "Invalid email format." };
    case "auth/email-already-in-use":
      return {
        field: "email",
        message: "Email already registered. Try signing in instead.",
      };
    case "auth/weak-password":
      return {
        field: "password",
        message: "Password is too weak. Please choose a stronger password.",
      };
    case "auth/too-many-requests":
      return { message: "Too many attempts. Please try again later." };
    case "auth/popup-closed-by-user":
      return { message: "Google sign-in was closed." };
    case "auth/operation-not-allowed":
      return { message: "Registration is currently disabled. Contact support." };
    default:
      return { message: "Registration failed. Please try again." };
  }
};

export default function Register() {
  const { signUp, signInWithGoogle, user, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  // Which sign-up is in flight, so only that button shows a spinner.
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

    if (!displayName.trim()) {
      setError({ field: "displayName", message: "Full name is required." });
      return false;
    }
    if (displayName.trim().length < 2) {
      setError({
        field: "displayName",
        message: "Full name must be at least 2 characters.",
      });
      return false;
    }
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
    if (!validatePassword(password).isValid) {
      setError({
        field: "password",
        message:
          "Password must be at least 8 characters and include at least 2 of: an uppercase letter, a lowercase letter, a number, or a symbol.",
      });
      return false;
    }
    if (password !== confirmPassword) {
      setError({
        field: "confirmPassword",
        message: "Passwords do not match.",
      });
      return false;
    }
    return true;
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setPending("email");
      // Set persistence according to Remember Me
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence,
      );
      await signUp(email.trim(), password, displayName.trim());
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
              Create Account
            </h1>
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Join us to start your IELTS journey
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Social Sign Up */}
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

          <form onSubmit={handleEmailSignUp} className="space-y-4" noValidate>
            {/* Display Name Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="displayName"
                className="text-sm font-medium text-card-foreground"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  disabled={busy}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="pl-10"
                  aria-invalid={error?.field === "displayName"}
                  aria-describedby={error ? "register-error" : undefined}
                  required
                  minLength={2}
                />
              </div>
            </div>

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
                  aria-describedby={error ? "register-error" : undefined}
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
                  autoComplete="new-password"
                  disabled={busy}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                  aria-invalid={error?.field === "password"}
                  aria-describedby={error ? "register-error" : undefined}
                  required
                  minLength={8}
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
              <PasswordStrength password={password} />
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-card-foreground"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={busy}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                  aria-invalid={
                    error?.field === "confirmPassword" ||
                    (!!confirmPassword && password !== confirmPassword)
                  }
                  aria-describedby="confirmPassword-hint"
                  required
                  minLength={8}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    {showConfirmPassword ? "Hide password" : "Show password"}
                  </TooltipContent>
                </Tooltip>
              </div>
              <p
                id="confirmPassword-hint"
                className="text-xs text-destructive empty:hidden"
                aria-live="polite"
              >
                {confirmPassword && password !== confirmPassword
                  ? "Passwords do not match"
                  : ""}
              </p>
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
                to="/login"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Have an account?
              </Link>
            </div>

            {error && (
              <div
                id="register-error"
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
                <UserPlus />
              )}
              Create Account
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            By creating an account, you agree to our terms and privacy policy.
            <span className="mx-1 font-medium">Remember me</span> controls
            session persistence.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
