// src/components/PrivateRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { JSX } from "react";

export const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Signing in...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
};
