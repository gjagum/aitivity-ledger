import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Shield, User } from 'lucide-react';
import { api, setApiKey, setRole, type Role } from '../../api.ts';

export function LoginPage() {
  const [role, setRoleState] = useState<Role>('tenant');
  const [credential, setCredential] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const label = role === 'admin' ? 'Admin Token' : 'API Key';
  const target = role === 'admin' ? '/admin' : '/';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = credential.trim();
    if (!value) return;

    setError(null);
    setBusy(true);

    // Optimistically store the credential so the validating request carries it,
    // then validate against an endpoint appropriate to the role. On failure we
    // wipe everything so no stale state remains.
    setApiKey(value);
    setRole(role);

    try {
      if (role === 'admin') {
        await api.tenant.list();
      } else {
        await api.agents.list();
      }
      navigate(target, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error && err.message !== 'Unauthorized'
          ? err.message
          : `Invalid ${label.toLowerCase()}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">AItivity Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Role selector */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <RoleButton
              active={role === 'tenant'}
              onClick={() => { setRoleState('tenant'); setError(null); }}
              icon={<User className="w-4 h-4" />}
              label="Tenant User"
            />
            <RoleButton
              active={role === 'admin'}
              onClick={() => { setRoleState('admin'); setError(null); }}
              icon={<Shield className="w-4 h-4" />}
              label="Admin"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500">{label}</label>
              <input
                type="password"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder={role === 'admin' ? 'Enter admin token' : 'Enter tenant API key'}
                autoFocus
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !credential.trim()}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400">
            {role === 'admin'
              ? 'Admins manage tenants (projects) across the instance.'
              : 'Tenant users access the dashboard for a single project.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
