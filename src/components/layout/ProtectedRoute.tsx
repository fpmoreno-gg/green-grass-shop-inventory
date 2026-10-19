import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { manager } = useAuth();
  if (!manager) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
