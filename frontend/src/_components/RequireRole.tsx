import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getRole, hasApiKey, type Role } from '../api.ts';

// Route guard: requires both an API key and the given role. Anything else
// (including the other role being logged in) bounces to /login.
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  if (!hasApiKey() || getRole() !== role) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
