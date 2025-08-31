// src/pages/Register.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
  LogIn,
  Mail,
  Lock,
  UserPlus,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { User as UserType } from "@/types/User";

// Simple email regex for client-side validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// Password strength validation
const validatePassword = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score, isValid: score >= 3 && checks.length };
};

// Map Firebase error codes to user friendly messages
const mapAuthError = (code: string): string => {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/email-already-in-use":
      return "Email already registered. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please choose a stronger password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed.";
    case "auth/operation-not-allowed":
      return "Registration is currently disabled. Contact support.";
    default:
      return "Registration failed. Please try again.";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  // const {
  //   isLoading: isLoadingRegister,
  //   error: registerError,
  //   mutate: mutateUsers,
  // } = useFetch<UserType[]>("/api/user", {
  //   skipInitialFetch: true,
  // });

  // const registerAsync = async (data: UserType) => {
  //   await mutateUsers({
  //     url: "api/user",
  //     method: "POST",
  //     data,
  //     onSuccess: () => {
  //       toast.success("Successfully registered");
  //     },
  //     onError: (error) => {
  //       toast.error("Failed to register", {
  //         description: error.message,
  //       });
  //     },
  //   });
  // };

  // If already authenticated redirect
  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, from, navigate]);

  const passwordValidation = validatePassword(password);

  const validate = (): boolean => {
    setError(null);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return false;
    }
    if (displayName.trim().length < 2) {
      setError("Display name must be at least 2 characters.");
      return false;
    }
    if (!email) {
      setError("Email is required.");
      return false;
    }
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!password) {
      setError("Password is required.");
      return false;
    }
    if (!passwordValidation.isValid) {
      setError(
        "Password must be at least 8 characters with mixed case, numbers."
      );
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    if (!acceptTerms) {
      setError("Please accept the terms and conditions.");
      return false;
    }
    return true;
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      // Set persistence according to Remember Me
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      await signUp(email.trim(), password, displayName.trim());

      await navigate(from, { replace: true });
    } catch (err: any) {
      setError(mapAuthError(err.code || ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    if (!acceptTerms) {
      setError("Please accept the terms and conditions.");
      return;
    }

    try {
      setSubmitting(true);
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithGoogle();

      // var payload: UserType = {
      //   email: auth.currentUser?.email || "",
      //   firebaseUid: auth.currentUser?.uid || "",
      //   authProvider: auth.currentUser?.providerData[0]?.providerId || "",
      // };

      // await registerAsync(payload);

      navigate(from, { replace: true });
    } catch (err: any) {
      setError(mapAuthError(err.code || ""));
    } finally {
      setSubmitting(false);
    }
  };

  const PasswordStrengthIndicator = () => (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < passwordValidation.score
                ? passwordValidation.score >= 4
                  ? "bg-green-500"
                  : passwordValidation.score >= 3
                  ? "bg-yellow-500"
                  : "bg-red-500"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries({
            "8+ chars": passwordValidation.checks.length,
            Uppercase: passwordValidation.checks.uppercase,
            Number: passwordValidation.checks.number,
            "Special char": passwordValidation.checks.special,
          }).map(([label, valid]) => (
            <div
              key={label}
              className={`flex items-center gap-1 ${
                valid ? "text-green-600 dark:text-green-400" : "text-gray-400"
              }`}
            >
              {valid ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col justify-center mx-auto p-6 w-md">
      <Card className="w-full max-w-md border-0 shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <p className="text-center text-muted-foreground-bold">
            Join us to start your IELTS journey
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Social Sign Up */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              disabled={submitting || !acceptTerms}
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2 border-gray-200 dark:border-gray-600"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span>Continue with Google</span>
            </Button>
            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            {/* Display Name Field */}
            <div className="space-y-1">
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
                  disabled={submitting}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-10"
                  required
                  minLength={2}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
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
                  disabled={submitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  aria-invalid={!!error && !emailRegex.test(email)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
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
                  disabled={submitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground transition"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      tabIndex={0}
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
              <PasswordStrengthIndicator />
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
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
                  disabled={submitting}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground transition"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      tabIndex={0}
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
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Terms & Remember Me */}
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <Checkbox
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  id="terms"
                />
                <span className="text-muted-foreground-bold leading-relaxed">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <label className="flex items-center justify-between text-sm cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    id="remember"
                  />
                  <span className="text-muted-foreground-bold">
                    Remember me
                  </span>
                </div>
                <Link
                  to="/login"
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Have an account?
                </Link>
              </label>
            </div>

            {error && (
              <div
                className="text-sm rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-2"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !acceptTerms}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Create Account
                </span>
              )}
            </Button>
          </form>

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            By creating an account, you agree to our terms and privacy policy.
            <span className="mx-1 font-medium">Remember me</span> controls
            session persistence.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
