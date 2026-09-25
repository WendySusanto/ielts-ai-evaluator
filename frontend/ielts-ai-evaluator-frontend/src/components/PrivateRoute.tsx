// src/components/PrivateRoute.tsx
import { JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogoMark } from "./AppSidebar";

export const PrivateRoute = ({
  children,
  requireAdmin,
}: {
  children: JSX.Element;
  requireAdmin?: boolean;
}) => {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center gap-5 p-6"
      >
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-16 w-16 rounded-full bg-primary/20 motion-safe:animate-ping" />
          <span className="relative rounded-2xl bg-background p-3 shadow-lg ring-1 ring-border motion-safe:animate-pulse">
            <LogoMark size={40} />
          </span>
        </div>
        <span className="text-xl font-semibold text-foreground">
          When IELTS?
        </span>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Signing you in
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (requireAdmin && role.toLowerCase() !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};
