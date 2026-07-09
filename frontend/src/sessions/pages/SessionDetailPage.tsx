import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { api, type DevSession } from '../../api.ts';

const reqStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  complete: 'bg-green-100 text-green-700',
  deferred: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-700',
};

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<DevSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const load = () => {
    if (!id) return;
    api.sessions
      .get(id)
      .then(setSession)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleClose = async () => {
    if (!id || !session || session.status !== 'open') return;
    setClosing(true);
    try {
      const updated = await api.sessions.close(id, {
        ready_to_merge: session.ready_to_merge,
        handover_notes: session.handover_notes ?? undefined,
      });
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Close failed');
    } finally {
      setClosing(false);
    }
  };

  if (error && !session) {
    return <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>;
  }
  if (!session) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link to="/sessions" className="text-sm text-indigo-600 hover:underline">
          ← Sessions
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Session #{session.number} — {session.developer_name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{session.module}</p>
          </div>
          {session.status === 'open' && (
            <button
              type="button"
              onClick={handleClose}
              disabled={closing}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {closing ? 'Closing…' : 'Close session'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Meta label="Status" value={session.status} />
        <Meta label="Branch" value={session.branch} mono />
        <Meta
          label="Started"
          value={formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
        />
        <Meta
          label="Ready to merge"
          value={session.ready_to_merge ? 'YES' : 'NO'}
        />
      </div>

      {session.plan?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Plan</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            {session.plan.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {session.blockers && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Blockers</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.blockers}</p>
        </section>
      )}

      {session.handover_notes && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Handover notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.handover_notes}</p>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Requirements</h2>
        {!session.requirements?.length ? (
          <p className="text-sm text-gray-500">None yet — use MCP <code>req_upsert</code>.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">REQ</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {session.requirements.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-mono text-xs">{r.req_id}</td>
                    <td className="px-4 py-2 text-gray-700">{r.description}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${reqStyles[r.status] ?? ''}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Files modified</h2>
        {!session.files?.length ? (
          <p className="text-sm text-gray-500">None recorded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {session.files.map((f) => (
              <li key={f.id} className="font-mono text-xs text-gray-700">
                <span className="text-gray-400">{f.category}</span> {f.path}{' '}
                <span className="text-gray-400">({f.change_type})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`mt-1 text-sm text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  );
}
