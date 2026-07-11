import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Copy, Check, LogOut, Plus, Trash2 } from 'lucide-react';
import { api, clearApiKey, clearRole, type TenantSummary } from '../../api.ts';

export function AdminPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ slug: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { items } = await api.tenant.list();
      setTenants(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim();
    const n = name.trim();
    if (!s || !n) return;

    setCreating(true);
    setError(null);
    setCreatedKey(null);
    try {
      const tenant = await api.tenant.create(s, n);
      setCreatedKey({ slug: tenant.slug, key: tenant.api_key });
      setSlug('');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(t: TenantSummary) {
    if (!window.confirm(`Delete tenant "${t.name}" (${t.slug})? This permanently removes all its data.`)) {
      return;
    }
    try {
      await api.tenant.delete(t.id);
      setTenants((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
    }
  }

  function copyKey() {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function logout() {
    clearApiKey();
    clearRole();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500">Admin console</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Create tenant */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Create tenant</h2>
          <form
            onSubmit={handleCreate}
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
          >
            <div>
              <label className="block text-xs font-medium text-gray-500">Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. team-management"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-400">lowercase letters, numbers, hyphens</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              {/* Spacer matches the label height so the button lines up with the
                  inputs rather than with the labels. */}
              <span className="block text-xs font-medium opacity-0 select-none">_</span>
              <button
                type="submit"
                disabled={creating || !slug.trim() || !name.trim()}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>

          {createdKey && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-800">
                API key for <span className="font-mono">{createdKey.slug}</span> — copy it now, it won't be shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-3 py-2 font-mono text-xs text-gray-800">
                  {createdKey.key}
                </code>
                <button
                  onClick={copyKey}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Tenant list */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Tenants {tenants.length > 0 && <span className="text-gray-400">({tenants.length})</span>}
            </h2>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : tenants.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">No tenants yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="px-6 py-3">Slug</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3 font-mono text-xs text-gray-700">{t.slug}</td>
                    <td className="px-6 py-3 text-gray-900">{t.name}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDelete(t)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
