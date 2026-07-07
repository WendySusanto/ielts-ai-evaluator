// src/components/PrivateRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { JSX } from "react";

export const PrivateRoute = ({
  children,
  requireAdmin,
}: {
  children: JSX.Element;
  requireAdmin?: boolean;
}) => {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading) return <div>Signing in...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (requireAdmin && role.toLowerCase() !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};
